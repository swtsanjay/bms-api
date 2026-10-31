import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_bill_claims', (table) => {
        table.bigIncrements('id').primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('request_id', 36).notNullable();
        table.string('reward', 10).notNullable();
        table.string('upi_id', 255).nullable();
        table.string('original_filename', 255).notNullable();
        table.string('mime_type', 80).notNullable();
        table.bigInteger('byte_size').unsigned().notNullable();
        table.string('checksum_sha256', 64).notNullable();
        table.string('object_key', 500).notNullable();
        table.string('status', 20).notNullable().defaultTo('PENDING');
        table.bigInteger('granted_amount_minor').unsigned().nullable();
        table.bigInteger('reviewed_by').unsigned().nullable();
        table.string('review_note', 500).nullable();
        table.timestamp('reviewed_at').nullable();
        table.timestamps(true, true);
        table.foreign('customer_id').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.unique(['customer_id', 'request_id']);
        table.index(['status', 'created_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_bill_claims');
}
