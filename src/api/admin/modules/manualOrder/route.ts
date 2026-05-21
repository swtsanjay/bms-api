import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import {
    manualOrderDetailsValidation,
    manualOrderStatusValidation
} from '../../middlewares/form-validation/ManualOrder';
import Controller from './controller';

const manualOrderAdminRoutes = Router();

manualOrderAdminRoutes.get('/list', Controller.list);
manualOrderAdminRoutes.get('/details/:id', manualOrderDetailsValidation, Controller.details);
manualOrderAdminRoutes.post('/update-status', createTransaction, manualOrderStatusValidation, Controller.updateStatus);

export default manualOrderAdminRoutes;
