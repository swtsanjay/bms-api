import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import CommerceReferralController from './controller';

const router = Router();

router.get('/resolve/:code', [
    param('code').trim().matches(/^VSQ[A-Z0-9]{6,17}$/i),
    checkFormValidations
], CommerceReferralController.resolve);
router.post('/claim', commerceCustomerAuth, [
    body('referral_code').trim().matches(/^VSQ[A-Z0-9]{6,17}$/i),
    checkFormValidations
], CommerceReferralController.claim);
router.get('/credits', commerceCustomerAuth, CommerceReferralController.credits);

export default router;
