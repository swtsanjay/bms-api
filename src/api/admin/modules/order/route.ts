import { Router } from 'express';
import OrderController from './controller';
import { orderSaveValidation } from '../../middlewares/form-validation/Order';
import { createTransaction } from '../../middlewares/databse/db';

const Routes = Router();

Routes.get('/list', OrderController.list);
Routes.get('/details/:id', OrderController.details);
Routes.post('/save', createTransaction, orderSaveValidation, OrderController.save);
export default Routes;
