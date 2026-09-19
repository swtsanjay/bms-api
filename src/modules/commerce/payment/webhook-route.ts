import { Router } from 'express';
import RazorpayWebhookController from './webhook-controller';

const router = Router();

router.post('/', RazorpayWebhookController.receive);

export default router;
