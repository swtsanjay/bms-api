import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import AdminWalletController from './controller';
import { requireStaffRoles } from '../../middlewares/jwt-auth';

const walletRoutes = Router();

walletRoutes.get('/settings', AdminWalletController.settings);
walletRoutes.post('/settings', requireStaffRoles('ADMIN'), createTransaction, AdminWalletController.saveSettings);

export default walletRoutes;
