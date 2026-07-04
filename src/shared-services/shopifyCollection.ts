import axios from 'axios';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import striptags from 'striptags';
import config from '../config';
import Response from '../lib/api-response';
import pagination from '../lib/pagination';
import SharedShopifyAdminTokenService from './shopifyAdminToken';
import {
    ShopifyCategory,
    ShopifyCategoryProduct,
    ShopifyCategoryProductWithProduct,
    ShopifyCategoryStatus,
    ShopifyCategoryWithProducts,
    ShopifyProduct,
    ShopifyProductMeta,
    ShopifyRelatedProduct,
    ShopifyRestProduct
} from '../types/shopifyCollection';
import { isGError, toShopifyError } from '../api/admin/modules/shopify-apis/utils';

type ProductListQuery = Partial<Record<keyof (ShopifyProduct & GPagination), ShopifyProduct[keyof ShopifyProduct]>> & {
    search?: string;
    vendor?: string;
    product_type?: string;
    status?: string;
    style_no?: string;
    shopify_created_at_from?: string;
    shopify_created_at_to?: string;
};

type CategoryListQuery = Partial<Record<keyof (ShopifyCategory & GPagination), ShopifyCategory[keyof ShopifyCategory]>> & {
    search?: string;
};

type ShopifyAdminGraphqlResponse<TData> = {
    data?: TData;
    errors?: GTypeAll;
};

type ShopifyAdminMoney = {
    amount?: string | null;
    currencyCode?: string | null;
};

type ShopifyAdminImage = {
    url?: string | null;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
};

type ShopifyAdminMetafieldReference = {
    id?: string | null;
    handle?: string | null;
};

type ShopifyAdminMetafield = {
    namespace?: string | null;
    key?: string | null;
    type?: string | null;
    value?: string | null;
    references?: {
        nodes?: ShopifyAdminMetafieldReference[];
    } | null;
};

type ShopifyAdminVariant = {
    id?: string | null;
    title?: string | null;
    sku?: string | null;
    price?: string | null;
    compareAtPrice?: string | null;
    availableForSale?: boolean | null;
    inventoryQuantity?: number | null;
    barcode?: string | null;
    selectedOptions?: Array<{ name?: string | null; value?: string | null }>;
    image?: Pick<ShopifyAdminImage, 'url' | 'altText'> | null;
};

type ShopifyAdminProduct = {
    id: string;
    title: string;
    handle?: string | null;
    descriptionHtml?: string | null;
    vendor?: string | null;
    productType?: string | null;
    status?: string | null;
    tags?: string[] | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    publishedAt?: string | null;
    totalInventory?: number | null;
    priceRangeV2?: {
        minVariantPrice?: ShopifyAdminMoney | null;
        maxVariantPrice?: ShopifyAdminMoney | null;
    } | null;
    featuredImage?: ShopifyAdminImage | null;
    images?: {
        nodes?: ShopifyAdminImage[];
    } | null;
    variants?: {
        nodes?: ShopifyAdminVariant[];
    } | null;
    options?: Array<{
        id?: string | null;
        name?: string | null;
        values?: string[] | null;
    }>;
    metafields?: {
        nodes?: ShopifyAdminMetafield[];
    } | null;
    seo?: {
        title?: string | null;
        description?: string | null;
    } | null;
};

type ShopifyAdminProductsResponse = {
    products?: {
        nodes?: ShopifyAdminProduct[];
        pageInfo?: {
            hasNextPage?: boolean;
            endCursor?: string | null;
        };
    } | null;
};

type ShopifyAdminProductResponse = {
    product?: ShopifyAdminProduct | null;
};

type ShopifySyncSummary = {
    synced: number;
    skipped: number;
    deleted: number;
    removed_from_collections: number;
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

type ShopifyProductMetafield = Record<string, unknown> & {
    namespace?: string | null;
    key?: string | null;
    type?: string | null;
    value?: unknown;
    references?: unknown[] | { nodes?: unknown[] } | null;
};

const SHOPIFY_ADMIN_PRODUCT_FIELDS = `
    id
    title
    handle
    descriptionHtml
    vendor
    productType
    status
    tags
    createdAt
    updatedAt
    publishedAt
    totalInventory
    priceRangeV2 {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
    }
    featuredImage { url altText width height }
    images(first: 20) {
        nodes { url altText width height }
    }
    variants(first: 100) {
        nodes {
            id
            title
            sku
            price
            compareAtPrice
            availableForSale
            inventoryQuantity
            barcode
            selectedOptions { name value }
            image { url altText }
        }
    }
    options {
        id
        name
        values
    }
    metafields(first: 30) {
        nodes {
            namespace
            key
            type
            value
            references(first: 10) {
                nodes {
                    ... on Metaobject {
                        id
                        handle
                    }
                }
            }
        }
    }
    seo { title description }
`;

const SHOPIFY_ACTIVE_PRODUCT_STATUS = 'ACTIVE';
const SHOPIFY_ACTIVE_PRODUCT_QUERY = 'status:active';

function normalizeShopifyProductId(shopifyProductId: string | number): string {
    const value = String(shopifyProductId).trim();
    const gidMatch = value.match(/gid:\/\/shopify\/Product\/(\d+)$/);
    return gidMatch ? gidMatch[1] : value;
}

function toShopifyProductGid(shopifyProductId: string | number): string {
    const value = String(shopifyProductId).trim();
    if (value.startsWith('gid://shopify/Product/')) {
        return value;
    }

    return `gid://shopify/Product/${normalizeShopifyProductId(value)}`;
}

function buildPaginationQuery(query: Partial<Record<keyof GPagination, unknown>>): GPagination {
    return {
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 100,
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

function getProductHandle(product: ShopifyRestProduct): string | null {
    return product.handle || null;
}

function isActiveShopifyProduct(product: ShopifyRestProduct): boolean {
    return String(product.status || '').trim().toUpperCase() === SHOPIFY_ACTIVE_PRODUCT_STATUS;
}

function getStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function getPlainText(value: unknown): string | null {
    const html = getStringValue(value);
    if (!html) {
        return null;
    }

    const text = striptags(html)
        .replace(/\s+/g, ' ')
        .trim();

    return text || null;
}

function normalizeTags(tags: unknown): string | null {
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter(Boolean).join(', ');
    }

    return typeof tags === 'string' && tags.trim() ? tags : null;
}

function parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function parseProductMeta(meta: ShopifyProductMeta | string | null | undefined): ShopifyProductMeta {
    if (!meta) {
        return {};
    }
    if (typeof meta !== 'string') {
        return meta;
    }

    const parsed = parseJsonValue(meta);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as ShopifyProductMeta : {};
}

function getProductCurrency(meta: ShopifyProductMeta): string | null {
    const priceRange = meta.price_range as {
        min_variant_price?: { currencyCode?: string | null } | null;
    } | undefined;
    const priceRangeV2 = meta.priceRangeV2 as {
        minVariantPrice?: { currencyCode?: string | null } | null;
    } | undefined;

    return getStringValue(meta.currencyCode)
        || getStringValue(meta.currency)
        || getStringValue(priceRange?.min_variant_price?.currencyCode)
        || getStringValue(priceRangeV2?.minVariantPrice?.currencyCode);
}

function mapRelatedProduct(row: ShopifyProduct): ShopifyRelatedProduct {
    const meta = parseProductMeta(row.meta);
    const handle = getStringValue(meta.handle);
    const vendor = getStringValue(meta.vendor);
    const productType = getStringValue(meta.productType) || getStringValue(meta.product_type);
    const currency = getProductCurrency(meta);

    return {
        id: Number(row.id),
        shopify_product_id: String(row.shopify_product_id),
        title: row.title,
        price: row.price,
        url: row.url || (handle ? `/${handle}` : null),
        image_url: row.image_url || null,
        meta: {
            ...meta,
            ...(handle ? { handle } : {}),
            ...(currency ? { currencyCode: currency, currency } : {}),
            ...(vendor ? { vendor } : {}),
            ...(productType ? { productType } : {})
        }
    };
}

function getMetafieldReferences(metafield: ShopifyProductMetafield): unknown[] {
    if (Array.isArray(metafield.references)) {
        return metafield.references;
    }

    if (metafield.references && typeof metafield.references === 'object') {
        const references = metafield.references as { nodes?: unknown[] };
        return Array.isArray(references.nodes) ? references.nodes : [];
    }

    return [];
}

function parseShopifyProductMetafieldValue(metafield: ShopifyProductMetafield): unknown {
    const type = typeof metafield.type === 'string' ? metafield.type : '';
    const value = metafield.value;
    const references = getMetafieldReferences(metafield);

    if (type === 'list.metaobject_reference' || type === 'list.mixed_reference') {
        const handles = references
            .map((reference) => (reference as { handle?: unknown })?.handle)
            .filter((handle): handle is string => typeof handle === 'string' && Boolean(handle.trim()));

        return handles.length > 0 ? handles : parseJsonValue(value);
    }

    if (type === 'metaobject_reference' || type === 'mixed_reference') {
        const reference = references[0] as { handle?: unknown } | undefined;
        return typeof reference?.handle === 'string' && reference.handle.trim() ? reference.handle : value;
    }

    const jsonValueTypes = new Set([
        'list.product_reference',
        'list.collection_reference',
        'list.page_reference',
        'list.article_reference',
        'list.variant_reference',
        'list.customer_reference',
        'list.file_reference',
        'list.single_line_text_field',
        'list.url',
        'list.id',
        'list.color',
        'list.date',
        'list.date_time',
        'money',
        'rating',
        'list.rating',
        'link',
        'list.link',
        'rich_text_field',
        'json'
    ]);

    if (jsonValueTypes.has(type)) {
        return parseJsonValue(value);
    }

    if (type === 'boolean') {
        return value === true || value === 'true';
    }

    if (type === 'number_integer') {
        return parseInt(String(value), 10);
    }

    if (type === 'number_decimal') {
        return parseFloat(String(value));
    }

    if (type === 'list.number_integer') {
        const parsed = parseJsonValue(value);
        return Array.isArray(parsed) ? parsed.map((item) => parseInt(String(item), 10)) : value;
    }

    if (type === 'list.number_decimal') {
        const parsed = parseJsonValue(value);
        return Array.isArray(parsed) ? parsed.map((item) => parseFloat(String(item))) : value;
    }

    const measurementTypes = [
        'dimension', 'weight', 'volume', 'area', 'speed', 'temperature',
        'energy', 'power', 'pressure', 'duration', 'distance', 'frequency',
        'voltage', 'mass_flow_rate', 'data_storage_capacity', 'data_transfer_rate',
        'resolution', 'concentration', 'sound_level', 'luminous_flux',
        'rotational_speed', 'battery_charge_capacity', 'battery_energy_capacity',
        'display_density', 'inductance', 'capacitance', 'electric_current',
        'electrical_resistance', 'thermal_power', 'volumetric_flow_rate',
        'antenna_gain', 'illuminance'
    ];

    if (measurementTypes.includes(type) || measurementTypes.some((measurementType) => type === `list.${measurementType}`)) {
        return parseJsonValue(value);
    }

    return parseJsonValue(value);
}

function mapShopifyProductMetafields(metafields: unknown): ShopifyProductMeta['metafields'] {
    if (!Array.isArray(metafields)) {
        return [];
    }

    return metafields
        .filter((metafield): metafield is ShopifyProductMetafield => Boolean(metafield && typeof metafield === 'object'))
        .map((metafield) => ({
            namespace: metafield.namespace || null,
            key: metafield.key || null,
            type: metafield.type || null,
            value: parseShopifyProductMetafieldValue(metafield),
            references: getMetafieldReferences(metafield)
        }));
}

function mapShopifyAdminImage(image: ShopifyAdminImage, index: number) {
    return {
        id: image.url || undefined,
        src: image.url || null,
        url: image.url || null,
        alt: image.altText || null,
        altText: image.altText || null,
        width: image.width || null,
        height: image.height || null,
        position: index + 1
    };
}

function mapShopifyAdminProduct(product: ShopifyAdminProduct): ShopifyRestProduct {
    const images = (product.images?.nodes || []).map(mapShopifyAdminImage);
    const featuredImage = product.featuredImage ? mapShopifyAdminImage(product.featuredImage, 0) : null;
    const variants = (product.variants?.nodes || []).map((variant) => ({
        id: variant.id || undefined,
        title: variant.title || null,
        price: variant.price || null,
        compare_at_price: variant.compareAtPrice || null,
        compareAtPrice: variant.compareAtPrice || null,
        sku: variant.sku || null,
        available_for_sale: variant.availableForSale ?? null,
        availableForSale: variant.availableForSale ?? null,
        inventory_quantity: variant.inventoryQuantity ?? null,
        inventoryQuantity: variant.inventoryQuantity ?? null,
        barcode: variant.barcode || null,
        selected_options: variant.selectedOptions || [],
        selectedOptions: variant.selectedOptions || [],
        image: variant.image ? {
            src: variant.image.url || null,
            url: variant.image.url || null,
            alt: variant.image.altText || null,
            altText: variant.image.altText || null
        } : null
    }));
    const metafields = (product.metafields?.nodes || []).map((metafield) => ({
        namespace: metafield.namespace || null,
        key: metafield.key || null,
        type: metafield.type || null,
        value: metafield.value || null,
        references: metafield.references?.nodes || []
    }));

    return {
        id: product.id,
        title: product.title,
        handle: product.handle || null,
        vendor: product.vendor || null,
        product_type: product.productType || null,
        tags: normalizeTags(product.tags),
        status: product.status || null,
        created_at: product.createdAt || null,
        updated_at: product.updatedAt || null,
        images,
        image: featuredImage || images[0] || null,
        variants,
        description_html: product.descriptionHtml || null,
        descriptionHtml: product.descriptionHtml || null,
        published_at: product.publishedAt || null,
        publishedAt: product.publishedAt || null,
        total_inventory: product.totalInventory ?? null,
        totalInventory: product.totalInventory ?? null,
        price_range: {
            min_variant_price: product.priceRangeV2?.minVariantPrice || null,
            max_variant_price: product.priceRangeV2?.maxVariantPrice || null
        },
        priceRangeV2: product.priceRangeV2 || null,
        featured_image: featuredImage,
        featuredImage: product.featuredImage || null,
        options: product.options || [],
        metafields,
        seo: product.seo || null
    };
}

function getMetafieldValue(product: ShopifyRestProduct, key: string): string | null {
    const metafields = Array.isArray(product.metafields) ? product.metafields : [];
    const metafield = metafields.find((item) => {
        if (!item || typeof item !== 'object') {
            return false;
        }
        const row = item as Record<string, unknown>;
        return String(row.key || '').trim().toLowerCase() === key.toLowerCase();
    }) as Record<string, unknown> | undefined;
    const references = metafield?.references && typeof metafield.references === 'object'
        ? (metafield.references as { nodes?: Array<{ handle?: string | null }> }).nodes || []
        : [];
    const referenceHandles = references
        .map((reference) => reference.handle)
        .filter((handle): handle is string => Boolean(handle && handle.trim()));
    if (referenceHandles.length > 0) {
        return referenceHandles.join(', ');
    }

    return metafield?.value ? String(metafield.value).trim() || null : null;
}

function getOptionValue(product: ShopifyRestProduct, optionName: string): string | null {
    const options = Array.isArray(product.options) ? product.options : [];
    const option = options.find((item) => {
        if (!item || typeof item !== 'object') {
            return false;
        }
        const row = item as Record<string, unknown>;
        return String(row.name || '').toLowerCase() === optionName.toLowerCase();
    }) as Record<string, unknown> | undefined;
    const values = Array.isArray(option?.values) ? option.values.map((value) => String(value).trim()).filter(Boolean) : [];

    return values.length > 0 ? values.join(', ') : null;
}

function getProductGender(product: ShopifyRestProduct): string | null {
    // @ts-ignore
    const genderMetafield = product.metafields?.find(
        (m: any) => m.namespace === "shopify" && m.key === "target-gender"
    );

    return genderMetafield?.references?.[0]?.handle ?? null;
}

function getProductSeo(product: ShopifyRestProduct): { seo_title: string | null; seo_description: string | null } {
    const seo = product.seo && typeof product.seo === 'object'
        ? product.seo as { title?: string | null; description?: string | null }
        : null;

    return {
        seo_title: getStringValue(seo?.title) || product.title || null,
        seo_description: getStringValue(seo?.description)
            || getPlainText(product.description_html)
            || getPlainText(product.descriptionHtml)
            || getPlainText(product.body_html)
            || null
    };
}

function mapShopifyProduct(product: ShopifyRestProduct, existingImageUrl?: string | null) {
    const now = new Date();
    const seo = getProductSeo(product);
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
            position: image.position || null,
            url: image.url || null,
            altText: image.altText || null,
            width: image.width || null,
            height: image.height || null
        })),
        variants: (product.variants || []).map((variant) => ({
            id: variant.id,
            price: variant.price || null,
            title: variant.title || null,
            sku: variant.sku || null,
            compare_at_price: variant.compare_at_price || null,
            compareAtPrice: variant.compareAtPrice || null,
            available_for_sale: variant.available_for_sale ?? null,
            availableForSale: variant.availableForSale ?? null,
            inventory_quantity: variant.inventory_quantity ?? null,
            inventoryQuantity: variant.inventoryQuantity ?? null,
            barcode: variant.barcode || null,
            selected_options: variant.selected_options || [],
            selectedOptions: variant.selectedOptions || [],
            image: variant.image || null
        })),
        description_html: product.description_html || product.descriptionHtml || null,
        published_at: product.published_at || product.publishedAt || null,
        updated_at: product.updated_at || null,
        total_inventory: product.total_inventory || product.totalInventory || null,
        price_range: product.price_range || product.priceRangeV2 || null,
        featured_image: product.featured_image || product.featuredImage || null,
        options: Array.isArray(product.options) ? product.options : [],
        metafields: mapShopifyProductMetafields(product.metafields),
        seo: product.seo || null
    };

    return {
        shopify_product_id: normalizeShopifyProductId(product.id),
        title: product.title,
        price: getLowestVariantPrice(product),
        url: getProductHandle(product),
        image_url: existingImageUrl || getPrimaryImageUrl(product),
        gender: getProductGender(product),
        seo_title: seo.seo_title,
        seo_description: seo.seo_description,
        meta: JSON.stringify(meta),
        shopify_created_at: product.created_at ? new Date(product.created_at) : null,
        shopify_updated_at: product.updated_at ? new Date(product.updated_at) : null,
        synced_at: now,
        updated_at: now
    };
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

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function resolveCategorySlug(
    trx: Knex.Transaction,
    rawSlug: string,
    currentCategoryId: number | null,
    allowSuffix: boolean
): Promise<string> {
    const baseSlug = slugify(rawSlug);
    if (!baseSlug) {
        throw Response.createError({
            message: 'Category slug is required',
            code: StatusCodes.UNPROCESSABLE_ENTITY,
            name: 'ShopifyCategorySlugRequired'
        });
    }

    let slug = baseSlug;
    let suffix = 2;

    while (true) {
        const query = trx('shopify_categories').select('id').where({ slug });
        if (currentCategoryId) {
            query.whereNot({ id: currentCategoryId });
        }

        const existing = await query.first() as { id: number } | undefined;
        if (!existing) {
            return slug;
        }

        if (!allowSuffix) {
            throw Response.createError({
                message: 'Category slug already exists',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'ShopifyCategorySlugExists'
            });
        }

        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
    }
}

export default class SharedShopifyCollectionService {
    static normalizeShopifyProductId(shopifyProductId: string | number): string {
        return normalizeShopifyProductId(shopifyProductId);
    }

    static normalizeCategoryProducts(body: Record<string, unknown>): CategoryProductInput[] {
        return normalizeCategoryProducts(body);
    }

    static async syncProducts(): Promise<ShopifySyncSummary> {
        const products = await SharedShopifyCollectionService.fetchProductsFromShopify();

        const summary: ShopifySyncSummary = {
            synced: 0,
            skipped: 0,
            deleted: 0,
            removed_from_collections: 0,
            errors: []
        };

        await knexInstance.transaction(async (trx) => {
            for (const product of products) {
                try {
                    await SharedShopifyCollectionService.upsertProduct(product, trx);
                    summary.synced += 1;
                } catch (error: unknown) {
                    summary.errors.push({
                        shopify_product_id: normalizeShopifyProductId(product.id),
                        message: error instanceof Error ? error.message : 'Product sync failed'
                    });
                }
            }

            const cleanup = await SharedShopifyCollectionService.deleteProductsMissingFromShopify(
                products.map((product) => normalizeShopifyProductId(product.id)),
                trx
            );
            summary.deleted = cleanup.deleted;
            summary.removed_from_collections = cleanup.removed_from_collections;
        });

        return summary;
    }

    static async syncProduct(shopifyProductId: string): Promise<ShopifyProduct> {
        let product: ShopifyRestProduct;
        try {
            product = await SharedShopifyCollectionService.fetchProductFromShopify(shopifyProductId);
        } catch (error: unknown) {
            if (isGError(error) && error.name === 'ShopifyProductNotFound') {
                await knexInstance.transaction(async (trx) => {
                    await SharedShopifyCollectionService.deleteProductsByShopifyIds([normalizeShopifyProductId(shopifyProductId)], trx);
                });
            }
            throw error;
        }

        if (!isActiveShopifyProduct(product)) {
            await knexInstance.transaction(async (trx) => {
                await SharedShopifyCollectionService.deleteProductsByShopifyIds([normalizeShopifyProductId(product.id)], trx);
            });
            throw Response.createError({
                message: 'Shopify product is not active',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyProductNotActive'
            });
        }

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
            dbQuery.whereRaw('JSON_UNQUOTE(JSON_EXTRACT(meta, \'$.vendor\')) = ?', [String(query.vendor)]);
        }
        if (query.product_type) {
            dbQuery.whereRaw('JSON_UNQUOTE(JSON_EXTRACT(meta, \'$.product_type\')) = ?', [String(query.product_type)]);
        }
        if (query.status) {
            dbQuery.whereRaw('JSON_UNQUOTE(JSON_EXTRACT(meta, \'$.status\')) = ?', [String(query.status)]);
        }
        const styleNo = query.style_no;
        if (styleNo) {
            dbQuery.whereRaw(
                'JSON_CONTAINS(JSON_EXTRACT(meta, \'$.metafields\'), JSON_OBJECT(\'namespace\', \'custom\', \'key\', \'style_no\', \'value\', ?))',
                [String(styleNo).trim()]
            );
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
            const search = String(query.search).trim();
            dbQuery.where((builder) => {
                builder.where('title', 'like', `%${search}%`)
                    .orWhere('slug', 'like', `%${search}%`);
            });
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

    static async getCategoryBySlug(
        slug: string,
        trx: Knex.Transaction | null = null,
        activeOnly = false,
        includeProducts = false
    ): Promise<ShopifyCategoryWithProducts | null> {
        const dbQuery = knexInstance('shopify_categories').select('*').where({ slug: slugify(slug) });
        if (activeOnly) {
            dbQuery.where({ status: 'active' });
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const category = await dbQuery.first() as ShopifyCategoryWithProducts | null;
        if (!category || !includeProducts) {
            return category;
        }

        const { data: products } = await SharedShopifyCollectionService.listCategoryProducts(
            category.id,
            { isAll: true, getTotal: false },
            trx
        );
        category.products = products;

        return category;
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
            slug: '',
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

        const incomingSlug = data.slug === undefined || data.slug === null ? '' : String(data.slug).trim();
        if (data.id) {
            payload.slug = incomingSlug
                ? await resolveCategorySlug(trx, incomingSlug, Number(data.id), false)
                : existing?.slug || await resolveCategorySlug(trx, payload.title, Number(data.id), true);
        } else {
            payload.slug = await resolveCategorySlug(trx, incomingSlug || payload.title, null, !incomingSlug);
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
                'sp.gender',
                'sp.seo_title',
                'sp.seo_description',
                'sp.meta',
                'sp.shopify_created_at',
                'sp.shopify_updated_at',
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
                    gender: row.gender as string | null,
                    seo_title: row.seo_title as string | null,
                    seo_description: row.seo_description as string | null,
                    meta: row.meta as ShopifyProductMeta | string | null,
                    shopify_created_at: row.shopify_created_at as Date | string | null,
                    shopify_updated_at: row.shopify_updated_at as Date | string | null,
                    synced_at: row.synced_at as Date | string | null,
                    created_at: row.product_created_at as Date | undefined,
                    updated_at: row.product_updated_at as Date | undefined
                } : null
            })),
            status: true,
            extra
        };
    }

    static async getCollectionBySlug(
        slug: string,
        query: Partial<GPagination>,
        activeOnly = true
    ): Promise<{ category: ShopifyCategory; products: ShopifyCategoryProductWithProduct[]; extra: GPagination }> {
        const category = await SharedShopifyCollectionService.getCategoryBySlug(slug, null, activeOnly);
        if (!category) {
            throw Response.createError({
                message: 'Collection not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyCollectionNotFound'
            });
        }

        const { data: products, extra } = await SharedShopifyCollectionService.listCategoryProducts(category.id, query);
        return { category, products, extra };
    }

    static async getRelatedProducts(shopifyProductId: string, limit = 12): Promise<ShopifyRelatedProduct[]> {
        const normalizedProductId = normalizeShopifyProductId(shopifyProductId);
        if (!normalizedProductId) {
            throw Response.createError({
                message: 'Product not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyProductNotFound'
            });
        }

        console.log('Fetching shopify_products', normalizedProductId);

        const product = await knexInstance('shopify_products')
            .select('shopify_product_id')
            .where({ shopify_product_id: normalizedProductId })
            .first() as Pick<ShopifyProduct, 'shopify_product_id'> | undefined;

        console.log('Product Details', product);

        if (!product) {
            throw Response.createError({
                message: 'Product not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyProductNotFound'
            });
        }

        const categoryRows = await knexInstance('shopify_category_products as scp')
            .select('scp.shopify_category_id')
            .leftJoin('shopify_categories as sc', 'scp.shopify_category_id', 'sc.id')
            .where('scp.shopify_product_id', normalizedProductId)
            .where((builder) => {
                builder.whereNull('sc.status').orWhere('sc.status', 'active');
            });
        const categoryIds = Array.from(new Set(categoryRows.map((row) => Number(row.shopify_category_id)).filter(Boolean)));

        if (categoryIds.length === 0) {
            return [];
        }

        const maxLimit = Math.min(Math.max(Number(limit) || 12, 8), 12);
        const rows = await knexInstance('shopify_category_products as scp')
            .select(
                'sp.id',
                'sp.shopify_product_id',
                'sp.title',
                'sp.price',
                'sp.url',
                'sp.image_url',
                'sp.meta',
                'sp.shopify_created_at'
            )
            .innerJoin('shopify_products as sp', 'scp.shopify_product_id', 'sp.shopify_product_id')
            .whereIn('scp.shopify_category_id', categoryIds)
            .whereNot('scp.shopify_product_id', normalizedProductId)
            .orderBy('scp.sort_order', 'asc')
            .orderBy('sp.shopify_created_at', 'desc')
            .orderBy('sp.id', 'desc')
            .limit(maxLimit * 3) as ShopifyProduct[];

        const products: ShopifyRelatedProduct[] = [];
        const seenProductIds = new Set<string>();
        for (const row of rows) {
            const rowProductId = String(row.shopify_product_id);
            if (seenProductIds.has(rowProductId)) {
                continue;
            }
            seenProductIds.add(rowProductId);
            products.push(mapRelatedProduct(row));
            if (products.length >= maxLimit) {
                break;
            }
        }

        return products;
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

    private static async deleteProductsByShopifyIds(
        shopifyProductIds: string[],
        trx: Knex.Transaction
    ): Promise<{ deleted: number; removed_from_collections: number }> {
        const uniqueProductIds = Array.from(new Set(shopifyProductIds.map(normalizeShopifyProductId).filter(Boolean)));
        if (uniqueProductIds.length === 0) {
            return {
                deleted: 0,
                removed_from_collections: 0
            };
        }

        const removedFromCollections = await trx('shopify_category_products')
            .whereIn('shopify_product_id', uniqueProductIds)
            .del();

        const deleted = await trx('shopify_products')
            .whereIn('shopify_product_id', uniqueProductIds)
            .del();

        return {
            deleted,
            removed_from_collections: removedFromCollections
        };
    }

    private static async deleteProductsMissingFromShopify(
        activeShopifyProductIds: string[],
        trx: Knex.Transaction
    ): Promise<{ deleted: number; removed_from_collections: number }> {
        const uniqueActiveProductIds = Array.from(new Set(activeShopifyProductIds.filter(Boolean)));
        const staleProductRowsQuery = trx('shopify_products').select('shopify_product_id');
        if (uniqueActiveProductIds.length > 0) {
            staleProductRowsQuery.whereNotIn('shopify_product_id', uniqueActiveProductIds);
        }

        const staleProductRows = await staleProductRowsQuery as Array<{ shopify_product_id: string }>;
        return SharedShopifyCollectionService.deleteProductsByShopifyIds(
            staleProductRows.map((product) => product.shopify_product_id),
            trx
        );
    }

    private static async upsertProduct(product: ShopifyRestProduct, trx: Knex.Transaction | null = null): Promise<number> {
        const db = trx || knexInstance;
        const shopifyProductId = normalizeShopifyProductId(product.id);
        const existing = await db('shopify_products')
            .where({ shopify_product_id: shopifyProductId })
            .first() as ShopifyProduct | undefined;
        const payload = mapShopifyProduct(product, existing?.image_url || null);

        await db('shopify_products').insert({
            ...payload,
            created_at: new Date()
        }).onConflict('shopify_product_id').merge(payload);

        const row = await db('shopify_products')
            .select('id')
            .where({ shopify_product_id: shopifyProductId })
            .first() as { id: number } | undefined;

        if (!row) {
            throw Response.createError({
                message: 'Shopify product upsert failed',
                code: StatusCodes.INTERNAL_SERVER_ERROR,
                name: 'ShopifyProductUpsertFailed'
            });
        }

        return row.id;
    }

    private static async fetchProductsFromShopify(updatedAtMin: string | null = null): Promise<ShopifyRestProduct[]> {
        const products: ShopifyRestProduct[] = [];
        let after: string | null = null;
        let hasNextPage = true;
        const query = [
            SHOPIFY_ACTIVE_PRODUCT_QUERY,
            updatedAtMin ? `updated_at:>=${updatedAtMin}` : null
        ].filter(Boolean).join(' ');

        while (hasNextPage) {
            const data: ShopifyAdminProductsResponse = await SharedShopifyCollectionService.adminGraphql<ShopifyAdminProductsResponse>(
                `
                    query GetProducts($first: Int!, $after: String, $query: String) {
                        products(first: $first, after: $after, sortKey: UPDATED_AT, query: $query) {
                            nodes {
                                ${SHOPIFY_ADMIN_PRODUCT_FIELDS}
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                `,
                {
                    first: 250,
                    after,
                    query
                }
            );

            products.push(...(data.products?.nodes || []).map(mapShopifyAdminProduct).filter(isActiveShopifyProduct));
            hasNextPage = Boolean(data.products?.pageInfo?.hasNextPage);
            after = data.products?.pageInfo?.endCursor || null;
        }

        return products;
    }

    private static async fetchProductFromShopify(shopifyProductId: string): Promise<ShopifyRestProduct> {
        const data: ShopifyAdminProductResponse = await SharedShopifyCollectionService.adminGraphql<ShopifyAdminProductResponse>(
            `
                query GetProduct($id: ID!) {
                    product(id: $id) {
                        ${SHOPIFY_ADMIN_PRODUCT_FIELDS}
                    }
                }
            `,
            {
                id: toShopifyProductGid(shopifyProductId)
            }
        );

        if (!data.product) {
            throw Response.createError({
                message: 'Shopify product not found',
                code: StatusCodes.NOT_FOUND,
                name: 'ShopifyProductNotFound'
            });
        }

        return mapShopifyAdminProduct(data.product);
    }

    private static async adminGraphql<TData>(
        query: string,
        variables: Record<string, unknown>
    ): Promise<TData> {
        const shopDomain = config.shopify.adminShopDomain;
        if (!shopDomain) {
            throw Response.createError({
                message: 'Shopify Admin API configuration is missing',
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
            const { data } = await axios.post<ShopifyAdminGraphqlResponse<TData>>(
                `https://${SharedShopifyAdminTokenService.normalizeShopDomain(shopDomain)}/admin/api/${config.shopify.adminApiVersion}/graphql.json`,
                {
                    query,
                    variables
                },
                {
                    headers: {
                        'X-Shopify-Access-Token': adminAccessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (data.errors) {
                throw Response.createError({
                    message: 'Shopify GraphQL request failed',
                    code: StatusCodes.BAD_GATEWAY,
                    name: 'ShopifyGraphqlError',
                    data: data.errors
                });
            }

            return (data.data || {}) as TData;
        } catch (error: unknown) {
            if (isGError(error)) {
                throw error;
            }

            throw toShopifyError(error, 'Shopify GraphQL request failed');
        }
    }

}
