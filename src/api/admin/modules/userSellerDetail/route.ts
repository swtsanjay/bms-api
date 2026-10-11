import { Router } from 'express';
import Controller from './controller';
import { userSellerDetailSaveValidation } from '../../middlewares/form-validation/UserSellerDetail';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const routes = Router();

routes.get('/list', Controller.list);
routes.get('/details/:id', Controller.details);
routes.post('/save', requireStaffRoles('ADMIN'), createTransaction, userSellerDetailSaveValidation, Controller.save);
routes.post('/delete', requireStaffRoles('ADMIN'), createTransaction, Controller.delete);

export default routes;
