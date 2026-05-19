import { Customer } from '../../../../types/customer';

export type ShopifyTokenResponse = Record<string, unknown>;

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
    data?: {
        customer?: ShopifyAdminCustomer | null;
    };
    errors?: GTypeAll;
};

export type CustomerLoginData = {
    customer: Customer;
    token: string;
};
