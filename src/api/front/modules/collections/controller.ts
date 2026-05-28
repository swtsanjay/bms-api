import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedShopifyCollectionService from '../../../../shared-services/shopifyCollection';

export default class CollectionController {
    static async details(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { category, products, extra } = await SharedShopifyCollectionService.getCollectionBySlug(
                req.params.slug,
                { ...req.query }
            );

            Response.success(res, {
                data: {
                    category,
                    products
                },
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error) {
                Response.fail(res, error as GError);
                return;
            }

            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotFound.message,
                    code: StatusCodes.NOT_FOUND,
                    name: Message.dataNotFound.name
                }, error as GError | Error)
            );
        }
    }
}
