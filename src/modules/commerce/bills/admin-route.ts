import { Router, type Response } from 'express';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import { ADMIN_LIST_PAGE_SIZE, adminListPageInfo, parseAdminListPage } from '../admin/list-pagination';
import S3Service from '../../../lib/S3Service';
import { BillError, billColumns, reviewBill } from './service';
import { submissionFailure } from '../uploads/errors';

function billFailure(res: Response, error: unknown) { return submissionFailure(res, error, 'bill'); }

const router = Router();
router.use(requireCommerceAdmin);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/', async (req, res) => {
    try {
        const status = String(req.query.status || 'PENDING');
        if (!['PENDING', 'SENT', 'CREDITED', 'REJECTED', 'ALL'].includes(status)) throw new BillError('Invalid status', 422);
        const page = parseAdminListPage(req.query.page);
        if (page === null) throw new BillError('Invalid page', 422);
        const base = knexInstance('vsq_bill_claims as s');
        if (status !== 'ALL') base.where('s.status', status);
        const [count, submissions] = await Promise.all([
            base.clone().count('* as total').first(),
            base.clone().join('vsq_customers as c', 'c.id', 's.customer_id').leftJoin('users as u', 'u.id', 's.reviewed_by')
                .select(billColumns.map((column) => `s.${column}`)).select('c.first_name', 'c.last_name', 'c.email as customer_email', 'c.phone', 'c.public_id as customer_public_id', 'u.name as reviewer_name', 'u.email as reviewer_email')
                .orderBy('s.created_at', 'desc').orderBy('s.id', 'desc').limit(ADMIN_LIST_PAGE_SIZE).offset((page - 1) * ADMIN_LIST_PAGE_SIZE)
        ]);
        return res.json({ success: true, data: { submissions, ...adminListPageInfo(page, Number(count?.total || 0)) } });
    } catch (error) { return billFailure(res, error); }
});
router.get('/:publicId/file', async (req, res) => {
    try {
        const claim = await knexInstance('vsq_bill_claims').where({ public_id: req.params.publicId }).first();
        if (!claim) throw new BillError('Submission not found', 404);
        const url = await S3Service.privateDesignReviewUrl(claim.object_key, claim.original_filename, true, claim.mime_type);
        return res.json({ success: true, data: { url } });
    } catch (error) { return billFailure(res, error); }
});
router.post('/:publicId/review', async (req, res) => {
    try {
        const submission = await reviewBill(String(req.params.publicId), String(req.body?.action || ''), req.body?.reward_rupees, String(req.body?.note || ''), Number((req as any).user.id));
        return res.json({ success: true, message: 'Review saved', data: { submission } });
    } catch (error) { return billFailure(res, error); }
});
export default router;
