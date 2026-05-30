import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../lib/api-response';
import pagination from '../lib/pagination';
import {
    StorefrontPage,
    StorefrontPageItem,
    StorefrontPageItemType,
    StorefrontPageItemWithData,
    StorefrontPageStatus
} from '../types/storefrontPage';
import { ShopifyProductMeta } from '../types/shopifyCollection';

type PageListQuery = Partial<StorefrontPage> & Partial<GPagination> & {
    search?: string;
};

type PagePayload = Partial<StorefrontPage>;

type PageItemInput = {
    item_type: StorefrontPageItemType;
    shopify_product_id?: string | null;
    shopify_category_id?: number | null;
    image_url?: string | null;
    sort_order?: number;
};

function buildPaginationQuery(query: Partial<Record<keyof GPagination, unknown>>): GPagination {
    return {
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        getTotal: query.getTotal === undefined ? true : Boolean(query.getTotal),
        isAll: query.isAll ? Boolean(query.isAll) : false,
        withGroup: query.withGroup ? Boolean(query.withGroup) : false,
        withOutData: query.withOutData ? Boolean(query.withOutData) : false,
        total: query.total ? Number(query.total) : 0
    };
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function getStatus(status: unknown, fallback: StorefrontPageStatus = 'active'): StorefrontPageStatus {
    if (status === undefined || status === null || status === '') {
        return fallback;
    }
    if (status === 'active' || status === 'inactive') {
        return status;
    }
    throw Response.createError({
        message: 'Page status must be active or inactive',
        code: StatusCodes.UNPROCESSABLE_ENTITY,
        name: 'StorefrontPageStatusInvalid'
    });
}

async function resolveSlug(
    trx: Knex.Transaction,
    rawSlug: string,
    currentPageId: number | null,
    allowSuffix: boolean
) {
    const baseSlug = slugify(rawSlug);
    if (!baseSlug) {
        throw Response.createError({
            message: 'Page slug is required',
            code: StatusCodes.UNPROCESSABLE_ENTITY,
            name: 'StorefrontPageSlugRequired'
        });
    }

    let slug = baseSlug;
    let suffix = 2;
    while (true) {
        const query = trx('storefront_pages').select('id').where({ slug }).whereNull('deleted_at');
        if (currentPageId) {
            query.whereNot({ id: currentPageId });
        }
        const existing = await query.first() as { id: number } | undefined;
        if (!existing) {
            return slug;
        }
        if (!allowSuffix) {
            throw Response.createError({
                message: 'Page slug already exists',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'StorefrontPageSlugExists'
            });
        }
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

function parseMeta(meta: ShopifyProductMeta | string | null | undefined): ShopifyProductMeta {
    if (!meta) return {};
    if (typeof meta === 'string') {
        try {
            return JSON.parse(meta) as ShopifyProductMeta;
        } catch {
            return {};
        }
    }
    return meta;
}

function normalizeProduct(row: Record<string, unknown>) {
    if (!row.product_internal_id) {
        return null;
    }
    return {
        id: Number(row.product_internal_id),
        shopify_product_id: String(row.product_shopify_product_id || row.shopify_product_id || ''),
        title: String(row.product_title || ''),
        price: row.price as string | number,
        url: row.url as string | null,
        image_url: (row.item_image_url || row.image_url) as string | null,
        meta: row.meta as ShopifyProductMeta | string | null,
        shopify_created_at: row.shopify_created_at as Date | string | null,
        synced_at: row.synced_at as Date | string | null
    };
}

export default class SharedStorefrontPageService {
    static async list(
        query: PageListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: StorefrontPage[], status: boolean, extra: GPagination }> {
        const paginationQuery = buildPaginationQuery(query);
        const dbQuery = knexInstance('storefront_pages')
            .select('*')
            .whereNull('deleted_at')
            .orderBy('sort_order', 'asc')
            .orderBy('id', 'desc');

        if (query.status) {
            dbQuery.where('status', getStatus(query.status));
        }
        if (query.search) {
            const search = String(query.search).trim();
            dbQuery.where((builder) => {
                builder.where('title', 'like', `%${search}%`).orWhere('slug', 'like', `%${search}%`);
            });
        }
        if (trx) dbQuery.transacting(trx);

        const { data, extra } = await pagination<StorefrontPage>(dbQuery, paginationQuery);
        return { data, status: true, extra };
    }

    static async details(id: number, trx: Knex.Transaction | null = null): Promise<StorefrontPage | null> {
        const query = knexInstance('storefront_pages').select('*').where({ id }).whereNull('deleted_at');
        if (trx) query.transacting(trx);
        return await query.first() as StorefrontPage | null;
    }

    static async detailsBySlug(slug: string, activeOnly = true): Promise<StorefrontPage | null> {
        const query = knexInstance('storefront_pages')
            .select('*')
            .where({ slug: slugify(slug) })
            .whereNull('deleted_at');
        if (activeOnly) {
            query.where({ status: 'active' });
        }
        return await query.first() as StorefrontPage | null;
    }

    static async save(data: PagePayload, trx: Knex.Transaction): Promise<StorefrontPage> {
        const now = new Date();
        const existing = data.id
            ? await trx('storefront_pages').where({ id: data.id }).whereNull('deleted_at').first() as StorefrontPage | undefined
            : undefined;
        if (data.id && !existing) {
            throw Response.createError({
                message: 'Page not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontPageNotFound'
            });
        }

        const title = String(data.title ?? existing?.title ?? '').trim();
        if (!title) {
            throw Response.createError({
                message: 'Page title is required',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'StorefrontPageTitleRequired'
            });
        }

        const incomingSlug = data.slug === undefined || data.slug === null ? '' : String(data.slug).trim();
        const payload = {
            title,
            slug: data.id
                ? incomingSlug
                    ? await resolveSlug(trx, incomingSlug, Number(data.id), false)
                    : existing?.slug || await resolveSlug(trx, title, Number(data.id), true)
                : await resolveSlug(trx, incomingSlug || title, null, !incomingSlug),
            description: data.description === undefined ? existing?.description || null : data.description || null,
            hero_image_url: data.hero_image_url === undefined ? existing?.hero_image_url || null : data.hero_image_url || null,
            status: getStatus(data.status, existing?.status || 'active'),
            sort_order: data.sort_order === undefined ? existing?.sort_order || 0 : Number(data.sort_order),
            updated_at: now
        };

        if (data.id) {
            await trx('storefront_pages').where({ id: data.id }).update(payload);
            return await trx('storefront_pages').where({ id: data.id }).first() as StorefrontPage;
        }

        const [id] = await trx('storefront_pages').insert({ ...payload, created_at: now }) as [number];
        return await trx('storefront_pages').where({ id }).first() as StorefrontPage;
    }

    static async delete(id: number, trx: Knex.Transaction): Promise<number> {
        const deleted = await trx('storefront_pages')
            .where({ id })
            .whereNull('deleted_at')
            .update({ deleted_at: new Date(), updated_at: new Date() });
        if (!deleted) {
            throw Response.createError({
                message: 'Page not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontPageNotFound'
            });
        }
        return id;
    }

    static normalizeItems(body: Record<string, unknown>): PageItemInput[] {
        return (Array.isArray(body.items) ? body.items : []).map((item) => {
            const row = item as Record<string, unknown>;
            return {
                item_type: String(row.item_type) as StorefrontPageItemType,
                shopify_product_id: row.shopify_product_id ? String(row.shopify_product_id) : null,
                shopify_category_id: row.shopify_category_id ? Number(row.shopify_category_id) : null,
                image_url: row.image_url ? String(row.image_url) : null,
                sort_order: row.sort_order === undefined ? undefined : Number(row.sort_order)
            };
        });
    }

    static async listItems(pageId: number): Promise<StorefrontPageItemWithData[]> {
        await SharedStorefrontPageService.ensurePageExists(pageId);
        const rows = await knexInstance('storefront_page_items as spi')
            .select(
                'spi.*',
                'spi.image_url as item_image_url',
                'sp.id as product_internal_id',
                'sp.shopify_product_id as product_shopify_product_id',
                'sp.title as product_title',
                'sp.price',
                'sp.url',
                'sp.image_url',
                'sp.meta',
                'sp.shopify_created_at',
                'sp.synced_at',
                'sc.title as category_title',
                'sc.slug as category_slug',
                'sc.description as category_description',
                'sc.status as category_status',
                'sc.sort_order as category_sort_order'
            )
            .leftJoin('shopify_products as sp', 'spi.shopify_product_id', 'sp.shopify_product_id')
            .leftJoin('shopify_categories as sc', 'spi.shopify_category_id', 'sc.id')
            .where('spi.storefront_page_id', pageId)
            .orderBy('spi.sort_order', 'asc')
            .orderBy('spi.id', 'asc');

        return rows.map((row: Record<string, unknown>) => ({
            id: Number(row.id),
            storefront_page_id: Number(row.storefront_page_id),
            item_type: row.item_type as StorefrontPageItemType,
            shopify_product_id: row.shopify_product_id as string | null,
            shopify_category_id: row.shopify_category_id as number | null,
            image_url: row.item_image_url as string | null,
            sort_order: Number(row.sort_order),
            created_at: row.created_at as Date | string | undefined,
            product: normalizeProduct(row),
            category: row.shopify_category_id ? {
                id: Number(row.shopify_category_id),
                title: String(row.category_title || ''),
                slug: String(row.category_slug || ''),
                description: row.category_description as string | null,
                status: (row.category_status || 'active') as StorefrontPageStatus,
                sort_order: Number(row.category_sort_order || 0)
            } : null
        }));
    }

    static async replaceItems(pageId: number, items: PageItemInput[], trx: Knex.Transaction): Promise<StorefrontPageItem[]> {
        console.log('------------')
        await SharedStorefrontPageService.ensurePageExists(pageId, trx);
        await trx('storefront_page_items').where({ storefront_page_id: pageId }).del();

        const normalized = items.filter((item) =>
            (item.item_type === 'product' && item.shopify_product_id)
            || (item.item_type === 'category' && item.shopify_category_id)
        );
        console.log('normalized items to insert', normalized);
        if (normalized.length) {
            await trx('storefront_page_items').insert(normalized.map((item, index) => ({
                storefront_page_id: pageId,
                item_type: item.item_type,
                shopify_product_id: item.item_type === 'product' ? item.shopify_product_id : null,
                shopify_category_id: item.item_type === 'category' ? item.shopify_category_id : null,
                image_url: item.image_url || null,
                sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index + 1,
                created_at: new Date()
            })));
        }

        return await trx('storefront_page_items')
            .where({ storefront_page_id: pageId })
            .orderBy('sort_order', 'asc') as StorefrontPageItem[];
    }

    static async pageBySlug(slug: string): Promise<{ page: StorefrontPage; items: StorefrontPageItemWithData[] }> {
        const page = await SharedStorefrontPageService.detailsBySlug(slug, true);
        if (!page) {
            throw Response.createError({
                message: 'Page not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontPageNotFound'
            });
        }
        const items = await SharedStorefrontPageService.listItems(page.id);
        const categoryItems = items.filter((item) => item.item_type === 'category' && item.shopify_category_id);
        for (const item of categoryItems) {
            item.category_products = await SharedStorefrontPageService.listCategoryProductSummaries(Number(item.shopify_category_id));
        }
        return { page, items };
    }

    private static async listCategoryProductSummaries(categoryId: number) {
        const rows = await knexInstance('shopify_category_products as scp')
            .select(
                'scp.shopify_product_id',
                'scp.sort_order',
                'sp.id as product_internal_id',
                'sp.shopify_product_id as product_shopify_product_id',
                'sp.title as product_title',
                'sp.price',
                'sp.url',
                'sp.image_url',
                'sp.meta',
                'sp.shopify_created_at',
                'sp.synced_at'
            )
            .leftJoin('shopify_products as sp', 'scp.shopify_product_id', 'sp.shopify_product_id')
            .where('scp.shopify_category_id', categoryId)
            .orderBy('scp.sort_order', 'asc')
            .orderBy('scp.id', 'asc');

        return rows.map((row: Record<string, unknown>) => ({
            shopify_product_id: String(row.shopify_product_id),
            sort_order: Number(row.sort_order),
            product: normalizeProduct(row)
        }));
    }

    private static async ensurePageExists(pageId: number, trx: Knex.Transaction | null = null) {
        const page = await SharedStorefrontPageService.details(pageId, trx);
        if (!page) {
            throw Response.createError({
                message: 'Page not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontPageNotFound'
            });
        }
    }
}
