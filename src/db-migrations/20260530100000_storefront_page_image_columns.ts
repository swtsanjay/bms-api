import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('storefront_pages')) {
        const hasHeroImageUrl = await knex.schema.hasColumn('storefront_pages', 'hero_image_url');
        if (!hasHeroImageUrl) {
            await knex.schema.alterTable('storefront_pages', function (table) {
                table.string('hero_image_url', 1000).nullable().after('description');
            });
        }
    }

    if (await knex.schema.hasTable('storefront_page_items')) {
        const hasImageUrl = await knex.schema.hasColumn('storefront_page_items', 'image_url');
        if (!hasImageUrl) {
            await knex.schema.alterTable('storefront_page_items', function (table) {
                table.string('image_url', 1000).nullable().after('shopify_category_id');
            });
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    if (
        await knex.schema.hasTable('storefront_page_items')
        && await knex.schema.hasColumn('storefront_page_items', 'image_url')
    ) {
        await knex.schema.alterTable('storefront_page_items', function (table) {
            table.dropColumn('image_url');
        });
    }

    if (
        await knex.schema.hasTable('storefront_pages')
        && await knex.schema.hasColumn('storefront_pages', 'hero_image_url')
    ) {
        await knex.schema.alterTable('storefront_pages', function (table) {
            table.dropColumn('hero_image_url');
        });
    }
}
