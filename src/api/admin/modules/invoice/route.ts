import { Router } from 'express';
import InvoiceController from './controller';
import { invoiceSaveValidation } from '../../middlewares/form-validation/Invoice';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const Routes = Router();

Routes.get('/list', InvoiceController.list);
Routes.get('/details/:id', InvoiceController.details);
Routes.get('/invoice-data/:id', InvoiceController.invoiceData);
Routes.post('/save', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, invoiceSaveValidation, InvoiceController.save);

export default Routes;
