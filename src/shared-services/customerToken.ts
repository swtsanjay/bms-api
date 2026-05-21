import { Knex } from 'knex';
import { CustomerToken } from '../types/customerToken';

export default class SharedCustomerTokenService {
    static async save(
        data: Pick<CustomerToken, 'jwt_key' | 'access_token'>,
        trx: Knex.Transaction
    ): Promise<CustomerToken> {
        const existingToken = await trx('customer_tokens')
            .where({ jwt_key: data.jwt_key })
            .first() as CustomerToken | undefined;

        if (existingToken) {
            await trx('customer_tokens')
                .where({ jwt_key: data.jwt_key })
                .update({
                    access_token: data.access_token,
                    updated_at: new Date()
                });

            return await trx('customer_tokens').where({ jwt_key: data.jwt_key }).first() as CustomerToken;
        }

        await trx('customer_tokens').insert(data);
        return await trx('customer_tokens').where({ jwt_key: data.jwt_key }).first() as CustomerToken;
    }

    static async getByJwtKey(jwtKey: string): Promise<CustomerToken | null> {
        const token = await knexInstance('customer_tokens')
            .where({ jwt_key: jwtKey })
            .first() as CustomerToken | undefined;

        return token || null;
    }
}
