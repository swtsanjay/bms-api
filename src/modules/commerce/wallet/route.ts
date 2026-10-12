import { Router, type Response } from 'express';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import { giftDenominations, giftPurchaseForBuyer, redeemWalletCode, startGiftPurchase, verifyGiftPurchase, WalletError } from './service';
import { createRateLimit } from '../../../shared-services/rate-limit';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const redeemLimit = createRateLimit([{ points: 10, durationSeconds: 3600, key: (req) => `wallet:redeem:${req.commerceCustomer!.id}` }], 'Too many attempts. Please try later.');
function fail(res: Response, error: unknown) {
    if (error instanceof WalletError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Wallet request failed', error);
    return res.status(500).json({ success: false, message: 'Wallet request failed', data: null });
}
router.get('/denominations', async (_req, res) => {
    try { return res.json({ success: true, data: { denominations: (await giftDenominations()).filter((row) => row.active) } }); }
    catch (error) { return fail(res, error); }
});
router.use(commerceCustomerAuth);
router.post('/redeem', redeemLimit, async (req, res) => {
    try { const redemption = await redeemWalletCode(Number(req.commerceCustomer!.id), String(req.body?.code || '')); return res.json({ success: true, message: 'Credits added to your wallet', data: { redemption } }); }
    catch (error) { return fail(res, error); }
});
router.post('/gift-purchases', async (req, res) => {
    try { const purchase = await startGiftPurchase(Number(req.commerceCustomer!.id), Number(req.body?.denomination_id), String(req.get('idempotency-key') || '')); return res.status(201).json({ success: true, message: 'Gift purchase ready', data: { purchase } }); }
    catch (error) { return fail(res, error); }
});
router.post('/gift-purchases/:publicId/verify', async (req, res) => {
    try { const purchase = await verifyGiftPurchase(String(req.params.publicId), Number(req.commerceCustomer!.id), String(req.body?.razorpay_payment_id || ''), String(req.body?.razorpay_signature || '')); return res.json({ success: true, message: 'Gift purchase verified', data: { purchase } }); }
    catch (error) { return fail(res, error); }
});
router.get('/gift-purchases/:publicId', async (req, res) => {
    try { const purchase = await giftPurchaseForBuyer(String(req.params.publicId), Number(req.commerceCustomer!.id)); return res.json({ success: true, message: 'Gift purchase found', data: { purchase } }); }
    catch (error) { return fail(res, error); }
});
export default router;
