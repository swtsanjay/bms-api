import crypto from 'node:crypto';
import sharp from 'sharp';
import type { Knex } from 'knex';
import S3Service from '../../../lib/S3Service';
import config from '../../../config';
import { checkPrivateSubmission } from '../uploads/file-validation';
import { logSubmissionError, SubmissionError } from '../uploads/errors';
import { queueCommerceEmail } from '../email/service';

export class DesignError extends SubmissionError {}
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export { checkPrivateSubmission as checkDesign } from '../uploads/file-validation';

export async function submitDesign(file: Express.Multer.File, phone: string, marketingPermission: boolean, customerId: number | null) {
    const mime = await checkPrivateSubmission(file);
    if (!/^\+?[0-9()\s-]{8,30}$/.test(phone)) throw new DesignError('Enter a valid contact phone number', 422);
    if (!config.aws.s3PrivateDesignBucketName || config.aws.s3PrivateDesignBucketName === config.aws.s3BucketName) throw new SubmissionError('File uploads are temporarily unavailable. Please try again later.', 503, 'UPLOAD_STORAGE_UNAVAILABLE');
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
    } catch (error) {
        await S3Service.deletePrivateDesign(object.key, object.versionId).catch((cleanupError) => logSubmissionError('design', 'cleanup', cleanupError));
        throw error;
    }
    return { public_id: publicId, status: 'PENDING', claim_token: claimToken };
}

export async function privateDesignThumbnail(submission: { id: number; public_id: string; mime_type: string; object_key: string; thumbnail_object_key?: string | null }) {
    if (!submission.mime_type.startsWith('image/')) throw new DesignError('PDF submissions have no image thumbnail', 422);
    let key = submission.thumbnail_object_key;
    if (!key) {
        const original = await S3Service.readPrivateDesign(submission.object_key);
        const thumbnail = await sharp(original, { failOn: 'error', limitInputPixels: 50_000_000 }).rotate().resize(320, 320, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
        const object = await S3Service.uploadPrivateDesign(thumbnail, `commerce/designs/${submission.public_id}/thumbnail.webp`, 'image/webp');
        key = object.key;
        await knexInstance('vsq_design_submissions').where({ id: submission.id }).whereNull('thumbnail_object_key').update({ thumbnail_object_key: key });
    }
    return S3Service.privateDesignReviewUrl(key, 'thumbnail.webp', true, 'image/webp');
}

export async function awardApprovedDesign(trx: Knex.Transaction, customerId: number) {
    const customer = await trx('vsq_customers').where({ id: customerId, status: 'ACTIVE' }).whereNull('deleted_at').forUpdate().first();
    if (!customer?.email_verified_at) return false;
    // Historic approvals have no stored decision amount and must never be paid retroactively.
    const submissions = await trx('vsq_design_submissions').where({ customer_id: customerId, status: 'APPROVED' })
        .whereNotNull('approved_reward_minor').orderBy('id', 'asc').forUpdate();
    if (!submissions.length) return false;
    await trx('vsq_credit_accounts').insert({ customer_id: customerId, created_at: new Date(), updated_at: new Date() }).onConflict('customer_id').ignore();
    await trx('vsq_credit_accounts').where({ customer_id: customerId }).forUpdate().first();
    let awarded = false;
    for (const submission of submissions) {
        if (await trx('vsq_design_rewards').where({ submission_id: submission.id }).first()) continue;
        const amount = Number(submission.approved_reward_minor);
        if (!Number.isInteger(amount) || amount < 100 || amount > 5000 || amount % 100 !== 0) throw new Error('Invalid stored design reward');
        await trx('vsq_design_rewards').insert({ customer_id: customerId, submission_id: submission.id, amount_minor: amount, created_at: new Date() });
        await trx('vsq_credit_transactions').insert({
            public_id: crypto.randomUUID(), customer_id: customerId, type: 'ADMIN_ADJUSTMENT', source: 'APPROVED_DESIGN',
            pending_delta_minor: 0, available_delta_minor: amount, currency: 'INR', idempotency_key: `design-reward:submission:${submission.id}`,
            description: 'Approved design reward', actor_type: 'SYSTEM', metadata: JSON.stringify({ submission_public_id: submission.public_id }), created_at: new Date()
        });
        await trx('vsq_credit_accounts').where({ customer_id: customerId }).update({
            available_balance_minor: trx.raw('available_balance_minor + ?', [amount]), version: trx.raw('version + 1'), updated_at: new Date()
        });
        await trx('vsq_design_submissions').where({ id: submission.id }).update({ rewarded_at: new Date(), updated_at: new Date() });
        await queueCommerceEmail(trx, { eventKey: `design.reward:submission:${submission.id}`, template: 'DESIGN_REWARD', recipientEmail: customer.email,
            recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '), payload: { amount: amount / 100 } });
        awarded = true;
    }
    return awarded;
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
        const linked = await trx('vsq_design_submissions as s').leftJoin('vsq_design_rewards as r', 'r.submission_id', 's.id')
            .select('s.status', 's.rewarded_at', 's.approved_reward_minor', 'r.amount_minor as issued_amount_minor').where('s.id', submission.id).first();
        return { public_id: publicId, status: linked.status, rewarded_at: linked.rewarded_at, approved_reward_minor: linked.approved_reward_minor, issued_amount_minor: linked.issued_amount_minor };
    });
}

export async function reviewDesign(publicId: string, status: 'APPROVED' | 'REJECTED', note: string, actorId: number, rewardRupees?: number) {
    if (status === 'APPROVED' && (!Number.isInteger(rewardRupees) || rewardRupees! < 1 || rewardRupees! > 50)) throw new DesignError('Choose a whole-rupee reward from ₹1 to ₹50', 422);
    return knexInstance.transaction(async (trx) => {
        const read = await trx('vsq_design_submissions').where({ public_id: publicId }).first();
        if (!read) throw new DesignError('Submission not found', 404);
        if (read.customer_id) await trx('vsq_customers').where({ id: read.customer_id }).forUpdate().first();
        const submission = await trx('vsq_design_submissions').where({ id: read.id }).forUpdate().first();
        if (submission.status !== 'PENDING') throw new DesignError('Submission has already been reviewed', 409);
        await trx('vsq_design_submissions').where({ id: submission.id }).update({ status, approved_reward_minor: status === 'APPROVED' ? rewardRupees! * 100 : null, reviewed_by: actorId, review_note: note.slice(0, 500), reviewed_at: new Date(), updated_at: new Date() });
        await trx('vsq_design_review_events').insert({ submission_id: submission.id, actor_id: actorId, from_status: 'PENDING', to_status: status, note: note.slice(0, 500), created_at: new Date() });
        if (status === 'APPROVED' && submission.customer_id) await awardApprovedDesign(trx, Number(submission.customer_id));
        return { public_id: publicId, status };
    });
}
