import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import StorefrontPageController from './controller';

const storefrontPageRoutes = Router();

storefrontPageRoutes.get('/', StorefrontPageController.list);
storefrontPageRoutes.post('/', createTransaction, StorefrontPageController.create);
storefrontPageRoutes.get('/:id', StorefrontPageController.details);
storefrontPageRoutes.put('/:id', createTransaction, StorefrontPageController.update);
storefrontPageRoutes.delete('/:id', createTransaction, StorefrontPageController.delete);
storefrontPageRoutes.get('/:id/items', StorefrontPageController.items);
storefrontPageRoutes.put('/:id/items', createTransaction, StorefrontPageController.replaceItems);

export default storefrontPageRoutes;
