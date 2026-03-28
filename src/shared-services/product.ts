import { Knex } from 'knex';
import pagination from '../lib/pagination';
import { clearSearch } from '../lib/utils';
import { Product, ProductColor, ProductImage, ProductSize } from '../types/product';

type ProductPayload = {
    id?: number;
    name: string;
    hsn_sac?: string;
    price: number;
    sizes?: Array<Partial<ProductSize>>;
    images?: Array<Partial<ProductImage>>;
    colors?: Array<Partial<ProductColor>>;
};

type ProductListQuery = Partial<Record<keyof (Product & GPagination), Product[keyof Product]>>;

function groupByProductId<T extends { product_id: number }>(rows: T[]): Record<number, T[]> {
    return rows.reduce<Record<number, T[]>>((acc, row) => {
        if (!acc[row.product_id]) {
            acc[row.product_id] = [];
        }
        acc[row.product_id].push(row);
        return acc;
    }, {});
}

async function attachRelations(products: Product[], trx?: Knex.Transaction | null): Promise<Product[]> {
    if (products.length === 0) {
        return products;
    }

    const productIds = products.map((product) => product.id);
    const sizesQuery = knexInstance('product_sizes').select('*').whereIn('product_id', productIds);
    const imagesQuery = knexInstance('product_images').select('*').whereIn('product_id', productIds);
    const colorsQuery = knexInstance('product_colors').select('*').whereIn('product_id', productIds);

    if (trx) {
        sizesQuery.transacting(trx);
        imagesQuery.transacting(trx);
        colorsQuery.transacting(trx);
    }

    const [sizes, images, colors] = await Promise.all([
        sizesQuery,
        imagesQuery,
        colorsQuery
    ]) as [ProductSize[], ProductImage[], ProductColor[]];

    const sizesByProductId = groupByProductId(sizes);
    const imagesByProductId = groupByProductId(images);
    const colorsByProductId = groupByProductId(colors);

    return products.map((product) => ({
        ...product,
        sizes: sizesByProductId[product.id] || [],
        images: imagesByProductId[product.id] || [],
        colors: colorsByProductId[product.id] || []
    }));
}

async function syncChildRows(
    trx: Knex.Transaction,
    config: {
        table: 'product_sizes' | 'product_images' | 'product_colors';
        productId: number;
        valueKey: 'size' | 'url' | 'color';
        rows: Array<Record<string, any>>;
    }
) {
    const now = new Date();
    const existingRows = await trx(config.table).select('id').where({ product_id: config.productId });
    const incomingIds = config.rows
        .map((row) => Number(row.id))
        .filter((id) => Number.isInteger(id) && id > 0);
    const removableIds = existingRows
        .map((row: { id: number }) => row.id)
        .filter((id: number) => !incomingIds.includes(id));

    if (removableIds.length > 0) {
        await trx(config.table).whereIn('id', removableIds).del();
    }

    for (const row of config.rows) {
        const id = Number(row.id);
        const payload = {
            product_id: config.productId,
            [config.valueKey]: row[config.valueKey],
            updated_at: now
        };

        if (Number.isInteger(id) && id > 0) {
            await trx(config.table).where({ id, product_id: config.productId }).update(payload);
        } else {
            await trx(config.table).insert({
                ...payload,
                created_at: now
            });
        }
    }
}

export default class SharedProductService {
    static async list(
        query: ProductListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: Product[], status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : true,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response = { data: [] as Product[], status: false, extra: paginationQuery };
        const search = {
            id: query.id ? Number(query.id) : undefined,
            name: query.name ? String(query.name).trim() : undefined
        };
        clearSearch(search);

        const dbQuery = knexInstance('products').select('*').orderBy('id', 'desc');
        if (search.id) {
            dbQuery.where('id', search.id);
        }
        if (search.name) {
            dbQuery.where('name', 'like', `%${search.name}%`);
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<Product>(dbQuery, paginationQuery);
        response.data = await attachRelations(data, trx);
        response.extra = extra;
        response.status = true;
        return response;
    }

    static async details(
        query: Partial<Record<keyof Product, Product[keyof Product]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: Product | null, status: boolean }> {
        const search = {
            id: query.id ? Number(query.id) : undefined,
            name: query.name ? String(query.name).trim() : undefined
        };
        clearSearch(search);

        const dbQuery = knexInstance('products').select('*');
        if (search.id) {
            dbQuery.where('id', search.id);
        }
        if (search.name) {
            dbQuery.where('name', search.name);
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const product = await dbQuery.first() as Product | undefined;
        if (!product) {
            return { data: null, status: true };
        }

        const [productWithRelations] = await attachRelations([product], trx);
        return { data: productWithRelations || null, status: true };
    }

    static async save(data: ProductPayload, trx: Knex.Transaction): Promise<{ data: number | null, status: boolean }> {
        const now = new Date();
        const productPayload = {
            name: data.name,
            hsn_sac: data.hsn_sac,
            price: Number(data.price),
            updated_at: now
        };

        let productId: number;
        const existing = data.id ? await trx('products').where({ id: data.id }).first() : null;
        if (existing) {
            await trx('products').where({ id: data.id }).update(productPayload);
            productId = existing.id;
        } else {
            const [id] = await trx('products').insert({
                ...productPayload,
                created_at: now
            }) as [number];
            productId = id;
        }

        await syncChildRows(trx, {
            table: 'product_sizes',
            productId,
            valueKey: 'size',
            rows: (data.sizes || []).map((row) => ({ id: row.id, size: row.size }))
        });
        await syncChildRows(trx, {
            table: 'product_images',
            productId,
            valueKey: 'url',
            rows: (data.images || []).map((row) => ({ id: row.id, url: row.url }))
        });
        await syncChildRows(trx, {
            table: 'product_colors',
            productId,
            valueKey: 'color',
            rows: (data.colors || []).map((row) => ({ id: row.id, color: row.color }))
        });

        return { data: productId, status: true };
    }

    static async deleteChildRow(
        table: 'product_sizes' | 'product_images' | 'product_colors',
        id: number,
        trx: Knex.Transaction
    ): Promise<{ data: number, status: boolean }> {
        const deleted = await trx(table).where({ id }).del();
        if (deleted === 0) {
            throw new Error(`${table} record with id ${id} not found`);
        }
        return { data: id, status: true };
    }
}
