import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import config from '../../../../config';

type ShopifyTokenResponse = Record<string, unknown>;
type ShopifyAdminGraphqlResponse = {
    data?: {
        customer?: Record<string, unknown> | null;
    };
    errors?: GTypeAll;
};

export default class ShopifyApisController {
    static async loginCustomerByShopifyToken(req: ExpressRequest, res: ExpressResponse) {
        const code = ShopifyApisController.getStringParam(req, 'code');
        const codeVerifier = ShopifyApisController.getStringParam(req, 'code_verifier')
            || ShopifyApisController.getStringParam(req, 'codeVerifier');

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

            const { data } = await ShopifyApisController.exchangeCodeForToken(formData);
            const customerGid = ShopifyApisController.getCustomerGidFromIdToken(data);
            const customer = customerGid
                ? await ShopifyApisController.fetchAdminCustomerById(customerGid)
                : null;

            return Response.success(res, {
                data: {
                    ...data,
                    customer
                },
                message: 'Login successful',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (ShopifyApisController.isGError(error)) {
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
                'Shopify token exchange failed',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    private static async exchangeCodeForToken(formData: URLSearchParams): Promise<{ data: ShopifyTokenResponse }> {
        try {
            return await axios.post<ShopifyTokenResponse>(
                config.shopify.tokenUrl,
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
        } catch (error: unknown) {
            throw ShopifyApisController.toShopifyError(error, 'Shopify token exchange failed');
        }
    }

    private static getStringParam(req: ExpressRequest, key: string): string | null {
        const value = req.body?.[key] ?? req.query?.[key] ?? req.params?.[key];
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    private static getCustomerGidFromIdToken(data: ShopifyTokenResponse): string | null {
        const idToken = data.id_token;
        if (typeof idToken !== 'string' || !idToken.trim()) {
            return null;
        }

        const decodedToken = jwt.decode(idToken);
        if (!ShopifyApisController.isJwtPayload(decodedToken) || !decodedToken.sub) {
            return null;
        }
        return ShopifyApisController.normalizeCustomerGid(decodedToken.sub);
    }

    private static async fetchAdminCustomerById(customerGid: string): Promise<Record<string, unknown> | null> {
        if (!config.shopify.adminShopDomain || !config.shopify.adminAccessToken) {
            throw Response.createError({
                message: 'Shopify Admin API configuration is missing',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyAdminApiConfigMissing'
            });
        }
        console.log('ADMIN_API_URL :', {
            url: `https://${config.shopify.adminShopDomain}/admin/api/${config.shopify.adminApiVersion}/graphql.json`,
            'X-Shopify-Access-Token': config.shopify.adminAccessToken
        })
        try {
            const { data } = await axios.post<ShopifyAdminGraphqlResponse>(
                `https://${config.shopify.adminShopDomain}/admin/api/${config.shopify.adminApiVersion}/graphql.json`,
                {
                    query: `
                        query GetCustomer($id: ID!) {
                            customer(id: $id) {
                                id
                                firstName
                                lastName
                                email
                                phone
                                createdAt
                                updatedAt
                                state
                                tags
                                verifiedEmail
                                taxExempt
                                note
                                metafields(first: 10) {
                                    edges {
                                        node {
                                            namespace
                                            key
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    `,
                    variables: {
                        id: customerGid
                    }
                },
                {
                    headers: {
                        'X-Shopify-Access-Token': config.shopify.adminAccessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (data.errors) {
                throw Response.createError({
                    message: 'Shopify customer fetch failed',
                    code: StatusCodes.BAD_GATEWAY,
                    name: 'ShopifyGraphqlError',
                    data: data.errors
                });
            }

            return data.data?.customer || null;
        } catch (error: unknown) {
            if (ShopifyApisController.isGError(error)) {
                throw error;
            }

            throw ShopifyApisController.toShopifyError(error, 'Shopify customer fetch failed');
        }
    }

    private static isJwtPayload(decodedToken: string | JwtPayload | null): decodedToken is JwtPayload {
        return typeof decodedToken === 'object' && decodedToken !== null;
    }

    private static isGError(error: unknown): error is GError {
        return error instanceof Error && 'code' in error;
    }

    private static normalizeCustomerGid(customerId: string | number): string {
        const normalizedCustomerId = String(customerId);
        if (normalizedCustomerId.startsWith('gid://shopify/Customer/')) {
            return normalizedCustomerId;
        }

        return `gid://shopify/Customer/${normalizedCustomerId}`;
    }

    private static toShopifyError(error: unknown, message: string): GError {
        if (axios.isAxiosError(error)) {
            return Response.createError({
                message,
                code: error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyApiError',
                data: (error.response?.data || null) as GTypeAll
            });
        }

        return Response.createError({
            message,
            code: StatusCodes.INTERNAL_SERVER_ERROR,
            name: 'ShopifyApiError'
        });
    }
}
