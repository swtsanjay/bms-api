import { Router } from 'express';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import S3Service from '../../../lib/S3Service';
import { DesignError, privateDesignThumbnail, reviewDesign } from './service';

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
            .leftJoin('users as u', 'u.id', 's.reviewed_by').leftJoin('vsq_design_rewards as r', 'r.submission_id', 's.id')
            .select('s.public_id', 's.customer_id', 's.phone', 's.original_filename', 's.mime_type', 's.byte_size', 's.marketing_permission', 's.status', 's.claimed_at', 's.rewarded_at', 's.review_note', 's.reviewed_at', 's.approved_reward_minor', 's.created_at', 'c.first_name', 'c.last_name', 'c.email as customer_email', 'c.email_verified_at', 'u.name as reviewer_name', 'u.email as reviewer_email', 'r.amount_minor as issued_amount_minor')
            .select(knexInstance.raw('(SELECT candidate.id FROM vsq_design_submissions candidate WHERE candidate.customer_id = s.customer_id ORDER BY candidate.created_at ASC, candidate.id ASC LIMIT 1) = s.id AS is_first_design'))
            .orderBy('s.id', 'desc').limit(100);
        if (status !== 'ALL') query.where('s.status', status);
        return res.json({ success: true, message: 'Designs found', data: { submissions: await query } });
    } catch (error) { return fail(res, error); }
});
router.get('/:publicId/file', async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const url = await S3Service.privateDesignReviewUrl(submission.object_key, submission.original_filename, req.query.inline === 'true', submission.mime_type);
        return res.json({ success: true, message: 'Private review link ready', data: { url } });
    } catch (error) { return fail(res, error); }
});
router.get('/:publicId/thumbnail', async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const url = await privateDesignThumbnail(submission);
        return res.json({ success: true, message: 'Private thumbnail ready', data: { url } });
    } catch (error) { return fail(res, error); }
});
router.get('/:publicId/events', async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const events = await knexInstance('vsq_design_review_events as e').leftJoin('users as u', 'u.id', 'e.actor_id')
            .select('e.id', 'e.from_status', 'e.to_status', 'e.note', 'e.created_at', 'u.name as actor_name', 'u.email as actor_email')
            .where({ 'e.submission_id': submission.id }).orderBy('e.id', 'asc');
        return res.json({ success: true, message: 'Review history found', data: { events } });
    } catch (error) { return fail(res, error); }
});
router.post('/:publicId/review', async (req, res) => {
    try {
        const status = String(req.body?.status || '');
        if (status !== 'APPROVED' && status !== 'REJECTED') throw new DesignError('Choose approve or reject');
        const result = await reviewDesign(String(req.params.publicId), status, String(req.body?.note || ''), Number((req as any).user.id), req.body?.reward_rupees);
        return res.json({ success: true, message: 'Review saved', data: { submission: result } });
    } catch (error) { return fail(res, error); }
});
export default router;
