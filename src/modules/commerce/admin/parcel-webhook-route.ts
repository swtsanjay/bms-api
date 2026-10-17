import crypto from 'crypto';
import { Router } from 'express';
import { receiveShiprocketTracking } from './shiprocket-service';

const router = Router();
router.post('/', async (req, res) => {
    const configured = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    const received = req.get('x-api-key') || '';
    if (!configured || !received || !crypto.timingSafeEqual(
        crypto.createHash('sha256').update(configured).digest(),
        crypto.createHash('sha256').update(received).digest()
    )) return res.status(401).json({ success: false });
    try {
        const matched = await receiveShiprocketTracking(req.body);
        if (!matched) return res.status(404).json({ success: false, message: 'Shipment not found' });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Parcel tracking webhook failed', error);
        return res.status(500).json({ success: false });
    }
});
export default router;
