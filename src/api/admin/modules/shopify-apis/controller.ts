import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import config from '../../../../config';
import ShopifyCustomerAuthService from './customer-auth';
import ShopifyApisService from './service';
import { getCustomerGidFromIdToken, getStringParam, isGError } from './utils';

export default class ShopifyApisController {
    static async loginCustomerByShopifyToken(req: ExpressRequest, res: ExpressResponse) {
        const code = getStringParam(req, 'code');
        const codeVerifier = getStringParam(req, 'code_verifier') || getStringParam(req, 'codeVerifier');

        if (!code || !codeVerifier) {
            return Response.fail(
                res,
                'code and code_verifier are required',
                null,
                StatusCodes.BAD_REQUEST
            );
        }

        if (!config.shopify.tokenUrl || !config.shopify.clientId || !config.shopify.redirectUri) {
            return Response.fail(
                res,
                'Shopify configuration is missing',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'authorization_code');
            formData.append('client_id', config.shopify.clientId);
            formData.append('redirect_uri', config.shopify.redirectUri);
            formData.append('code', code);
            formData.append('code_verifier', codeVerifier);

            const { data } = await ShopifyApisService.exchangeCodeForToken(formData);
            const customerGid = getCustomerGidFromIdToken(data);
            const shopifyCustomer = customerGid
                ? await ShopifyApisService.fetchAdminCustomerById(customerGid)
                : null;

            if (!shopifyCustomer) {
                return Response.fail(
                    res,
                    'Shopify customer not found',
                    null,
                    StatusCodes.NOT_FOUND
                );
            }

            const loginData = await ShopifyCustomerAuthService.createLoginData(shopifyCustomer);

            return Response.success(res, {
                data: loginData,
                message: 'Login successful',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
                const errorData = error.response?.data || null;
                return Response.fail(
                    res,
                    'Shopify token exchange failed',
                    errorData,
                    statusCode
                );
            }

            return Response.fail(
                res,
                'Shopify login failed',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
}
