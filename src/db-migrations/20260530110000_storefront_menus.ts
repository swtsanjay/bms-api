import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!(await knex.schema.hasTable('storefront_menus'))) {
        await knex.schema.createTable('storefront_menus', function (table) {
            table.increments('id').unsigned().primary();
            table.string('title', 255).notNullable();
            table.string('handle', 255).notNullable();
            table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamps(true, true);
            table.timestamp('deleted_at').nullable();

            table.unique(['handle'], 'storefront_menus_handle_unique');
            table.index(['status'], 'storefront_menus_status_idx');
            table.index(['sort_order'], 'storefront_menus_sort_order_idx');
        });
    }

    if (!(await knex.schema.hasTable('storefront_menu_pages'))) {
        await knex.schema.createTable('storefront_menu_pages', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('storefront_menu_id').unsigned().notNullable()
                .references('id').inTable('storefront_menus')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('storefront_page_id').unsigned().notNullable()
                .references('id').inTable('storefront_pages')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('label', 255).nullable();
            table.integer('sort_order').notNullable().defaultTo(0);
            table.timestamp('created_at').defaultTo(knex.fn.now());

            table.index(['storefront_menu_id'], 'storefront_menu_pages_menu_idx');
            table.index(['storefront_page_id'], 'storefront_menu_pages_page_idx');
            table.index(['sort_order'], 'storefront_menu_pages_sort_order_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('storefront_menu_pages')) {
        await knex.schema.dropTable('storefront_menu_pages');
    }
    if (await knex.schema.hasTable('storefront_menus')) {
        await knex.schema.dropTable('storefront_menus');
    }
}
