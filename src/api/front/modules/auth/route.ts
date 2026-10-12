import { Router } from 'express';
import FrontAuthController from './controller';
import { loginValidation, signupValidation } from '../../middlewares/form-validation/User';
import { verifyFrontJWT } from '../../middlewares/jwt-auth';
import { createTransaction } from '../../middlewares/databse/db';
import { emailRateLimit } from '../../../../shared-services/rate-limit';

const router = Router();

router.post('/login', emailRateLimit('legacy-front:login', 10, 900), loginValidation, FrontAuthController.login);
router.post('/signup', createTransaction, signupValidation, FrontAuthController.signup);
router.post('/logout', verifyFrontJWT, FrontAuthController.logout);

export default router;
