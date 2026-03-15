import { Knex } from 'knex';
import { Order } from '../types/order';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';
import SharedOrderItemService from './orderItem';
import { OrderItem } from '../types/orderItem';

type OrderPayload = {
    id?: number;
    status: Order['status'];
    payment_status: Order['payment_status'];
    client_id: number;
    created_by: number;
    items?: Array<Partial<OrderItem>>;
};

async function attachItems(orders: Order[], trx?: Knex.Transaction | null): Promise<any[]> {
    if (orders.length === 0) {
        return orders;
    }

    const orderIds = orders.map((order) => order.id);
    const itemsQuery = knexInstance('order_items').select('*').whereIn('order_id', orderIds).orderBy('id', 'asc');
    if (trx) {
        itemsQuery.transacting(trx);
    }
    const items = await itemsQuery as OrderItem[];
    if (items.length === 0) {
        return orders.map((order) => ({ ...order, items: [] }));
    }

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const sizeIds = [...new Set(items.map((item) => item.product_sizes_id))];
    const colorIds = [...new Set(items.map((item) => item.product_colors_id).filter((value): value is number => Number.isInteger(value)))];
    const imageIds = [...new Set(items.map((item) => item.product_images_id).filter((value): value is number => Number.isInteger(value)))];

    const productQuery = knexInstance('products').select('*').whereIn('id', productIds);
    const sizeQuery = knexInstance('product_sizes').select('*').whereIn('id', sizeIds);
    const colorQuery = colorIds.length > 0 ? knexInstance('product_colors').select('*').whereIn('id', colorIds) : null;
    const imageQuery = imageIds.length > 0 ? knexInstance('product_images').select('*').whereIn('id', imageIds) : null;

    if (trx) {
        productQuery.transacting(trx);
        sizeQuery.transacting(trx);
        colorQuery?.transacting(trx);
        imageQuery?.transacting(trx);
    }

    const [products, sizes, colors, images] = await Promise.all([
        productQuery,
        sizeQuery,
        colorQuery || Promise.resolve([]),
        imageQuery || Promise.resolve([])
    ]) as [Array<Record<string, any>>, Array<Record<string, any>>, Array<Record<string, any>>, Array<Record<string, any>>];

    const productById = products.reduce<Record<number, Record<string, any>>>((acc, row) => {
        acc[row.id] = row;
        return acc;
    }, {});
    const sizeById = sizes.reduce<Record<number, Record<string, any>>>((acc, row) => {
        acc[row.id] = row;
        return acc;
    }, {});
    const colorById = colors.reduce<Record<number, Record<string, any>>>((acc, row) => {
        acc[row.id] = row;
        return acc;
    }, {});
    const imageById = images.reduce<Record<number, Record<string, any>>>((acc, row) => {
        acc[row.id] = row;
        return acc;
    }, {});

    const itemsByOrderId = items.reduce<Record<number, any[]>>((acc, item) => {
        if (!acc[item.order_id]) {
            acc[item.order_id] = [];
        }
        acc[item.order_id].push({
            ...item,
            product: productById[item.product_id] || null,
            product_size: sizeById[item.product_sizes_id] || null,
            product_color: item.product_colors_id ? colorById[item.product_colors_id] || null : null,
            product_image: item.product_images_id ? imageById[item.product_images_id] || null : null
        });
        return acc;
    }, {});

    return orders.map((order) => ({
        ...order,
        items: itemsByOrderId[order.id] || []
    }));
}

export default class SharedOrderService {
    static async list(
        query: Partial<Record<keyof (Order & GPagination), Order[keyof Order]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : false,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response: { data: any, status: boolean, extra: GPagination } = { data: null, status: false, extra: paginationQuery };
        const search = {
            id: query.id ? Number(query.id) : undefined,
            client_id: query.client_id ? Number(query.client_id) : undefined,
            status: query.status ? String(query.status) : undefined,
            payment_status: query.payment_status ? String(query.payment_status) : undefined
        };
        clearSearch(search);

        try {
            const dbQuery = knexInstance('orders').select('*').orderBy('id', 'desc').where(search);
            if (trx) {
                dbQuery.transacting(trx);
            }
            const { data, extra } = await pagination(dbQuery, paginationQuery);
            response.data = await attachItems(data as Order[], trx);
            response.extra = extra;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async details(
        query: Partial<Record<keyof Order, Order[keyof Order]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean }> {
        const search = {
            id: query.id ? Number(query.id) : undefined
        };
        clearSearch(search);

        const dbQuery = knexInstance('orders').select('*').where(search);
        if (trx) {
            dbQuery.transacting(trx);
        }
        const order = await dbQuery.first() as Order | undefined;
        if (!order) {
            return { data: null, status: true };
        }
        const [hydratedOrder] = await attachItems([order], trx);
        return { data: hydratedOrder || null, status: true };
    }
    static async save(
        data: OrderPayload,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };
        const now = new Date();
        const payload = {
            status: data.status,
            payment_status: data.payment_status,
            client_id: data.client_id,
            created_by: data.created_by,
            updated_at: now
        };

        try {
            const existing = data.id ? await trx('orders').where({ id: data.id }).first() : null;
            if (existing) {
                await trx('orders').where({ id: data.id }).update(payload) as [number];
                response.data = existing.id;
            } else {
                const [id] = await trx('orders').insert({
                    ...payload,
                    created_at: now
                }) as [number];
                response.data = id;
            }

            const orderId = response.data as number;
            const existingItems = await SharedOrderItemService.list({ order_id: orderId }, trx);
            const incomingIds = (data.items || [])
                .map((item) => Number(item.id))
                .filter((id) => Number.isInteger(id) && id > 0);
            const deleteIds = (existingItems.data || [])
                .map((item: OrderItem) => item.id)
                .filter((id: number) => !incomingIds.includes(id));

            if (deleteIds.length > 0) {
                await trx('order_items').whereIn('id', deleteIds).del();
            }

            for (const item of data.items || []) {
                await SharedOrderItemService.saveByKeys({
                    id: item.id,
                    order_id: orderId,
                    product_id: item.product_id as number,
                    product_sizes_id: item.product_sizes_id as number,
                    product_colors_id: item.product_colors_id ?? null,
                    product_images_id: item.product_images_id ?? null,
                    quantity: item.quantity as number,
                    price: item.price as number,
                    status: item.status as OrderItem['status'],
                    payment_status: item.payment_status as OrderItem['payment_status'],
                    created_by: (item.created_by as number) || data.created_by
                }, trx);
            }

            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}
