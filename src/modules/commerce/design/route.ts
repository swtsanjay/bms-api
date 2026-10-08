import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import CommerceCustomerAuthService from '../customer/auth-service';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import { claimDesign, DesignError, submitDesign } from './service';
import { requestEmailVerification, verifyCustomerEmail } from './email-verification';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const attempts = new Map<string, { count: number; until: number }>();
function limit(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = attempts.get(key);
    const entry = !current || current.until < now ? { count: 1, until: now + 60 * 60_000 } : { count: current.count + 1, until: current.until };
    attempts.set(key, entry);
    if (attempts.size > 10000) for (const [name, value] of attempts) if (value.until < now) attempts.delete(name);
    if (entry.count > 20) return res.status(429).json({ success: false, message: 'Please try again later', data: null });
    next();
}
function fail(res: Response, error: unknown) {
    if (error instanceof DesignError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Design request failed', error);
    return res.status(500).json({ success: false, message: 'Unable to process request', data: null });
}
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 2 } }).single('file');
router.post('/submissions', limit, optionalAuth, (req, res, next) => upload(req, res, (error) => {
    if (error) return res.status(error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: 'Upload must be one file up to 15 MB', data: null });
    next();
}), async (req, res) => {
    try {
        if (!req.file) throw new DesignError('Choose a design file', 422);
        if (!['true', 'false'].includes(String(req.body.marketing_permission))) throw new DesignError('Marketing permission choice is required', 422);
        const submission = await submitDesign(req.file, String(req.body.phone || ''), req.body.marketing_permission === 'true', req.commerceCustomer?.id || null);
        return res.status(201).json({ success: true, message: 'Design submitted for review', data: { submission } });
    } catch (error) { return fail(res, error); }
});
router.post('/submissions/:publicId/claim', commerceCustomerAuth, limit, async (req, res) => {
    try {
        const submission = await claimDesign(String(req.params.publicId), String(req.body?.claim_token || ''), Number(req.commerceCustomer!.id));
        return res.json({ success: true, message: 'Design linked to your account', data: { submission } });
    } catch (error) { return fail(res, error); }
});
router.get('/submissions/mine', commerceCustomerAuth, async (req, res) => {
    try {
        const rows = await knexInstance('vsq_design_submissions').select('public_id', 'status', 'marketing_permission', 'created_at', 'rewarded_at')
            .where({ customer_id: req.commerceCustomer!.id }).orderBy('id', 'desc').limit(50);
        return res.json({ success: true, message: 'Designs found', data: { submissions: rows } });
    } catch (error) { return fail(res, error); }
});
router.post('/email-verification/request', commerceCustomerAuth, limit, async (req, res) => {
    try { const result = await requestEmailVerification(Number(req.commerceCustomer!.id)); return res.json({ success: true, message: 'Verification email queued', data: result }); }
    catch (error) { return fail(res, error); }
});
router.post('/email-verification/confirm', limit, async (req, res) => {
    try { const result = await verifyCustomerEmail(String(req.body?.token || '')); return res.json({ success: true, message: 'Email verified', data: result }); }
    catch (error) { return fail(res, error); }
});
export default router;
