import { Router } from 'express';
import AuthController from './controller';
import { emailRateLimit } from '../../../../shared-services/rate-limit';

const authRoutes = Router();

authRoutes.post('/login', emailRateLimit('staff:login', 10, 900), AuthController.login);

export default authRoutes;
