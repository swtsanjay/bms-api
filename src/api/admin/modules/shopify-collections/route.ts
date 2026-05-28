import { Router } from 'express';
import { createTransaction } from '../../middlewares/databse/db';
import ShopifyCollectionsController from './controller';

export const shopifyRoutes = Router();
export const shopifyCategoryRoutes = Router();

shopifyRoutes.post('/sync', ShopifyCollectionsController.sync);
shopifyRoutes.post('/sync/:shopifyProductId', ShopifyCollectionsController.syncOne);
shopifyRoutes.get('/products', ShopifyCollectionsController.products);

shopifyCategoryRoutes.get('/', ShopifyCollectionsController.categories);
shopifyCategoryRoutes.post('/', createTransaction, ShopifyCollectionsController.createCategory);
shopifyCategoryRoutes.get('/slug/:slug', ShopifyCollectionsController.categoryBySlug);
shopifyCategoryRoutes.get('/:id', ShopifyCollectionsController.category);
shopifyCategoryRoutes.put('/:id', createTransaction, ShopifyCollectionsController.updateCategory);
shopifyCategoryRoutes.delete('/:id', createTransaction, ShopifyCollectionsController.deleteCategory);
shopifyCategoryRoutes.get('/:id/products', ShopifyCollectionsController.categoryProducts);
shopifyCategoryRoutes.post('/:id/products', createTransaction, ShopifyCollectionsController.addCategoryProducts);
shopifyCategoryRoutes.delete('/:id/products/:shopifyProductId', createTransaction, ShopifyCollectionsController.removeCategoryProduct);
shopifyCategoryRoutes.put('/:id/products/reorder', createTransaction, ShopifyCollectionsController.reorderCategoryProducts);
