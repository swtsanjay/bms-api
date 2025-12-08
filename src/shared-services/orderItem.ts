import { Knex } from 'knex';
import { OrderItem } from '../types/orderItem';

export function clearSearch(obj: Record<string, any>) {
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined) {
			delete obj[key];
		} else if (typeof value === 'object' && value !== null) {
			clearSearch(value);
		} else if (typeof value === 'string' && value.length === 0) {
			delete obj[key];
		}
	}
}

export default class SharedOrderItemService {
    /**
     * Saves or updates order property data based on provided keys and order details.
     * @param {Object} data - The data object containing order properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the order ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
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
            if (existing) {
                const selectedKeys: (keyof OrderItem)[] = ['id', 'name', 'quantity', 'pp_price', 'created_at', 'updated_at', 'deleted_at'];
                await trx('order_items').select(selectedKeys).where({ id: data.id }).update(data) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const [id] = await trx('order_items').insert(data) as [number];
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