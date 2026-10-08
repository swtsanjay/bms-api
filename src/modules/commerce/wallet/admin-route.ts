import { Router } from 'express';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import { generatePackageCodes, giftDenominations, requestGiftRefund, saveGiftDenomination, WalletError } from './service';

const router = Router();
router.use(requireCommerceAdmin);
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
function fail(res: any, error: unknown) {
    if (error instanceof WalletError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Admin wallet request failed', error);
    return res.status(500).json({ success: false, message: 'Wallet request failed', data: null });
}
router.get('/denominations', async (_req, res) => {
    try { return res.json({ success: true, data: { denominations: await giftDenominations() } }); }
    catch (error) { return fail(res, error); }
});
router.post('/denominations', async (req, res) => {
    try { const denominations = await saveGiftDenomination(Number(req.body?.amount_minor), req.body?.active === true); return res.json({ success: true, data: { denominations } }); }
    catch (error) { return fail(res, error); }
});
router.post('/package-codes', async (req, res) => {
    try { const codes = await generatePackageCodes(Number(req.body?.amount_minor), Number(req.body?.count), Number((req as any).user.id)); return res.status(201).json({ success: true, message: 'Copy or export these codes now; they cannot be shown again', data: { codes } }); }
    catch (error) { return fail(res, error); }
});
router.get('/codes', async (_req, res) => {
    try { const codes = await knexInstance('vsq_wallet_codes as c').leftJoin('vsq_customers as r', 'r.id', 'c.redeemed_by_customer_id')
        .select('c.public_id', 'c.kind', 'c.amount_minor', 'c.status', 'c.redeemed_at', 'c.created_at', 'r.email as redeemed_by_email')
        .orderBy('c.id', 'desc').limit(100); return res.json({ success: true, data: { codes } }); }
    catch (error) { return fail(res, error); }
});
router.get('/purchases', async (_req, res) => {
    try { const purchases = await knexInstance('vsq_gift_purchases as p').join('vsq_customers as c', 'c.id', 'p.buyer_customer_id').leftJoin('vsq_wallet_codes as code', 'code.purchase_id', 'p.id')
        .select('p.public_id', 'p.amount_minor', 'p.status', 'p.paid_at', 'p.provider_refund_id', 'p.created_at', 'c.email as buyer_email', 'code.status as code_status')
        .orderBy('p.id', 'desc').limit(100); return res.json({ success: true, data: { purchases } }); }
    catch (error) { return fail(res, error); }
});
router.post('/purchases/:publicId/refund', async (req, res) => {
    try { const result = await requestGiftRefund(String(req.params.publicId), String(req.body?.reason || 'Gift purchase cancelled')); return res.json({ success: true, message: 'Refund requested for an unused code', data: result }); }
    catch (error) { return fail(res, error); }
});
export default router;
