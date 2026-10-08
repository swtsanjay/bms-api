import crypto from 'node:crypto';
import sharp from 'sharp';
import type { Knex } from 'knex';
import S3Service from '../../../lib/S3Service';
import config from '../../../config';
import { queueCommerceEmail } from '../email/service';

export class DesignError extends Error {
    constructor(message: string, public statusCode = 400) { super(message); }
}
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function checkDesign(file: Express.Multer.File) {
    if (!file?.buffer?.length || file.buffer.length > 15 * 1024 * 1024) throw new DesignError('Choose a file up to 15 MB', 413);
    if (!allowed.has(file.mimetype)) throw new DesignError('Use JPG, PNG, WebP or PDF', 422);
    if (file.mimetype === 'application/pdf') {
        const body = file.buffer.toString('latin1');
        if (!body.startsWith('%PDF-') || !body.slice(-2048).includes('%%EOF') || /\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile)\b/i.test(body)) {
            throw new DesignError('This PDF cannot be accepted', 422);
        }
    } else {
        try {
            const meta = await sharp(file.buffer, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata();
            const actual = meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : null;
            if (actual !== file.mimetype || (meta.pages || 1) !== 1) throw new Error('Invalid image');
        } catch { throw new DesignError('The image content is invalid or animated', 422); }
    }
    return file.mimetype;
}

export async function submitDesign(file: Express.Multer.File, phone: string, marketingPermission: boolean, customerId: number | null) {
    const mime = await checkDesign(file);
    if (!/^\+?[0-9()\s-]{8,30}$/.test(phone)) throw new DesignError('Enter a valid contact phone number', 422);
    if (!config.aws.s3PrivateDesignBucketName || config.aws.s3PrivateDesignBucketName === config.aws.s3BucketName) throw new DesignError('Private design storage is unavailable', 503);
    const publicId = crypto.randomUUID();
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const suffix = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
    const object = await S3Service.uploadPrivateDesign(file.buffer, `commerce/designs/${publicId}/original.${suffix}`, mime);
    const claimToken = customerId ? null : crypto.randomBytes(32).toString('base64url');
    try {
        await knexInstance('vsq_design_submissions').insert({
            public_id: publicId, customer_id: customerId, phone: phone.trim(), original_filename: file.originalname.slice(0, 255),
            mime_type: mime, byte_size: file.buffer.length, checksum_sha256: checksum, object_key: object.key,
            marketing_permission: marketingPermission, status: 'PENDING', claim_token_hash: claimToken ? hash(claimToken) : null,
            claim_expires_at: claimToken ? new Date(Date.now() + 30 * 60 * 1000) : null, created_at: new Date(), updated_at: new Date()
        });
    } catch (error) { await S3Service.deletePrivateDesign(object.key, object.versionId); throw error; }
    return { public_id: publicId, status: 'PENDING', claim_token: claimToken };
}

export async function awardApprovedDesign(trx: Knex.Transaction, customerId: number) {
    const customer = await trx('vsq_customers').where({ id: customerId, status: 'ACTIVE' }).whereNull('deleted_at').forUpdate().first();
    if (!customer?.email_verified_at) return false;
    const submission = await trx('vsq_design_submissions').where({ customer_id: customerId, status: 'APPROVED' }).orderBy('id', 'asc').forUpdate().first();
    if (!submission || await trx('vsq_design_rewards').where({ customer_id: customerId }).first()) return false;
    await trx('vsq_credit_accounts').insert({ customer_id: customerId, created_at: new Date(), updated_at: new Date() }).onConflict('customer_id').ignore();
    await trx('vsq_credit_accounts').where({ customer_id: customerId }).forUpdate().first();
    await trx('vsq_design_rewards').insert({ customer_id: customerId, submission_id: submission.id, amount_minor: 5000, created_at: new Date() });
    await trx('vsq_credit_transactions').insert({
        public_id: crypto.randomUUID(), customer_id: customerId, type: 'ADMIN_ADJUSTMENT', source: 'APPROVED_DESIGN',
        pending_delta_minor: 0, available_delta_minor: 5000, currency: 'INR', idempotency_key: `design-reward:${customerId}`,
        description: 'Approved design reward', actor_type: 'SYSTEM', metadata: JSON.stringify({ submission_public_id: submission.public_id }), created_at: new Date()
    });
    await trx('vsq_credit_accounts').where({ customer_id: customerId }).update({
        available_balance_minor: trx.raw('available_balance_minor + 5000'), version: trx.raw('version + 1'), updated_at: new Date()
    });
    await trx('vsq_design_submissions').where({ id: submission.id }).update({ rewarded_at: new Date(), updated_at: new Date() });
    await queueCommerceEmail(trx, { eventKey: `design.reward:${customerId}`, template: 'DESIGN_REWARD', recipientEmail: customer.email,
        recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '), payload: { amount: 50 } });
    return true;
}

export async function claimDesign(publicId: string, token: string, customerId: number) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DesignError('Claim link is invalid', 400);
    return knexInstance.transaction(async (trx) => {
        await trx('vsq_customers').where({ id: customerId }).forUpdate().first();
        const submission = await trx('vsq_design_submissions').where({ public_id: publicId }).forUpdate().first();
        if (!submission || submission.customer_id || submission.claimed_at || !submission.claim_token_hash
            || new Date(submission.claim_expires_at).getTime() <= Date.now()
            || !crypto.timingSafeEqual(Buffer.from(submission.claim_token_hash, 'hex'), Buffer.from(hash(token), 'hex'))) {
            throw new DesignError('This submission can no longer be claimed', 409);
        }
        await trx('vsq_design_submissions').where({ id: submission.id }).update({ customer_id: customerId, claimed_at: new Date(), claim_token_hash: null, claim_expires_at: null, updated_at: new Date() });
        await awardApprovedDesign(trx, customerId);
        const linked = await trx('vsq_design_submissions').where({ id: submission.id }).first();
        return { public_id: publicId, status: linked.status, rewarded_at: linked.rewarded_at };
    });
}

export async function reviewDesign(publicId: string, status: 'APPROVED' | 'REJECTED', note: string, actorId: number) {
    return knexInstance.transaction(async (trx) => {
        const read = await trx('vsq_design_submissions').where({ public_id: publicId }).first();
        if (!read) throw new DesignError('Submission not found', 404);
        if (read.customer_id) await trx('vsq_customers').where({ id: read.customer_id }).forUpdate().first();
        const submission = await trx('vsq_design_submissions').where({ id: read.id }).forUpdate().first();
        if (submission.status !== 'PENDING') throw new DesignError('Submission has already been reviewed', 409);
        await trx('vsq_design_submissions').where({ id: submission.id }).update({ status, reviewed_by: actorId, review_note: note.slice(0, 500), reviewed_at: new Date(), updated_at: new Date() });
        await trx('vsq_design_review_events').insert({ submission_id: submission.id, actor_id: actorId, from_status: 'PENDING', to_status: status, note: note.slice(0, 500), created_at: new Date() });
        if (status === 'APPROVED' && submission.customer_id) await awardApprovedDesign(trx, Number(submission.customer_id));
        return { public_id: publicId, status };
    });
}
