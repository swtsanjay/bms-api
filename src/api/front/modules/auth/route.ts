import { Router } from 'express';
import FrontAuthController from './controller';
import { loginValidation, signupValidation } from '../../middlewares/form-validation/User';
import { verifyFrontJWT } from '../../middlewares/jwt-auth';
import { createTransaction } from '../../middlewares/databse/db';

const router = Router();

router.post('/login', loginValidation, FrontAuthController.login);
router.post('/signup', createTransaction, signupValidation, FrontAuthController.signup);
router.post('/logout', verifyFrontJWT, FrontAuthController.logout);

export default router;
