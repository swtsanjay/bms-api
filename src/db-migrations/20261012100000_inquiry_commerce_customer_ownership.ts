import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', (table) => {
        table.bigInteger('commerce_customer_id').unsigned().nullable();
        table.enu('ownership_source', ['LEGACY_FRONT', 'COMMERCE_CUSTOMER', 'GUEST']).nullable();
        table.index(['commerce_customer_id'], 'inquiries_commerce_customer_idx');
        table.foreign('commerce_customer_id', 'inquiries_commerce_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('SET NULL');
    });
    // Existing user_id and contact fields cannot establish either customer identity.
    // Historical rows deliberately retain null commerce_customer_id and ownership_source.
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', (table) => {
        table.dropForeign(['commerce_customer_id'], 'inquiries_commerce_customer_fk');
        table.dropIndex(['commerce_customer_id'], 'inquiries_commerce_customer_idx');
        table.dropColumn('commerce_customer_id');
        table.dropColumn('ownership_source');
    });
}
