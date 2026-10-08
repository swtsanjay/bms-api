import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_design_submissions', (table) => {
        table.bigIncrements('id').primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().nullable();
        table.string('phone', 30).notNullable();
        table.string('original_filename', 255).notNullable();
        table.string('mime_type', 80).notNullable();
        table.bigInteger('byte_size').unsigned().notNullable();
        table.string('checksum_sha256', 64).notNullable();
        table.string('object_key', 500).notNullable();
        table.boolean('marketing_permission').notNullable().defaultTo(false);
        table.string('status', 20).notNullable().defaultTo('PENDING');
        table.string('claim_token_hash', 64).nullable().unique();
        table.timestamp('claim_expires_at').nullable();
        table.timestamp('claimed_at').nullable();
        table.bigInteger('reviewed_by').unsigned().nullable();
        table.string('review_note', 500).nullable();
        table.timestamp('reviewed_at').nullable();
        table.timestamp('rewarded_at').nullable();
        table.timestamps(true, true);
        table.foreign('customer_id').references('id').inTable('vsq_customers').onDelete('SET NULL');
        table.index(['status', 'created_at']);
        table.index(['customer_id', 'status']);
    });
    await knex.schema.createTable('vsq_design_review_events', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('submission_id').unsigned().notNullable();
        table.bigInteger('actor_id').unsigned().notNullable();
        table.string('from_status', 20).notNullable();
        table.string('to_status', 20).notNullable();
        table.string('note', 500).nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('submission_id').references('id').inTable('vsq_design_submissions').onDelete('CASCADE');
    });
    await knex.schema.createTable('vsq_design_rewards', (table) => {
        table.bigIncrements('id').primary();
        table.bigInteger('customer_id').unsigned().notNullable().unique();
        table.bigInteger('submission_id').unsigned().notNullable().unique();
        table.bigInteger('amount_minor').unsigned().notNullable().defaultTo(5000);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.foreign('submission_id').references('id').inTable('vsq_design_submissions').onDelete('RESTRICT');
    });
    await knex.schema.createTable('vsq_email_verification_tokens', (table) => {
        table.bigIncrements('id').primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('token_hash', 64).notNullable().unique();
        table.timestamp('expires_at').notNullable();
        table.timestamp('consumed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.index(['customer_id', 'expires_at']);
    });
    await knex.schema.alterTable('vsq_credit_transactions', (table) => {
        table.string('source', 40).nullable().after('type');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_credit_transactions', (table) => table.dropColumn('source'));
    await knex.schema.dropTableIfExists('vsq_email_verification_tokens');
    await knex.schema.dropTableIfExists('vsq_design_rewards');
    await knex.schema.dropTableIfExists('vsq_design_review_events');
    await knex.schema.dropTableIfExists('vsq_design_submissions');
}
