import { Router } from 'express';
import AuthController from './controller';

const authRoutes = Router();

authRoutes.post('/login', AuthController.login);

export default authRoutes;
