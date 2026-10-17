// Run after npm run build. Uses only a disposable local MySQL schema and mocked Shiprocket HTTP responses.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('one-parcel Shiprocket booking, retries, verified tracking and cancellation boundaries', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `shiprocket_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  const originalFetch = global.fetch;
  const oldEnv = { email: process.env.SHIPROCKET_API_EMAIL, password: process.env.SHIPROCKET_API_PASSWORD, webhook: process.env.SHIPROCKET_WEBHOOK_TOKEN };
  process.env.SHIPROCKET_API_EMAIL = 'mock-api-user@example.test';
  process.env.SHIPROCKET_API_PASSWORD = 'mock-secret';
  process.env.SHIPROCKET_WEBHOOK_TOKEN = 'mock-webhook-token';
  let db; let server;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 8 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const client = require('../dist/modules/commerce/admin/shiprocket-client');
    const service = require('../dist/modules/commerce/admin/shiprocket-service');
    const adminService = require('../dist/modules/commerce/admin/service').default;
    const checkoutService = require('../dist/modules/commerce/checkout/service').default;
    const [customerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'buyer@example.test', email_normalized: 'buyer@example.test', status: 'ACTIVE' });
    async function order(method = 'COD', credits = 0) {
      const [cartId] = await db('vsq_carts').insert({ public_id: crypto.randomUUID(), customer_id: customerId });
      const [sessionId] = await db('vsq_checkout_sessions').insert({ public_id: crypto.randomUUID(), cart_id: cartId, customer_id: customerId, status: 'COMPLETED', expires_at: new Date(Date.now() + 86400000) });
      const publicId = crypto.randomUUID();
      const [id] = await db('vsq_orders').insert({ public_id: publicId, order_number: `SR-${crypto.randomBytes(4).toString('hex')}`, customer_id: customerId, checkout_session_id: sessionId,
        email_snapshot: 'buyer@example.test', phone_snapshot: '9876543210', order_status: 'ACCEPTED', financial_status: method === 'COD' ? 'PENDING' : 'PAID',
        fulfillment_status: 'UNFULFILLED', payment_method: method, subtotal: 500, credits_total: credits, grand_total: 500 - credits, placed_at: new Date() });
      await db('vsq_order_items').insert({ order_id: id, product_title_snapshot: 'One garment', sku_snapshot: 'GARMENT-1', quantity: 1, unit_price: 500, line_total: 500 });
      const address = JSON.stringify({ first_name: 'Buyer', last_name: 'Test', address_line_1: 'House 10, Main Street', city: 'Delhi', state: 'Delhi', postcode: '110002', country: 'India', phone: '9876543210' });
      await db('vsq_order_addresses').insert([{ order_id: id, type: 'SHIPPING', address_json: address }, { order_id: id, type: 'BILLING', address_json: address }]);
      return { id, publicId };
    }
    const parcel = { pickup_location: 'Warehouse', pickup_postcode: '110001', weight: 0.7, length: 20, breadth: 15, height: 8 };
    assert.throws(() => client.validateParcel({ ...parcel, weight: 0 }), /actual weight/);
    assert.throws(() => client.validateParcel({ ...parcel, length: 0.5 }), /actual length/);
    const calls = [];
    let couriersAvailable = true;
    let createTimeout = false;
    let externalReference = '';
    let remoteOrderId = 9001;
    let remoteShipmentId = 8001;
    let remoteAwb = 'AWB9001';
    let remoteWasCancelled = false;
    global.fetch = async (url, options = {}) => {
      const endpoint = String(url).replace('https://apiv2.shiprocket.in/v1/external', '');
      const body = options.body ? JSON.parse(options.body) : {};
      calls.push({ endpoint, body });
      const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
      if (endpoint === '/auth/login') return response({ token: 'mock-token' });
      if (endpoint.startsWith('/settings/company/pickup')) return response({ data: { shipping_address: [{ id: 1, pickup_location: 'Warehouse', pin_code: '110001', address: 'Main warehouse', city: 'Delhi' }] } });
      if (endpoint.startsWith('/courier/serviceability/')) return response({ data: { available_courier_companies: couriersAvailable ? [{ courier_company_id: 42, courier_name: 'Test Express', freight_charge: 82, cod_charges: 20, estimated_delivery_days: 3 }] : [] } });
      if (endpoint === '/orders/create/adhoc') {
        externalReference = body.order_id;
        if (createTimeout) throw new Error('Simulated network timeout after external success');
        return response({ order_id: remoteOrderId, shipment_id: remoteShipmentId, status: 'NEW' });
      }
      if (endpoint === '/courier/assign/awb') return response({ awb_assign_status: 1, response: { data: { awb_code: remoteAwb, courier_name: 'Test Express' } } });
      if (endpoint === '/courier/generate/pickup') return response({ pickup_status: 1, response: { pickup_scheduled_date: '2026-10-17 10:00:00' } });
      if (endpoint === '/courier/generate/label') return response({ label_created: 1, label_url: 'https://example.test/label.pdf' });
      if (endpoint.startsWith('/orders?')) return response({ data: externalReference ? [{ id: remoteOrderId, shipment_id: remoteShipmentId, channel_order_id: externalReference, status: 'NEW', status_code: 1 }] : [] });
      if (endpoint.startsWith('/orders/show/')) return response({ data: { id: remoteOrderId, shipment_id: remoteShipmentId,
        status: remoteWasCancelled ? 'CANCELED' : 'NEW', status_code: remoteWasCancelled ? 5 : 1,
        shipments: [{ id: remoteShipmentId, status: remoteWasCancelled ? 'CANCELLED' : 'NEW', status_code: remoteWasCancelled ? 8 : 1 }] } });
      if (endpoint === '/orders/cancel') { remoteWasCancelled = true; return response({ status: 200, message: 'Cancelled' }); }
      if (endpoint === '/courier/track/shipment/8001') return response({ tracking_data: { awb_code: 'AWB9001', shipment_id: 8001, shipment_track_activities: [] } });
      throw new Error(`Unexpected mocked Shiprocket endpoint ${endpoint}`);
    };
    const cod = await order('COD');
    couriersAvailable = false;
    assert.deepEqual((await service.quoteShiprocket(cod.publicId, parcel)).couriers, []);
    await assert.rejects(service.bookShiprocket(cod.publicId, { ...parcel, courier_id: 42 }, 1), /no longer serviceable/);
    assert.equal((await db('vsq_shipments').where({ order_id: cod.id })).length, 0);
    couriersAvailable = true;
    const results = await Promise.allSettled([
      service.bookShiprocket(cod.publicId, { ...parcel, courier_id: 42 }, 1),
      service.bookShiprocket(cod.publicId, { ...parcel, courier_id: 42 }, 1)
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(calls.filter((call) => call.endpoint === '/orders/create/adhoc').length, 1);
    const createdPayload = calls.find((call) => call.endpoint === '/orders/create/adhoc').body;
    assert.equal(createdPayload.payment_method, 'COD');
    assert.match(createdPayload.order_id, /^\d{1,39}$/);
    assert.equal(createdPayload.order_items.length, 1);
    assert.equal(createdPayload.weight, 0.7);
    const shipment = await db('vsq_shipments').where({ order_id: cod.id }).first();
    assert.equal(shipment.integration_state, 'PICKUP_SCHEDULED');
    assert.equal(shipment.status, 'PREPARING');
    assert.equal((await db('vsq_orders').where({ id: cod.id }).first()).order_status, 'ACCEPTED');
    assert.equal(Number((await db('vsq_order_items').where({ order_id: cod.id }).first()).fulfilled_quantity), 0);
    assert.equal((await db('vsq_shipments').where({ order_id: cod.id })).length, 1);
    const customerBooked = await checkoutService.orderForCustomer(cod.publicId, customerId);
    assert.equal(customerBooked.order_status, 'ACCEPTED');
    assert.equal(customerBooked.shipments[0].tracking_number, 'AWB9001');
    assert.equal(customerBooked.shipments[0].courier_name, 'Test Express');
    assert.equal(customerBooked.shipments[0].label_ready, true);
    assert.equal(Object.hasOwn(customerBooked.shipments[0], 'label_url'), false);
    await assert.rejects(adminService.cancelOrder(cod.publicId, 1), /Cancel and verify/);
    await service.receiveShiprocketTracking({ awb: 'AWB9001', order_id: shipment.merchant_reference, sr_order_id: 9001,
      shipment_status: 'PICKUP SCHEDULED', shipment_status_id: 3, date: '2026-10-17 10:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'PREPARING');
    await service.receiveShiprocketTracking({ awb: 'AWB9001', order_id: shipment.merchant_reference, sr_order_id: 9001,
      shipment_status: 'PICKUP EXCEPTION', shipment_status_id: 20, date: '2026-10-17 11:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'PREPARING');
    const transit = { awb: 'AWB9001', order_id: shipment.merchant_reference, sr_order_id: 9001,
      shipment_status: 'IN TRANSIT', shipment_status_id: 18, date: '2026-10-17 12:00:00' };
    await service.receiveShiprocketTracking(transit);
    await service.receiveShiprocketTracking(transit);
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'IN_TRANSIT');
    assert.equal((await checkoutService.orderForCustomer(cod.publicId, customerId)).shipments[0].status, 'IN_TRANSIT');
    assert.equal(Number((await db('vsq_order_items').where({ order_id: cod.id }).first()).fulfilled_quantity), 1);
    const beforeOld = await db('vsq_shipment_events').where({ shipment_id: shipment.id }).count({ count: '*' }).first();
    await service.receiveShiprocketTracking({ ...transit, shipment_status: 'OUT FOR DELIVERY', shipment_status_id: 17, date: '2026-10-17 11:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'IN_TRANSIT');
    const afterOld = await db('vsq_shipment_events').where({ shipment_id: shipment.id }).count({ count: '*' }).first();
    assert.equal(Number(afterOld.count), Number(beforeOld.count) + 1);
    await service.receiveShiprocketTracking({ ...transit, shipment_status: 'OUT FOR DELIVERY', shipment_status_id: 17, date: '2026-10-17 13:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'OUT_FOR_DELIVERY');
    await service.receiveShiprocketTracking({ ...transit, shipment_status: 'UNDELIVERED', shipment_status_id: 21, date: '2026-10-17 14:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: shipment.id }).first()).status, 'DELIVERY_ISSUE');
    await service.receiveShiprocketTracking({ ...transit, shipment_status: 'DELIVERED', shipment_status_id: 7, date: '2026-10-17 15:00:00' });
    assert.equal((await db('vsq_orders').where({ id: cod.id }).first()).order_status, 'COMPLETED');
    remoteOrderId = 9002; remoteShipmentId = 8002; remoteAwb = 'AWB9002';
    const prepaid = await order('RAZORPAY');
    const prepaidBooked = await service.bookShiprocket(prepaid.publicId, { ...parcel, courier_id: 42 }, 1);
    assert.equal(prepaidBooked.shipments.length, 1);
    assert.equal(calls.filter((call) => call.endpoint === '/orders/create/adhoc').at(-1).body.payment_method, 'Prepaid');
    const prepaidShipment = await db('vsq_shipments').where({ order_id: prepaid.id }).first();
    await service.receiveShiprocketTracking({ awb: 'AWB9002', order_id: prepaidShipment.merchant_reference, sr_order_id: 9002,
      shipment_status: 'PICKED UP', shipment_status_id: 42, date: '2026-10-17 10:00:00' });
    await service.receiveShiprocketTracking({ awb: 'AWB9002', order_id: prepaidShipment.merchant_reference, sr_order_id: 9002,
      shipment_status: 'RTO INITIATED', shipment_status_id: 9, date: '2026-10-18 10:00:00' });
    assert.equal((await db('vsq_shipments').where({ id: prepaidShipment.id }).first()).status, 'RETURN_TO_ORIGIN');
    assert.equal((await db('vsq_orders').where({ id: prepaid.id }).first()).fulfillment_status, 'DELIVERY_ISSUE');
    await assert.rejects(adminService.cancelOrder(prepaid.publicId, 1), /handed-over/);
    remoteOrderId = 9003; remoteShipmentId = 8003; remoteAwb = 'AWB9003';
    const uncertain = await order('COD');
    createTimeout = true;
    await assert.rejects(service.bookShiprocket(uncertain.publicId, { ...parcel, courier_id: 42 }, 1));
    const countAfterTimeout = calls.filter((call) => call.endpoint === '/orders/create/adhoc').length;
    await assert.rejects(service.bookShiprocket(uncertain.publicId, { ...parcel, courier_id: 42 }, 1), /reconciliation/);
    assert.equal(calls.filter((call) => call.endpoint === '/orders/create/adhoc').length, countAfterTimeout);
    const uncertainShipment = await db('vsq_shipments').where({ order_id: uncertain.id }).first();
    assert.equal(uncertainShipment.integration_state, 'RECONCILE_REQUIRED');
    const reconciled = await service.reconcileShiprocket(uncertain.publicId);
    assert.equal(reconciled.shipments[0].provider_order_id, String(remoteOrderId));
    assert.equal(reconciled.shipments[0].integration_state, 'ORDER_CREATED');
    const resumed = await service.continueShiprocket(uncertain.publicId, 1);
    assert.equal(resumed.shipments[0].integration_state, 'PICKUP_SCHEDULED');
    assert.equal(calls.filter((call) => call.endpoint === '/orders/create/adhoc').length, countAfterTimeout);
    createTimeout = false;
    remoteOrderId = 9004; remoteShipmentId = 8004; remoteAwb = 'AWB9004';
    const preparedLegacy = await order('COD');
    const [legacyId] = await db('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: preparedLegacy.id,
      provider: 'SHIPROCKET_MANUAL', courier_name: 'Shiprocket', status: 'PREPARING' });
    const legacyItem = await db('vsq_order_items').where({ order_id: preparedLegacy.id }).first();
    await db('vsq_shipment_items').insert({ shipment_id: legacyId, order_item_id: legacyItem.id, quantity: 1 });
    await db('vsq_order_items').where({ id: legacyItem.id }).update({ fulfilled_quantity: 1 });
    await service.bookShiprocket(preparedLegacy.publicId, { ...parcel, courier_id: 42 }, 1);
    assert.equal((await db('vsq_shipments').where({ order_id: preparedLegacy.id })).length, 1);
    assert.equal(Number((await db('vsq_order_items').where({ id: legacyItem.id }).first()).fulfilled_quantity), 0);
    remoteOrderId = 9005; remoteShipmentId = 8005; remoteAwb = 'AWB9005';
    const toCancel = await order('COD');
    await service.bookShiprocket(toCancel.publicId, { ...parcel, courier_id: 42 }, 1);
    assert.equal((await db('vsq_orders').where({ id: toCancel.id }).first()).order_status, 'ACCEPTED');
    await adminService.requestCancellation(toCancel.publicId, 1, 'Customer requested review', 'ADMIN');
    assert.equal((await db('vsq_orders').where({ id: toCancel.id }).first()).order_status, 'ACCEPTED');
    await service.cancelBookedShiprocket(toCancel.publicId, 1, 'Customer changed mind');
    assert.equal(calls.filter((call) => call.endpoint === '/orders/cancel').length, 1);
    assert.equal((await db('vsq_orders').where({ id: toCancel.id }).first()).order_status, 'CANCELLED');
    const oldManual = await order('RAZORPAY');
    await db('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: oldManual.id, provider: 'SHIPROCKET_MANUAL',
      courier_name: 'Shiprocket', tracking_number: 'OLD-MANUAL-AWB', status: 'PREPARING' });
    await assert.rejects(service.quoteShiprocket(oldManual.publicId, parcel), /already has courier details/);
    assert.equal((await adminService.order(oldManual.publicId)).shipments[0].tracking_number, 'OLD-MANUAL-AWB');
    remoteOrderId = 9006; remoteShipmentId = 8006; remoteAwb = 'AWB9006';
    const partialCod = await order('COD', 100);
    await service.bookShiprocket(partialCod.publicId, { ...parcel, courier_id: 42 }, 1);
    const partialCodPayload = calls.filter((call) => call.endpoint === '/orders/create/adhoc').at(-1).body;
    assert.equal(partialCodPayload.payment_method, 'COD');
    assert.equal(partialCodPayload.sub_total, 500);
    assert.equal(partialCodPayload.partial_cod_collected, 100);
    assert.equal(partialCodPayload.sub_total - partialCodPayload.partial_cod_collected, 400);
    const webhook = require('../dist/modules/commerce/admin/parcel-webhook-route').default;
    const app = express(); app.use(express.json()); app.use('/webhooks/v1/parcel-status', webhook);
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const endpoint = `http://127.0.0.1:${server.address().port}/webhooks/v1/parcel-status`;
    const unauthorized = await originalFetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(transit) });
    assert.equal(unauthorized.status, 401);
    const authorized = await originalFetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'mock-webhook-token' }, body: JSON.stringify(transit) });
    assert.equal(authorized.status, 200);
  } finally {
    global.fetch = originalFetch;
    if (oldEnv.email === undefined) delete process.env.SHIPROCKET_API_EMAIL; else process.env.SHIPROCKET_API_EMAIL = oldEnv.email;
    if (oldEnv.password === undefined) delete process.env.SHIPROCKET_API_PASSWORD; else process.env.SHIPROCKET_API_PASSWORD = oldEnv.password;
    if (oldEnv.webhook === undefined) delete process.env.SHIPROCKET_WEBHOOK_TOKEN; else process.env.SHIPROCKET_WEBHOOK_TOKEN = oldEnv.webhook;
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    delete global.knexInstance;
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
