import { Knex } from 'knex';
import { User } from '../types/user';
import { UserSellerDetail } from '../types/userSellerDetail';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';

type UserSavePayload = Partial<Record<keyof User, User[keyof User]>> & {
    seller_details?: Partial<UserSellerDetail> | null;
};

function buildSellerDetailsPayload(data?: Partial<UserSellerDetail> | null) {
    if (!data) {
        return null;
    }

    return {
        seller_name: data.seller_name ?? null,
        seller_tagline: data.seller_tagline ?? null,
        seller_address: data.seller_address ?? null,
        seller_phone: data.seller_phone ?? null,
        seller_email: data.seller_email ?? null,
        seller_website: data.seller_website ?? null,
        seller_pan: data.seller_pan ?? null,
        seller_gstin: data.seller_gstin ?? null,
        bank_name: data.bank_name ?? null,
        bank_branch: data.bank_branch ?? null,
        bank_account_no: data.bank_account_no ?? null,
        bank_ifsc: data.bank_ifsc ?? null,
        bank_upi_id: data.bank_upi_id ?? null,
        upi_qr_image_url: data.upi_qr_image_url ?? null,
        terms_conditions: data.terms_conditions ?? null,
        declaration: data.declaration ?? null,
        customer_signature_label: data.customer_signature_label ?? null,
        authorized_signatory_label: data.authorized_signatory_label ?? null,
        footer_note: data.footer_note ?? null,
    };
}

async function attachSellerDetails(users: User[], trx: Knex.Transaction | null = null): Promise<any[]> {
    if (users.length === 0) {
        return users;
    }

    const userIds = users.map((user) => user.id);
    const sellerQuery = knexInstance('user_seller_details').select('*').whereIn('user_id', userIds);
    if (trx) {
        sellerQuery.transacting(trx);
    }
    const sellerDetails = await sellerQuery as UserSellerDetail[];
    const sellerByUserId = sellerDetails.reduce<Record<number, UserSellerDetail>>((acc, row) => {
        acc[row.user_id] = row;
        return acc;
    }, {});

    return users.map((user) => ({
        ...user,
        seller_details: sellerByUserId[user.id] || null
    }));
}

export default class SharedUserService {
    /**
     * Saves or updates user property data based on provided keys and user details.
     * @param {Object} data - The data object containing user properties and keys to be updated.
     * @param {Knex.Transaction} trx - The Knex transaction to be used.
     * @returns {Promise<GResponse<number | null>>} A response containing the user ID and status of the operation.
     * @throws {Error} If the database query fails.
    */
    static async list(
        query: Partial<Record<keyof (User & GPagination), User[keyof User]>>,
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
        const search = {
            ...query,
        };
        clearSearch(search);
        try {
            const dbQuery = knexInstance('users')
                .select(
                    'id',
                    'name',
                    'email',
                    'phone',
                    'adhar_url',
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
                )
                .whereNull('deleted_at');
            if (trx) {
                dbQuery.transacting(trx);
            }
            const { data, extra } = await pagination(dbQuery, paginationQuery);
            response.data = await attachSellerDetails(data as User[], trx);
            response.extra = extra;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }
    static async saveByKeys(
        data: UserSavePayload,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null, status: boolean } = { data: null, status: false };

        try {
            const sellerDetailsPayload = buildSellerDetailsPayload(data.seller_details);
            delete data.seller_details;
            const existing = data.id ? await trx('users').where({ id: data.id }).first() : null;
            if (existing) {
                const selectedKeys: (keyof User)[] = ['id', 'name', 'password', 'email', 'phone', 'user_type', 'created_at', 'updated_at', 'deleted_at'];
                await trx('users').select(selectedKeys).where({ id: data.id }).update(data) as [number];
                response.data = existing.id;
            } else {
                delete data.id;
                const [id] = await trx('users').insert(data) as [number];
                response.data = id;
            }

            if (response.data && sellerDetailsPayload) {
                const existingSellerDetails = await trx('user_seller_details').where({ user_id: response.data }).first();
                const payload = {
                    user_id: response.data,
                    ...sellerDetailsPayload,
                    updated_at: new Date()
                };

                if (existingSellerDetails) {
                    await trx('user_seller_details').where({ user_id: response.data }).update(payload);
                } else {
                    await trx('user_seller_details').insert({
                        ...payload,
                        created_at: new Date()
                    });
                }
            }

            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }

    static async getUserBy(
        value: string | number,
        key: 'id' | 'email' = 'id',
        trx: Knex.Transaction | null = null
    ): Promise<User | null> {
        try {
            const dbQuery = knexInstance('users')
                .where({ [key]: value })
                .whereNull('deleted_at');
            if (trx) {
                dbQuery.transacting(trx);
            }
            const user = await dbQuery.first() as User | undefined;
            if (!user) {
                return null;
            }
            const [hydratedUser] = await attachSellerDetails([user], trx);
            return hydratedUser || null;
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
            await trx('users').where({ id }).update({ deleted_at: new Date() });
            response.data = true;
            response.status = true;
            return response;
        } catch (err) {
            throw err;
        }
    }

}
