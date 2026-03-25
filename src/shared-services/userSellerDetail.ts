import { Knex } from 'knex';
import { UserSellerDetail } from '../types/userSellerDetail';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';

export default class SharedUserSellerDetailService {
    static async list(
        query: Partial<Record<keyof (UserSellerDetail & GPagination), UserSellerDetail[keyof UserSellerDetail]>>,
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
        const search = { ...query };
        clearSearch(search);
        try {
            const dbQuery = knexInstance('user_seller_details').select('*');
            if (trx) {
                dbQuery.transacting(trx);
            }
            if (search.user_id) {
                dbQuery.where({ user_id: search.user_id });
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

    static async details(
        query: Partial<Record<keyof UserSellerDetail, UserSellerDetail[keyof UserSellerDetail]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: UserSellerDetail | null, status: boolean }> {
        const response: { data: UserSellerDetail | null, status: boolean } = { data: null, status: false };
        try {
            const search: any = {
                id: query.id ? Number(query.id) : '',
                user_id: query.user_id ? Number(query.user_id) : ''
            };
            clearSearch(search);
            if (search.id || search.user_id) {
                const dbQuery = knexInstance('user_seller_details').select('*').where(search);
                if (trx) {
                    dbQuery.transacting(trx);
                }
                response.data = await dbQuery.first() as UserSellerDetail | null;
            }
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }

    static async saveByKeys(
        data: Partial<Record<keyof UserSellerDetail, UserSellerDetail[keyof UserSellerDetail]>>,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };
        try {
            const existing = data.id ? await trx('user_seller_details').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof UserSellerDetail)[] = ['id', 'user_id', 'seller_name', 'seller_tagline', 'seller_address', 'seller_phone', 'seller_email', 'seller_website', 'seller_pan', 'seller_gstin', 'bank_name', 'bank_branch', 'bank_account_no', 'bank_ifsc', 'bank_upi_id', 'upi_qr_image_url', 'terms_conditions', 'declaration', 'customer_signature_label', 'authorized_signatory_label', 'footer_note', 'created_at', 'updated_at'];
                await trx('user_seller_details').select(selectedKeys).where({ id: data.id }).update({ ...data, updated_at: new Date() }) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const payload = {
                    ...data,
                    created_at: new Date(),
                    updated_at: new Date()
                } as any;
                const [id] = await trx('user_seller_details').insert(payload) as [number];
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
        trx: Knex.Transaction
    ): Promise<{ data: boolean, status: boolean }> {
        const response: { data: boolean, status: boolean } = { data: false, status: false };
        try {
            await trx('user_seller_details').where({ id }).del();
            response.data = true;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
}
