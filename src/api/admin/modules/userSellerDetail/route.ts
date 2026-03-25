import { Router } from 'express';
import Controller from './controller';
import { userSellerDetailSaveValidation } from '../../middlewares/form-validation/UserSellerDetail';
import { createTransaction } from '../../middlewares/databse/db';

const routes = Router();

routes.get('/list', Controller.list);
routes.get('/details/:id', Controller.details);
routes.post('/save', createTransaction, userSellerDetailSaveValidation, Controller.save);
routes.post('/delete', createTransaction, Controller.delete);

export default routes;
