import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_payment_attempts', (table) => {
        table.string('provider_receipt', 40).nullable();
        table.string('provider_status', 40).nullable();
        table.timestamp('last_verified_at').nullable();
        table.unique(['provider', 'provider_order_id'], 'vsq_pa_provider_order_uq');
    });

    await knex.schema.alterTable('vsq_payment_transactions', (table) => {
        table.dropUnique(['payment_attempt_id', 'provider_transaction_id'], 'vsq_pt_provider_tx_uq');
        table.unique(
            ['payment_attempt_id', 'provider_transaction_id', 'type'],
            'vsq_pt_provider_tx_type_uq'
        );
    });

    await knex.schema.alterTable('vsq_provider_webhook_events', (table) => {
        table.string('payload_checksum', 64).nullable();
        table.timestamp('available_at').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_provider_webhook_events', (table) => {
        table.dropColumn('available_at');
        table.dropColumn('payload_checksum');
    });

    await knex.schema.alterTable('vsq_payment_transactions', (table) => {
        table.dropUnique(
            ['payment_attempt_id', 'provider_transaction_id', 'type'],
            'vsq_pt_provider_tx_type_uq'
        );
        table.unique(
            ['payment_attempt_id', 'provider_transaction_id'],
            'vsq_pt_provider_tx_uq'
        );
    });

    await knex.schema.alterTable('vsq_payment_attempts', (table) => {
        table.dropUnique(['provider', 'provider_order_id'], 'vsq_pa_provider_order_uq');
        table.dropColumn('last_verified_at');
        table.dropColumn('provider_status');
        table.dropColumn('provider_receipt');
    });
}
