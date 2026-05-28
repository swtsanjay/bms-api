import { Router } from 'express';
import CollectionController from './controller';

const collectionRoutes = Router();

collectionRoutes.get('/:slug', CollectionController.details);

export default collectionRoutes;
