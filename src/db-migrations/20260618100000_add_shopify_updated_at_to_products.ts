import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasShopifyUpdatedAt = await knex.schema.hasColumn('shopify_products', 'shopify_updated_at');
    if (!hasShopifyUpdatedAt) {
        await knex.schema.alterTable('shopify_products', function (table) {
            table.timestamp('shopify_updated_at').nullable().after('shopify_created_at');
            table.index(['shopify_updated_at'], 'shopify_products_updated_at_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasShopifyUpdatedAt = await knex.schema.hasColumn('shopify_products', 'shopify_updated_at');
    if (hasShopifyUpdatedAt) {
        await knex.schema.alterTable('shopify_products', function (table) {
            table.dropIndex(['shopify_updated_at'], 'shopify_products_updated_at_idx');
            table.dropColumn('shopify_updated_at');
        });
    }
}
