import { Request as ExpressRequest, Response as ExpressResponse, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../../lib/Messages';
import Response from '../../lib/api-response';
import authRoutes from './modules/auth/route';
import inquiryRoutes from './modules/inquiry/route';
import userRoutes from './modules/user/route';
import wishlistRoutes from './modules/wishlist/route';
import collectionRoutes from './modules/collections/route';

const router = Router();

router.all('/status', (req: ExpressRequest, res: ExpressResponse) => {
    Response.success(
        res,
        Message.ok.message,
        {
            headers: req.headers,
            params: req.params,
            query: req.query,
            body: req.body
        },
        StatusCodes.OK
    );
});

router.use('/auth', authRoutes);
router.use('/inquiry', inquiryRoutes);
router.use('/user', userRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/collections', collectionRoutes);

export default router;
