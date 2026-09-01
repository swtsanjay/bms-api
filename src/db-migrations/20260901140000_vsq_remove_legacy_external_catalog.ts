import type { Knex } from 'knex';

async function dropColumns(knex: Knex, tableName: string, columns: string[]) {
    if (!await knex.schema.hasTable(tableName)) return;
    const existing: string[] = [];
    for (const column of columns) {
        if (await knex.schema.hasColumn(tableName, column)) existing.push(column);
    }
    if (!existing.length) return;
    await knex.schema.alterTable(tableName, (table) => table.dropColumns(...existing));
}

export async function up(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_migration_entities');
    await knex.schema.dropTableIfExists('vsq_migration_runs');

    if (await knex.schema.hasTable('vsq_media_assets')) {
        const sourceIndex = await knex('information_schema.STATISTICS')
            .whereRaw('TABLE_SCHEMA = DATABASE()')
            .where({ TABLE_NAME: 'vsq_media_assets', INDEX_NAME: 'vsq_ma_source_uq' })
            .first();
        if (sourceIndex) {
            await knex.schema.alterTable('vsq_media_assets', (table) => {
                table.dropUnique(['source_system', 'source_id'], 'vsq_ma_source_uq');
                table.index(['source_system', 'source_id'], 'vsq_ma_source_idx');
            });
        }
    }

    if (await knex.schema.hasColumn('vsq_product_variants', 'legacy_shopify_variant_id')) {
        await knex.schema.alterTable('vsq_product_variants', (table) => {
            table.dropUnique(['legacy_shopify_variant_id'], 'vsq_pv_shopify_id_uq');
            table.dropColumn('legacy_shopify_variant_id');
        });
    }

    if (await knex.schema.hasColumn('vsq_products', 'legacy_shopify_product_id')) {
        await knex.schema.alterTable('vsq_products', (table) => {
            table.dropUnique(['legacy_shopify_product_id'], 'vsq_p_shopify_id_uq');
            table.dropColumn('legacy_shopify_product_id');
            table.dropColumn('source_status');
            table.dropColumn('source_created_at');
            table.dropColumn('source_updated_at');
        });
    }

    if (await knex.schema.hasTable('storefront_page_items')) {
        const foreignKeys = await knex('information_schema.KEY_COLUMN_USAGE')
            .select('CONSTRAINT_NAME')
            .whereRaw('TABLE_SCHEMA = DATABASE()')
            .where({ TABLE_NAME: 'storefront_page_items' })
            .whereIn('COLUMN_NAME', ['shopify_product_id', 'shopify_category_id'])
            .whereNotNull('REFERENCED_TABLE_NAME');
        if (foreignKeys.length) {
            await knex.schema.alterTable('storefront_page_items', (table) => {
                for (const key of foreignKeys) table.dropForeign([], key.CONSTRAINT_NAME);
            });
        }
        await dropColumns(knex, 'storefront_page_items', ['shopify_product_id', 'shopify_category_id']);
    }

    await knex.schema.dropTableIfExists('shopify_category_products');
    await knex.schema.dropTableIfExists('shopify_categories');
    await knex.schema.dropTableIfExists('shopify_products');
    await knex.schema.dropTableIfExists('shopify_admin_tokens');

    await dropColumns(knex, 'customers', [
        'shopify_customer_id',
        'shopify_created_at',
        'shopify_updated_at'
    ]);
    await dropColumns(knex, 'wishlists', ['shopify_product_id', 'shopify_product_handle']);
}

export async function down(): Promise<void> {
    throw new Error('Legacy external catalog removal cannot restore discarded source metadata');
}
