import { Knex } from 'knex';
import { Order } from '../types/order';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';

export default class SharedOrderService {
    /**
     * Saves or updates order property data based on provided keys and order details.
     * @param {Object} data - The data object containing order properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the order ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
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
        const search = { ...query };
        clearSearch(search);

        try {
            const dbQuery = knexInstance('orders').select('*');
            if (trx) {
                dbQuery.transacting(trx);
            }
            const { data, extra } = await pagination(dbQuery, paginationQuery);
            response.data = data;
            response.extra = extra;
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