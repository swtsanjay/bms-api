import { Router } from 'express';
import UserController from './controller';
import { userChangePasswordValidation, userDeleteValidation, userSaveValidation } from '../../middlewares/form-validation/User';
import { createTransaction } from '../../middlewares/databse/db';

const appUserRoutes = Router();

appUserRoutes.get('/list', UserController.list);
appUserRoutes.post('/save', createTransaction, userSaveValidation, UserController.updateProfile);
appUserRoutes.post('/create', createTransaction, userSaveValidation, UserController.createUser);
appUserRoutes.post('/delete', createTransaction, userDeleteValidation, UserController.delete);
appUserRoutes.post('/change-password', createTransaction, userChangePasswordValidation, UserController.changePassword);
export default appUserRoutes;
