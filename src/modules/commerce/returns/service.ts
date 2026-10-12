import crypto from 'crypto';
import type { Knex } from 'knex';
import { orderDto } from '../checkout/service';

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const RETURN_REASONS = ['SIZE_ISSUE', 'DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'OTHER'] as const;
export type ReturnReason = typeof RETURN_REASONS[number];
export type ReturnItemInput = { order_item_id: number; quantity: number };

export class CommerceReturnError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceReturnError';
    }
}

async function requestDetails(db: Knex | Knex.Transaction, orderId: number) {
    const rows = await db('vsq_returns').where({ order_id: orderId }).orderBy('requested_at', 'desc').orderBy('id', 'desc');
    return Promise.all(rows.map(async (row) => {
        const [items, history] = await Promise.all([
            db('vsq_return_items as ri').join('vsq_order_items as oi', 'oi.id', 'ri.order_item_id')
                .where('ri.return_id', row.id).select('ri.order_item_id', 'ri.quantity', 'oi.product_title_snapshot as product_title', 'oi.variant_title_snapshot as variant_title', 'oi.sku_snapshot as sku'),
            db('vsq_return_status_history').where({ return_id: row.id }).orderBy('id', 'asc')
                .select('from_status', 'to_status', 'actor_type', 'actor_id', 'note', 'created_at')
        ]);
        return {
            public_id: row.public_id, return_number: row.return_number, status: row.status,
            reason_code: row.reason_code, customer_note: row.customer_note, admin_note: row.admin_note,
            requested_at: row.requested_at, approved_at: row.approved_at,
            items: items.map((item) => ({ ...item, order_item_id: Number(item.order_item_id), quantity: Number(item.quantity) })),
            history
        };
    }));
}

function customerRequestView(request: Awaited<ReturnType<typeof requestDetails>>[number]) {
    return {
        public_id: request.public_id, return_number: request.return_number, status: request.status,
        reason_code: request.reason_code, customer_note: request.customer_note,
        requested_at: request.requested_at, items: request.items
    };
}

async function deliveryDetails(db: Knex | Knex.Transaction, orderId: number) {
    const rows = await db('vsq_shipment_items as si')
        .join('vsq_shipments as s', 's.id', 'si.shipment_id')
        .join('vsq_order_items as oi', 'oi.id', 'si.order_item_id')
        .where('s.order_id', orderId)
        .select('si.order_item_id', 'si.quantity', 's.public_id as shipment_public_id', 's.status', 's.delivered_at', 's.shipped_at');
    return rows.map((row) => ({ ...row, order_item_id: Number(row.order_item_id), quantity: Number(row.quantity) }));
}

async function eligibility(db: Knex | Knex.Transaction, orderId: number, now: Date) {
    const [items, deliveries, reservations, refunds] = await Promise.all([
        db('vsq_order_items').where({ order_id: orderId }).select('id', 'quantity', 'refunded_quantity', 'product_title_snapshot', 'variant_title_snapshot'),
        deliveryDetails(db, orderId),
        db('vsq_return_items as ri').join('vsq_returns as r', 'r.id', 'ri.return_id')
            .where('r.order_id', orderId).whereNotIn('r.status', ['REJECTED', 'CANCELLED'])
            .groupBy('ri.order_item_id').select('ri.order_item_id').sum({ quantity: 'ri.quantity' }),
        db('vsq_refund_items as rfi').join('vsq_refunds as r', 'r.id', 'rfi.refund_id')
            .where('r.order_id', orderId).whereNot('r.status', 'FAILED')
            .groupBy('rfi.order_item_id').select('rfi.order_item_id').sum({ quantity: 'rfi.quantity' })
    ]);
    const reserved = new Map(reservations.map((entry) => {
        const row = entry as { order_item_id: number; quantity: number };
        return [Number(row.order_item_id), Number(row.quantity)] as const;
    }));
    const refunded = new Map(refunds.map((entry) => {
        const row = entry as { order_item_id: number; quantity: number };
        return [Number(row.order_item_id), Number(row.quantity)] as const;
    }));
    const cutoff = now.getTime() - WINDOW_MS;
    return {
        window_days: 7,
        items: items.map((item) => {
            const itemId = Number(item.id);
            const delivered = deliveries.filter((row) => row.order_item_id === itemId && row.status === 'DELIVERED' && row.delivered_at &&
                new Date(row.delivered_at).getTime() <= now.getTime() && new Date(row.delivered_at).getTime() >= cutoff)
                .reduce((total, row) => total + row.quantity, 0);
            // Refunded quantity may be mirrored on the order item; count the larger source once.
            const unavailable = Number(reserved.get(itemId) || 0) + Math.max(Number(item.refunded_quantity || 0), Number(refunded.get(itemId) || 0));
            return {
                order_item_id: itemId, product_title: item.product_title_snapshot, variant_title: item.variant_title_snapshot,
                ordered_quantity: Number(item.quantity), eligible_quantity: Math.max(0, Math.min(Number(item.quantity), delivered) - unavailable)
            };
        }),
        deliveries
    };
}

function validateRequest(items: ReturnItemInput[], reason: ReturnReason, note?: string | null) {
    if (!Array.isArray(items) || items.length < 1 || items.length > 100 ||
        items.some((item) => !Number.isSafeInteger(item.order_item_id) || item.order_item_id < 1 ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1) ||
        new Set(items.map((item) => item.order_item_id)).size !== items.length) {
        throw new CommerceReturnError('Select valid order items and quantities', 422);
    }
    if (!RETURN_REASONS.includes(reason)) throw new CommerceReturnError('Select a return reason', 422);
    if (note != null && (typeof note !== 'string' || note.length > 2000)) throw new CommerceReturnError('Note must be 2000 characters or fewer', 422);
}

export async function customerReturnContext(orderPublicId: string, customerId: number) {
    const order = await knexInstance('vsq_orders').where({ public_id: orderPublicId, customer_id: customerId }).first();
    if (!order) throw new CommerceReturnError('Order not found', 404);
    const now = new Date();
    const [requests, available] = await Promise.all([requestDetails(knexInstance, Number(order.id)), eligibility(knexInstance, Number(order.id), now)]);
    return { order_public_id: orderPublicId, requests: requests.map(customerRequestView), eligibility: { window_days: available.window_days, items: available.items } };
}

export async function requestCustomerReturn(orderPublicId: string, customerId: number, items: ReturnItemInput[], reason: ReturnReason, note?: string | null) {
    validateRequest(items, reason, note);
    return knexInstance.transaction(async (trx) => {
        // Serializes competing requests for this order, including requests from separate sessions.
        const order = await trx('vsq_orders').where({ public_id: orderPublicId, customer_id: customerId }).forUpdate().first();
        if (!order) throw new CommerceReturnError('Order not found', 404);
        if (order.order_status === 'CANCELLED') throw new CommerceReturnError('Cancelled orders cannot be returned', 409);
        // A repeated submit must not create an identical open request even if other
        // units of the item are still eligible. The order lock also covers this check.
        const openRequests = await trx('vsq_returns').where({ order_id: order.id, status: 'REQUESTED', reason_code: reason }).select('id');
        const selected = [...items].sort((left, right) => left.order_item_id - right.order_item_id);
        for (const open of openRequests) {
            const existing = await trx('vsq_return_items').where({ return_id: open.id }).orderBy('order_item_id', 'asc').select('order_item_id', 'quantity');
            if (existing.length === selected.length && existing.every((item, index) => Number(item.order_item_id) === selected[index].order_item_id && Number(item.quantity) === selected[index].quantity)) {
                throw new CommerceReturnError('An identical return request is already awaiting review', 409);
            }
        }
        const available = await eligibility(trx, Number(order.id), new Date());
        const limits = new Map(available.items.map((item) => [item.order_item_id, item.eligible_quantity]));
        for (const item of items) {
            if ((limits.get(item.order_item_id) || 0) < item.quantity) {
                throw new CommerceReturnError('Selected quantity exceeds delivered items within the seven-day return window or is already requested or refunded', 409);
            }
        }
        const now = new Date();
        const publicId = crypto.randomUUID();
        const [returnId] = await trx('vsq_returns').insert({
            public_id: publicId, return_number: `RET-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
            order_id: order.id, status: 'REQUESTED', reason_code: reason, customer_note: note?.trim() || null,
            requested_at: now, created_at: now, updated_at: now
        });
        await trx('vsq_return_items').insert(items.map((item) => ({ return_id: returnId, order_item_id: item.order_item_id, quantity: item.quantity, created_at: now, updated_at: now })));
        await trx('vsq_return_status_history').insert({ return_id: returnId, from_status: null, to_status: 'REQUESTED', actor_type: 'CUSTOMER', actor_id: customerId, note: null, created_at: now });
        const created = (await requestDetails(trx, Number(order.id))).find((row) => row.public_id === publicId);
        return created ? customerRequestView(created) : null;
    });
}

export async function staffReturns(page: number, limit: number, status?: string) {
    const query = knexInstance('vsq_returns as r').join('vsq_orders as o', 'o.id', 'r.order_id');
    if (status) query.where('r.status', status);
    const [rows, count] = await Promise.all([
        query.clone().select('r.public_id', 'r.return_number', 'r.status', 'r.reason_code', 'r.requested_at', 'o.public_id as order_public_id', 'o.order_number', 'o.email_snapshot')
            .orderBy('r.requested_at', 'desc').orderBy('r.id', 'desc').limit(limit).offset((page - 1) * limit),
        query.clone().count({ total: '*' }).first()
    ]);
    return { returns: rows, pagination: { page, limit, total: Number(count?.total || 0) } };
}

export async function staffReturn(publicId: string) {
    const row = await knexInstance('vsq_returns').where({ public_id: publicId }).first();
    if (!row) throw new CommerceReturnError('Return request not found', 404);
    const [order, requests, deliveries] = await Promise.all([
        orderDto(knexInstance, Number(row.order_id)), requestDetails(knexInstance, Number(row.order_id)), deliveryDetails(knexInstance, Number(row.order_id))
    ]);
    return { request: requests.find((request) => request.public_id === publicId), order, deliveries, request_history: requests };
}

export async function decideStaffReturn(publicId: string, decision: 'APPROVED' | 'REJECTED', note: string, staffId: number) {
    if (!['APPROVED', 'REJECTED'].includes(decision) || !note?.trim() || note.trim().length > 2000) {
        throw new CommerceReturnError('Select a decision and provide a note of up to 2000 characters', 422);
    }
    await knexInstance.transaction(async (trx) => {
        const target = await trx('vsq_returns').where({ public_id: publicId }).first();
        if (!target) throw new CommerceReturnError('Return request not found', 404);
        await trx('vsq_orders').where({ id: target.order_id }).forUpdate().first();
        const current = await trx('vsq_returns').where({ id: target.id }).forUpdate().first();
        if (current.status !== 'REQUESTED') throw new CommerceReturnError('Only requested returns can be reviewed', 409);
        const now = new Date();
        await trx('vsq_returns').where({ id: target.id }).update({ status: decision, admin_note: note.trim(), approved_at: decision === 'APPROVED' ? now : null, updated_at: now });
        await trx('vsq_return_status_history').insert({ return_id: target.id, from_status: 'REQUESTED', to_status: decision, actor_type: 'STAFF', actor_id: staffId, note: note.trim(), created_at: now });
    });
    return staffReturn(publicId);
}
