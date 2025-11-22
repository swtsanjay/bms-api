import { Knex } from 'knex';
import { Order } from '../types/order';

export default class SharedOrderService {
    /**
     * Saves or updates order property data based on provided keys and order details.
     * @param {Object} data - The data object containing order properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the order ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
    static async list(
        data: Partial<Record<keyof Order, Order[keyof Order]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean }> {
        const response: { data: any, status: boolean } = { data: null, status: false };

        try {
            const dbQuery = knexInstance('orders').select('*').where(data);
            if(trx) {
                dbQuery.transacting(trx);
            }
            response.data = await dbQuery;
            console.log('dbQuery',  dbQuery.toString(), response.data);
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async saveByKeys(
        data: Partial<Record<keyof Order, Order[keyof Order]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const existing = data.id ? await trx('orders').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof Order)[] = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at'];
                await trx('orders').select(selectedKeys).where({ id: data.id }).update(data) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const [id] = await trx('orders').insert(data) as [number];
                response.data = id;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}