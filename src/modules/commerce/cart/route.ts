import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import CommerceCartController from './controller';

const router = Router();

router.post('/', CommerceCartController.create);
router.get('/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceCartController.get);
router.post('/:publicId/items', [
    param('publicId').isUUID(),
    body('variant_public_id').isUUID().withMessage('Variant id is invalid'),
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    checkFormValidations
], CommerceCartController.addItem);
router.patch('/:publicId/items/:itemId', [
    param('publicId').isUUID(),
    param('itemId').isInt({ min: 1 }),
    body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
    checkFormValidations
], CommerceCartController.updateItem);
router.delete('/:publicId/items/:itemId', [
    param('publicId').isUUID(),
    param('itemId').isInt({ min: 1 }),
    checkFormValidations
], CommerceCartController.removeItem);

export default router;
