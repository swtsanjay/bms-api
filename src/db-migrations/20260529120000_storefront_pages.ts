import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasPages = await knex.schema.hasTable('storefront_pages');
    if (!hasPages) {
        await knex.schema.createTable('storefront_pages', function (table) {
            table.increments('id').unsigned().primary();
            table.string('title', 255).notNullable();
            table.string('slug', 255).notNullable();
            table.text('description').nullable();
            table.string('hero_image_url', 1000).nullable();
            table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamps(true, true);
            table.timestamp('deleted_at').nullable();

            table.unique(['slug'], 'storefront_pages_slug_unique');
            table.index(['status'], 'storefront_pages_status_idx');
            table.index(['sort_order'], 'storefront_pages_sort_order_idx');
        });
    }

    const hasItems = await knex.schema.hasTable('storefront_page_items');
    if (!hasItems) {
        await knex.schema.createTable('storefront_page_items', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('storefront_page_id').unsigned().notNullable()
                .references('id').inTable('storefront_pages')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.enu('item_type', ['product', 'category']).notNullable();
            table.string('shopify_product_id', 255).nullable()
                .references('shopify_product_id').inTable('shopify_products')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('shopify_category_id').unsigned().nullable()
                .references('id').inTable('shopify_categories')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('image_url', 1000).nullable();
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index(['storefront_page_id'], 'storefront_page_items_page_idx');
            table.index(['item_type'], 'storefront_page_items_type_idx');
            table.index(['sort_order'], 'storefront_page_items_sort_order_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('storefront_page_items')) {
        await knex.schema.dropTable('storefront_page_items');
    }
    if (await knex.schema.hasTable('storefront_pages')) {
        await knex.schema.dropTable('storefront_pages');
    }
}
