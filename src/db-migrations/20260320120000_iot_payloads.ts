import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('iot_payloads');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('iot_payloads', function (table) {
        table.increments('id').unsigned().primary();
        table.json('payload').notNullable();
        table.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('iot_payloads');
    if (hasTable) {
        await knex.schema.dropTable('iot_payloads');
    }
}
