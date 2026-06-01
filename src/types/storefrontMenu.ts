import { StorefrontPage, StorefrontPageStatus } from './storefrontPage';

export type StorefrontMenu = {
    id: number;
    title: string;
    handle: string;
    status: StorefrontPageStatus;
    sort_order: number;
    created_at?: Date | string;
    updated_at?: Date | string;
    deleted_at?: Date | string | null;
};

export type StorefrontMenuPage = {
    id: number;
    storefront_menu_id: number;
    storefront_page_id: number;
    label?: string | null;
    sort_order: number;
    created_at?: Date | string;
    page?: StorefrontPage | null;
};

export type StorefrontMenuWithPages = StorefrontMenu & {
    pages: StorefrontMenuPage[];
};
