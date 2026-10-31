import { Router, type Request, type Response, type NextFunction } from 'express';
import CommerceCustomerAuthService from '../customer/auth-service';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import { claimDesign, DesignError, submitDesign } from './service';
import { privateDesignThumbnail } from './service';
import S3Service from '../../../lib/S3Service';
import { requestEmailVerification, verifyCustomerEmail } from './email-verification';
import { createRateLimit, requestIp } from '../../../shared-services/rate-limit';
import crypto from 'node:crypto';
import { guestDesignRateLimitKey, identifyGuestDesign } from './guest-identity';
import { submissionFailure } from '../uploads/errors';
import { privateSubmissionUpload } from '../uploads/multipart';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const submissionLimit = createRateLimit([{ points: 20, durationSeconds: 3600, key: (req) => req.commerceCustomer
    ? `design:submit:customer:${req.commerceCustomer.id}` : `design:submit:guest:${guestDesignRateLimitKey(req) || `ip:${requestIp(req)}`}` }], 'Please try again later');
const claimLimit = createRateLimit([{ points: 20, durationSeconds: 3600, key: (req) => `design:claim:${req.commerceCustomer!.id}` }], 'Please try again later');
const verificationRequestLimit = createRateLimit([{ points: 20, durationSeconds: 3600, key: (req) => `design:email-request:${req.commerceCustomer!.id}` }], 'Please try again later');
const verificationConfirmLimit = createRateLimit([{ points: 20, durationSeconds: 3600, key: (req) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    return `design:email-confirm:${token ? crypto.createHash('sha256').update(token).digest('hex') : `missing:${requestIp(req)}`}`;
} }], 'Please try again later');
function fail(res: Response, error: unknown) { return submissionFailure(res, error, 'design'); }

function optionalAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.get('authorization');
    if (!authorization) return next();
    if (!authorization.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Invalid authentication', data: null });
    try {
        const payload = CommerceCustomerAuthService.verifyAccessToken(authorization.slice(7).trim());
        req.commerceCustomer = { id: Number(payload.id), publicId: payload.public_id, email: payload.email, sessionId: payload.session_id };
        next();
    } catch { return res.status(401).json({ success: false, message: 'Session expired', data: null }); }
}
router.post('/submissions', optionalAuth, identifyGuestDesign, submissionLimit, privateSubmissionUpload('design', 2), async (req, res) => {
    try {
        if (!req.file) throw new DesignError('Choose a design file', 422);
        if (!['true', 'false'].includes(String(req.body.marketing_permission))) throw new DesignError('Marketing permission choice is required', 422);
        const submission = await submitDesign(req.file, String(req.body.phone || ''), req.body.marketing_permission === 'true', req.commerceCustomer?.id || null);
        return res.status(201).json({ success: true, message: 'Design submitted for review', data: { submission } });
    } catch (error) { return fail(res, error); }
});
router.post('/submissions/:publicId/claim', commerceCustomerAuth, claimLimit, async (req, res) => {
    try {
        const submission = await claimDesign(String(req.params.publicId), String(req.body?.claim_token || ''), Number(req.commerceCustomer!.id));
        return res.json({ success: true, message: 'Design linked to your account', data: { submission } });
    } catch (error) { return fail(res, error); }
});
router.get('/submissions/mine', commerceCustomerAuth, async (req, res) => {
    try {
        const page = Number(req.query.page || 1);
        if (!Number.isInteger(page) || page < 1 || page > 10000) throw new DesignError('Invalid page', 422);
        const pageSize = 12;
        const customerId = req.commerceCustomer!.id;
        const [rows, count] = await Promise.all([
            knexInstance('vsq_design_submissions as s').leftJoin('vsq_design_rewards as r', 'r.submission_id', 's.id')
                .select('s.public_id', 's.original_filename', 's.mime_type', 's.status', 's.marketing_permission', 's.created_at', 's.rewarded_at', 's.approved_reward_minor', 'r.amount_minor as issued_amount_minor')
                .where({ 's.customer_id': customerId }).orderBy('s.id', 'desc').limit(pageSize).offset((page - 1) * pageSize),
            knexInstance('vsq_design_submissions').where({ customer_id: customerId }).count('* as total').first()
        ]);
        return res.json({ success: true, message: 'Designs found', data: { submissions: rows, page, page_size: pageSize, total: Number(count?.total || 0) } });
    } catch (error) { return fail(res, error); }
});
router.get('/submissions/:publicId/preview', commerceCustomerAuth, async (req, res) => {
    try {
        const submission = await knexInstance('vsq_design_submissions').where({ public_id: req.params.publicId, customer_id: req.commerceCustomer!.id }).first();
        if (!submission) throw new DesignError('Submission not found', 404);
        const thumbnail = req.query.thumbnail === 'true';
        const url = thumbnail ? await privateDesignThumbnail(submission) : await S3Service.privateDesignReviewUrl(submission.object_key, submission.original_filename, true, submission.mime_type);
        return res.json({ success: true, message: 'Private preview ready', data: { url } });
    } catch (error) { return fail(res, error); }
});
router.post('/email-verification/request', commerceCustomerAuth, verificationRequestLimit, async (req, res) => {
    try { const result = await requestEmailVerification(Number(req.commerceCustomer!.id)); return res.json({ success: true, message: 'Verification email queued', data: result }); }
    catch (error) { return fail(res, error); }
});
router.post('/email-verification/confirm', verificationConfirmLimit, async (req, res) => {
    try { const result = await verifyCustomerEmail(String(req.body?.token || '')); return res.json({ success: true, message: 'Email verified', data: result }); }
    catch (error) { return fail(res, error); }
});
export default router;
