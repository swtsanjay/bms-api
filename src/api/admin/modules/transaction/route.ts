import { Router } from 'express';
import Controller from './controller';
import { transactionSaveValidation } from '../../middlewares/form-validation/Transactions';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const transactionRoutes = Router();

transactionRoutes.get('/list', Controller.list);
transactionRoutes.post('/save', requireStaffRoles('ADMIN'), createTransaction, transactionSaveValidation, Controller.save);
transactionRoutes.post('/delete', requireStaffRoles('ADMIN'), createTransaction, Controller.delete);
export default transactionRoutes;
