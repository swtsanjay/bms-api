import { Router } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import {
    inquiryDetailsValidation,
    inquiryStatusValidation
} from '../../middlewares/form-validation/Inquiry';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const inquiryAdminRoutes = Router();

inquiryAdminRoutes.get('/list', Controller.list);
inquiryAdminRoutes.get('/details/:id', inquiryDetailsValidation, Controller.details);
inquiryAdminRoutes.post('/update-status', requireStaffRoles('ADMIN', 'EMPLOYEE', 'SALES_MAN'), inquiryStatusValidation, createTransaction, Controller.updateStatus);
inquiryAdminRoutes.post('/assign', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, Controller.assign);

export default inquiryAdminRoutes;
