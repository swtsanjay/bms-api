import { Router } from 'express';
import FrontStorefrontPageController from './controller';

const pageRoutes = Router();

pageRoutes.get('/', FrontStorefrontPageController.list);
pageRoutes.get('/:slug', FrontStorefrontPageController.details);

export default pageRoutes;
