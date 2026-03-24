import { Knex } from 'knex';
import { clearSearch } from '../lib/utils';
import pagination from '../lib/pagination';
import { Invoice } from '../types/invoice';
import { InvoiceItem } from '../types/invoiceItem';
import { User } from '../types/user';

type InvoiceItemPayload = {
    id?: number;
    product_id?: number | null;
    sort_order?: number;
    description: string;
    hsn_sac?: string | null;
    quantity: number;
    unit?: string;
    rate: number;
    taxable_value?: number;
    tax_rate?: number;
    tax_amount?: number;
    line_total?: number;
};

export type InvoicePayload = {
    id?: number;
    client_id: number;
    seller_user_id?: number | null;
    order_id?: number | null;
    created_by: number;
    invoice_no: string;
    invoice_date: string;
    challan_no?: string | null;
    challan_date?: string | null;
    eway_bill_no?: string | null;
    transport_name?: string | null;
    transport_id?: string | null;
    place_of_supply?: string | null;
    currency?: string;
    seller_name: string;
    seller_tagline?: string | null;
    seller_address?: string | null;
    seller_phone?: string | null;
    seller_email?: string | null;
    seller_website?: string | null;
    seller_pan?: string | null;
    seller_gstin?: string | null;
    bank_name?: string | null;
    bank_branch?: string | null;
    bank_account_no?: string | null;
    bank_ifsc?: string | null;
    bank_upi_id?: string | null;
    upi_qr_image_url?: string | null;
    subtotal?: number;
    tax_total?: number;
    discount_total?: number;
    round_off?: number;
    total_amount?: number;
    amount_in_words?: string | null;
    notes?: string | null;
    terms_conditions?: string | null;
    declaration?: string | null;
    customer_signature_label?: string | null;
    authorized_signatory_label?: string | null;
    footer_note?: string | null;
    items: InvoiceItemPayload[];
};

type InvoiceQuery = Partial<Record<keyof (Invoice & GPagination), Invoice[keyof Invoice]>>;

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value?: string | null): string | null {
    if (!value) {
        return null;
    }
    return value;
}

function buildClientSnapshot(client: Partial<User> | null) {
    if (!client) {
        return null;
    }

    const billingName = client.billing_name || client.company_name || client.name || null;
    const shippingName = client.shipping_name || billingName;

    return {
        id: client.id || null,
        name: client.name || null,
        company_name: client.company_name || null,
        billing_name: billingName,
        gstin: client.gstin || null,
        pan_number: client.pan_number || null,
        email: client.billing_email || client.email || null,
        phone: client.billing_phone || client.phone || null,
        place_of_supply: client.place_of_supply || null,
        billing_address: {
            line1: client.billing_address_line1 || null,
            line2: client.billing_address_line2 || null,
            city: client.billing_city || null,
            state: client.billing_state || null,
            country: client.billing_country || null,
            pincode: client.billing_pincode || null
        },
        shipping_address: {
            name: shippingName,
            phone: client.shipping_phone || client.billing_phone || client.phone || null,
            line1: client.shipping_address_line1 || client.billing_address_line1 || null,
            line2: client.shipping_address_line2 || client.billing_address_line2 || null,
            city: client.shipping_city || client.billing_city || null,
            state: client.shipping_state || client.billing_state || null,
            country: client.shipping_country || client.billing_country || null,
            pincode: client.shipping_pincode || client.billing_pincode || null
        }
    };
}

async function attachItems(invoices: Invoice[], trx?: Knex.Transaction | null): Promise<any[]> {
    if (invoices.length === 0) {
        return [];
    }

    const invoiceIds = invoices.map((invoice) => invoice.id);
    const userIds = [...new Set(invoices.flatMap((invoice) => [invoice.client_id, invoice.created_by, invoice.seller_user_id]))]
        .filter((value): value is number => Number.isInteger(value));
    const invoiceItemsQuery = knexInstance('invoice_items')
        .select('*')
        .whereIn('invoice_id', invoiceIds)
        .orderBy('sort_order', 'asc')
        .orderBy('id', 'asc');
    const usersQuery = knexInstance('users')
        .select(
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
        )
        .whereIn('id', userIds);

    if (trx) {
        invoiceItemsQuery.transacting(trx);
        usersQuery.transacting(trx);
    }

    const [items, users] = await Promise.all([
        invoiceItemsQuery,
        usersQuery
    ]) as [InvoiceItem[], User[]];

    const productIds = [...new Set(items
        .map((item) => item.product_id)
        .filter((value): value is number => Number.isInteger(value)))];
    const productQuery = productIds.length > 0
        ? knexInstance('products').select('*').whereIn('id', productIds)
        : Promise.resolve([]);

    if (trx && 'transacting' in productQuery) {
        (productQuery as Knex.QueryBuilder).transacting(trx);
    }

    const products = await productQuery as Array<Record<string, any>>;
    const productById = products.reduce<Record<number, Record<string, any>>>((acc, product) => {
        acc[product.id] = product;
        return acc;
    }, {});

    const userById = users.reduce<Record<number, User>>((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {});

    const itemsByInvoiceId = items.reduce<Record<number, any[]>>((acc, item) => {
        if (!acc[item.invoice_id]) {
            acc[item.invoice_id] = [];
        }

        acc[item.invoice_id].push({
            ...item,
            product: item.product_id ? productById[item.product_id] || null : null
        });
        return acc;
    }, {});

    return invoices.map((invoice) => {
        const client = buildClientSnapshot(userById[invoice.client_id] || null);
        const createdByUser = userById[invoice.created_by] || null;
        const sellerUser = invoice.seller_user_id ? userById[invoice.seller_user_id] || null : null;
        const invoiceItems = itemsByInvoiceId[invoice.id] || [];

        return {
            ...invoice,
            client,
            created_by_user: createdByUser,
            seller_user: sellerUser,
            items: invoiceItems,
            seller: {
                name: invoice.seller_name,
                tagline: invoice.seller_tagline,
                address: invoice.seller_address,
                phone: invoice.seller_phone,
                email: invoice.seller_email,
                website: invoice.seller_website,
                pan: invoice.seller_pan,
                gstin: invoice.seller_gstin
            },
            bank_details: {
                bank_name: invoice.bank_name,
                bank_branch: invoice.bank_branch,
                bank_account_no: invoice.bank_account_no,
                bank_ifsc: invoice.bank_ifsc,
                bank_upi_id: invoice.bank_upi_id,
                upi_qr_image_url: invoice.upi_qr_image_url
            },
            summary: {
                subtotal: toNumber(invoice.subtotal),
                tax_total: toNumber(invoice.tax_total),
                discount_total: toNumber(invoice.discount_total),
                round_off: toNumber(invoice.round_off),
                total_amount: toNumber(invoice.total_amount),
                amount_in_words: invoice.amount_in_words
            }
        };
    });
}

function buildInvoiceData(invoice: any) {
    if (!invoice) {
        return null;
    }

    return {
        id: invoice.id,
        meta: {
            invoice_no: invoice.invoice_no,
            invoice_date: invoice.invoice_date,
            challan_no: invoice.challan_no,
            challan_date: invoice.challan_date,
            eway_bill_no: invoice.eway_bill_no,
            transport_name: invoice.transport_name,
            transport_id: invoice.transport_id,
            place_of_supply: invoice.place_of_supply || invoice.client?.place_of_supply || null,
            currency: invoice.currency
        },
        seller: invoice.seller,
        seller_user: invoice.seller_user,
        client: invoice.client,
        bank_details: invoice.bank_details,
        items: invoice.items,
        totals: invoice.summary,
        notes: invoice.notes,
        terms_conditions: invoice.terms_conditions,
        declaration: invoice.declaration,
        labels: {
            customer_signature: invoice.customer_signature_label,
            authorized_signatory: invoice.authorized_signatory_label,
            footer_note: invoice.footer_note
        }
    };
}

export default class SharedInvoiceService {
    static async list(
        query: InvoiceQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean, extra: GPagination }> {
        const paginationQuery: GPagination = {
            page: query.page ? Number(query.page) : 1,
            limit: query.limit ? Number(query.limit) : 20,
            getTotal: query.getTotal ? Boolean(query.getTotal) : false,
            isAll: query.isAll ? Boolean(query.isAll) : false,
            withGroup: query.withGroup ? Boolean(query.withGroup) : false,
            withOutData: query.withOutData ? Boolean(query.withOutData) : false,
            total: query.total ? Number(query.total) : 0,
        };
        const response: { data: any; status: boolean; extra: GPagination } = {
            data: null,
            status: false,
            extra: paginationQuery
        };
        const search = {
            id: query.id ? Number(query.id) : undefined,
            client_id: query.client_id ? Number(query.client_id) : undefined,
            seller_user_id: query.seller_user_id ? Number(query.seller_user_id) : undefined,
            order_id: query.order_id ? Number(query.order_id) : undefined,
            created_by: query.created_by ? Number(query.created_by) : undefined,
            invoice_no: query.invoice_no ? String(query.invoice_no) : undefined,
        };
        clearSearch(search);

        const dbQuery = knexInstance('invoices').select('*').orderBy('id', 'desc').where(search);
        if (trx) {
            dbQuery.transacting(trx);
        }

        const { data, extra } = await pagination(dbQuery, paginationQuery);
        response.data = await attachItems(data as Invoice[], trx);
        response.extra = extra;
        response.status = true;
        return response;
    }

    static async details(
        query: Partial<Record<keyof Invoice, Invoice[keyof Invoice]>>,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean }> {
        const search = {
            id: query.id ? Number(query.id) : undefined
        };
        clearSearch(search);

        const dbQuery = knexInstance('invoices').select('*').where(search);
        if (trx) {
            dbQuery.transacting(trx);
        }

        const invoice = await dbQuery.first() as Invoice | undefined;
        if (!invoice) {
            return { data: null, status: true };
        }

        const [hydratedInvoice] = await attachItems([invoice], trx);
        return { data: hydratedInvoice || null, status: true };
    }

    static async invoiceData(
        id: number,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: any, status: boolean }> {
        const { data, status } = await SharedInvoiceService.details({ id }, trx);
        return {
            data: buildInvoiceData(data),
            status
        };
    }

    static async save(
        data: InvoicePayload,
        trx: Knex.Transaction
    ): Promise<{ data: number | null, status: boolean }> {
        const response: { data: number | null; status: boolean } = { data: null, status: false };
        const now = new Date();

        const computedSubtotal = data.items.reduce((sum, item) => sum + toNumber(item.taxable_value, toNumber(item.quantity) * toNumber(item.rate)), 0);
        const computedTaxTotal = data.items.reduce((sum, item) => sum + toNumber(item.tax_amount, (toNumber(item.taxable_value, toNumber(item.quantity) * toNumber(item.rate)) * toNumber(item.tax_rate)) / 100), 0);
        const discountTotal = toNumber(data.discount_total);
        const roundOff = toNumber(data.round_off);
        const totalAmount = toNumber(data.total_amount, computedSubtotal + computedTaxTotal - discountTotal + roundOff);

        const payload = {
            client_id: data.client_id,
            seller_user_id: data.seller_user_id ?? null,
            order_id: data.order_id ?? null,
            created_by: data.created_by,
            invoice_no: data.invoice_no,
            invoice_date: data.invoice_date,
            challan_no: data.challan_no ?? null,
            challan_date: normalizeDate(data.challan_date),
            eway_bill_no: data.eway_bill_no ?? null,
            transport_name: data.transport_name ?? null,
            transport_id: data.transport_id ?? null,
            place_of_supply: data.place_of_supply ?? null,
            currency: data.currency || 'INR',
            seller_name: data.seller_name,
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
            subtotal: computedSubtotal,
            tax_total: computedTaxTotal,
            discount_total: discountTotal,
            round_off: roundOff,
            total_amount: totalAmount,
            amount_in_words: data.amount_in_words ?? null,
            notes: data.notes ?? null,
            terms_conditions: data.terms_conditions ?? null,
            declaration: data.declaration ?? null,
            customer_signature_label: data.customer_signature_label ?? 'Customer Signature',
            authorized_signatory_label: data.authorized_signatory_label ?? 'Authorised Signatory',
            footer_note: data.footer_note ?? null,
            updated_at: now
        };

        const duplicateQuery = trx('invoices').where({ invoice_no: data.invoice_no });
        if (data.id) {
            duplicateQuery.whereNot({ id: data.id });
        }
        const duplicateInvoice = await duplicateQuery.first();
        if (duplicateInvoice) {
            throw new Error(`Invoice number ${data.invoice_no} already exists`);
        }

        const existing = data.id ? await trx('invoices').where({ id: data.id }).first() : null;
        if (existing) {
            await trx('invoices').where({ id: data.id }).update(payload);
            response.data = existing.id;
        } else {
            const [id] = await trx('invoices').insert({
                ...payload,
                created_at: now
            }) as [number];
            response.data = id;
        }

        const invoiceId = response.data as number;
        const existingItems = await trx('invoice_items').select('id').where({ invoice_id: invoiceId });
        const incomingIds = (data.items || [])
            .map((item) => Number(item.id))
            .filter((id) => Number.isInteger(id) && id > 0);
        const deleteIds = existingItems
            .map((item) => item.id as number)
            .filter((id) => !incomingIds.includes(id));

        if (deleteIds.length > 0) {
            await trx('invoice_items').whereIn('id', deleteIds).del();
        }

        for (const [index, item] of data.items.entries()) {
            const taxableValue = toNumber(item.taxable_value, toNumber(item.quantity) * toNumber(item.rate));
            const taxAmount = toNumber(item.tax_amount, (taxableValue * toNumber(item.tax_rate)) / 100);
            const lineTotal = toNumber(item.line_total, taxableValue + taxAmount);
            const itemPayload = {
                invoice_id: invoiceId,
                product_id: item.product_id ?? null,
                sort_order: Number(item.sort_order ?? (index + 1)),
                description: item.description,
                hsn_sac: item.hsn_sac ?? null,
                quantity: toNumber(item.quantity, 1),
                unit: item.unit || 'NOS',
                rate: toNumber(item.rate),
                taxable_value: taxableValue,
                tax_rate: toNumber(item.tax_rate),
                tax_amount: taxAmount,
                line_total: lineTotal,
                updated_at: now
            };

            if (item.id) {
                const existingItem = await trx('invoice_items').where({ id: item.id, invoice_id: invoiceId }).first();
                if (existingItem) {
                    await trx('invoice_items').where({ id: item.id }).update(itemPayload);
                    continue;
                }
            }

            await trx('invoice_items').insert({
                ...itemPayload,
                created_at: now
            });
        }

        response.status = true;
        return response;
    }
}
