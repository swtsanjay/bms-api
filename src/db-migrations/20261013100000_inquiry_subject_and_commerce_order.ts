import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', (table) => {
        table.string('subject', 255).nullable();
        table.bigInteger('commerce_order_id').unsigned().nullable();
        table.index(['commerce_order_id'], 'inquiries_commerce_order_idx');
        table.foreign('commerce_order_id', 'inquiries_commerce_order_fk')
            .references('id').inTable('vsq_orders').onDelete('RESTRICT');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', (table) => {
        table.dropForeign(['commerce_order_id'], 'inquiries_commerce_order_fk');
        table.dropIndex(['commerce_order_id'], 'inquiries_commerce_order_idx');
        table.dropColumn('commerce_order_id');
        table.dropColumn('subject');
    });
}
