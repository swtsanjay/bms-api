import type { Knex } from 'knex';

const TABLE_NAME = 'shopify_category_products';
const COLUMN_NAME = 'shopify_product_id';
const REFERENCED_TABLE_NAME = 'shopify_products';
const REFERENCED_COLUMN_NAME = 'shopify_product_id';
const DEFAULT_CONSTRAINT_NAME = 'shopify_category_products_shopify_product_id_foreign';

type ForeignKeyRow = {
    constraint_name: string;
};

async function getProductForeignKeyName(knex: Knex): Promise<string | null> {
    const [rows] = await knex.raw(
        `
        SELECT CONSTRAINT_NAME AS constraint_name
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
            AND REFERENCED_TABLE_NAME = ?
            AND REFERENCED_COLUMN_NAME = ?
        LIMIT 1
        `,
        [TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME],
    );

    return (rows as ForeignKeyRow[])[0]?.constraint_name ?? null;
}

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable(TABLE_NAME);
    if (!hasTable) {
        return;
    }

    const foreignKeyName = await getProductForeignKeyName(knex);
    if (!foreignKeyName) {
        return;
    }

    await knex.schema.alterTable(TABLE_NAME, function (table) {
        table.dropForeign([COLUMN_NAME], foreignKeyName);
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable(TABLE_NAME);
    if (!hasTable) {
        return;
    }

    const foreignKeyName = await getProductForeignKeyName(knex);
    if (foreignKeyName) {
        return;
    }

    await knex.schema.alterTable(TABLE_NAME, function (table) {
        table.foreign(COLUMN_NAME, DEFAULT_CONSTRAINT_NAME)
            .references(REFERENCED_COLUMN_NAME)
            .inTable(REFERENCED_TABLE_NAME)
            .onDelete('CASCADE')
            .onUpdate('CASCADE');
    });
}
