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

export type CustomerLoginData = {
    customer: Customer;
    token: string;
    jwt_key: string;
};
