import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_gift_denominations', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('amount_minor').unsigned().notNullable().unique();
        table.boolean('active').notNullable().defaultTo(true);
        table.timestamps(true, true);
    });
    await knex('vsq_gift_denominations').insert([10000, 25000, 50000].map((amount_minor) => ({ amount_minor, active: true })));
    await knex.schema.createTable('vsq_gift_purchases', (table) => {
        table.bigIncrements('id').primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('buyer_customer_id').unsigned().notNullable();
        table.bigInteger('amount_minor').unsigned().notNullable();
        table.string('status', 30).notNullable().defaultTo('CREATING');
        table.string('idempotency_key', 100).notNullable().unique();
        table.string('provider_order_id', 191).nullable().unique();
        table.string('provider_payment_id', 191).nullable().unique();
        table.string('provider_refund_id', 191).nullable().unique();
        table.string('refund_reason', 500).nullable();
        table.timestamp('refund_requested_at').nullable();
        table.timestamp('paid_at').nullable();
        table.timestamp('refunded_at').nullable();
        table.timestamps(true, true);
        table.foreign('buyer_customer_id').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.index(['buyer_customer_id', 'created_at']);
    });
    await knex.schema.createTable('vsq_wallet_codes', (table) => {
        table.bigIncrements('id').primary();
        table.string('public_id', 36).notNullable().unique();
        table.string('code_hash', 64).notNullable().unique();
        table.string('kind', 20).notNullable();
        table.bigInteger('amount_minor').unsigned().notNullable();
        table.string('status', 20).notNullable().defaultTo('ISSUED');
        table.bigInteger('purchase_id').unsigned().nullable().unique();
        table.text('encrypted_code').nullable();
        table.bigInteger('redeemed_by_customer_id').unsigned().nullable();
        table.timestamp('redeemed_at').nullable();
        table.bigInteger('created_by_admin_id').unsigned().nullable();
        table.timestamps(true, true);
        table.foreign('purchase_id').references('id').inTable('vsq_gift_purchases').onDelete('RESTRICT');
        table.foreign('redeemed_by_customer_id').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.index(['kind', 'status']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_wallet_codes');
    await knex.schema.dropTableIfExists('vsq_gift_purchases');
    await knex.schema.dropTableIfExists('vsq_gift_denominations');
}
