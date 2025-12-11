import { Knex } from 'knex';
import { Category } from '../../../types/category';
import { clearSearch } from '../../../lib/utils';

export default class UserService {
    static async details(
        query: Partial<Record<keyof Category, Category[keyof Category]>>, 
        transaction?: Knex.Transaction
    ): Promise<{ data: Category | null, status: boolean }> {
        const response: { data: Category | null, status: boolean } = { data: null, status: false };
        try {
            const search = {
                'id': parseInt(String(query.id)) ? parseInt(String(query.id)) : '',
                'code': query.code ? query.code : ''
            };
            clearSearch(search);
            if (search.id || search.code) {
                const selectedFields = ['id', 'title', 'code', 'created_at', 'updated_at'] as (keyof Category)[];
                const dbQuery = knexInstance.select(selectedFields).where(search).from('categories');
                if (transaction) {
                    dbQuery.transacting(transaction);
                }
                response.data = await dbQuery.first() as Category | null;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}