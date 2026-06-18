import { Router } from 'express';
import NewsletterController from './controller';

const newsletterRoutes = Router();

newsletterRoutes.post('/subscribe', NewsletterController.subscribe);

export default newsletterRoutes;
