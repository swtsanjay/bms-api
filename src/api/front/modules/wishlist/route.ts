import { Router } from 'express';
import { body } from 'express-validator';
import WishlistController from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { checkFormValidations } from '../../middlewares/form-validation/express-validator';
import { verifyFrontJWT } from '../../middlewares/jwt-auth';

const router = Router();

router.use(verifyFrontJWT);
router.get('/list', WishlistController.list);
router.post(
    '/save',
    createTransaction,
    [
        body('shopify_product_id').trim().notEmpty().withMessage('Product id is required'),
        checkFormValidations
    ],
    WishlistController.save
);
router.post(
    '/toggle',
    createTransaction,
    [
        body('shopify_product_id').trim().notEmpty().withMessage('Product id is required'),
        checkFormValidations
    ],
    WishlistController.toggle
);

export default router;
