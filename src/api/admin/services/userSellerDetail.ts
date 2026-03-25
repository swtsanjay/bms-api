import { Knex } from 'knex';
import { clearSearch } from '../../../lib/utils';

export default class UserSellerDetailService {
    static async details(
        query: Partial<Record<string, any>>,
        transaction?: Knex.Transaction
    ): Promise<{ data: any | null, status: boolean }> {
        const response: { data: any | null, status: boolean } = { data: null, status: false };
        try {
            const search: any = {
                id: query.id ? Number(query.id) : '',
                user_id: query.user_id ? Number(query.user_id) : ''
            };
            clearSearch(search);
            if (search.id || search.user_id) {
                const dbQuery = knexInstance.select('*').from('user_seller_details').where(search);
                if (transaction) {
                    dbQuery.transacting(transaction);
                }
                response.data = await dbQuery.first();
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}
