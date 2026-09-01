import { Router } from 'express';
import CommerceCatalogController from './controller';

const router = Router();

router.get('/products', CommerceCatalogController.products);
router.get('/products/:slug', CommerceCatalogController.product);

export default router;
