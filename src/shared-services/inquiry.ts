import { Knex } from 'knex';
import pagination from '../lib/pagination';
import { clearSearch } from '../lib/utils';
import { Inquiry, InquiryStatus } from '../types/inquiry';

type InquiryPayload = {
    user_id?: number | null;
    name: string;
    email: string;
    phone: string;
    company_brand_name?: string | null;
    requirements: string;
    reference_file_url?: string | null;
};

type InquiryListQuery = Partial<Record<keyof (Inquiry & GPagination), Inquiry[keyof Inquiry]>> & {
    search?: string;
};

export default class SharedInquiryService {
    static async list(
        query: InquiryListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: Inquiry[], status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : true,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response = { data: [] as Inquiry[], status: false, extra: paginationQuery };
        const search = {
            id: query.id ? Number(query.id) : undefined,
            user_id: query.user_id ? Number(query.user_id) : undefined,
            status: query.status ? String(query.status) as InquiryStatus : undefined,
            email: query.email ? String(query.email).trim() : undefined,
            phone: query.phone ? String(query.phone).trim() : undefined,
            search: query.search ? String(query.search).trim() : undefined,
        };
        clearSearch(search);

        const dbQuery = knexInstance('inquiries')
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
        if (search.email) {
            dbQuery.where('email', 'like', `%${search.email}%`);
        }
        if (search.phone) {
            dbQuery.where('phone', 'like', `%${search.phone}%`);
        }
        if (search.search) {
            dbQuery.where((builder) => {
                builder
                    .where('name', 'like', `%${search.search}%`)
                    .orWhere('email', 'like', `%${search.search}%`)
                    .orWhere('phone', 'like', `%${search.search}%`)
                    .orWhere('company_brand_name', 'like', `%${search.search}%`);
            });
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination<Inquiry>(dbQuery, paginationQuery);
        response.data = data;
        response.extra = extra;
        response.status = true;
        return response;
    }

    static async details(
        query: Partial<Record<keyof Inquiry, Inquiry[keyof Inquiry]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: Inquiry | null, status: boolean }> {
        const search = {
            id: query.id ? Number(query.id) : undefined,
            user_id: query.user_id ? Number(query.user_id) : undefined,
        };
        clearSearch(search);

        const dbQuery = knexInstance('inquiries').select('*').whereNull('deleted_at');
        if (search.id) {
            dbQuery.where('id', search.id);
        }
        if (search.user_id) {
            dbQuery.where('user_id', search.user_id);
        }
        if (trx) {
            dbQuery.transacting(trx);
        }

        const inquiry = await dbQuery.first() as Inquiry | undefined;
        return { data: inquiry || null, status: true };
    }

    static async save(data: InquiryPayload, trx: Knex.Transaction): Promise<{ data: number | null, status: boolean }> {
        const now = new Date();
        const [id] = await trx('inquiries').insert({
            user_id: data.user_id || null,
            name: data.name,
            email: data.email,
            phone: data.phone,
            company_brand_name: data.company_brand_name || null,
            requirements: data.requirements,
            reference_file_url: data.reference_file_url || null,
            status: 'new',
            created_at: now,
            updated_at: now
        }) as [number];

        return { data: id, status: true };
    }

    static async updateStatus(
        id: number,
        status: InquiryStatus,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const updated = await trx('inquiries')
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
