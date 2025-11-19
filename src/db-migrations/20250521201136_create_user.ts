import type { Knex } from 'knex';
import { User } from '../types/user';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users', function (table) {
        table.increments('id' as (keyof User)[number]).unsigned().primary();
        table.string('name' as (keyof User)[number], 100).nullable();
        table.string('email' as (keyof User)[number], 100).nullable();
        table.string('phone' as (keyof User)[number], 20).nullable();
        table.string('adhar_url' as (keyof User)[number], 20).nullable();
        table.enu('user_type' as (keyof User)[number], ['EMPLOYEE', 'VENDOR']).defaultTo('EMPLOYEE').notNullable();
        table.timestamps(true, true);
        table.timestamp('deleted_at' as (keyof User)[number]).nullable();

        /* indexs */
        table.index(['id' as (keyof User)[number]], 'user_primary_id');
    });
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('users');
}