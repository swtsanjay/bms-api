import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import config from '../../../../config';
import Response from '../../../../lib/api-response';
import { GET_CUSTOMER_QUERY } from './queries/customer';
import { ShopifyAdminCustomer, ShopifyAdminGraphqlResponse, ShopifyTokenResponse } from './types';
import { isGError, toShopifyError } from './utils';

type ShopifyUserError = {
    field?: string[] | string | null;
    message?: string | null;
};

type ShopifyAddressInput = {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    provinceCode?: string | null;
    countryCode?: string | null;
    zip?: string | null;
    phone?: string | null;
};

const ADDRESS_FIELDS = `
    id
    firstName
    lastName
    company
    address1
    address2
    city
    province
    country
    zip
    phone
`;

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

    static async fetchAdminCustomerById(customerGid: string): Promise<ShopifyAdminCustomer | null> {
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

    static async fetchAdminCustomerByLegacyId(customerId: string | number): Promise<ShopifyAdminCustomer | null> {
        return ShopifyApisService.fetchAdminCustomerById(
            ShopifyApisService.toCustomerGid(customerId)
        );
    }

    static async createCustomerAddress(
        customerId: string | number,
        address: ShopifyAddressInput,
        setAsDefault: boolean = false
    ) {
        const data = await ShopifyApisService.adminGraphql<{
            customerAddressCreate?: {
                address?: unknown;
                userErrors?: ShopifyUserError[];
            };
        }>(
            `
                mutation CustomerAddressCreate($customerId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
                    customerAddressCreate(customerId: $customerId, address: $address, setAsDefault: $setAsDefault) {
                        address {
                            ${ADDRESS_FIELDS}
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                customerId: ShopifyApisService.toCustomerGid(customerId),
                address,
                setAsDefault
            }
        );

        ShopifyApisService.throwUserErrors(data.customerAddressCreate?.userErrors);
        return data.customerAddressCreate?.address || null;
    }

    static async updateCustomerAddress(
        customerId: string | number,
        addressId: string,
        address: ShopifyAddressInput,
        setAsDefault: boolean = false
    ) {
        const data = await ShopifyApisService.adminGraphql<{
            customerAddressUpdate?: {
                address?: unknown;
                userErrors?: ShopifyUserError[];
            };
        }>(
            `
                mutation CustomerAddressUpdate($customerId: ID!, $addressId: ID!, $address: MailingAddressInput!, $setAsDefault: Boolean) {
                    customerAddressUpdate(customerId: $customerId, addressId: $addressId, address: $address, setAsDefault: $setAsDefault) {
                        address {
                            ${ADDRESS_FIELDS}
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                customerId: ShopifyApisService.toCustomerGid(customerId),
                addressId,
                address,
                setAsDefault
            }
        );

        ShopifyApisService.throwUserErrors(data.customerAddressUpdate?.userErrors);
        return data.customerAddressUpdate?.address || null;
    }

    static async deleteCustomerAddress(customerId: string | number, addressId: string) {
        const data = await ShopifyApisService.adminGraphql<{
            customerAddressDelete?: {
                deletedAddressId?: string | null;
                userErrors?: ShopifyUserError[];
            };
        }>(
            `
                mutation CustomerAddressDelete($customerId: ID!, $addressId: ID!) {
                    customerAddressDelete(customerId: $customerId, addressId: $addressId) {
                        deletedAddressId
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                customerId: ShopifyApisService.toCustomerGid(customerId),
                addressId
            }
        );

        ShopifyApisService.throwUserErrors(data.customerAddressDelete?.userErrors);
        return data.customerAddressDelete?.deletedAddressId || null;
    }

    static async setDefaultCustomerAddress(customerId: string | number, addressId: string) {
        const data = await ShopifyApisService.adminGraphql<{
            customerUpdateDefaultAddress?: {
                customer?: ShopifyAdminCustomer | null;
                userErrors?: ShopifyUserError[];
            };
        }>(
            `
                mutation CustomerAddressDefault($customerId: ID!, $addressId: ID!) {
                    customerUpdateDefaultAddress(customerId: $customerId, addressId: $addressId) {
                        customer {
                            id
                            defaultAddress {
                                ${ADDRESS_FIELDS}
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `,
            {
                customerId: ShopifyApisService.toCustomerGid(customerId),
                addressId
            }
        );

        ShopifyApisService.throwUserErrors(data.customerUpdateDefaultAddress?.userErrors);
        return data.customerUpdateDefaultAddress?.customer || null;
    }

    private static async adminGraphql<TData>(
        query: string,
        variables: Record<string, unknown>
    ): Promise<TData> {
        if (!config.shopify.adminShopDomain || !config.shopify.adminAccessToken) {
            throw Response.createError({
                message: 'Shopify Admin API configuration is missing',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyAdminApiConfigMissing'
            });
        }

        try {
            const { data } = await axios.post<ShopifyAdminGraphqlResponse & { data?: TData }>(
                ShopifyApisService.getAdminGraphqlUrl(),
                {
                    query,
                    variables
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
                    message: 'Shopify GraphQL request failed',
                    code: StatusCodes.BAD_GATEWAY,
                    name: 'ShopifyGraphqlError',
                    data: data.errors
                });
            }

            return (data.data || {}) as TData;
        } catch (error: unknown) {
            if (isGError(error)) {
                throw error;
            }

            throw toShopifyError(error, 'Shopify GraphQL request failed');
        }
    }

    private static throwUserErrors(userErrors?: ShopifyUserError[]) {
        const firstError = userErrors?.find((error) => error.message);
        if (!firstError) {
            return;
        }

        throw Response.createError({
            message: firstError.message || 'Shopify customer address request failed',
            code: StatusCodes.UNPROCESSABLE_ENTITY,
            name: 'ShopifyCustomerAddressError',
            data: userErrors as unknown as GTypeAll
        });
    }

    private static toCustomerGid(customerId: string | number): string {
        const value = String(customerId);
        if (value.startsWith('gid://shopify/Customer/')) {
            return value;
        }

        return `gid://shopify/Customer/${value}`;
    }

    private static getAdminGraphqlUrl(): string {
        return `https://${config.shopify.adminShopDomain}/admin/api/${config.shopify.adminApiVersion}/graphql.json`;
    }
}
