import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasInvoices = await knex.schema.hasTable('invoices');
    if (!hasInvoices) {
        return;
    }

    const hasSellerUserId = await knex.schema.hasColumn('invoices', 'seller_user_id');
    if (!hasSellerUserId) {
        await knex.schema.alterTable('invoices', function (table) {
            table.integer('seller_user_id').unsigned().nullable()
                .references('id').inTable('users')
                .onDelete('SET NULL').onUpdate('CASCADE');
            table.index(['seller_user_id'], 'invoices_seller_user_id_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasInvoices = await knex.schema.hasTable('invoices');
    if (!hasInvoices) {
        return;
    }

    const hasSellerUserId = await knex.schema.hasColumn('invoices', 'seller_user_id');
    if (hasSellerUserId) {
        await knex.schema.alterTable('invoices', function (table) {
            table.dropIndex(['seller_user_id'], 'invoices_seller_user_id_idx');
            table.dropColumn('seller_user_id');
        });
    }
}
