import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_customer_password_reset_tokens', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('token_hash', 64).notNullable().unique();
        table.string('requested_ip', 64).nullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('consumed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_password_reset_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.index(['customer_id', 'created_at'], 'vsq_password_reset_customer_idx');
        table.index(['expires_at', 'consumed_at'], 'vsq_password_reset_expiry_idx');
    });

    await knex.schema.createTable('vsq_email_outbox', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.string('event_key', 191).notNullable().unique();
        table.string('template', 64).notNullable();
        table.string('recipient_email', 191).notNullable();
        table.string('recipient_name', 191).nullable();
        table.json('payload_json').notNullable();
        table.enu('status', ['PENDING', 'PROCESSING', 'SENT', 'FAILED']).notNullable().defaultTo('PENDING');
        table.integer('attempts').unsigned().notNullable().defaultTo(0);
        table.timestamp('available_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('locked_at').nullable();
        table.string('provider_message_id', 255).nullable();
        table.text('last_error').nullable();
        table.timestamp('sent_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.index(['status', 'available_at'], 'vsq_email_outbox_dispatch_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_email_outbox');
    await knex.schema.dropTableIfExists('vsq_customer_password_reset_tokens');
}
