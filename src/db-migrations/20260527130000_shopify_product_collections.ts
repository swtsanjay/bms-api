import type { Knex } from 'knex';

const CATEGORY_STATUSES = ['active', 'inactive'] as const;

export async function up(knex: Knex): Promise<void> {
    const hasProducts = await knex.schema.hasTable('shopify_products');
    if (!hasProducts) {
        await knex.schema.createTable('shopify_products', function (table) {
            table.increments('id').unsigned().primary();
            table.string('shopify_product_id', 255).notNullable();
            table.string('title', 255).notNullable();
            table.decimal('price', 10, 2).notNullable().defaultTo(0);
            table.string('url', 1000).nullable();
            table.string('image_url', 1000).nullable();
            table.json('meta').nullable();
            table.timestamp('shopify_created_at').nullable();
            table.timestamp('synced_at').nullable();
            table.timestamps(true, true);

            table.unique(['shopify_product_id'], 'shopify_products_shopify_product_id_unique');
            table.index(['title'], 'shopify_products_title_idx');
            table.index(['shopify_created_at'], 'shopify_products_created_at_idx');
        });
    }

    const hasCategories = await knex.schema.hasTable('shopify_categories');
    if (!hasCategories) {
        await knex.schema.createTable('shopify_categories', function (table) {
            table.increments('id').unsigned().primary();
            table.string('title', 255).notNullable();
            table.text('description').nullable();
            table.enu('status', [...CATEGORY_STATUSES]).notNullable().defaultTo('active');
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamps(true, true);

            table.index(['status'], 'shopify_categories_status_idx');
            table.index(['sort_order'], 'shopify_categories_sort_order_idx');
        });
    }

    const hasCategoryProducts = await knex.schema.hasTable('shopify_category_products');
    if (!hasCategoryProducts) {
        await knex.schema.createTable('shopify_category_products', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('shopify_category_id').unsigned().notNullable()
                .references('id').inTable('shopify_categories')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('shopify_product_id', 255).notNullable();
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.unique(['shopify_category_id', 'shopify_product_id'], 'shopify_category_products_unique');
            table.index(['shopify_category_id'], 'shopify_category_products_category_idx');
            table.index(['shopify_product_id'], 'shopify_category_products_product_idx');
            table.index(['sort_order'], 'shopify_category_products_sort_order_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('shopify_category_products')) {
        await knex.schema.dropTable('shopify_category_products');
    }
    if (await knex.schema.hasTable('shopify_categories')) {
        await knex.schema.dropTable('shopify_categories');
    }
    if (await knex.schema.hasTable('shopify_products')) {
        await knex.schema.dropTable('shopify_products');
    }
}
