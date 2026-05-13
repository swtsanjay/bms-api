import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('inquiries', function (table) {
        table.increments('id').unsigned().primary();
        table.string('name', 150).notNullable();
        table.string('email', 150).notNullable();
        table.string('phone', 30).notNullable();
        table.string('company_brand_name', 150).nullable();
        table.text('requirements').notNullable();
        table.string('reference_file_url', 1000).nullable();
        table.enu('status', ['new', 'in_progress', 'resolved', 'closed']).notNullable().defaultTo('new');
        table.timestamps(true, true);
        table.timestamp('deleted_at').nullable();

        table.index(['id'], 'inquiries_primary_id');
        table.index(['email'], 'inquiries_email_idx');
        table.index(['phone'], 'inquiries_phone_idx');
        table.index(['status'], 'inquiries_status_idx');
        table.index(['deleted_at'], 'inquiries_deleted_at_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('inquiries');
}
