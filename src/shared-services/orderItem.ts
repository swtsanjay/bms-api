import { Knex } from 'knex';
import { OrderItem } from '../types/orderItem';
import { clearSearch } from '../lib/utils';

export default class SharedOrderItemService {
    static async list(
        data: Partial<Record<keyof OrderItem, OrderItem[keyof OrderItem]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean }> {
        const response: { data: any, status: boolean } = { data: null, status: false };

        try {
            const search = {
                'id': parseInt(String(data.id)) ? parseInt(String(data.id)) : '',
                'order_id': parseInt(String(data.order_id)) ? parseInt(String(data.order_id)) : '',
            };
            clearSearch(search);

            const dbQuery = knexInstance('order_items').select('*').where(search);
            if (trx) {
                dbQuery.transacting(trx);
            }
            response.data = await dbQuery;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async saveByKeys(
        data: Partial<Record<keyof OrderItem, OrderItem[keyof OrderItem]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const existing = data.id ? await trx('order_items').where({ id: data.id }).first() : null;
            const payload = {
                order_id: data.order_id,
                item_order: data.item_order,
                product_id: data.product_id,
                product_sizes_id: data.product_sizes_id,
                product_colors_id: data.product_colors_id ?? null,
                product_images_id: data.product_images_id ?? null,
                quantity: data.quantity,
                price: data.price,
                status: data.status,
                payment_status: data.payment_status,
                created_by: data.created_by,
                updated_at: new Date()
            };
            if (existing) {
                await trx('order_items').where({ id: data.id }).update(payload) as [number];
                response.data = existing.id;
            } else {
                const [id] = await trx('order_items').insert({
                    ...payload,
                    created_at: new Date()
                }) as [number];
                response.data = id;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async delete(
        data: { id: number },
        trx: Knex.Transaction
    ): Promise<{ data: number, status: boolean }> {
        const response: { data: number, status: boolean } = { data: 0, status: false };

        try {
            const deleted = await trx('order_items').where({ id: data.id }).del();
            if (deleted === 0) {
                throw new Error(`Order item with id ${data.id} not found`);
            }

            response.data = data.id;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}
