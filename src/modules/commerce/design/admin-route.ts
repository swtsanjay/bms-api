import { Router } from 'express';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import S3Service from '../../../lib/S3Service';
import { DesignError, reviewDesign } from './service';

const router = Router();
router.use(requireCommerceAdmin);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
function fail(res: any, error: unknown) {
    if (error instanceof DesignError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Admin design request failed', error);
    return res.status(500).json({ success: false, message: 'Unable to process design', data: null });
}
router.get('/', async (req, res) => {
    try {
        const status = String(req.query.status || 'PENDING');
        if (!['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(status)) throw new DesignError('Invalid status');
        const query = knexInstance('vsq_design_submissions as s').leftJoin('vsq_customers as c', 'c.id', 's.customer_id')
            .select('s.public_id', 's.phone', 's.original_filename', 's.mime_type', 's.byte_size', 's.marketing_permission', 's.status', 's.claimed_at', 's.rewarded_at', 's.review_note', 's.created_at', 'c.email as customer_email')
            .orderBy('s.id', 'desc').limit(100);
        if (status !== 'ALL') query.where('s.status', status);
        return res.json({ success: true, message: 'Designs found', data: { submissions: await query } });
    } catch (error) { return fail(res, error); }
});
router.get('/:publicId/file', async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const url = await S3Service.privateDesignReviewUrl(submission.object_key, submission.original_filename);
        return res.json({ success: true, message: 'Private review link ready', data: { url } });
    } catch (error) { return fail(res, error); }
});
router.get('/:publicId/events', async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const events = await knexInstance('vsq_design_review_events').where({ submission_id: submission.id }).orderBy('id', 'asc');
        return res.json({ success: true, message: 'Review history found', data: { events } });
    } catch (error) { return fail(res, error); }
});
router.post('/:publicId/review', async (req, res) => {
    try {
        const status = String(req.body?.status || '');
        if (status !== 'APPROVED' && status !== 'REJECTED') throw new DesignError('Choose approve or reject');
        const result = await reviewDesign(String(req.params.publicId), status, String(req.body?.note || ''), Number((req as any).user.id));
        return res.json({ success: true, message: 'Review saved', data: { submission: result } });
    } catch (error) { return fail(res, error); }
});
export default router;
