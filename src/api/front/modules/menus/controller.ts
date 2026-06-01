import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import SharedStorefrontMenuService from '../../../../shared-services/storefrontMenu';

export default class FrontStorefrontMenuController {
    static async list(_req: ExpressRequest, res: ExpressResponse) {
        try {
            const data = await SharedStorefrontMenuService.activeMenusWithPages();
            Response.success(res, 'Menus found', data, StatusCodes.OK);
        } catch (error) {
            Response.fail(res, 'Menus not found', [], StatusCodes.OK);
        }
    }
}
