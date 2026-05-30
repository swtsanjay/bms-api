import { Router } from 'express';
import FrontStorefrontMenuController from './controller';

const menuRoutes = Router();

menuRoutes.get('/', FrontStorefrontMenuController.list);

export default menuRoutes;
