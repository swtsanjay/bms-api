import { Router } from 'express';
import Controller from './controller';
import { categorySaveValidation } from '../../middlewares/form-validation/Category';
import { createTransaction } from '../../middlewares/databse/db';

const categoryRoutes = Router();

categoryRoutes.get('/list', Controller.list);
categoryRoutes.post('/save', createTransaction, categorySaveValidation, Controller.save);
export default categoryRoutes;