import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import StorefrontMenuController from './controller';

const storefrontMenuRoutes = Router();

storefrontMenuRoutes.get('/', StorefrontMenuController.list);
storefrontMenuRoutes.post('/', createTransaction, StorefrontMenuController.create);
storefrontMenuRoutes.get('/:id', StorefrontMenuController.details);
storefrontMenuRoutes.put('/:id', createTransaction, StorefrontMenuController.update);
storefrontMenuRoutes.delete('/:id', createTransaction, StorefrontMenuController.delete);
storefrontMenuRoutes.get('/:id/pages', StorefrontMenuController.pages);
storefrontMenuRoutes.put('/:id/pages', createTransaction, StorefrontMenuController.replacePages);

export default storefrontMenuRoutes;
