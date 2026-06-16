export type ShopifyProductMeta = {
    handle?: string | null;
    seo?: {
        title?: string | null;
        description?: string | null;
    } | null;
    metafields?: Array<{
        namespace?: string | null;
        key?: string | null;
        value?: unknown;
        type?: string | null;
        references?: unknown[];
    }>;
    tags?: string | null;
    vendor?: string | null;
    product_type?: string | null;
    status?: string | null;
    images?: any[];
    variants?: any[];
    [key: string]: unknown;
};

export type ShopifyProduct = {
    id: number;
    shopify_product_id: string;
    title: string;
    price: string | number;
    url?: string | null;
    image_url?: string | null;
    gender?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
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
    id?: number | string;
    product_id?: number | string;
    position?: number;
    src?: string | null;
    url?: string | null;
    alt?: string | null;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
    [key: string]: unknown;
};

export type ShopifyRestVariant = {
    id?: number | string;
    product_id?: number | string;
    title?: string | null;
    price?: string | number | null;
    compare_at_price?: string | number | null;
    compareAtPrice?: string | number | null;
    sku?: string | null;
    available_for_sale?: boolean | null;
    availableForSale?: boolean | null;
    inventory_quantity?: number | null;
    inventoryQuantity?: number | null;
    barcode?: string | null;
    selected_options?: Array<{ name?: string | null; value?: string | null }>;
    selectedOptions?: Array<{ name?: string | null; value?: string | null }>;
    image?: Record<string, unknown> | null;
    [key: string]: unknown;
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
