import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('customer_tokens');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('customer_tokens', function (table) {
        table.string('jwt_key', 32).primary();
        table.text('access_token').notNullable();
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('customer_tokens');
    if (!hasTable) {
        return;
    }

    await knex.schema.dropTable('customer_tokens');
}
