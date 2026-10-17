import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_shipments', (table) => {
        table.string('merchant_reference', 50).nullable().unique();
        table.string('provider_order_id', 80).nullable();
        table.integer('courier_id').unsigned().nullable();
        table.string('pickup_location', 150).nullable();
        table.string('pickup_postcode', 10).nullable();
        table.decimal('package_weight_kg', 10, 3).nullable();
        table.decimal('package_length_cm', 10, 2).nullable();
        table.decimal('package_breadth_cm', 10, 2).nullable();
        table.decimal('package_height_cm', 10, 2).nullable();
        table.string('integration_state', 40).nullable();
        table.string('integration_error', 500).nullable();
        table.timestamp('pickup_scheduled_at').nullable();
        table.timestamp('provider_event_at').nullable();
        table.timestamp('integration_locked_at').nullable();
    });
    await knex.schema.alterTable('vsq_shipment_events', (table) => {
        table.json('provider_payload').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('vsq_shipment_events', (table) => table.dropColumn('provider_payload'));
    await knex.schema.alterTable('vsq_shipments', (table) => {
        table.dropUnique(['merchant_reference']);
        for (const column of ['merchant_reference', 'provider_order_id', 'courier_id', 'pickup_location', 'pickup_postcode',
            'package_weight_kg', 'package_length_cm', 'package_breadth_cm', 'package_height_cm', 'integration_state',
            'integration_error', 'pickup_scheduled_at', 'provider_event_at', 'integration_locked_at']) table.dropColumn(column);
    });
}
