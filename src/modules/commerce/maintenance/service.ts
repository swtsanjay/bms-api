export default class CommerceMaintenanceService {
    static async releaseExpiredReservations(limit = 500) {
        return knexInstance.transaction(async (trx) => {
            const reservations = await trx('vsq_inventory_reservations')
                .where({ status: 'ACTIVE' })
                .where('expires_at', '<=', new Date())
                .orderBy('id', 'asc')
                .limit(limit)
                .forUpdate();
            if (!reservations.length) return 0;
            const now = new Date();
            for (const reservation of reservations) {
                await trx('vsq_inventory_levels')
                    .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                    .update({
                        reserved: trx.raw('GREATEST(0, reserved - ?)', [Number(reservation.quantity)]),
                        version: trx.raw('version + 1'),
                        updated_at: now
                    });
            }
            await trx('vsq_inventory_reservations')
                .whereIn('id', reservations.map((item) => item.id))
                .update({ status: 'EXPIRED', updated_at: now });

            const orderIds = Array.from(new Set(reservations.map((item) => Number(item.order_id)).filter(Boolean)));
            for (const orderId of orderIds) {
                const active = await trx('vsq_inventory_reservations').where({ order_id: orderId, status: 'ACTIVE' }).first();
                if (active) continue;
                const order = await trx('vsq_orders').where({ id: orderId, order_status: 'PENDING_PAYMENT', payment_method: 'MANUAL' }).first();
                if (!order) continue;
                await trx('vsq_orders').where({ id: orderId }).update({
                    order_status: 'CANCELLED',
                    cancel_reason: 'Manual payment window expired',
                    cancelled_at: now,
                    updated_at: now,
                    version: trx.raw('version + 1')
                });
                await trx('vsq_payment_attempts').where({ order_id: orderId, status: 'PENDING' }).update({ status: 'EXPIRED', updated_at: now });
                await trx('vsq_order_status_history').insert({
                    order_id: orderId,
                    status_type: 'ORDER',
                    from_status: 'PENDING_PAYMENT',
                    to_status: 'CANCELLED',
                    reason: 'Manual payment window expired',
                    actor_type: 'SYSTEM',
                    created_at: now
                });
            }
            return reservations.length;
        });
    }
}
