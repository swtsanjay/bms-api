type CatalogQuery = {
    page?: string | number;
    limit?: string | number;
    search?: string;
    category?: string;
    collection?: string;
};

type ProductRow = Record<string, any> & { id: number };

function positiveInteger(value: unknown, fallback: number, maximum = 100) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, maximum);
}

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
                const available = Math.max(
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
            description_html: product.description_html,
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
    static async listProducts(query: CatalogQuery) {
        const page = positiveInteger(query.page, 1, 100000);
        const limit = positiveInteger(query.limit, 24, 100);
        const productQuery = knexInstance('vsq_products as p')
            .select('p.*')
            .where('p.status', 'ACTIVE')
            .whereNotNull('p.published_at')
            .whereNull('p.deleted_at');

        if (query.search?.trim()) {
            const search = `%${query.search.trim()}%`;
            productQuery.where((builder) => {
                builder.whereLike('p.title', search)
                    .orWhereLike('p.description_text', search)
                    .orWhereLike('p.vendor', search)
                    .orWhereLike('p.product_type', search);
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

        if (query.collection?.trim()) {
            productQuery.whereExists(function () {
                this.select(knexInstance.raw('1'))
                    .from('vsq_collection_products as cp')
                    .join('vsq_collections as c', 'c.id', 'cp.collection_id')
                    .whereRaw('cp.product_id = p.id')
                    .where('c.slug', query.collection!.trim())
                    .where('c.status', 'ACTIVE');
            });
        }

        const countRow = await productQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'p.id' }).first();
        const rows = await productQuery
            .orderBy('p.published_at', 'desc')
            .orderBy('p.id', 'desc')
            .limit(limit)
            .offset((page - 1) * limit) as ProductRow[];

        return {
            products: await enrichProducts(rows),
            pagination: { page, limit, total: Number(countRow?.total || 0) }
        };
    }

    static async productBySlug(slug: string) {
        const product = await knexInstance('vsq_products')
            .where({ slug, status: 'ACTIVE' })
            .whereNotNull('published_at')
            .whereNull('deleted_at')
            .first() as ProductRow | undefined;
        if (!product) return null;
        return (await enrichProducts([product]))[0] || null;
    }
}
