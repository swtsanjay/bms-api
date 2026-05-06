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
        const rawQuery = query as Partial<Record<string, unknown>>;
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
        const userId = rawQuery.user_id ? Number(rawQuery.user_id) : null;
        const paymentTransferTo = rawQuery.user_id ? Number(rawQuery.payment_transfer_to) : null;
        const startDate = rawQuery.start_date ? String(rawQuery.start_date) : '';
        const endDate = rawQuery.end_date ? String(rawQuery.end_date) : '';
        clearSearch(search);
        try {
            const dbQuery = knexInstance('transactions as t').select('t.*').where(search).whereNull('t.deleted_at');
            dbQuery.orderBy('created_at', 'desc');
            if (userId) {
                dbQuery.where('t.user_id', userId);
            }
            if (paymentTransferTo) {
                dbQuery.where('t.payment_transfer_to', paymentTransferTo);
            }

            if (query.type === 'SALARY') {
                dbQuery.leftJoin('users as payment_transfer_user', 't.payment_transfer_to', 'payment_transfer_user.id').select([
                    'payment_transfer_user.name as payment_transfer_to_user_name',
                    'payment_transfer_user.email as payment_transfer_to_user_email',
                ]);
            } else {
                dbQuery.join('users', 't.user_id', 'users.id').select([
                    'users.name as user_name',
                    'users.email as user_email',
                    'users.phone as user_phone',
                ]);
            }

            if (startDate) {
                dbQuery.where('t.created_at', '>=', `${startDate} 00:00:00`);
            }
            if (endDate) {
                dbQuery.where('t.created_at', '<=', `${endDate} 23:59:59`);
            }
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
        data: Partial<Record<keyof Transaction, Transaction[keyof Transaction]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            if (!['PAYMENT', 'SALARY'].includes(String(data.type))) {
                data.payment_transfer_to = null;
            }

            const existing = data.id ? await trx('transactions').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof Transaction)[] = ['id', 'user_id', 'transaction_id', 'type', 'amount', 'comment', 'receipt_url', 'payment_transfer_to', 'created_at', 'updated_at'];

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

    static async deleteById(
        id: number,
        deletedBy: number,
        trx: Knex.Transaction
    ): Promise<{ data: boolean, status: boolean }> {
        const response: { data: boolean, status: boolean } = { data: false, status: false };
        try {
            await trx('transactions').where({ id }).update({ deleted_at: new Date(), deleted_by: deletedBy });
            response.data = true;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}
