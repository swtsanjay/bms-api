import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import config from '../../../../config';
import SharedCustomerService from '../../../../shared-services/customer';
import SharedCustomerTokenService from '../../../../shared-services/customerToken';
import ShopifyCustomerAuthService from './customer-auth';
import ShopifyApisService from './service';
import { getAccessTokenFromTokenResponse, getCustomerGidFromIdToken, getStringParam, isGError } from './utils';

export default class ShopifyApisController {
    static async customerAccessToken(req: ExpressRequest, res: ExpressResponse) {
        const jwtKey = (req as any).shopifyCustomerJwtKey as string | undefined;

        if (!jwtKey) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        try {
            const customerToken = await SharedCustomerTokenService.getByJwtKey(jwtKey);
            if (!customerToken) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Access token not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    access_token: customerToken.access_token
                }
            });
        } catch (error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch access token'
            });
        }
    }

    static async customerDetails(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customerId = Number((req as any).shopifyCustomer?.id);
            const customer = customerId
                ? await SharedCustomerService.getCustomerById(customerId)
                : null;

            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        name: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
                        phone: customer.phone,
                        shopify_customer_id: ShopifyApisController.getCustomerGid(customer.shopify_customer_id),
                        status: 'active'
                    }
                }
            });
        } catch (error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch customer details'
            });
        }
    }

    private static getCustomerGid(shopifyCustomerId: string) {
        if (shopifyCustomerId.startsWith('gid://shopify/Customer/')) {
            return shopifyCustomerId;
        }

        return `gid://shopify/Customer/${shopifyCustomerId}`;
    }

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

            const accessToken = getAccessTokenFromTokenResponse(data);
            if (!accessToken) {
                return Response.fail(
                    res,
                    'Shopify access token not found',
                    null,
                    StatusCodes.BAD_GATEWAY
                );
            }

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

            const loginData = await ShopifyCustomerAuthService.createLoginData(shopifyCustomer, accessToken);

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
