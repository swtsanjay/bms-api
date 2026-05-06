import { Knex } from 'knex';
// import { User } from '../../../types/user';
import { clearSearch } from '../../../lib/utils';
export type User = {
    id: number;
    name: string;
    email: string;
    phone: string;
    user_type: 'EMPLOYEE' | 'ADMIN' | 'VENDOR' | 'FABRIC_SUPPLIER' | 'CHECKER' | 'SALES_MAN';
    billing_name?: string;
    company_name?: string;
    gstin?: string;
    pan_number?: string;
    billing_email?: string;
    billing_phone?: string;
    billing_address_line1?: string;
    billing_address_line2?: string;
    billing_city?: string;
    billing_state?: string;
    billing_country?: string;
    billing_pincode?: string;
    place_of_supply?: string;
    shipping_name?: string;
    shipping_phone?: string;
    shipping_address_line1?: string;
    shipping_address_line2?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_country?: string;
    shipping_pincode?: string;
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
                const selectedFields = [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'user_type',
                    'billing_name',
                    'company_name',
                    'gstin',
                    'pan_number',
                    'billing_email',
                    'billing_phone',
                    'billing_address_line1',
                    'billing_address_line2',
                    'billing_city',
                    'billing_state',
                    'billing_country',
                    'billing_pincode',
                    'place_of_supply',
                    'shipping_name',
                    'shipping_phone',
                    'shipping_address_line1',
                    'shipping_address_line2',
                    'shipping_city',
                    'shipping_state',
                    'shipping_country',
                    'shipping_pincode',
                    'created_at',
                    'updated_at'
                ] as (keyof User)[];
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
