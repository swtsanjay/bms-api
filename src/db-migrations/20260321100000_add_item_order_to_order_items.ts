import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('order_items');
    if (!hasTable) {
        return;
    }

    const hasColumn = await knex.schema.hasColumn('order_items', 'item_order');
    if (!hasColumn) {
        await knex.schema.alterTable('order_items', function (table) {
            table.integer('item_order').notNullable().defaultTo(0);
            table.index(['order_id', 'item_order'], 'order_items_order_item_order_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('order_items');
    if (!hasTable) {
        return;
    }

    const hasColumn = await knex.schema.hasColumn('order_items', 'item_order');
    if (hasColumn) {
        await knex.schema.alterTable('order_items', function (table) {
            table.dropIndex(['order_id', 'item_order'], 'order_items_order_item_order_idx');
            table.dropColumn('item_order');
        });
    }
}
