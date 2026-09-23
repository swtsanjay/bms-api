import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_checkout_sessions', (table) => {
        table.decimal('credits_total', 19, 4).notNullable().defaultTo(0).after('discount_total');
    });
    await knex.schema.alterTable('vsq_orders', (table) => {
        table.decimal('credits_total', 19, 4).notNullable().defaultTo(0).after('discount_total');
    });
    await knex.schema.createTable('vsq_credit_redemptions', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.bigInteger('order_id').unsigned().notNullable().unique();
        table.bigInteger('amount_minor').unsigned().notNullable();
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.enu('status', ['APPLIED', 'REFUNDED']).notNullable().defaultTo('APPLIED');
        table.timestamp('refunded_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_credit_redemption_customer_fk').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.foreign('order_id', 'vsq_credit_redemption_order_fk').references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.index(['customer_id', 'created_at'], 'vsq_credit_redemption_customer_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_credit_redemptions');
    await knex.schema.alterTable('vsq_orders', (table) => table.dropColumn('credits_total'));
    await knex.schema.alterTable('vsq_checkout_sessions', (table) => table.dropColumn('credits_total'));
}
