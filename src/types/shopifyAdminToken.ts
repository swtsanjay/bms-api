export type ShopifyAdminToken = {
    id: number;
    shop_domain: string;
    encrypted_access_token: string;
    scope?: string | null;
    expires_at?: Date | null;
    created_at?: Date;
    updated_at?: Date;
};

export type ShopifyAdminTokenSaveData = {
    shop_domain: string;
    access_token: string;
    scope?: string | null;
    expires_in?: number | null;
};
