import { Knex } from 'knex';
import { Transaction } from '../../../types/transaction';
import { clearSearch } from '../../../lib/utils';

export default class TransactionService {
    static async details(
        query: Partial<Record<keyof Transaction, Transaction[keyof Transaction]>>, 
        transaction?: Knex.Transaction
    ): Promise<{ data: Transaction | null, status: boolean }> {
        const response: { data: Transaction | null, status: boolean } = { data: null, status: false };
        try {
            const search = {
                'id': parseInt(String(query.id)) ? parseInt(String(query.id)) : '',
                'transaction_id': query.transaction_id ? query.transaction_id : ''
            };
            clearSearch(search);
            if (search.id || search.transaction_id) {
                const selectedFields: (keyof Transaction)[] = ['id', 'user_id', 'transaction_id', 'type', 'amount', 'comment', 'receipt_url', 'created_at', 'updated_at'];
                const dbQuery = knexInstance.select(selectedFields).where(search).from('transactions');
                if (transaction) {
                    dbQuery.transacting(transaction);
                }
                response.data = await dbQuery.first() as Transaction | null;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}