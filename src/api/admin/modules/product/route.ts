import { Router } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { productChildDeleteValidation, productSaveValidation } from '../../middlewares/form-validation/Product';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const productRoutes = Router();

productRoutes.get('/list', Controller.list);
productRoutes.get('/details/:id', Controller.details);
productRoutes.post('/save', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, productSaveValidation, Controller.save);
productRoutes.post('/delete-size', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, productChildDeleteValidation, Controller.deleteSize);
productRoutes.post('/delete-image', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, productChildDeleteValidation, Controller.deleteImage);
productRoutes.post('/delete-color', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, productChildDeleteValidation, Controller.deleteColor);
productRoutes.post('/archive', requireStaffRoles('ADMIN', 'EMPLOYEE'), createTransaction, Controller.archive);

export default productRoutes;
