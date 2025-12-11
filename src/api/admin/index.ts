import { Request as ExpressRequest, Response as ExpressResponse, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../../lib/Messages';
import Response from '../../lib/api-response';
import appUserRoutes from './modules/user/route';
import orderRoutes from './modules/order/route';
import fileRoutes from './modules/file/route';

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


router.use('/user', appUserRoutes);
router.use('/order', orderRoutes);
router.use('/file', fileRoutes);

export default router;