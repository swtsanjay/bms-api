import { Knex } from 'knex';
import { Customer } from '../types/customer';

export type CustomerSavePayload = Omit<Customer, 'id'>;

export default class SharedCustomerService {
    static async getCustomerById(
        id: number,
        trx: Knex.Transaction | null = null
    ): Promise<Customer | null> {
        const dbQuery = knexInstance('customers')
            .where({ id });

        if (trx) {
            dbQuery.transacting(trx);
        }

        const customer = await dbQuery.first() as Customer | undefined;
        return customer || null;
    }

    static async getCustomerByPhone(
        phone: string,
        trx: Knex.Transaction | null = null
    ): Promise<Customer | null> {
        const dbQuery = knexInstance('customers')
            .where({ phone })
            .whereNull('deleted_at');

        if (trx) {
            dbQuery.transacting(trx);
        }

        const customer = await dbQuery.first() as Customer | undefined;
        return customer || null;
    }

    static async saveByShopifyCustomerId(
        data: CustomerSavePayload,
        trx: Knex.Transaction
    ): Promise<Customer> {
        const normalizedPhone = SharedCustomerService.normalizePhone(data.phone);
        const payload = {
            ...data,
            phone: normalizedPhone
        };

        const existingCustomer = await trx('customers')
            .where({ shopify_customer_id: data.shopify_customer_id })
            .first() as Customer | undefined;

        if (existingCustomer) {
            await trx('customers')
                .where({ id: existingCustomer.id })
                .update({
                    ...payload,
                    updated_at: new Date()
                });

            return await trx('customers').where({ id: existingCustomer.id }).first() as Customer;
        }

        const [id] = await trx('customers').insert(payload) as [number];
        return await trx('customers').where({ id }).first() as Customer;
    }

    static async updateById(
        id: number,
        data: Partial<CustomerSavePayload>,
        trx: Knex.Transaction
    ): Promise<Customer | null> {
        const payload = {
            ...data,
            ...(data.phone !== undefined && { phone: SharedCustomerService.normalizePhone(data.phone) }),
            updated_at: new Date()
        };

        await trx('customers').where({ id }).update(payload);
        const customer = await trx('customers').where({ id }).first() as Customer | undefined;
        return customer || null;
    }

    static normalizePhone(phone: string | null): string | null {
        if(phone === null) {
            return null;
        }
        const digits = phone.replace(/\D/g, '');
        if (digits.length > 10) {
            return digits.slice(-10);
        }

        return digits;
    }
}
