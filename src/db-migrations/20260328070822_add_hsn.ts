import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('products', function (table) {
        table.string('hsn_sac', 20).nullable().after('name');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('products', function (table) {
        table.dropColumn('hsn_sac');
    });
}

