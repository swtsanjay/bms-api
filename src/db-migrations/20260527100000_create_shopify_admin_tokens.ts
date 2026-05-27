import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_admin_tokens');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('shopify_admin_tokens', function (table) {
        table.increments('id').primary();
        table.string('shop_domain', 255).notNullable();
        table.text('encrypted_access_token').notNullable();
        table.text('scope').nullable();
        table.timestamp('expires_at').nullable();
        table.timestamps(true, true);

        table.unique(['shop_domain'], 'shopify_admin_tokens_shop_domain_unique');
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_admin_tokens');
    if (!hasTable) {
        return;
    }

    await knex.schema.dropTable('shopify_admin_tokens');
}
