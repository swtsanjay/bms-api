import { Router } from 'express';
import Controller from './controller';
import { transactionSaveValidation } from '../../middlewares/form-validation/Transactions';
import { createTransaction } from '../../middlewares/databse/db';

const transactionRoutes = Router();

transactionRoutes.get('/list', Controller.list);
transactionRoutes.post('/save', createTransaction, transactionSaveValidation, Controller.save);
export default transactionRoutes;