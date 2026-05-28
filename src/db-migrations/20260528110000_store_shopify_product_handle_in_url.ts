import type { Knex } from 'knex';

function extractHandle(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const match = value.match(/\/products\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : value;
}

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable('shopify_products');
    if (!hasTable) {
        return;
    }

    const rows = await knex('shopify_products')
        .select('id', 'url')
        .where('url', 'like', '%/products/%') as Array<{ id: number; url: string | null }>;

    for (const row of rows) {
        await knex('shopify_products')
            .where({ id: row.id })
            .update({
                url: extractHandle(row.url),
                updated_at: new Date()
            });
    }
}

export async function down(knex: Knex): Promise<void> {
    return Promise.resolve();
}
