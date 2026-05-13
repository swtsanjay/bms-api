import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', function (table) {
        table.integer('user_id').unsigned().nullable().after('id');
        table.index(['user_id'], 'inquiries_user_id_idx');
        table.foreign('user_id', 'inquiries_user_id_fk').references('id').inTable('users').onDelete('SET NULL');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('inquiries', function (table) {
        table.dropForeign(['user_id'], 'inquiries_user_id_fk');
        table.dropIndex(['user_id'], 'inquiries_user_id_idx');
        table.dropColumn('user_id');
    });
}
