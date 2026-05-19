import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import config from '../../../../config';
import Response from '../../../../lib/api-response';
import { GET_CUSTOMER_QUERY } from './queries/customer';
import { ShopifyAdminGraphqlResponse, ShopifyTokenResponse } from './types';
import { isGError, toShopifyError } from './utils';

export default class ShopifyApisService {
    static async exchangeCodeForToken(formData: URLSearchParams): Promise<{ data: ShopifyTokenResponse }> {
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
            throw toShopifyError(error, 'Shopify token exchange failed');
        }
    }

    static async fetchAdminCustomerById(customerGid: string): Promise<Record<string, unknown> | null> {
        if (!config.shopify.adminShopDomain || !config.shopify.adminAccessToken) {
            throw Response.createError({
                message: 'Shopify Admin API configuration is missing',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyAdminApiConfigMissing'
            });
        }

        console.log('ADMIN_API_URL :', {
            url: ShopifyApisService.getAdminGraphqlUrl(),
            'X-Shopify-Access-Token': config.shopify.adminAccessToken
        });

        try {
            const { data } = await axios.post<ShopifyAdminGraphqlResponse>(
                ShopifyApisService.getAdminGraphqlUrl(),
                {
                    query: GET_CUSTOMER_QUERY,
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
            if (isGError(error)) {
                throw error;
            }

            throw toShopifyError(error, 'Shopify customer fetch failed');
        }
    }

    private static getAdminGraphqlUrl(): string {
        return `https://${config.shopify.adminShopDomain}/admin/api/${config.shopify.adminApiVersion}/graphql.json`;
    }
}
