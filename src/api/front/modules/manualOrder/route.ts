import { Router } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { optionalFrontJWT } from '../../middlewares/jwt-auth';
import { manualOrderSaveValidation } from '../../middlewares/form-validation/ManualOrder';

const router = Router();

router.post('/submit', optionalFrontJWT, createTransaction, manualOrderSaveValidation, Controller.submit);

export default router;
