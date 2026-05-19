import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('customers');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('customers', function (table) {
        table.increments('id').unsigned().primary();
        table.string('shopify_customer_id', 100).notNullable();
        table.string('first_name', 100).nullable();
        table.string('last_name', 100).nullable();
        table.string('email', 150).nullable();
        table.string('phone', 30).notNullable();
        table.string('state', 50).nullable();
        table.json('tags').nullable();
        table.boolean('verified_email').nullable();
        table.boolean('tax_exempt').nullable();
        table.text('note').nullable();
        table.json('metafields').nullable();
        table.timestamp('shopify_created_at').nullable();
        table.timestamp('shopify_updated_at').nullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        table.unique(['shopify_customer_id'], 'customers_shopify_customer_id_unique');
        table.unique(['phone'], 'customers_phone_unique');
        table.index(['email'], 'customers_email_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('customers');
    if (!hasTable) {
        return;
    }

    await knex.schema.dropTable('customers');
}
