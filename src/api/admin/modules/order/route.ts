import { Router } from 'express';
import OrderController from './controller';
import { userSaveValidation } from '../../middlewares/form-validation/User';
import { createTransaction } from '../../middlewares/databse/db';

const Routes = Router();

Routes.get('/list', OrderController.list);
Routes.post('/save', createTransaction, OrderController.save);
export default Routes;