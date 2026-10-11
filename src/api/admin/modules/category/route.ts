import { Router } from 'express';
import Controller from './controller';
import { categorySaveValidation } from '../../middlewares/form-validation/Category';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const categoryRoutes = Router();

categoryRoutes.get('/list', Controller.list);
categoryRoutes.post('/save', requireStaffRoles('ADMIN'), createTransaction, categorySaveValidation, Controller.save);
export default categoryRoutes;
