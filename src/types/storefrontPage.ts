import { ShopifyCategory, ShopifyProduct } from './shopifyCollection';

export type StorefrontPageStatus = 'active' | 'inactive';
export type StorefrontPageItemType = 'product' | 'category';

export type StorefrontPage = {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    hero_image_url?: string | null;
    status: StorefrontPageStatus;
    sort_order: number;
    created_at?: Date | string;
    updated_at?: Date | string;
    deleted_at?: Date | string | null;
};

export type StorefrontPageItem = {
    id: number;
    storefront_page_id: number;
    item_type: StorefrontPageItemType;
    shopify_product_id?: string | null;
    shopify_category_id?: number | null;
    image_url?: string | null;
    sort_order: number;
    created_at?: Date | string;
};

export type StorefrontPageItemWithData = StorefrontPageItem & {
    product?: ShopifyProduct | null;
    category?: ShopifyCategory | null;
    category_products?: Array<{
        shopify_product_id: string;
        sort_order: number;
        product: ShopifyProduct | null;
    }>;
};
