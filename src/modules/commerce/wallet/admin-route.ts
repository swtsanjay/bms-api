import { Router } from 'express';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import { generatePackageCodes, giftDenominations, packageCodeForAdmin, requestGiftRefund, saveGiftDenomination, WalletError } from './service';
import { renderPackageCard } from './package-card';
import { ADMIN_LIST_PAGE_SIZE, adminListPageInfo, parseAdminListPage } from '../admin/list-pagination';

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
    try { const codes = await generatePackageCodes(Number(req.body?.amount_minor), Number(req.body?.count), Number((req as any).user.id)); return res.status(201).json({ success: true, message: 'Codes generated. Export or reveal them from the package code list.', data: { codes } }); }
    catch (error) { return fail(res, error); }
});
router.get('/codes', async (req, res) => {
    try {
        const requestedPage = Number(req.query.page || 1);
        const page = Number.isSafeInteger(requestedPage) ? Math.min(1_000_000, Math.max(1, requestedPage)) : 1;
        const pageSize = 20;
        const [count, codes] = await Promise.all([
            knexInstance('vsq_wallet_codes').count({ total: 'id' }).first(),
            knexInstance('vsq_wallet_codes as c').leftJoin('vsq_customers as r', 'r.id', 'c.redeemed_by_customer_id')
        .select('c.public_id', 'c.kind', 'c.amount_minor', 'c.status', 'c.redeemed_at', 'c.created_at', 'r.email as redeemed_by_email')
        .select(knexInstance.raw('CASE WHEN c.encrypted_code IS NULL THEN 0 ELSE 1 END AS recoverable'))
                .orderBy('c.id', 'desc').limit(pageSize).offset((page - 1) * pageSize),
        ]);
        return res.json({ success: true, data: { codes, total: Number(count?.total || 0), page, page_size: pageSize } });
    }
    catch (error) { return fail(res, error); }
});
async function auditPackageCodeAccess(req: any, codePublicId: string, action: string) {
    await knexInstance('vsq_commerce_audit_logs').insert({ actor_type: 'ADMIN', actor_id: Number(req.user.id), action,
        entity_type: 'PACKAGE_CODE', entity_id: codePublicId, ip_address: req.ip || null, created_at: new Date() });
}
router.post('/codes/:publicId/reveal', async (req, res) => {
    try {
        const code = await packageCodeForAdmin(String(req.params.publicId));
        await auditPackageCodeAccess(req, code.public_id, 'PACKAGE_CODE_REVEALED');
        return res.json({ success: true, data: code });
    } catch (error) { return fail(res, error); }
});
router.get('/codes/:publicId/card', async (req, res) => {
    try {
        const code = await packageCodeForAdmin(String(req.params.publicId));
        const pdf = await renderPackageCard(code.code, code.amount_minor);
        await auditPackageCodeAccess(req, code.public_id, 'PACKAGE_CODE_CARD_DOWNLOADED');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="vastriqo-package-card-${code.public_id}.pdf"`);
        return res.send(pdf);
    } catch (error) { return fail(res, error); }
});
router.get('/purchases', async (req, res) => {
    try {
        const page = parseAdminListPage(req.query.page);
        if (page === null) throw new WalletError('Page must be a positive integer no greater than 100000', 422);
        const [count, purchases] = await Promise.all([
            knexInstance('vsq_gift_purchases').count({ total: 'id' }).first(),
            knexInstance('vsq_gift_purchases as p').join('vsq_customers as c', 'c.id', 'p.buyer_customer_id').leftJoin('vsq_wallet_codes as code', 'code.purchase_id', 'p.id')
                .select('p.public_id', 'p.amount_minor', 'p.status', 'p.paid_at', 'p.provider_refund_id', 'p.created_at', 'c.email as buyer_email', 'code.status as code_status')
                .orderBy('p.created_at', 'desc').orderBy('p.id', 'desc')
                .limit(ADMIN_LIST_PAGE_SIZE).offset((page - 1) * ADMIN_LIST_PAGE_SIZE)
        ]);
        return res.json({ success: true, data: { purchases, ...adminListPageInfo(page, Number(count?.total || 0)) } });
    }
    catch (error) { return fail(res, error); }
});
router.post('/purchases/:publicId/refund', async (req, res) => {
    try { const result = await requestGiftRefund(String(req.params.publicId), String(req.body?.reason || 'Gift purchase cancelled')); return res.json({ success: true, message: 'Refund requested for an unused code', data: result }); }
    catch (error) { return fail(res, error); }
});
export default router;
