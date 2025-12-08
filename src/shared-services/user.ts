import { Knex } from 'knex';
import { User } from '../types/user';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';
export default class SharedUserService {
    /**
     * Saves or updates user property data based on provided keys and user details.
     * @param {Object} data - The data object containing user properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the user ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
    static async list(
        query: Partial<Record<keyof (User & GPagination), User[keyof User]>>,
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
            ...query
        };
        clearSearch(search);
        try {
            const dbQuery = knexInstance('users').select('*');
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
        data: Partial<Record<keyof User, User[keyof User]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const existing = data.id ? await trx('users').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof User)[] = ['id', 'name', 'email', 'phone', 'user_type', 'created_at', 'updated_at', 'deleted_at'];
                await trx('users').select(selectedKeys).where({ id: data.id }).update(data) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const [id] = await trx('users').insert(data) as [number];
                response.data = id;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}