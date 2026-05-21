import { Knex } from 'knex';
import pagination from '../lib/pagination';
import { clearSearch } from '../lib/utils';
import { ManualOrder, ManualOrderStatus } from '../types/manualOrder';

type ManualOrderPayload = {
    user_id?: number | null;
    product_id?: string | null;
    product_handle?: string | null;
    product_title: string;
    product_image?: string | null;
    size?: string | null;
    quantity: number;
    customer_message?: string | null;
    phone: string;
    email?: string | null;
};

type ManualOrderListQuery = Partial<Record<keyof (ManualOrder & GPagination), ManualOrder[keyof ManualOrder]>> & {
    search?: string;
};

export default class SharedManualOrderService {
    static async list(
        query: ManualOrderListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: ManualOrder[], status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : true,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response = { data: [] as ManualOrder[], status: false, extra: paginationQuery };
        const search = {
            id: query.id ? Number(query.id) : undefined,
            user_id: query.user_id ? Number(query.user_id) : undefined,
            status: query.status ? String(query.status) as ManualOrderStatus : undefined,
            phone: query.phone ? String(query.phone).trim() : undefined,
            email: query.email ? String(query.email).trim() : undefined,
            search: query.search ? String(query.search).trim() : undefined,
        };
        clearSearch(search);

        const dbQuery = knexInstance('manual_order_requests')
            .select('*')
            .whereNull('deleted_at')
            .orderBy('id', 'desc');

        if (search.id) {
            dbQuery.where('id', search.id);
        }
        if (search.user_id) {
            dbQuery.where('user_id', search.user_id);
        }
        if (search.status) {
            dbQuery.where('status', search.status);
        }
        if (search.phone) {
            dbQuery.where('phone', 'like', `%${search.phone}%`);
        }
        if (search.email) {
            dbQuery.where('email', 'like', `%${search.email}%`);
        }
        if (search.search) {
            dbQuery.where((builder) => {
                builder
                    .where('product_title', 'like', `%${search.search}%`)
                    .orWhere('phone', 'like', `%${search.search}%`)
                    .orWhere('email', 'like', `%${search.search}%`)
                    .orWhere('product_handle', 'like', `%${search.search}%`);
            });
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<ManualOrder>(dbQuery, paginationQuery);
        response.data = data;
        response.extra = extra;
        response.status = true;
        return response;
    }

    static async details(
        query: Partial<Record<keyof ManualOrder, ManualOrder[keyof ManualOrder]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: ManualOrder | null, status: boolean }> {
        const search = {
            id: query.id ? Number(query.id) : undefined,
            user_id: query.user_id ? Number(query.user_id) : undefined,
        };
        clearSearch(search);

        const dbQuery = knexInstance('manual_order_requests').select('*').whereNull('deleted_at');
        if (search.id) {
            dbQuery.where('id', search.id);
        }
        if (search.user_id) {
            dbQuery.where('user_id', search.user_id);
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const order = await dbQuery.first() as ManualOrder | undefined;
        return { data: order || null, status: true };
    }

    static async save(data: ManualOrderPayload, trx: Knex.Transaction): Promise<{ data: number | null, status: boolean }> {
        const now = new Date();
        const [id] = await trx('manual_order_requests').insert({
            user_id: data.user_id || null,
            product_id: data.product_id || null,
            product_handle: data.product_handle || null,
            product_title: data.product_title,
            product_image: data.product_image || null,
            size: data.size || null,
            quantity: data.quantity || 1,
            customer_message: data.customer_message || null,
            phone: data.phone,
            email: data.email || null,
            status: 'new',
            created_at: now,
            updated_at: now
        }) as [number];

        return { data: id, status: true };
    }

    static async updateStatus(
        id: number,
        status: ManualOrderStatus,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const updated = await trx('manual_order_requests')
            .where({ id })
            .whereNull('deleted_at')
            .update({
                status,
                updated_at: new Date()
            });

        if (updated === 0) {
            return { data: null, status: false };
        }

        return { data: id, status: true };
    }
}
