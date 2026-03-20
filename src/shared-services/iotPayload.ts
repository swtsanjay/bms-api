import { Knex } from 'knex';
import { IotPayload } from '../types/iotPayload';

export default class SharedIotPayloadService {
    static async save(
        payload: IotPayload['payload'],
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const [id] = await trx('iot_payloads').insert({ payload }) as [number];
            response.data = id;
            response.status = true;
            return response;
        } catch (error) {
            throw error;
        }
    }
}
