import type { Knex } from 'knex';

const TABLE_NAME = 'newsletter_subscribers';

export async function up(knex: Knex): Promise<void> {
    const hasSubscribers = await knex.schema.hasTable(TABLE_NAME);
    if (!hasSubscribers) {
        await knex.schema.createTable(TABLE_NAME, function (table) {
            table.increments('id').unsigned().primary();
            table.string('email', 255).notNullable();
            table.string('source', 100).notNullable().defaultTo('homepage');
            table.timestamps(true, true);

            table.unique(['email'], 'newsletter_subscribers_email_unique');
            table.index(['source'], 'newsletter_subscribers_source_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable(TABLE_NAME)) {
        await knex.schema.dropTable(TABLE_NAME);
    }
}
