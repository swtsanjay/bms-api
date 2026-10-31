import crypto from 'node:crypto';
import config from '../../../config';
import S3Service from '../../../lib/S3Service';
import { checkPrivateSubmission } from '../uploads/file-validation';
import { logSubmissionError, SubmissionError } from '../uploads/errors';
import { toMinorUnits } from '../payment/money';

export class BillError extends SubmissionError {}
export const billColumns = ['public_id', 'reward', 'upi_id', 'original_filename', 'mime_type', 'status', 'granted_amount_minor', 'review_note', 'reviewed_at', 'created_at'];

export function walletRewardMinor(value: unknown): number {
    let amount: number;
    try { amount = toMinorUnits(value); } catch { throw new BillError('Enter a valid amount from ₹0.01 to ₹100, with at most two decimal places', 422); }
    if (amount < 1 || amount > 10000) throw new BillError('Enter a positive credit amount no greater than ₹100', 422);
    return amount;
}

export async function submitBill(file: Express.Multer.File, reward: string, upi: string, requestId: string, customerId: number) {
    if (!['CASH', 'WALLET'].includes(reward)) throw new BillError('Choose a reward', 422);
    const upiId = reward === 'CASH' ? upi.trim() : null;
    if (reward === 'CASH' && (!upiId || upiId.length > 255 || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId))) throw new BillError('Enter a valid UPI ID', 422);
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new BillError('Invalid submission request ID', 422);
    const mime = await checkPrivateSubmission(file);
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const existing = async () => {
        const row = await knexInstance('vsq_bill_claims').where({ customer_id: customerId, request_id: requestId }).first();
        if (row && (row.reward !== reward || row.upi_id !== upiId || row.checksum_sha256 !== checksum)) throw new BillError('This request ID was already used for a different submission', 409);
        return row;
    };
    const previous = await existing();
    if (previous) return publicBill(previous.public_id, customerId);
    const customer = await knexInstance('vsq_customers').where({ id: customerId, status: 'ACTIVE' }).whereNull('deleted_at').first();
    if (!customer) throw new BillError('Customer account unavailable', 403);
    if (!config.aws.s3PrivateDesignBucketName || config.aws.s3PrivateDesignBucketName === config.aws.s3BucketName) throw new SubmissionError('File uploads are temporarily unavailable. Please try again later.', 503, 'UPLOAD_STORAGE_UNAVAILABLE');
    const publicId = crypto.randomUUID();
    const suffix = mime === 'application/pdf' ? 'pdf' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
    // Reuse the private bucket's existing authorized upload namespace. A new
    // top-level namespace is not covered by the API's scoped storage policy.
    const object = await S3Service.uploadPrivateDesign(file.buffer, `commerce/designs/bills/${publicId}/original.${suffix}`, mime);
    try {
        await knexInstance('vsq_bill_claims').insert({ public_id: publicId, customer_id: customerId, request_id: requestId, reward, upi_id: upiId,
            original_filename: file.originalname.slice(0, 255), mime_type: mime, byte_size: file.buffer.length,
            checksum_sha256: checksum, object_key: object.key, status: 'PENDING', created_at: new Date(), updated_at: new Date() });
    } catch (error) {
        await S3Service.deletePrivateDesign(object.key, object.versionId).catch((cleanupError) => logSubmissionError('bill', 'cleanup', cleanupError));
        if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
            const duplicate = await existing();
            if (duplicate) return publicBill(duplicate.public_id, customerId);
        }
        throw error;
    }
    return publicBill(publicId, customerId);
}

export async function publicBill(publicId: string, customerId: number) {
    return knexInstance('vsq_bill_claims').select(billColumns).where({ public_id: publicId, customer_id: customerId }).first();
}

export async function reviewBill(publicId: string, action: string, amount: unknown, note: string, actorId: number) {
    if (!['MARK_SENT', 'GRANT_CREDITS', 'REJECT'].includes(action)) throw new BillError('Invalid review action', 422);
    const amountMinor = action === 'GRANT_CREDITS' ? walletRewardMinor(amount) : null;
    return knexInstance.transaction(async (trx) => {
        const read = await trx('vsq_bill_claims').where({ public_id: publicId }).first();
        if (!read) throw new BillError('Submission not found', 404);
        // Match the existing customer → claim → wallet lock order. All completion
        // writes and ledger/balance changes share this transaction.
        const customer = await trx('vsq_customers').where({ id: read.customer_id }).forUpdate().first();
        const claim = await trx('vsq_bill_claims').where({ id: read.id }).forUpdate().first();
        if (claim.status !== 'PENDING') throw new BillError('This claim has already been processed', 409);
        if ((action === 'MARK_SENT' && claim.reward !== 'CASH') || (action === 'GRANT_CREDITS' && claim.reward !== 'WALLET')) throw new BillError('Action does not match the selected reward', 422);
        if (action === 'GRANT_CREDITS') {
            if (!customer || customer.status !== 'ACTIVE' || customer.deleted_at) throw new BillError('Customer account unavailable', 409);
            await trx('vsq_credit_accounts').insert({ customer_id: customer.id, created_at: new Date(), updated_at: new Date() }).onConflict('customer_id').ignore();
            await trx('vsq_credit_accounts').where({ customer_id: customer.id }).forUpdate().first();
            await trx('vsq_credit_transactions').insert({ public_id: crypto.randomUUID(), customer_id: customer.id,
                type: 'ADMIN_ADJUSTMENT', source: 'BILL_REWARD', pending_delta_minor: 0, available_delta_minor: amountMinor,
                currency: 'INR', idempotency_key: `bill-reward:${claim.public_id}`, description: 'Approved purchase bill reward',
                actor_type: 'ADMIN', actor_id: actorId, metadata: JSON.stringify({ claim_public_id: claim.public_id }), created_at: new Date() });
            await trx('vsq_credit_accounts').where({ customer_id: customer.id }).update({
                available_balance_minor: trx.raw('available_balance_minor + ?', [amountMinor!]), version: trx.raw('version + 1'), updated_at: new Date() });
        }
        const status = action === 'REJECT' ? 'REJECTED' : action === 'MARK_SENT' ? 'SENT' : 'CREDITED';
        await trx('vsq_bill_claims').where({ id: claim.id }).update({ status, granted_amount_minor: amountMinor,
            reviewed_by: actorId, review_note: note.slice(0, 500), reviewed_at: new Date(), updated_at: new Date() });
        return trx('vsq_bill_claims').select(billColumns).where({ id: claim.id }).first();
    });
}
