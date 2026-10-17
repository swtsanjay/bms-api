import crypto from 'crypto';
import CommerceCheckoutService from '../checkout/service';
import { ShiprocketError, pickupLocations, serviceableCouriers, shiprocketApi, validateParcel, type Parcel } from './shiprocket-client';
import { validatedTrackingUrl } from './shipment-workflow';
import CommerceAdminService from './service';

type BookingInput = Parcel & { courier_id: number };
type ProviderOrder = Record<string, any>;
const ref = (uuid: string) => BigInt(`0x${uuid.replace(/-/g, '')}`).toString(10); // numeric, stable, <=39 of the documented 50 chars
const asDate = (value: unknown) => value && !Number.isNaN(new Date(String(value)).getTime()) ? new Date(String(value)) : null;

function providerIds(data: ProviderOrder) {
    const row = data.data || data;
    const shipment = row.shipments?.[0] || row.shipment || row;
    return {
        orderId: String(row.order_id || row.id || ''),
        shipmentId: String(row.shipment_id || shipment.id || shipment.shipment_id || ''),
        awb: String(row.awb_code || shipment.awb_code || shipment.awb || ''),
        courierName: String(row.courier_name || shipment.courier_name || ''),
        courierId: Number(row.courier_company_id || shipment.courier_company_id || 0),
        status: String(shipment.status || row.status || ''),
        statusCode: Number(shipment.status_code || row.status_code || 0)
    };
}

function remoteCancelled(data: ProviderOrder) {
    const row = data.data || data;
    const shipment = row.shipments?.[0] || row.shipment || {};
    return Number(row.status_code) === 5 || [8, 45].includes(Number(shipment.status_code)) ||
        /CANCELLED|CANCELED/.test(String(row.status || shipment.status || '').toUpperCase());
}

async function details(publicId: string) {
    const order = await knexInstance('vsq_orders').where({ public_id: publicId }).first();
    if (!order) throw new ShiprocketError('Order not found', 404);
    const dto = await CommerceCheckoutService.adminOrderById(Number(order.id));
    if (!dto) throw new ShiprocketError('Order not found', 404);
    return { order, dto };
}

async function event(shipmentId: number, orderId: number, status: string, description: string, actorId: number | null) {
    const now = new Date();
    await knexInstance('vsq_shipment_events').insert({ shipment_id: shipmentId, status, description, occurred_at: now, created_at: now });
    await knexInstance('vsq_order_status_history').insert({ order_id: orderId, status_type: 'SHIPMENT', from_status: null,
        to_status: status, reason: description, actor_id: actorId, actor_type: actorId ? 'ADMIN' : 'SYSTEM', created_at: now });
}

export async function quoteShiprocket(publicId: string, parcelInput: Parcel) {
    const parcel = validateParcel(parcelInput);
    const { order, dto } = await details(publicId);
    if (order.order_status !== 'ACCEPTED' || (order.financial_status !== 'PAID' && order.payment_method !== 'COD')) {
        throw new ShiprocketError('Accept a paid or COD order before booking', 409);
    }
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id }).first();
    if (shipment && (shipment.provider !== 'SHIPROCKET_MANUAL' || shipment.tracking_number || shipment.provider_shipment_id || shipment.provider_order_id || !['PENDING', 'PREPARING'].includes(shipment.status))) {
        throw new ShiprocketError('This parcel already has courier details or was handed over; it cannot be booked again', 409);
    }
    const pickups = await pickupLocations();
    if (!pickups.some((pickup: any) => pickup.name === parcel.pickup_location && pickup.postcode === parcel.pickup_postcode)) {
        throw new ShiprocketError('Select a pickup location from the connected Shiprocket account', 422);
    }
    const delivery = String((dto.addresses as any)?.shipping?.postcode || '');
    if (!/^\d{6}$/.test(delivery)) throw new ShiprocketError('Customer delivery pincode is invalid', 422);
    const couriers = await serviceableCouriers(parcel, delivery, order.payment_method === 'COD', Number(order.grand_total) + Number(order.credits_total || 0));
    return { couriers, pickup_location: parcel.pickup_location };
}

export async function listShiprocketPickups() { return pickupLocations(); }

export async function shiprocketLabel(publicId: string) {
    const { order } = await details(publicId);
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (!shipment?.label_url) throw new ShiprocketError('Shipping label is not available yet; reconcile the booking', 404);
    const url = validatedTrackingUrl(shipment.label_url);
    if (!url) throw new ShiprocketError('Shipping label URL is invalid', 409);
    return url;
}

function creationPayload(dto: any, parcel: Parcel, merchantReference: string) {
    const shipping = dto.addresses.shipping;
    const billing = dto.addresses.billing || shipping;
    if (!shipping || !billing || !dto.phone || !dto.email) throw new ShiprocketError('Customer address, phone and email are required for Shiprocket', 422);
    const addressFields = (prefix: string, address: any) => ({
        [`${prefix}_customer_name`]: address.first_name,
        [`${prefix}_last_name`]: address.last_name || '',
        [`${prefix}_address`]: address.address_line_1,
        [`${prefix}_address_2`]: address.address_line_2 || '',
        [`${prefix}_city`]: address.city,
        [`${prefix}_pincode`]: address.postcode,
        [`${prefix}_state`]: address.state,
        [`${prefix}_country`]: address.country || 'India',
        [`${prefix}_email`]: dto.email,
        [`${prefix}_phone`]: address.phone || dto.phone
    });
    const items = dto.items.map((item: any) => ({ name: item.product_title, sku: item.sku || `item-${item.id}`,
        units: item.quantity, selling_price: Math.max(0.01, Number((item.line_total / item.quantity).toFixed(2))) }));
    const credits = Number(dto.credits_total || 0);
    const due = Number(dto.grand_total);
    const shippingCharge = Number(dto.shipping_total);
    if (![credits, due, shippingCharge].every((amount) => Number.isFinite(amount) && amount >= 0)) throw new ShiprocketError('Order payment totals need review before booking', 422);
    // A partial COD order must collect only the balance after server-recorded credits.
    const subtotal = credits > 0 ? due + credits : due - shippingCharge;
    if (subtotal < 0) throw new ShiprocketError('Order payment totals need review before booking', 422);
    return {
        order_id: merchantReference, order_date: new Date(dto.placed_at).toISOString().slice(0, 16).replace('T', ' '),
        pickup_location: parcel.pickup_location, ...addressFields('billing', billing),
        shipping_is_billing: false, ...addressFields('shipping', shipping),
        order_items: items, payment_method: dto.payment_method === 'COD' ? 'COD' : 'Prepaid',
        shipping_charges: credits > 0 ? 0 : shippingCharge,
        sub_total: Number(subtotal.toFixed(2)),
        ...(dto.payment_method === 'COD' && credits > 0 ? { partial_cod_collected: credits } : {}),
        weight: parcel.weight, length: parcel.length, breadth: parcel.breadth, height: parcel.height
    };
}

async function markError(shipmentId: number, error: unknown, stage: string) {
    const message = error instanceof Error ? error.message : 'Unknown Shiprocket error';
    await knexInstance('vsq_shipments').where({ id: shipmentId }).update({
        integration_state: 'RECONCILE_REQUIRED', integration_error: `${stage}: ${message}`.slice(0, 500),
        integration_locked_at: null, updated_at: new Date()
    });
}

export async function bookShiprocket(publicId: string, input: BookingInput, actorId: number) {
    const parcel = validateParcel(input);
    const courierId = Number(input.courier_id);
    if (!Number.isInteger(courierId) || courierId <= 0) throw new ShiprocketError('Choose a serviceable courier', 422);
    const { order, dto } = await details(publicId);
    const existingApiParcel = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (existingApiParcel?.integration_state === 'PICKUP_SCHEDULED') return CommerceCheckoutService.adminOrderById(Number(order.id));
    if (existingApiParcel) throw new ShiprocketError('A Shiprocket booking is in progress or needs reconciliation; do not create another order', 409);
    const quote = await quoteShiprocket(publicId, parcel);
    const selected = quote.couriers.find((courier: any) => courier.courier_id === courierId);
    if (!selected) throw new ShiprocketError('Selected courier is no longer serviceable; refresh rates', 409);
    const shipment = await knexInstance.transaction(async (trx) => {
        const lockedOrder = await trx('vsq_orders').where({ id: order.id }).forUpdate().first();
        if (lockedOrder.order_status !== 'ACCEPTED') throw new ShiprocketError('Order must still be Accepted', 409);
        let row = await trx('vsq_shipments').where({ order_id: order.id }).forUpdate().first();
        if (row?.integration_state) throw new ShiprocketError('A Shiprocket booking is in progress or needs reconciliation; refresh tracking before retrying', 409);
        if (row && (row.provider !== 'SHIPROCKET_MANUAL' || row.tracking_number || row.provider_shipment_id || row.provider_order_id || !['PENDING', 'PREPARING'].includes(row.status))) {
            throw new ShiprocketError('Existing parcel cannot be booked with Shiprocket', 409);
        }
        const now = new Date();
        if (!row) {
            const items = await trx('vsq_order_items').where({ order_id: order.id }).forUpdate();
            if (!items.length || items.some((item) => Number(item.fulfilled_quantity) > 0)) throw new ShiprocketError('Order items cannot be booked again', 409);
            const [id] = await trx('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: order.id,
                provider: 'SHIPROCKET', courier_name: selected.courier_name, status: 'PREPARING', created_at: now, updated_at: now });
            for (const item of items) await trx('vsq_shipment_items').insert({ shipment_id: id, order_item_id: item.id, quantity: item.quantity });
            row = await trx('vsq_shipments').where({ id }).first();
        } else {
            const items = await trx('vsq_order_items').where({ order_id: order.id }).forUpdate();
            const packed = await trx('vsq_shipment_items').where({ shipment_id: row.id });
            if (items.length !== packed.length || items.some((item) => !packed.some((line) =>
                Number(line.order_item_id) === Number(item.id) && Number(line.quantity) === Number(item.quantity)))) {
                throw new ShiprocketError('Prepared parcel does not contain every order item exactly once; review it before booking', 409);
            }
            for (const item of items) {
                if (Number(item.fulfilled_quantity) > Number(item.quantity)) throw new ShiprocketError('Recorded fulfillment exceeds ordered quantity', 409);
                // Older manual preparation incremented this before physical handover.
                if (Number(item.fulfilled_quantity)) await trx('vsq_order_items').where({ id: item.id }).update({ fulfilled_quantity: 0, updated_at: now });
            }
        }
        const merchantReference = ref(row.public_id);
        await trx('vsq_shipments').where({ id: row.id }).update({ provider: 'SHIPROCKET', merchant_reference: merchantReference,
            courier_id: courierId, courier_name: selected.courier_name, pickup_location: parcel.pickup_location,
            pickup_postcode: parcel.pickup_postcode, package_weight_kg: parcel.weight, package_length_cm: parcel.length,
            package_breadth_cm: parcel.breadth, package_height_cm: parcel.height, integration_state: 'CREATE_INTENT',
            integration_locked_at: now, integration_error: null, updated_at: now });
        return { ...row, merchant_reference: merchantReference };
    });
    await event(Number(shipment.id), Number(order.id), 'BOOKING_REQUESTED', 'Shiprocket booking requested; parcel has not been handed to a courier', actorId);
    try {
        const created = providerIds(await shiprocketApi.create(creationPayload(dto, parcel, shipment.merchant_reference)));
        if (!created.orderId || !created.shipmentId) throw new ShiprocketError('Shiprocket did not return order and shipment IDs; reconcile before retrying', 502, true);
        await knexInstance('vsq_shipments').where({ id: shipment.id }).update({ provider_order_id: created.orderId,
            provider_shipment_id: created.shipmentId, integration_state: 'AWB_INTENT', updated_at: new Date() });
        await event(Number(shipment.id), Number(order.id), 'BOOKED', `Shiprocket order ${created.orderId} created; no courier handover`, actorId);
        return advanceBooking(Number(order.id), Number(shipment.id), created.shipmentId, courierId, selected.courier_name, 'AWB', actorId);
    } catch (error) {
        const current = await knexInstance('vsq_shipments').where({ id: shipment.id }).first();
        if (current.integration_state === 'CREATE_INTENT') await markError(Number(shipment.id), error, 'Create custom order');
        throw error;
    }
}

async function advanceBooking(orderId: number, shipmentId: number, providerShipmentId: string, courierId: number, courierName: string,
    start: 'AWB' | 'PICKUP' | 'LABEL', actorId: number) {
    let stage = start === 'AWB' ? 'Assign courier and AWB' : start === 'PICKUP' ? 'Request pickup' : 'Generate label';
    try {
        if (start === 'AWB') {
            await knexInstance('vsq_shipments').where({ id: shipmentId }).update({ integration_state: 'AWB_INTENT', updated_at: new Date() });
        const assigned = await shiprocketApi.assignAwb(providerShipmentId, courierId);
        const awb = String(assigned.response?.data?.awb_code || '');
        if (Number(assigned.awb_assign_status) !== 1 || !awb) throw new ShiprocketError('Shiprocket did not confirm AWB assignment; reconcile before retrying', 502, true);
        await knexInstance('vsq_shipments').where({ id: shipmentId }).update({ tracking_number: awb,
            courier_name: String(assigned.response?.data?.courier_name || courierName),
            integration_state: 'PICKUP_INTENT', updated_at: new Date() });
        await event(shipmentId, orderId, 'AWB_ASSIGNED', `AWB ${awb} assigned; no courier handover`, actorId);
        }
        if (start !== 'LABEL') {
        stage = 'Request pickup';
        await knexInstance('vsq_shipments').where({ id: shipmentId }).update({ integration_state: 'PICKUP_INTENT', updated_at: new Date() });
        const pickup = await shiprocketApi.pickup(providerShipmentId);
        if (Number(pickup.pickup_status) !== 1) throw new ShiprocketError('Shiprocket did not confirm pickup; reconcile before retrying', 502, true);
        await knexInstance('vsq_shipments').where({ id: shipmentId }).update({
            pickup_scheduled_at: asDate(pickup.response?.pickup_scheduled_date),
            integration_state: 'LABEL_INTENT', updated_at: new Date() });
        await event(shipmentId, orderId, 'PICKUP_SCHEDULED', 'Courier pickup requested; actual handover is still pending', actorId);
        }
        stage = 'Generate label';
        await knexInstance('vsq_shipments').where({ id: shipmentId }).update({ integration_state: 'LABEL_INTENT', updated_at: new Date() });
        const label = await shiprocketApi.label(providerShipmentId);
        const labelUrl = validatedTrackingUrl(label.label_url);
        if (Number(label.label_created) !== 1 || !labelUrl) throw new ShiprocketError('Shiprocket label is not available; reconcile before retrying', 502, true);
        await knexInstance('vsq_shipments').where({ id: shipmentId }).update({ label_url: labelUrl,
            integration_state: 'PICKUP_SCHEDULED', integration_locked_at: null, updated_at: new Date() });
        await event(shipmentId, orderId, 'LABEL_READY', 'Shipping label ready for authorized staff', actorId);
        return CommerceCheckoutService.adminOrderById(orderId);
    } catch (error) {
        await markError(shipmentId, error, stage);
        throw error;
    }
}

export async function reconcileShiprocket(publicId: string) {
    const { order } = await details(publicId);
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (!shipment) throw new ShiprocketError('No API-managed Shiprocket parcel exists', 404);
    if (shipment.integration_locked_at && Date.now() - +new Date(shipment.integration_locked_at) < 90_000) {
        throw new ShiprocketError('Booking is still in progress. Wait briefly, then reconcile if it did not finish.', 409);
    }
    let found: any = null;
    if (shipment.provider_order_id) found = (await shiprocketApi.showOrder(String(shipment.provider_order_id))).data;
    else if (shipment.merchant_reference) {
        const listed = await shiprocketApi.findOrder(shipment.merchant_reference);
        const matches = (listed.data || []).filter((row: any) => String(row.channel_order_id) === shipment.merchant_reference);
        if (matches.length > 1) throw new ShiprocketError('Multiple Shiprocket orders match this merchant reference; investigate manually', 409);
        found = matches[0];
    }
    if (!found) {
        await knexInstance('vsq_shipments').where({ id: shipment.id }).update({ integration_state: 'RECONCILE_REQUIRED',
            integration_error: 'No exact Shiprocket order found. Confirm in Shiprocket before retrying; do not create another order.', updated_at: new Date() });
        if (shipment.integration_state !== 'RECONCILE_REQUIRED') await event(Number(shipment.id), Number(order.id), 'RECONCILIATION_REQUIRED', 'No exact external order found; staff review required before another booking', null);
        return CommerceCheckoutService.adminOrderById(Number(order.id));
    }
    const ids = providerIds(found);
    if (!ids.orderId || !ids.shipmentId) throw new ShiprocketError('Shiprocket order has no usable shipment ID; investigate in the account', 409);
    if (shipment.provider_shipment_id && String(shipment.provider_shipment_id) !== ids.shipmentId) throw new ShiprocketError('Shiprocket shipment ID mismatch; investigate manually', 409);
    if (shipment.tracking_number && ids.awb && shipment.tracking_number !== ids.awb) throw new ShiprocketError('Shiprocket AWB mismatch; investigate manually', 409);
    const pickupKnown = Boolean(shipment.pickup_scheduled_at) || ['LABEL_INTENT', 'PICKUP_SCHEDULED'].includes(shipment.integration_state) ||
        [3, 4, 5, 6, 7, 17, 18, 42, 51].includes(ids.statusCode);
    const priorError = String(shipment.integration_error || '');
    const awbUncertain = !ids.awb && (shipment.integration_state === 'AWB_INTENT' || priorError.startsWith('Assign courier and AWB'));
    const pickupUncertain = Boolean(ids.awb) && !pickupKnown && (shipment.integration_state === 'PICKUP_INTENT' || priorError.startsWith('Request pickup'));
    const isCancelled = remoteCancelled(found);
    const cancellationPending = ['CANCEL_INTENT', 'CANCEL_PENDING'].includes(shipment.integration_state) || priorError.startsWith('Cancel booking');
    const state = cancellationPending ? isCancelled ? 'CANCELLED' : 'CANCEL_PENDING'
        : !ids.awb ? awbUncertain ? 'AWB_UNCERTAIN' : 'ORDER_CREATED'
        : pickupUncertain ? 'PICKUP_UNCERTAIN' : pickupKnown ? 'PICKUP_SCHEDULED' : 'AWB_ASSIGNED';
    await knexInstance('vsq_shipments').where({ id: shipment.id }).update({ provider_order_id: ids.orderId,
        provider_shipment_id: ids.shipmentId, tracking_number: ids.awb || shipment.tracking_number,
        courier_name: ids.courierName || shipment.courier_name,
        pickup_scheduled_at: pickupKnown ? shipment.pickup_scheduled_at : null,
        integration_state: state,
        integration_error: cancellationPending && !isCancelled ? 'Shiprocket has not confirmed cancellation; stock and refund remain held.'
            : awbUncertain || pickupUncertain ? 'Shiprocket has not yet confirmed the attempted AWB or pickup. Check the account and reconcile later; do not repeat the mutation.' : null,
        integration_locked_at: null, updated_at: new Date() });
    if (state !== shipment.integration_state) await event(Number(shipment.id), Number(order.id), 'RECONCILED', `Shiprocket booking reconciled to ${state}`, null);
    if (ids.awb) await refreshShiprocket(publicId);
    return CommerceCheckoutService.adminOrderById(Number(order.id));
}

export async function continueShiprocket(publicId: string, actorId: number) {
    const { order } = await details(publicId);
    if (order.order_status !== 'ACCEPTED') throw new ShiprocketError('Booking can only continue before courier handover', 409);
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (!shipment?.provider_order_id || !shipment.provider_shipment_id || !shipment.courier_id) throw new ShiprocketError('Reconcile the external order before continuing', 409);
    if (shipment.integration_state === 'PICKUP_SCHEDULED' && shipment.label_url) return CommerceCheckoutService.adminOrderById(Number(order.id));
    if (!['ORDER_CREATED', 'AWB_ASSIGNED', 'PICKUP_SCHEDULED'].includes(shipment.integration_state)) {
        throw new ShiprocketError('This step is uncertain. Reconcile with Shiprocket before continuing; do not repeat a provider mutation.', 409);
    }
    const start = shipment.integration_state === 'ORDER_CREATED' ? 'AWB' : shipment.integration_state === 'AWB_ASSIGNED' ? 'PICKUP' : 'LABEL';
    const claimed = await knexInstance.transaction(async (trx) => {
        const lockedOrder = await trx('vsq_orders').where({ id: order.id }).forUpdate().first();
        const current = await trx('vsq_shipments').where({ id: shipment.id }).forUpdate().first();
        if (lockedOrder.order_status !== 'ACCEPTED' || current.integration_state !== shipment.integration_state) return false;
        await trx('vsq_shipments').where({ id: shipment.id }).update({ integration_state: `${start}_INTENT`, integration_locked_at: new Date(), updated_at: new Date() });
        return true;
    });
    if (!claimed) throw new ShiprocketError('Another booking or status update is in progress; refresh the order', 409);
    return advanceBooking(Number(order.id), Number(shipment.id), String(shipment.provider_shipment_id), Number(shipment.courier_id),
        String(shipment.courier_name || 'Shiprocket courier'), start, actorId);
}

export async function cancelBookedShiprocket(publicId: string, actorId: number, reason?: string) {
    const { order } = await details(publicId);
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (!shipment) throw new ShiprocketError('No API-managed Shiprocket booking exists', 404);
    if (shipment.integration_locked_at && Date.now() - +new Date(shipment.integration_locked_at) < 90_000) {
        throw new ShiprocketError('Booking is still in progress. Wait or reconcile before requesting cancellation.', 409);
    }
    if (shipment.status !== 'PREPARING') throw new ShiprocketError('Parcel may have been collected; request courier interception or a return', 409);
    if (!shipment.provider_order_id) throw new ShiprocketError('First reconcile the pending Shiprocket order; stock and refunds remain held', 409);
    const remoteData = (await shiprocketApi.showOrder(String(shipment.provider_order_id))).data || {};
    const remote = providerIds(remoteData);
    if ([6, 7, 9, 10, 17, 18, 42, 51].includes(remote.statusCode)) {
        throw new ShiprocketError('Shiprocket reports courier progress. Request interception or a return; cancellation cannot release stock now', 409);
    }
    if (!remoteCancelled(remoteData)) {
        if (['CANCEL_INTENT', 'CANCEL_PENDING'].includes(shipment.integration_state) || String(shipment.integration_error || '').startsWith('Cancel booking')) {
            throw new ShiprocketError('Prior cancellation is uncertain. Verify its result in Shiprocket and reconcile before sending another cancellation', 409);
        }
        const claimed = await knexInstance.transaction(async (trx) => {
            const current = await trx('vsq_shipments').where({ id: shipment.id }).forUpdate().first();
            if (current.status !== 'PREPARING' || current.integration_state !== shipment.integration_state) return false;
            await trx('vsq_shipments').where({ id: shipment.id }).update({ integration_state: 'CANCEL_INTENT', integration_locked_at: new Date(), updated_at: new Date() });
            return true;
        });
        if (!claimed) throw new ShiprocketError('Cancellation or tracking changed concurrently; refresh and review the parcel', 409);
        try { await shiprocketApi.cancel(String(shipment.provider_order_id)); }
        catch (error) { await markError(Number(shipment.id), error, 'Cancel booking'); throw error; }
    }
    const verified = (await shiprocketApi.showOrder(String(shipment.provider_order_id))).data || {};
    if (!remoteCancelled(verified)) {
        await knexInstance('vsq_shipments').where({ id: shipment.id }).update({ integration_state: 'CANCEL_PENDING',
            integration_error: 'Shiprocket has not confirmed cancellation. Refresh and verify before releasing stock or refunding.',
            integration_locked_at: null, updated_at: new Date() });
        throw new ShiprocketError('Shiprocket cancellation is pending; stock and refunds remain held', 409);
    }
    await knexInstance('vsq_shipments').where({ id: shipment.id }).update({ integration_state: 'CANCELLED', integration_error: null,
        integration_locked_at: null, updated_at: new Date() });
    await event(Number(shipment.id), Number(order.id), 'BOOKING_CANCELLED', 'Shiprocket cancellation verified before local order cancellation', actorId);
    return CommerceAdminService.cancelOrder(publicId, actorId, reason);
}

export async function refreshShiprocket(publicId: string) {
    const { order } = await details(publicId);
    const shipment = await knexInstance('vsq_shipments').where({ order_id: order.id, provider: 'SHIPROCKET' }).first();
    if (!shipment?.provider_shipment_id) throw new ShiprocketError('Reconcile the Shiprocket order before refreshing tracking', 409);
    const payload = await shiprocketApi.tracking(String(shipment.provider_shipment_id));
    await receiveShiprocketTracking(payload, Number(shipment.id));
    return CommerceCheckoutService.adminOrderById(Number(order.id));
}

export function mapShiprocketStatus(code: number, text: string): string | null {
    const normalized = text.toUpperCase();
    if ([13, 20, 82, 83].includes(code) || /PICKUP (ERROR|EXCEPTION)|HANDOVER EXCEPTION|PACKING EXCEPTION/.test(normalized)) return null;
    if ([7].includes(code) || normalized === 'DELIVERED') return 'DELIVERED';
    if ([9, 10, 14, 40, 41, 46].includes(code) || normalized.startsWith('RTO')) return 'RETURN_TO_ORIGIN';
    if ([12, 21, 23, 24, 25, 39, 47, 88, 89].includes(code) || /UNDELIVERED|EXCEPTION|LOST|DAMAGED/.test(normalized)) return 'DELIVERY_ISSUE';
    if (code === 17 || normalized === 'OUT FOR DELIVERY') return 'OUT_FOR_DELIVERY';
    if (code === 18 || normalized === 'IN TRANSIT') return 'IN_TRANSIT';
    if ([6, 42, 51].includes(code) || ['PICKED UP', 'HANDOVER TO COURIER', 'SHIPPED'].includes(normalized)) return 'SHIPPED';
    return null;
}

export async function receiveShiprocketTracking(payload: any, expectedShipmentId?: number) {
    const root = payload.tracking_data || payload;
    const awb = String(root.awb || root.awb_code || root.shipment_track?.[0]?.awb_code || '').trim();
    const shipmentId = String(root.shipment_id || root.shipment_track?.[0]?.shipment_id || '');
    const merchant = String(root.order_id || root.channel_order_id || '');
    const providerOrderId = String(root.sr_order_id || '');
    if (!expectedShipmentId && !awb && !shipmentId && !merchant && !providerOrderId) return false;
    const shipment = expectedShipmentId
        ? await knexInstance('vsq_shipments').where({ id: expectedShipmentId, provider: 'SHIPROCKET' }).first()
        : await knexInstance('vsq_shipments').where({ provider: 'SHIPROCKET' }).andWhere((query) => {
            if (awb) query.where({ tracking_number: awb });
            if (shipmentId) query.orWhere({ provider_shipment_id: shipmentId });
            if (merchant) query.orWhere({ merchant_reference: merchant });
            if (providerOrderId) query.orWhere({ provider_order_id: providerOrderId });
        }).first();
    if (!shipment) return false;
    if ((awb && shipment.tracking_number && awb !== shipment.tracking_number) ||
        (shipmentId && shipment.provider_shipment_id && shipmentId !== String(shipment.provider_shipment_id)) ||
        (!expectedShipmentId && merchant && shipment.merchant_reference && merchant !== shipment.merchant_reference) ||
        (providerOrderId && shipment.provider_order_id && providerOrderId !== String(shipment.provider_order_id))) {
        throw new ShiprocketError('Tracking identifiers conflict with the local parcel', 409);
    }
    const verifiedProgress = Boolean(expectedShipmentId ||
        (awb && shipment.tracking_number && awb === shipment.tracking_number) ||
        (shipmentId && shipment.provider_shipment_id && shipmentId === String(shipment.provider_shipment_id)) ||
        (providerOrderId && shipment.provider_order_id && providerOrderId === String(shipment.provider_order_id)));
    const scans = Array.isArray(root.scans) ? root.scans : Array.isArray(root.shipment_track_activities) ? root.shipment_track_activities : [];
    const entries = [...scans, root].map((scan: any) => ({
        raw: scan,
        status: String(scan['sr-status-label'] || scan.shipment_status || scan.current_status || scan.activity || scan.status || ''),
        code: Number(scan['sr-status'] || scan.shipment_status_id || scan.current_status_id || scan.status_code || 0),
        sourceDate: String(scan.date || scan.current_timestamp || scan.updated_at || root.current_timestamp || root.date || ''),
        at: asDate(scan.date || scan.current_timestamp || scan.updated_at || root.current_timestamp || root.date) || new Date(),
        location: String(scan.location || scan.sr_location || '').slice(0, 255)
    })).filter((entry) => entry.status || entry.code);
    for (const entry of entries.sort((a, b) => +a.at - +b.at)) {
        const mapped = verifiedProgress ? mapShiprocketStatus(entry.code, entry.status) : null;
        const hash = crypto.createHash('sha256').update(`${awb}|${entry.code}|${entry.status}|${entry.sourceDate || 'undated'}|${entry.location}`).digest('hex');
        await knexInstance.transaction(async (trx) => {
            const current = await trx('vsq_shipments').where({ id: shipment.id }).forUpdate().first();
            const existing = await trx('vsq_shipment_events').where({ shipment_id: current.id, provider_event_id: hash }).first();
            if (existing) return;
            await trx('vsq_shipment_events').insert({ shipment_id: current.id, provider_event_id: hash,
                status: mapped || 'PROVIDER_UPDATE', description: entry.status.slice(0, 500), location: entry.location,
                provider_payload: JSON.stringify(entry.raw),
                occurred_at: entry.at, created_at: new Date() });
            if (verifiedProgress && ([8, 45].includes(entry.code) || /^(CANCELLED|CANCELED)$/.test(entry.status.toUpperCase()))) {
                if (['PENDING', 'PREPARING'].includes(current.status) &&
                    (!current.provider_event_at || +entry.at >= +new Date(current.provider_event_at))) {
                    await trx('vsq_shipments').where({ id: current.id }).update({ integration_state: 'CANCELLED',
                        integration_error: null, updated_at: new Date() });
                }
                return;
            }
            if (!mapped || (current.provider_event_at && +entry.at < +new Date(current.provider_event_at)) ||
                ['CANCELLED', 'DELIVERED', 'RETURN_TO_ORIGIN'].includes(current.status)) return;
            const rank: Record<string, number> = { PREPARING: 0, PENDING: 0, SHIPPED: 1, IN_TRANSIT: 2, OUT_FOR_DELIVERY: 3, DELIVERY_ISSUE: 3, RETURN_TO_ORIGIN: 4, DELIVERED: 4 };
            if (rank[mapped] < rank[current.status] && !(current.status === 'DELIVERY_ISSUE' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(mapped))) return;
            const now = new Date();
            await trx('vsq_shipments').where({ id: current.id }).update({ status: mapped, provider_event_at: entry.at,
                shipped_at: current.shipped_at || (rank[mapped] > 0 ? entry.at : null),
                delivered_at: mapped === 'DELIVERED' ? entry.at : current.delivered_at, updated_at: now });
            const order = await trx('vsq_orders').where({ id: current.order_id }).forUpdate().first();
            if (order.order_status === 'CANCELLED') return;
            if (rank[current.status] === 0 && rank[mapped] > 0) {
                const items = await trx('vsq_shipment_items').where({ shipment_id: current.id });
                for (const item of items) await trx('vsq_order_items').where({ id: item.order_item_id }).update({ fulfilled_quantity: trx.raw('GREATEST(fulfilled_quantity, ?)', [Number(item.quantity)]), updated_at: now });
            }
            const orderStatus = mapped === 'DELIVERED' ? 'COMPLETED' : 'SHIPPED';
            const fulfillment = mapped === 'DELIVERED' ? 'DELIVERED' : ['DELIVERY_ISSUE', 'RETURN_TO_ORIGIN'].includes(mapped) ? 'DELIVERY_ISSUE' : 'FULFILLED';
            await trx('vsq_orders').where({ id: order.id }).update({ order_status: orderStatus, fulfillment_status: fulfillment, updated_at: now, version: trx.raw('version + 1') });
            for (const [type, oldValue, newValue] of [['ORDER', order.order_status, orderStatus], ['FULFILLMENT', order.fulfillment_status, fulfillment], ['SHIPMENT', current.status, mapped]]) {
                if (oldValue !== newValue) await trx('vsq_order_status_history').insert({ order_id: order.id, status_type: type,
                    from_status: oldValue, to_status: newValue, reason: `Verified Shiprocket event: ${entry.status}`.slice(0, 500),
                    actor_id: null, actor_type: 'SYSTEM', created_at: now });
            }
        });
    }
    return true;
}
