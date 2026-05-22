import { Customer } from '../../../../types/customer';

export type ShopifyTokenResponse = Record<string, unknown>;

export type ShopifyMailingAddress = {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    province?: string | null;
    country?: string | null;
    zip?: string | null;
    phone?: string | null;
};

export type ShopifyAdminCustomer = {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    state?: string | null;
    tags?: string[] | null;
    verifiedEmail?: boolean | null;
    taxExempt?: boolean | null;
    note?: string | null;
    defaultAddress?: ShopifyMailingAddress | null;
    addresses?: ShopifyMailingAddress[] | null;
    metafields?: {
        edges?: Array<{
            node?: {
                namespace?: string | null;
                key?: string | null;
                value?: string | null;
            } | null;
        }> | null;
    } | null;
};

export type ShopifyAdminGraphqlResponse = {
    data?: Record<string, unknown> & {
        customer?: ShopifyAdminCustomer | null;
    };
    errors?: GTypeAll;
};

export type ShopifyCustomerProfileUpdateInput = {
    firstName: string;
    lastName: string;
    phone: string;
};

export type ShopifyCustomerOrder = {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    note?: string | null;
    tags?: string[] | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    processedAt?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string | null;
    closedAt?: string | null;
    fullyPaid?: boolean | null;
    unpaid?: boolean | null;
    refundable?: boolean | null;
    requiresShipping?: boolean | null;
    displayFinancialStatus?: string | null;
    displayFulfillmentStatus?: string | null;
    currencyCode?: string | null;
    currentTotalWeight?: string | null;
    totalPriceSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    subtotalPriceSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    currentTotalPriceSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    currentSubtotalPriceSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    currentTotalTaxSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    currentTotalDiscountsSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    totalShippingPriceSet?: {
        shopMoney?: {
            amount?: string | null;
            currencyCode?: string | null;
        } | null;
    } | null;
    shippingAddress?: ShopifyMailingAddress | null;
    billingAddress?: ShopifyMailingAddress | null;
    fulfillments?: Array<{
        id?: string | null;
        status?: string | null;
        trackingInfo?: Array<{
            company?: string | null;
            number?: string | null;
            url?: string | null;
        }> | null;
    }> | null;
    transactions?: Array<{
        id?: string | null;
        kind?: string | null;
        status?: string | null;
        gateway?: string | null;
        processedAt?: string | null;
        amountSet?: {
            shopMoney?: {
                amount?: string | null;
                currencyCode?: string | null;
            } | null;
        } | null;
    }> | null;
    lineItems?: {
        edges?: Array<{
            node?: {
                id?: string | null;
                name?: string | null;
                title?: string | null;
                quantity?: number | null;
                currentQuantity?: number | null;
                refundableQuantity?: number | null;
                sku?: string | null;
                variantTitle?: string | null;
                vendor?: string | null;
                originalUnitPriceSet?: {
                    shopMoney?: {
                        amount?: string | null;
                        currencyCode?: string | null;
                    } | null;
                } | null;
                discountedTotalSet?: {
                    shopMoney?: {
                        amount?: string | null;
                        currencyCode?: string | null;
                    } | null;
                } | null;
                totalDiscountSet?: {
                    shopMoney?: {
                        amount?: string | null;
                        currencyCode?: string | null;
                    } | null;
                } | null;
                image?: {
                    url?: string | null;
                    altText?: string | null;
                } | null;
            } | null;
        }>;
    } | null;
};

export type ShopifyCustomerOrdersResponse = {
    orders: ShopifyCustomerOrder[];
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
};

export type CustomerLoginData = {
    customer: Customer;
    token: string;
    jwt_key: string;
};
