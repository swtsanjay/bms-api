import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import SharedStorefrontPageService from '../../../../shared-services/storefrontPage';

function getParam(req: ExpressRequest, key: string): string {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : String(value || '');
}

export default class FrontStorefrontPageController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        try {
            const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20;
            const rawPage = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const { data, extra } = await SharedStorefrontPageService.list({
                status: 'active',
                search,
                limit: Number.isFinite(rawLimit) ? rawLimit : 20,
                page: Number.isFinite(rawPage) ? rawPage : 1,
                getTotal: true
            });
            Response.success(res, {
                data,
                message: 'Pages found',
                code: StatusCodes.OK,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error) {
            Response.fail(res, 'Pages not found', null, StatusCodes.NOT_FOUND);
        }
    }

    static async details(req: ExpressRequest, res: ExpressResponse) {
        try {
            const data = await SharedStorefrontPageService.pageBySlug(getParam(req, 'slug'));
            Response.success(res, 'Page found', data, StatusCodes.OK);
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                Response.fail(res, error as GError);
                return;
            }
            Response.fail(res, 'Page not found', null, StatusCodes.NOT_FOUND);
        }
    }
}
