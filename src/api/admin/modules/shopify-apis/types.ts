export type ShopifyTokenResponse = Record<string, unknown>;

export type ShopifyAdminGraphqlResponse = {
    data?: {
        customer?: Record<string, unknown> | null;
    };
    errors?: GTypeAll;
};
