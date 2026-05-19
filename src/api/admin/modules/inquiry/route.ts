import { Router } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import {
    inquiryDetailsValidation,
    inquiryStatusValidation
} from '../../middlewares/form-validation/Inquiry';

const inquiryAdminRoutes = Router();

inquiryAdminRoutes.get('/list', Controller.list);
inquiryAdminRoutes.get('/details/:id', inquiryDetailsValidation, Controller.details);
inquiryAdminRoutes.post('/update-status', createTransaction, inquiryStatusValidation, Controller.updateStatus);

export default inquiryAdminRoutes;
