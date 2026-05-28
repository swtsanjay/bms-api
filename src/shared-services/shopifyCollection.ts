import axios from 'axios';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import config from '../config';
import Response from '../lib/api-response';
import pagination from '../lib/pagination';
import SharedShopifyAdminTokenService from './shopifyAdminToken';
import {
    ShopifyCategory,
    ShopifyCategoryProduct,
    ShopifyCategoryProductWithProduct,
    ShopifyCategoryStatus,
    ShopifyProduct,
    ShopifyProductMeta,
    ShopifyRestProduct
} from '../types/shopifyCollection';
import { isGError, toShopifyError } from '../api/admin/modules/shopify-apis/utils';

type ProductListQuery = Partial<Record<keyof (ShopifyProduct & GPagination), ShopifyProduct[keyof ShopifyProduct]>> & {
    search?: string;
    vendor?: string;
    product_type?: string;
    status?: string;
    shopify_created_at_from?: string;
    shopify_created_at_to?: string;
};

type CategoryListQuery = Partial<Record<keyof (ShopifyCategory & GPagination), ShopifyCategory[keyof ShopifyCategory]>> & {
    search?: string;
};

type ShopifyProductsRestResponse = {
    products?: ShopifyRestProduct[];
};

type ShopifyProductRestResponse = {
    product?: ShopifyRestProduct;
};

type ShopifySyncSummary = {
    synced: number;
    skipped: number;
    errors: Array<{ shopify_product_id?: string; message: string }>;
};

type CategoryProductInput = {
    shopify_product_id: string;
    sort_order?: number;
    image_url?: string | null;
};

type ReorderInput = {
    shopify_product_id: string;
    sort_order: number;
};

function normalizeShopifyProductId(shopifyProductId: string | number): string {
    const value = String(shopifyProductId).trim();
    const gidMatch = value.match(/gid:\/\/shopify\/Product\/(\d+)$/);
    return gidMatch ? gidMatch[1] : value;
}

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

function getLowestVariantPrice(product: ShopifyRestProduct): number {
    const prices = (product.variants || [])
        .map((variant) => Number(variant.price))
        .filter((price) => Number.isFinite(price));

    return prices.length > 0 ? Math.min(...prices) : 0;
}

function getPrimaryImageUrl(product: ShopifyRestProduct): string | null {
    return product.image?.src || product.images?.find((image) => Boolean(image.src))?.src || null;
}

function getProductUrl(product: ShopifyRestProduct): string | null {
    if (!product.handle) {
        return null;
    }

    const shopDomain = SharedShopifyAdminTokenService.normalizeShopDomain(
        config.shopify.shopDomain || config.shopify.adminShopDomain || ''
    );
    return shopDomain ? `https://${shopDomain}/products/${product.handle}` : `/products/${product.handle}`;
}

function mapShopifyProduct(product: ShopifyRestProduct, existingImageUrl?: string | null) {
    const now = new Date();
    const meta: ShopifyProductMeta = {
        handle: product.handle || null,
        tags: product.tags || null,
        vendor: product.vendor || null,
        product_type: product.product_type || null,
        status: product.status || null,
        images: (product.images || []).map((image) => ({
            id: image.id,
            src: image.src || null,
            alt: image.alt || null,
            position: image.position || null
        })),
        variants: (product.variants || []).map((variant) => ({
            id: variant.id,
            price: variant.price || null,
            title: variant.title || null,
            sku: variant.sku || null
        }))
    };

    return {
        shopify_product_id: normalizeShopifyProductId(product.id),
        title: product.title,
        price: getLowestVariantPrice(product),
        url: getProductUrl(product),
        image_url: existingImageUrl || getPrimaryImageUrl(product),
        meta: JSON.stringify(meta),
        shopify_created_at: product.created_at ? new Date(product.created_at) : null,
        synced_at: now,
        updated_at: now
    };
}

function getNextPageInfo(linkHeader?: string): string | null {
    if (!linkHeader) {
        return null;
    }

    const nextLink = linkHeader.split(',').find((part) => part.includes('rel="next"'));
    if (!nextLink) {
        return null;
    }

    const urlMatch = nextLink.match(/<([^>]+)>/);
    if (!urlMatch) {
        return null;
    }

    const nextUrl = new URL(urlMatch[1]);
    return nextUrl.searchParams.get('page_info');
}

function normalizeCategoryProducts(body: Record<string, unknown>): CategoryProductInput[] {
    const products = Array.isArray(body.products) ? body.products : null;
    if (products) {
        return products.map((product) => {
            const row = product as Record<string, unknown>;
            return {
                shopify_product_id: normalizeShopifyProductId(String(row.shopify_product_id || '')),
                sort_order: row.sort_order === undefined ? undefined : Number(row.sort_order),
                image_url: row.image_url === undefined ? undefined : String(row.image_url || '')
            };
        });
    }

    const ids = Array.isArray(body.shopify_product_ids) ? body.shopify_product_ids : [];
    return ids.map((shopifyProductId) => ({
        shopify_product_id: normalizeShopifyProductId(String(shopifyProductId))
    }));
}

function getCategoryStatus(status: unknown, fallback: ShopifyCategoryStatus = 'active'): ShopifyCategoryStatus {
    if (status === undefined || status === null || status === '') {
        return fallback;
    }
    if (status === 'active' || status === 'inactive') {
        return status;
    }

    throw Response.createError({
        message: 'Category status must be active or inactive',
        code: StatusCodes.UNPROCESSABLE_ENTITY,
        name: 'ShopifyCategoryStatusInvalid'
    });
}

export default class SharedShopifyCollectionService {
    static normalizeShopifyProductId(shopifyProductId: string | number): string {
        return normalizeShopifyProductId(shopifyProductId);
    }

    static normalizeCategoryProducts(body: Record<string, unknown>): CategoryProductInput[] {
        return normalizeCategoryProducts(body);
    }

    static async syncProducts(): Promise<ShopifySyncSummary> {
        const maxCreatedAtRow = await knexInstance('shopify_products')
            .max<{ max_created_at?: Date | string | null }>('shopify_created_at as max_created_at')
            .first();
        const createdAtMin = maxCreatedAtRow?.max_created_at
            ? new Date(maxCreatedAtRow.max_created_at).toISOString()
            : null;
        const products = await SharedShopifyCollectionService.fetchProductsFromShopify(createdAtMin);

        const summary: ShopifySyncSummary = {
            synced: 0,
            skipped: 0,
            errors: []
        };

        for (const product of products) {
            try {
                await SharedShopifyCollectionService.upsertProduct(product);
                summary.synced += 1;
            } catch (error: unknown) {
                summary.errors.push({
                    shopify_product_id: normalizeShopifyProductId(product.id),
                    message: error instanceof Error ? error.message : 'Product sync failed'
                });
            }
        }

        return summary;
    }

    static async syncProduct(shopifyProductId: any): Promise<ShopifyProduct> {
        const product = await SharedShopifyCollectionService.fetchProductFromShopify(shopifyProductId);
        const id = await SharedShopifyCollectionService.upsertProduct(product);
        return await knexInstance('shopify_products').where({ id }).first() as ShopifyProduct;
    }

    static async listProducts(
        query: ProductListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: ShopifyProduct[], status: boolean, extra: GPagination }> {
        const paginationQuery = buildPaginationQuery(query);
        const dbQuery = knexInstance('shopify_products').select('*').orderBy('shopify_created_at', 'desc').orderBy('id', 'desc');

        if (query.search) {
            const search = String(query.search).trim();
            dbQuery.where((builder) => {
                builder.where('title', 'like', `%${search}%`)
                    .orWhere('shopify_product_id', 'like', `%${search}%`);
            });
        }
        if (query.vendor) {
            dbQuery.whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.vendor')) = ?", [String(query.vendor)]);
        }
        if (query.product_type) {
            dbQuery.whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.product_type')) = ?", [String(query.product_type)]);
        }
        if (query.status) {
            dbQuery.whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.status')) = ?", [String(query.status)]);
        }
        if (query.shopify_created_at_from) {
            dbQuery.where('shopify_created_at', '>=', new Date(String(query.shopify_created_at_from)));
        }
        if (query.shopify_created_at_to) {
            dbQuery.where('shopify_created_at', '<=', new Date(String(query.shopify_created_at_to)));
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<ShopifyProduct>(dbQuery, paginationQuery);
        return { data, status: true, extra };
    }

    static async listCategories(
        query: CategoryListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: ShopifyCategory[], status: boolean, extra: GPagination }> {
        const paginationQuery = buildPaginationQuery(query);
        const dbQuery = knexInstance('shopify_categories').select('*').orderBy('sort_order', 'asc').orderBy('id', 'desc');

        if (query.status) {
            dbQuery.where('status', getCategoryStatus(query.status));
        }
        if (query.search) {
            dbQuery.where('title', 'like', `%${String(query.search).trim()}%`);
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<ShopifyCategory>(dbQuery, paginationQuery);
        return { data, status: true, extra };
    }

    static async getCategory(id: number, trx: Knex.Transaction | null = null): Promise<ShopifyCategory | null> {
        const dbQuery = knexInstance('shopify_categories').select('*').where({ id });
        if (trx) {
            dbQuery.transacting(trx);
        }

        return await dbQuery.first() as ShopifyCategory | null;
    }

    static async saveCategory(
        data: Partial<ShopifyCategory>,
        trx: Knex.Transaction
    ): Promise<ShopifyCategory> {
        const now = new Date();
        const existing = data.id
            ? await trx('shopify_categories').where({ id: data.id }).first() as ShopifyCategory | undefined
            : undefined;

        if (data.id && !existing) {
            throw Response.createError({
                message: 'Category not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyCategoryNotFound'
            });
        }

        const payload = {
            title: String(data.title ?? existing?.title ?? '').trim(),
            description: data.description === undefined ? existing?.description || null : data.description || null,
            status: getCategoryStatus(data.status, existing?.status || 'active'),
            sort_order: data.sort_order === undefined ? existing?.sort_order || 0 : Number(data.sort_order),
            updated_at: now
        };

        if (!payload.title) {
            throw Response.createError({
                message: 'Category title is required',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'ShopifyCategoryTitleRequired'
            });
        }

        if (data.id) {
            await trx('shopify_categories').where({ id: data.id }).update(payload);
            return await trx('shopify_categories').where({ id: data.id }).first() as ShopifyCategory;
        }

        const [id] = await trx('shopify_categories').insert({
            ...payload,
            created_at: now
        }) as [number];
        return await trx('shopify_categories').where({ id }).first() as ShopifyCategory;
    }

    static async deleteCategory(id: number, trx: Knex.Transaction): Promise<number> {
        const deleted = await trx('shopify_categories').where({ id }).del();
        if (deleted === 0) {
            throw Response.createError({
                message: 'Category not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyCategoryNotFound'
            });
        }

        return id;
    }

    static async listCategoryProducts(
        categoryId: number,
        query: Partial<GPagination>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: ShopifyCategoryProductWithProduct[], status: boolean, extra: GPagination }> {
        await SharedShopifyCollectionService.ensureCategoryExists(categoryId, trx);

        const paginationQuery = buildPaginationQuery(query);
        const dbQuery = knexInstance('shopify_category_products as scp')
            .select(
                'scp.*',
                'sp.id as product_internal_id',
                'sp.title',
                'sp.price',
                'sp.url',
                'sp.image_url',
                'sp.meta',
                'sp.shopify_created_at',
                'sp.synced_at',
                'sp.created_at as product_created_at',
                'sp.updated_at as product_updated_at'
            )
            .leftJoin('shopify_products as sp', 'scp.shopify_product_id', 'sp.shopify_product_id')
            .where('scp.shopify_category_id', categoryId)
            .orderBy('scp.sort_order', 'asc')
            .orderBy('scp.id', 'asc');

        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<Record<string, unknown>>(dbQuery, paginationQuery);
        return {
            data: data.map((row) => ({
                id: Number(row.id),
                shopify_category_id: Number(row.shopify_category_id),
                shopify_product_id: String(row.shopify_product_id),
                sort_order: Number(row.sort_order),
                created_at: row.created_at as Date | undefined,
                product: row.product_internal_id ? {
                    id: Number(row.product_internal_id),
                    shopify_product_id: String(row.shopify_product_id),
                    title: String(row.title),
                    price: row.price as string | number,
                    url: row.url as string | null,
                    image_url: row.image_url as string | null,
                    meta: row.meta as ShopifyProductMeta | string | null,
                    shopify_created_at: row.shopify_created_at as Date | string | null,
                    synced_at: row.synced_at as Date | string | null,
                    created_at: row.product_created_at as Date | undefined,
                    updated_at: row.product_updated_at as Date | undefined
                } : null
            })),
            status: true,
            extra
        };
    }

    static async addProductsToCategory(
        categoryId: number,
        products: CategoryProductInput[],
        trx: Knex.Transaction
    ): Promise<ShopifyCategoryProduct[]> {
        await SharedShopifyCollectionService.ensureCategoryExists(categoryId, trx);
        const now = new Date();
        const normalizedProducts = products
            .map((product) => ({
                ...product,
                shopify_product_id: normalizeShopifyProductId(product.shopify_product_id)
            }))
            .filter((product) => Boolean(product.shopify_product_id));

        if (normalizedProducts.length === 0) {
            throw Response.createError({
                message: 'shopify_product_ids or products are required',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'ShopifyCategoryProductsRequired'
            });
        }

        const productIds = normalizedProducts.map((product) => product.shopify_product_id);
        const existingProducts = await trx('shopify_products')
            .select('shopify_product_id')
            .whereIn('shopify_product_id', productIds) as Array<{ shopify_product_id: string }>;
        const existingProductIds = new Set(existingProducts.map((product) => product.shopify_product_id));
        const missingProductIds = productIds.filter((shopifyProductId) => !existingProductIds.has(shopifyProductId));

        if (missingProductIds.length > 0) {
            throw Response.createError({
                message: 'Some Shopify products are not synced locally',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'ShopifyProductsMissing',
                data: missingProductIds
            });
        }

        for (const product of normalizedProducts) {
            const payload = {
                shopify_category_id: categoryId,
                shopify_product_id: product.shopify_product_id,
                sort_order: Number.isFinite(Number(product.sort_order)) ? Number(product.sort_order) : 0
            };
            const existing = await trx('shopify_category_products')
                .where({
                    shopify_category_id: categoryId,
                    shopify_product_id: product.shopify_product_id
                })
                .first() as ShopifyCategoryProduct | undefined;

            if (existing) {
                await trx('shopify_category_products').where({ id: existing.id }).update({ sort_order: payload.sort_order });
            } else {
                await trx('shopify_category_products').insert({
                    ...payload,
                    created_at: now
                });
            }

            if (product.image_url) {
                await trx('shopify_products')
                    .where({ shopify_product_id: product.shopify_product_id })
                    .update({ image_url: product.image_url, updated_at: now });
            }
        }

        return await trx('shopify_category_products')
            .where({ shopify_category_id: categoryId })
            .whereIn('shopify_product_id', productIds)
            .orderBy('sort_order', 'asc') as ShopifyCategoryProduct[];
    }

    static async removeProductFromCategory(
        categoryId: number,
        shopifyProductId: string,
        trx: Knex.Transaction
    ): Promise<string> {
        await SharedShopifyCollectionService.ensureCategoryExists(categoryId, trx);
        const normalizedProductId = normalizeShopifyProductId(shopifyProductId);
        const deleted = await trx('shopify_category_products')
            .where({
                shopify_category_id: categoryId,
                shopify_product_id: normalizedProductId
            })
            .del();

        if (deleted === 0) {
            throw Response.createError({
                message: 'Category product not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyCategoryProductNotFound'
            });
        }

        return normalizedProductId;
    }

    static async reorderCategoryProducts(
        categoryId: number,
        products: ReorderInput[],
        trx: Knex.Transaction
    ): Promise<ShopifyCategoryProduct[]> {
        await SharedShopifyCollectionService.ensureCategoryExists(categoryId, trx);
        if (!Array.isArray(products) || products.length === 0) {
            throw Response.createError({
                message: 'products are required',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'ShopifyCategoryProductReorderRequired'
            });
        }

        for (const product of products) {
            await trx('shopify_category_products')
                .where({
                    shopify_category_id: categoryId,
                    shopify_product_id: normalizeShopifyProductId(product.shopify_product_id)
                })
                .update({ sort_order: Number(product.sort_order) });
        }

        return await trx('shopify_category_products')
            .where({ shopify_category_id: categoryId })
            .orderBy('sort_order', 'asc')
            .orderBy('id', 'asc') as ShopifyCategoryProduct[];
    }

    private static async ensureCategoryExists(categoryId: number, trx: Knex.Transaction | null = null) {
        const category = await SharedShopifyCollectionService.getCategory(categoryId, trx);
        if (!category) {
            throw Response.createError({
                message: 'Category not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyCategoryNotFound'
            });
        }
    }

    private static async upsertProduct(product: ShopifyRestProduct): Promise<number> {
        const shopifyProductId = normalizeShopifyProductId(product.id);
        const existing = await knexInstance('shopify_products')
            .where({ shopify_product_id: shopifyProductId })
            .first() as ShopifyProduct | undefined;
        const payload = mapShopifyProduct(product, existing?.image_url || null);

        if (existing) {
            await knexInstance('shopify_products').where({ id: existing.id }).update(payload);
            return existing.id;
        }

        const [id] = await knexInstance('shopify_products').insert({
            ...payload,
            created_at: new Date()
        }) as [number];
        return id;
    }

    private static async fetchProductsFromShopify(createdAtMin: string | null): Promise<ShopifyRestProduct[]> {
        const products: ShopifyRestProduct[] = [];
        let pageInfo: string | null = null;

        do {
            const response = await SharedShopifyCollectionService.shopifyRestGet<ShopifyProductsRestResponse>(
                '/products.json',
                pageInfo
                    ? { limit: 250, page_info: pageInfo }
                    : {
                        limit: 250,
                        ...(createdAtMin ? { created_at_min: createdAtMin } : {})
                    }
            );
            products.push(...(response.data.products || []));
            pageInfo = getNextPageInfo(response.headers.link as string | undefined);
        } while (pageInfo);

        return products;
    }

    private static async fetchProductFromShopify(shopifyProductId: string): Promise<ShopifyRestProduct> {
        const productId = normalizeShopifyProductId(shopifyProductId);
        const response = await SharedShopifyCollectionService.shopifyRestGet<ShopifyProductRestResponse>(
            `/products/${productId}.json`,
            {}
        );

        if (!response.data.product) {
            throw Response.createError({
                message: 'Shopify product not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyProductNotFound'
            });
        }

        return response.data.product;
    }

    private static async shopifyRestGet<TData>(
        path: string,
        params: Record<string, string | number>
    ) {
        const shopDomain = config.shopify.adminShopDomain;
        if (!shopDomain) {
            throw Response.createError({
                message: 'Shopify Admin shop domain is missing',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyAdminApiConfigMissing'
            });
        }

        const adminAccessToken = await SharedShopifyAdminTokenService.getDecryptedAccessToken(shopDomain);
        if (!adminAccessToken) {
            throw Response.createError({
                message: 'Shopify Admin access token is missing. Please generate and store it first.',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyAdminAccessTokenMissing'
            });
        }

        try {
            return await axios.get<TData>(
                `https://${SharedShopifyAdminTokenService.normalizeShopDomain(shopDomain)}/admin/api/${config.shopify.adminApiVersion}${path}`,
                {
                    headers: {
                        'X-Shopify-Access-Token': adminAccessToken,
                        'Content-Type': 'application/json'
                    },
                    params
                }
            );
        } catch (error: unknown) {
            if (isGError(error)) {
                throw error;
            }

            throw toShopifyError(error, 'Shopify product request failed');
        }
    }
}
