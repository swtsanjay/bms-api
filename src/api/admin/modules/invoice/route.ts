import { Router } from 'express';
import InvoiceController from './controller';
import { invoiceSaveValidation } from '../../middlewares/form-validation/Invoice';
import { createTransaction } from '../../middlewares/databse/db';

const Routes = Router();

Routes.get('/list', InvoiceController.list);
Routes.get('/details/:id', InvoiceController.details);
Routes.get('/invoice-data/:id', InvoiceController.invoiceData);
Routes.post('/save', createTransaction, invoiceSaveValidation, InvoiceController.save);

export default Routes;
