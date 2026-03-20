import { Router } from 'express';
import IotController from './controller';
import { createTransaction } from '../../middlewares/databse/db';

const iotRoutes = Router();

iotRoutes.post('/save', createTransaction, IotController.save);

export default iotRoutes;
