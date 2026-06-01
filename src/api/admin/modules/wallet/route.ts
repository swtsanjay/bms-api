import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import AdminWalletController from './controller';

const walletRoutes = Router();

walletRoutes.get('/settings', AdminWalletController.settings);
walletRoutes.post('/settings', createTransaction, AdminWalletController.saveSettings);

export default walletRoutes;
