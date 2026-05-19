export type ShopifyCustomerMetafield = {
    namespace?: string | null;
    key?: string | null;
    value?: string | null;
};

export type Customer = {
    id: number;
    shopify_customer_id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone: string;
    state?: string | null;
    tags?: string[] | string | null;
    verified_email?: boolean | null;
    tax_exempt?: boolean | null;
    note?: string | null;
    metafields?: ShopifyCustomerMetafield[] | string | null;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
    deleted_at?: Date | null;
};
