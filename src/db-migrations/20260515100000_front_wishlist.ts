import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('wishlists', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('user_id').unsigned().notNullable();
        table.string('shopify_product_id', 255).notNullable();
        table.string('shopify_product_handle', 255).nullable();
        table.string('product_title', 255).nullable();
        table.string('product_image', 1000).nullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        table.index(['user_id'], 'wishlists_user_id_idx');
        table.index(['shopify_product_id'], 'wishlists_product_id_idx');
        table.unique(['user_id', 'shopify_product_id'], { indexName: 'wishlists_user_product_unique' });
        table.foreign('user_id', 'wishlists_user_id_fk').references('id').inTable('users').onDelete('CASCADE');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('wishlists');
}
