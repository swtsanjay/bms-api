import { Knex } from 'knex';
import { Transaction } from '../types/transaction';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';
export default class SharedTransactionService {
    /**
     * Saves or updates transaction property data based on provided keys and transaction details.
     * @param {Object} data - The data object containing transaction properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the transaction ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
    static async list(
        query: Partial<Record<keyof (Transaction & GPagination), Transaction[keyof Transaction]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : true,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response: { data: any, status: boolean, extra: GPagination } = { data: null, status: false, extra: paginationQuery };
        const search = {
            type: query.type ? String(query.type) : '',
            transaction_id: query.transaction_id ? String(query.transaction_id) : '',
        };
        clearSearch(search);
        try {
            const dbQuery = knexInstance('transactions as t').select('t.*').where(search);
            dbQuery.orderBy('created_at', 'desc');
            dbQuery.join('users', 't.user_id', 'users.id').select([
                'users.name as user_name',
                'users.email as user_email',
                'users.phone as user_phone',
            ]);
            if(trx) {
                dbQuery.transacting(trx);
            }
            const {data, extra} = await pagination(dbQuery, paginationQuery);
            response.data = data;
            response.extra = extra;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async saveByKeys(
        data: Partial<Record<keyof Transaction, Transaction[keyof Transaction]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const existing = data.id ? await trx('transactions').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof Transaction)[] = ['id', 'user_id', 'transaction_id', 'type', 'amount', 'comment', 'receipt_url', 'created_at', 'updated_at'];
                await trx('transactions').select(selectedKeys).where({ id: data.id }).update(data) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const [id] = await trx('transactions').insert(data) as [number];
                response.data = id;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}