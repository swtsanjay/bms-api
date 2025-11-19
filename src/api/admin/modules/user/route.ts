import { Router } from 'express';
import UserController from './controller';
import { userSaveValidation } from '../../middlewares/form-validation/User';
import { createTransaction } from '../../middlewares/databse/db';

const appUserRoutes = Router();

appUserRoutes.get('/list', UserController.list);
appUserRoutes.post('/save', createTransaction, userSaveValidation, UserController.updateProfile);
export default appUserRoutes;