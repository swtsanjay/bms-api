import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasGender = await knex.schema.hasColumn('shopify_products', 'gender');
    if (!hasGender) {
        await knex.schema.alterTable('shopify_products', function (table) {
            table.string('gender', 100).nullable().after('image_url');
            table.index(['gender'], 'shopify_products_gender_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const hasGender = await knex.schema.hasColumn('shopify_products', 'gender');
    if (hasGender) {
        await knex.schema.alterTable('shopify_products', function (table) {
            table.dropIndex(['gender'], 'shopify_products_gender_idx');
            table.dropColumn('gender');
        });
    }
}
