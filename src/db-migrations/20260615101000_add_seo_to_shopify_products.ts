import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasSeoTitle = await knex.schema.hasColumn('shopify_products', 'seo_title');
    const hasSeoDescription = await knex.schema.hasColumn('shopify_products', 'seo_description');
    if (!hasSeoTitle || !hasSeoDescription) {
        await knex.schema.alterTable('shopify_products', function (table) {
            if (!hasSeoTitle) {
                table.string('seo_title', 255).nullable().after('gender');
            }
            if (!hasSeoDescription) {
                table.text('seo_description').nullable().after('seo_title');
            }
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasSeoTitle = await knex.schema.hasColumn('shopify_products', 'seo_title');
    const hasSeoDescription = await knex.schema.hasColumn('shopify_products', 'seo_description');
    if (hasSeoTitle || hasSeoDescription) {
        await knex.schema.alterTable('shopify_products', function (table) {
            if (hasSeoDescription) {
                table.dropColumn('seo_description');
            }
            if (hasSeoTitle) {
                table.dropColumn('seo_title');
            }
        });
    }
}
