import { Knex } from 'knex';
// import { User } from '../../../types/user';
import { clearSearch } from '../../../lib/utils';
export type User = {
    id: number;
    name: string;
    email: string;
    phone: string;
    user_type: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'USER' | 'GUEST';
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
export default class UserService {
    static async details(
        query: Partial<Record<keyof User, User[keyof User]>>, 
        transaction?: Knex.Transaction
    ): Promise<{ data: User | null, status: boolean }> {
        const response: { data: User | null, status: boolean } = { data: null, status: false };
        try {
            const search = {
                'id': parseInt(String(query.id)) ? parseInt(String(query.id)) : '',
                'email': query.email ? query.email : '',
                'phone': query.phone ? query.phone : '',
            };
            clearSearch(search);
            if (search.id || search.email || search.phone) {
                const selectedFields = ['id', 'name', 'email', 'phone', 'user_type', 'created_at', 'updated_at'] as (keyof User)[];
                const dbQuery = knexInstance.select(selectedFields).where(search).from('users');
                if (transaction) {
                    dbQuery.transacting(transaction);
                }
                response.data = await dbQuery.first() as User | null;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}