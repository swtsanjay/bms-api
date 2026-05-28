import type { Knex } from 'knex';

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function getUniqueSlug(knex: Knex, baseSlug: string, categoryId: number): Promise<string> {
    let slug = baseSlug || `category-${categoryId}`;
    let suffix = 2;

    while (await knex('shopify_categories').where({ slug }).whereNot({ id: categoryId }).first()) {
        slug = `${baseSlug || `category-${categoryId}`}-${suffix}`;
        suffix += 1;
    }

    return slug;
}

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_categories');
    if (!hasTable) {
        return;
    }

    const hasSlug = await knex.schema.hasColumn('shopify_categories', 'slug');
    if (!hasSlug) {
        await knex.schema.alterTable('shopify_categories', function (table) {
            table.string('slug', 255).nullable().after('title');
        });
    }

    const categories = await knex('shopify_categories').select('id', 'title', 'slug') as Array<{
        id: number;
        title: string;
        slug?: string | null;
    }>;

    for (const category of categories) {
        if (category.slug) {
            continue;
        }

        const baseSlug = slugify(category.title || '');
        const slug = await getUniqueSlug(knex, baseSlug, category.id);
        await knex('shopify_categories').where({ id: category.id }).update({ slug });
    }

    await knex.schema.alterTable('shopify_categories', function (table) {
        table.string('slug', 255).notNullable().alter();
    });

    await knex.schema.alterTable('shopify_categories', function (table) {
        table.unique(['slug'], 'shopify_categories_slug_unique');
    }).catch(() => null);
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_categories');
    if (!hasTable) {
        return;
    }

    const hasSlug = await knex.schema.hasColumn('shopify_categories', 'slug');
    if (!hasSlug) {
        return;
    }

    await knex.schema.alterTable('shopify_categories', function (table) {
        table.dropUnique(['slug'], 'shopify_categories_slug_unique');
        table.dropColumn('slug');
    });
}
