import { Router, type Response } from 'express';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import S3Service from '../../../lib/S3Service';
import { BillError, billColumns, submitBill } from './service';
import { submissionFailure } from '../uploads/errors';
import { privateSubmissionUpload } from '../uploads/multipart';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.use(commerceCustomerAuth);
function billFailure(res: Response, error: unknown) { return submissionFailure(res, error, 'bill'); }
router.post('/submissions', privateSubmissionUpload('bill', 3), async (req, res) => {
    try {
        if (!req.file) throw new BillError('Choose your purchase bill', 422);
        const submission = await submitBill(req.file, String(req.body.reward || ''), String(req.body.upi_id || ''), String(req.body.request_id || ''), req.commerceCustomer!.id);
        return res.status(201).json({ success: true, message: 'Bill submitted. Your reward is pending admin verification.', data: { submission } });
    } catch (error) { return billFailure(res, error); }
});
router.get('/submissions/mine', async (req, res) => {
    try {
        const page = Number(req.query.page || 1);
        if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BillError('Invalid page', 422);
        const customerId = req.commerceCustomer!.id;
        const [submissions, count] = await Promise.all([
            knexInstance('vsq_bill_claims').select(billColumns).where({ customer_id: customerId }).orderBy('id', 'desc').limit(12).offset((page - 1) * 12),
            knexInstance('vsq_bill_claims').where({ customer_id: customerId }).count('* as total').first()
        ]);
        return res.json({ success: true, data: { submissions, page, page_size: 12, total: Number(count?.total || 0) } });
    } catch (error) { return billFailure(res, error); }
});
router.get('/submissions/:publicId/preview', async (req, res) => {
    try {
        const claim = await knexInstance('vsq_bill_claims').where({ public_id: req.params.publicId, customer_id: req.commerceCustomer!.id }).first();
        if (!claim) throw new BillError('Submission not found', 404);
        const url = await S3Service.privateDesignReviewUrl(claim.object_key, claim.original_filename, true, claim.mime_type);
        return res.json({ success: true, data: { url } });
    } catch (error) { return billFailure(res, error); }
});
export default router;
