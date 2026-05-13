import { Request as ExpressRequest, Response as ExpressResponse, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../../lib/Messages';
import Response from '../../lib/api-response';
import inquiryRoutes from './modules/inquiry/route';

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

router.use('/inquiry', inquiryRoutes);

export default router;
