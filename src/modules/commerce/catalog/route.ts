import { Router } from 'express';
import CommerceCatalogController from './controller';

const router = Router();

router.get('/products', CommerceCatalogController.products);
router.get('/products/sitemap', CommerceCatalogController.sitemapProducts);
router.get('/products/by-id/:publicId', CommerceCatalogController.productById);
router.get('/products/related/:publicId', CommerceCatalogController.relatedProducts);
router.get('/products/:slug', CommerceCatalogController.product);

export default router;
