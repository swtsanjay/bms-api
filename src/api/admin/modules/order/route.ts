import { Router } from 'express';
import OrderController from './controller';
import { orderSaveValidation } from '../../middlewares/form-validation/Order';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const Routes = Router();

Routes.get('/list', OrderController.list);
Routes.get('/details/:id', OrderController.details);
Routes.post('/save', requireStaffRoles('ADMIN', 'EMPLOYEE', 'SALES_MAN'), orderSaveValidation, createTransaction, OrderController.save);
Routes.post('/:id/assign', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, OrderController.assign);
Routes.post('/:id/finalize', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, OrderController.finalize);
export default Routes;
