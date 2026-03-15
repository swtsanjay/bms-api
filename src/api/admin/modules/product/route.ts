import { Router } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { productChildDeleteValidation, productSaveValidation } from '../../middlewares/form-validation/Product';

const productRoutes = Router();

productRoutes.get('/list', Controller.list);
productRoutes.get('/details/:id', Controller.details);
productRoutes.post('/save', createTransaction, productSaveValidation, Controller.save);
productRoutes.post('/delete-size', createTransaction, productChildDeleteValidation, Controller.deleteSize);
productRoutes.post('/delete-image', createTransaction, productChildDeleteValidation, Controller.deleteImage);
productRoutes.post('/delete-color', createTransaction, productChildDeleteValidation, Controller.deleteColor);

export default productRoutes;
