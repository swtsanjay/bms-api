import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('manual_order_requests');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('manual_order_requests', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('user_id').unsigned().nullable();
        table.string('product_id', 150).nullable();
        table.string('product_handle', 255).nullable();
        table.string('product_title', 255).notNullable();
        table.text('product_image').nullable();
        table.string('size', 80).nullable();
        table.integer('quantity').unsigned().notNullable().defaultTo(1);
        table.text('customer_message').nullable();
        table.string('phone', 30).notNullable();
        table.string('email', 150).nullable();
        table.enum('status', ['new', 'contacted', 'confirmed', 'cancelled']).notNullable().defaultTo('new');
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        table.index(['user_id'], 'manual_order_requests_user_id_idx');
        table.index(['status'], 'manual_order_requests_status_idx');
        table.index(['phone'], 'manual_order_requests_phone_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('manual_order_requests');
    if (!hasTable) {
        return;
    }

    await knex.schema.dropTable('manual_order_requests');
}
