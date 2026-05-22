import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import config from '../../../../config';
import Response from '../../../../lib/api-response';
import { GET_CUSTOMER_QUERY } from './queries/customer';
import {
    ShopifyAdminCustomer,
    ShopifyAdminGraphqlResponse,
    ShopifyCustomerOrdersResponse,
    ShopifyCustomerProfileUpdateInput,
    ShopifyTokenResponse
} from './types';
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

    static async updateCustomerProfile(
        customerId: string | number,
        input: ShopifyCustomerProfileUpdateInput
    ): Promise<ShopifyAdminCustomer | null> {
        const data = await ShopifyApisService.adminGraphql<{
            customerUpdate?: {
                customer?: ShopifyAdminCustomer | null;
                userErrors?: ShopifyUserError[];
            };
        }>(
            `
                mutation CustomerProfileUpdate($input: CustomerInput!) {
                    customerUpdate(input: $input) {
                        userErrors {
                            field
                            message
                        }
                        customer {
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
                        }
                    }
                }
            `,
            {
                input: {
                    id: ShopifyApisService.toCustomerGid(customerId),
                    firstName: input.firstName,
                    lastName: input.lastName,
                    phone: input.phone
                }
            }
        );

        ShopifyApisService.throwUserErrors(data.customerUpdate?.userErrors);
        return data.customerUpdate?.customer || null;
    }

    static async fetchCustomerOrders(
        customerId: string | number,
        first: number = 20,
        after: string | null = null
    ): Promise<ShopifyCustomerOrdersResponse> {
        const data = await ShopifyApisService.adminGraphql<{
            customer?: {
                orders?: {
                    edges?: Array<{
                        cursor?: string;
                        node?: ShopifyCustomerOrdersResponse['orders'][number];
                    }>;
                    pageInfo?: {
                        hasNextPage?: boolean;
                        endCursor?: string | null;
                    };
                } | null;
            } | null;
        }>(
            `
                query CustomerOrders($id: ID!, $first: Int!, $after: String) {
                    customer(id: $id) {
                        orders(first: $first, after: $after, reverse: true) {
                            edges {
                                cursor
                                node {
                                    id
                                    name
                                    email
                                    phone
                                    note
                                    tags
                                    createdAt
                                    updatedAt
                                    processedAt
                                    cancelledAt
                                    cancelReason
                                    closedAt
                                    fullyPaid
                                    unpaid
                                    refundable
                                    requiresShipping
                                    displayFinancialStatus
                                    displayFulfillmentStatus
                                    currencyCode
                                    currentTotalWeight
                                    totalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    subtotalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    currentTotalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    currentSubtotalPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    currentTotalTaxSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    currentTotalDiscountsSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    totalShippingPriceSet {
                                        shopMoney {
                                            amount
                                            currencyCode
                                        }
                                    }
                                    shippingAddress {
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
                                    }
                                    billingAddress {
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
                                    }
                                    fulfillments {
                                        id
                                        status
                                        trackingInfo {
                                            company
                                            number
                                            url
                                        }
                                    }
                                    transactions(first: 20) {
                                        id
                                        kind
                                        status
                                        gateway
                                        processedAt
                                        amountSet {
                                            shopMoney {
                                                amount
                                                currencyCode
                                            }
                                        }
                                    }
                                    lineItems(first: 20) {
                                        edges {
                                            node {
                                                id
                                                name
                                                title
                                                quantity
                                                currentQuantity
                                                refundableQuantity
                                                sku
                                                variantTitle
                                                vendor
                                                originalUnitPriceSet {
                                                    shopMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                                discountedTotalSet {
                                                    shopMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                                totalDiscountSet {
                                                    shopMoney {
                                                        amount
                                                        currencyCode
                                                    }
                                                }
                                                image {
                                                    url
                                                    altText
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                }
            `,
            {
                id: ShopifyApisService.toCustomerGid(customerId),
                first,
                after
            }
        );

        const ordersConnection = data.customer?.orders;
        return {
            orders: ordersConnection?.edges?.map((edge) => edge.node).filter((order): order is ShopifyCustomerOrdersResponse['orders'][number] => Boolean(order)) || [],
            pageInfo: {
                hasNextPage: Boolean(ordersConnection?.pageInfo?.hasNextPage),
                endCursor: ordersConnection?.pageInfo?.endCursor || null
            }
        };
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
