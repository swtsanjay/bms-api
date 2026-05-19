import { Router } from 'express';
import FrontUserController from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { verifyFrontJWT } from '../../middlewares/jwt-auth';
import { profileUpdateValidation } from '../../middlewares/form-validation/User';

const router = Router();

router.use(verifyFrontJWT);
router.get('/profile', FrontUserController.profile);
router.post('/profile', createTransaction, profileUpdateValidation, FrontUserController.updateProfile);

export default router;
