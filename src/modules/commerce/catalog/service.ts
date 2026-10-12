import { sanitizeProductDescriptionHtml } from '../product-description';
import { VISIBLE_PRODUCT_STATUSES } from '../product-status';

type CatalogQuery = {
    page?: string | number;
    limit?: string | number;
    search?: string;
    category?: string;
    collection?: string;
    sort?: string;
    category_names?: string | string[];
    sizes?: string | string[];
    colors?: string | string[];
    prices?: string | string[];
    include_facets?: string;
};

type ProductRow = Record<string, any> & { id: number };

function positiveInteger(value: unknown, fallback: number, maximum = 100) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, maximum);
}

function selectedValues(value: string | string[] | undefined) {
    return [...new Set((Array.isArray(value) ? value : value ? [value] : [])
        .map((item) => item.trim()).filter(Boolean))].slice(0, 20);
}

const priceRanges: Record<string, [number, number | null]> = {
    '0-200': [0, 200], '0-500': [0, 500], '0-1000': [0, 1000],
    '0-2000': [0, 2000], '0-5000': [0, 5000], '5000-plus': [5000, null]
};

const minimumPriceSql = `COALESCE((SELECT MIN(vp.amount) FROM vsq_product_variants AS v
    JOIN vsq_variant_prices AS vp ON vp.variant_id = v.id
    JOIN vsq_price_lists AS pl ON pl.id = vp.price_list_id AND pl.code = 'INR_DEFAULT'
    WHERE v.product_id = p.id AND v.status = 'ACTIVE' AND v.deleted_at IS NULL), 0)`;

function jsonValue(value: unknown) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

async function enrichProducts(products: ProductRow[]) {
    if (!products.length) return [];
    const productIds = products.map((product) => Number(product.id));

    const [variantRows, optionRows, mediaRows, categoryRows, metafieldRows] = await Promise.all([
        knexInstance('vsq_product_variants as v')
            .leftJoin('vsq_variant_prices as vp', function () {
                this.on('vp.variant_id', '=', 'v.id')
                    .andOn('vp.price_list_id', '=', knexInstance.raw('(SELECT id FROM vsq_price_lists WHERE code = ? LIMIT 1)', ['INR_DEFAULT']));
            })
            .leftJoin(
                knexInstance('vsq_inventory_levels')
                    .select('variant_id')
                    .sum({ on_hand: 'on_hand', reserved: 'reserved', safety_stock: 'safety_stock' })
                    .groupBy('variant_id')
                    .as('stock'),
                'stock.variant_id',
                'v.id'
            )
            .select(
                'v.*',
                'vp.amount as price',
                'vp.compare_at_amount as compare_at_price',
                'stock.on_hand',
                'stock.reserved',
                'stock.safety_stock'
            )
            .whereIn('v.product_id', productIds)
            .where('v.status', 'ACTIVE')
            .whereNull('v.deleted_at')
            .orderBy('v.id', 'asc'),
        knexInstance('vsq_product_options as po')
            .leftJoin('vsq_product_option_values as pov', 'pov.product_option_id', 'po.id')
            .select(
                'po.id as option_id',
                'po.product_id',
                'po.name',
                'po.position as option_position',
                'pov.id as value_id',
                'pov.value',
                'pov.swatch_value',
                'pov.position as value_position'
            )
            .whereIn('po.product_id', productIds)
            .orderBy('po.position', 'asc')
            .orderBy('pov.position', 'asc'),
        knexInstance('vsq_product_media as pm')
            .join('vsq_media_assets as ma', 'ma.id', 'pm.media_asset_id')
            .select('pm.product_id', 'pm.role', 'pm.position', 'ma.public_id', 'ma.public_url', 'ma.alt_text', 'ma.width', 'ma.height')
            .whereIn('pm.product_id', productIds)
            .where('ma.status', 'READY')
            .whereNull('ma.deleted_at')
            .orderBy('pm.position', 'asc'),
        knexInstance('vsq_product_categories as pc')
            .join('vsq_categories as c', 'c.id', 'pc.category_id')
            .select('pc.product_id', 'pc.is_primary', 'pc.sort_order', 'c.public_id', 'c.slug', 'c.name')
            .whereIn('pc.product_id', productIds)
            .where('c.status', 'ACTIVE')
            .orderBy('pc.sort_order', 'asc'),
        knexInstance('vsq_product_metafields')
            .select('product_id', 'namespace', 'metafield_key', 'type', 'value_json')
            .whereIn('product_id', productIds)
    ]);

    const variantIds = variantRows.map((variant) => Number(variant.id));
    const [variantOptions, variantMedia] = variantIds.length ? await Promise.all([
        knexInstance('vsq_variant_option_values as vov')
            .join('vsq_product_option_values as pov', 'pov.id', 'vov.product_option_value_id')
            .join('vsq_product_options as po', 'po.id', 'pov.product_option_id')
            .select('vov.variant_id', 'po.name', 'pov.value', 'pov.swatch_value')
            .whereIn('vov.variant_id', variantIds),
        knexInstance('vsq_variant_media as vm')
            .join('vsq_media_assets as ma', 'ma.id', 'vm.media_asset_id')
            .select('vm.variant_id', 'vm.position', 'ma.public_id', 'ma.public_url', 'ma.alt_text')
            .whereIn('vm.variant_id', variantIds)
            .where('ma.status', 'READY')
            .whereNull('ma.deleted_at')
            .orderBy('vm.position', 'asc')
    ]) : [[], []];

    return products.map((product) => {
        const productOptions = optionRows
            .filter((option) => Number(option.product_id) === Number(product.id))
            .reduce<Array<Record<string, any>>>((result, row) => {
                let option = result.find((item) => Number(item.id) === Number(row.option_id));
                if (!option) {
                    option = { id: Number(row.option_id), name: row.name, position: row.option_position, values: [] };
                    result.push(option);
                }
                if (row.value_id) {
                    option.values.push({
                        id: Number(row.value_id),
                        value: row.value,
                        swatch_value: row.swatch_value,
                        position: row.value_position
                    });
                }
                return result;
            }, []);

        const variants = variantRows
            .filter((variant) => Number(variant.product_id) === Number(product.id))
            .map((variant) => {
                const available = product.status === 'OUT_OF_STOCK' ? 0 : Math.max(
                    0,
                    Number(variant.on_hand || 0) - Number(variant.reserved || 0) - Number(variant.safety_stock || 0)
                );
                return {
                    id: Number(variant.id),
                    public_id: variant.public_id,
                    title: variant.title,
                    sku: variant.sku,
                    barcode: variant.barcode,
                    price: variant.price === null ? null : Number(variant.price),
                    compare_at_price: variant.compare_at_price === null ? null : Number(variant.compare_at_price),
                    currency: 'INR',
                    available_quantity: available,
                    available_for_sale: available > 0,
                    selected_options: variantOptions
                        .filter((item) => Number(item.variant_id) === Number(variant.id))
                        .map((item) => ({ name: item.name, value: item.value, swatch_value: item.swatch_value })),
                    media: variantMedia
                        .filter((item) => Number(item.variant_id) === Number(variant.id))
                        .map((item) => ({
                            public_id: item.public_id,
                            url: item.public_url,
                            alt_text: item.alt_text,
                            position: item.position
                        }))
                };
            });

        const prices = variants.map((variant) => variant.price).filter((price): price is number => price !== null);
        return {
            id: Number(product.id),
            public_id: product.public_id,
            slug: product.slug,
            title: product.title,
            description_html: sanitizeProductDescriptionHtml(product.description_html),
            description_text: product.description_text,
            vendor: product.vendor,
            product_type: product.product_type,
            tags: jsonValue(product.tags) || [],
            seo: { title: product.seo_title, description: product.seo_description },
            status: product.status,
            published_at: product.published_at,
            price: prices.length ? Math.min(...prices) : null,
            max_price: prices.length ? Math.max(...prices) : null,
            currency: 'INR',
            available_for_sale: variants.some((variant) => variant.available_for_sale),
            media: mediaRows
                .filter((media) => Number(media.product_id) === Number(product.id))
                .map((media) => ({
                    public_id: media.public_id,
                    url: media.public_url,
                    alt_text: media.alt_text,
                    role: media.role,
                    position: media.position,
                    width: media.width,
                    height: media.height
                })),
            options: productOptions,
            variants,
            categories: categoryRows
                .filter((category) => Number(category.product_id) === Number(product.id))
                .map((category) => ({
                    public_id: category.public_id,
                    slug: category.slug,
                    name: category.name,
                    is_primary: Boolean(category.is_primary)
                })),
            metafields: metafieldRows
                .filter((metafield) => Number(metafield.product_id) === Number(product.id))
                .map((metafield) => ({
                    namespace: metafield.namespace,
                    key: metafield.metafield_key,
                    type: metafield.type,
                    value: jsonValue(metafield.value_json)
                }))
        };
    });
}

export default class CommerceCatalogService {
    static async sitemapProducts(pageValue?: string | number, limitValue?: string | number) {
        const page = positiveInteger(pageValue, 1, 100000);
        const limit = positiveInteger(limitValue, 500, 1000);
        const query = knexInstance('vsq_products').whereIn('status', VISIBLE_PRODUCT_STATUSES).whereNotNull('published_at').whereNull('deleted_at');
        const countRow = await query.clone().count({ total: 'id' }).first();
        const products = await query.clone().select('slug', 'updated_at').orderBy('id', 'desc')
            .limit(limit).offset((page - 1) * limit);
        return { products, pagination: { page, limit, total: Number(countRow?.total || 0) } };
    }

    static async listProducts(query: CatalogQuery) {
        const page = positiveInteger(query.page, 1, 100000);
        const limit = positiveInteger(query.limit, 24, 100);
        const productQuery = knexInstance('vsq_products as p')
            .select('p.*')
            .whereIn('p.status', VISIBLE_PRODUCT_STATUSES)
            .whereNotNull('p.published_at')
            .whereNull('p.deleted_at');

        if (query.search?.trim()) {
            const search = `%${query.search.trim().toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
            productQuery.where((builder) => {
                builder.whereRaw('LOWER(p.title) LIKE ?', [search])
                    .orWhereRaw('LOWER(p.description_text) LIKE ?', [search])
                    .orWhereRaw('LOWER(p.vendor) LIKE ?', [search])
                    .orWhereRaw('LOWER(p.product_type) LIKE ?', [search])
                    .orWhereRaw('LOWER(CAST(p.tags AS CHAR)) LIKE ?', [search])
                    .orWhereExists(function () {
                        this.select(knexInstance.raw('1')).from('vsq_product_categories as search_pc')
                            .join('vsq_categories as search_c', 'search_c.id', 'search_pc.category_id')
                            .whereRaw('search_pc.product_id = p.id').whereRaw('LOWER(search_c.name) LIKE ?', [search]);
                    })
                    .orWhereExists(function () {
                        this.select(knexInstance.raw('1')).from('vsq_product_options as search_po')
                            .join('vsq_product_option_values as search_pov', 'search_pov.product_option_id', 'search_po.id')
                            .whereRaw('search_po.product_id = p.id')
                            .whereRaw('LOWER(search_po.name) IN (?, ?)', ['color', 'size'])
                            .whereRaw('LOWER(search_pov.value) LIKE ?', [search]);
                    });
            });
        }

        if (query.category?.trim()) {
            productQuery.whereExists(function () {
                this.select(knexInstance.raw('1'))
                    .from('vsq_product_categories as pc')
                    .join('vsq_categories as c', 'c.id', 'pc.category_id')
                    .whereRaw('pc.product_id = p.id')
                    .where('c.slug', query.category!.trim())
                    .where('c.status', 'ACTIVE');
            });
        }

        // All Products is derived from product visibility, including historical rows without membership.
        if (query.collection?.trim() && query.collection.trim() !== 'all-products') {
            productQuery.whereExists(function () {
                this.select(knexInstance.raw('1'))
                    .from('vsq_collection_products as cp')
                    .join('vsq_collections as c', 'c.id', 'cp.collection_id')
                    .whereRaw('cp.product_id = p.id')
                    .where('c.slug', query.collection!.trim())
                    .where('c.status', 'ACTIVE');
            });
        }

        // Facets describe the entire search/scope, before the selected facet filters.
        const baseIds = productQuery.clone().clearSelect().select('p.id');
        const [categoryFacets, optionFacets, facetCount] = query.include_facets === '0' ? [[], [], null] : await Promise.all([
            knexInstance('vsq_product_categories as facet_pc')
                .join('vsq_categories as facet_c', 'facet_c.id', 'facet_pc.category_id')
                .where('facet_c.status', 'ACTIVE')
                .whereIn('facet_pc.product_id', baseIds.clone())
                .select('facet_c.name').countDistinct({ count: 'facet_pc.product_id' })
                .groupBy('facet_c.name').orderBy('facet_c.name', 'asc'),
            knexInstance('vsq_product_options as facet_po')
                .join('vsq_product_option_values as facet_pov', 'facet_pov.product_option_id', 'facet_po.id')
                .whereIn('facet_po.product_id', baseIds.clone())
                .whereRaw('LOWER(facet_po.name) IN (?, ?)', ['size', 'color'])
                .distinct('facet_po.name', 'facet_pov.value'),
            productQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'p.id' }).first()
        ]);

        const categoryNames = selectedValues(query.category_names);
        if (categoryNames.length) productQuery.whereExists(function () {
            this.select(knexInstance.raw('1')).from('vsq_product_categories as selected_pc')
                .join('vsq_categories as selected_c', 'selected_c.id', 'selected_pc.category_id')
                .whereRaw('selected_pc.product_id = p.id').where('selected_c.status', 'ACTIVE').whereIn('selected_c.name', categoryNames);
        });
        for (const [name, values] of [['size', selectedValues(query.sizes)], ['color', selectedValues(query.colors)]] as const) {
            if (values.length) productQuery.whereExists(function () {
                this.select(knexInstance.raw('1')).from('vsq_product_options as selected_po')
                    .join('vsq_product_option_values as selected_pov', 'selected_pov.product_option_id', 'selected_po.id')
                    .whereRaw('selected_po.product_id = p.id').whereRaw('LOWER(selected_po.name) = ?', [name])
                    .whereIn('selected_pov.value', values);
            });
        }
        const selectedRanges = selectedValues(query.prices).map((value) => priceRanges[value]).filter(Boolean);
        if (selectedRanges.length) productQuery.where((builder) => {
            for (const [min, max] of selectedRanges) {
                if (max === null) builder.orWhereRaw(`${minimumPriceSql} >= ?`, [min]);
                else builder.orWhereRaw(`${minimumPriceSql} BETWEEN ? AND ?`, [min, max]);
            }
        });

        const countRow = await productQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'p.id' }).first();
        const sort = ['best_sellers', 'new_arrivals', 'price_low_high', 'price_high_low'].includes(query.sort || '') ? query.sort : 'best_sellers';
        if (sort === 'price_low_high' || sort === 'price_high_low') {
            productQuery.orderByRaw(`${minimumPriceSql} ${sort === 'price_low_high' ? 'asc' : 'desc'}`);
        } else productQuery.orderBy('p.published_at', 'desc');
        const rows = await productQuery.orderBy('p.id', 'desc')
            .limit(limit)
            .offset((page - 1) * limit) as ProductRow[];

        return {
            products: await enrichProducts(rows),
            pagination: { page, limit, total: Number(countRow?.total || 0) },
            facets: {
                total: Number(facetCount?.total || 0),
                categories: categoryFacets.map((row) => ({ name: (row as any).name as string, count: Number(row.count) })),
                sizes: [...new Set(optionFacets.filter((row) => row.name.toLowerCase() === 'size').map((row) => row.value))].sort(),
                colors: [...new Set(optionFacets.filter((row) => row.name.toLowerCase() === 'color').map((row) => row.value))].sort()
            }
        };
    }

    static async productBySlug(slug: string) {
        const product = await knexInstance('vsq_products')
            .where({ slug })
            .whereIn('status', VISIBLE_PRODUCT_STATUSES)
            .whereNotNull('published_at')
            .whereNull('deleted_at')
            .first() as ProductRow | undefined;
        if (!product) return null;
        return (await enrichProducts([product]))[0] || null;
    }

    static async productByPublicId(publicId: string) {
        const product = await knexInstance('vsq_products')
            .where({ public_id: publicId }).whereIn('status', VISIBLE_PRODUCT_STATUSES).whereNotNull('published_at').whereNull('deleted_at').first() as ProductRow | undefined;
        return product ? (await enrichProducts([product]))[0] || null : null;
    }

    static async relatedProducts(publicId: string) {
        const source = await knexInstance('vsq_products').where({ public_id: publicId }).whereIn('status', VISIBLE_PRODUCT_STATUSES)
            .whereNotNull('published_at').whereNull('deleted_at').first('id');
        if (!source) return [];
        const rows = await knexInstance('vsq_products as p').select('p.*')
            .select(knexInstance.raw(`(SELECT COUNT(*) FROM vsq_product_categories AS related_pc
                WHERE related_pc.product_id = p.id AND related_pc.category_id IN
                (SELECT source_pc.category_id FROM vsq_product_categories AS source_pc WHERE source_pc.product_id = ?)) AS related_score`, [source.id]))
            .whereIn('p.status', VISIBLE_PRODUCT_STATUSES).whereNotNull('p.published_at').whereNull('p.deleted_at')
            .whereNot('p.id', source.id).orderBy('related_score', 'desc')
            .orderBy('p.published_at', 'desc').orderBy('p.id', 'desc').limit(4) as ProductRow[];
        return enrichProducts(rows);
    }
}
