export type ShopifyProductMeta = {
    handle?: string | null;
    tags?: string | null;
    vendor?: string | null;
    product_type?: string | null;
    status?: string | null;
    images?: Array<{
        id?: number | string;
        src?: string | null;
        alt?: string | null;
        position?: number | null;
    }>;
    variants?: Array<{
        id?: number | string;
        price?: string | number | null;
        title?: string | null;
        sku?: string | null;
    }>;
    [key: string]: unknown;
};

export type ShopifyProduct = {
    id: number;
    shopify_product_id: string;
    title: string;
    price: string | number;
    url?: string | null;
    image_url?: string | null;
    meta?: ShopifyProductMeta | string | null;
    shopify_created_at?: Date | string | null;
    synced_at?: Date | string | null;
    created_at?: Date;
    updated_at?: Date;
};

export type ShopifyCategoryStatus = 'active' | 'inactive';

export type ShopifyCategory = {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    status: ShopifyCategoryStatus;
    sort_order: number;
    created_at?: Date;
    updated_at?: Date;
};

export type ShopifyCategoryProduct = {
    id: number;
    shopify_category_id: number;
    shopify_product_id: string;
    sort_order: number;
    created_at?: Date;
};

export type ShopifyCategoryProductWithProduct = ShopifyCategoryProduct & {
    product?: ShopifyProduct | null;
};

export type ShopifyRestImage = {
    id?: number;
    product_id?: number;
    position?: number;
    src?: string | null;
    alt?: string | null;
};

export type ShopifyRestVariant = {
    id?: number;
    product_id?: number;
    title?: string | null;
    price?: string | number | null;
    sku?: string | null;
};

export type ShopifyRestProduct = {
    id: number | string;
    title: string;
    handle?: string | null;
    vendor?: string | null;
    product_type?: string | null;
    tags?: string | null;
    status?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    images?: ShopifyRestImage[];
    image?: ShopifyRestImage | null;
    variants?: ShopifyRestVariant[];
    [key: string]: unknown;
};
