import type { Knex } from "knex";
import { User } from '../types/user';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', function (table) {
    table.string('password' as (keyof User)[number], 255).nullable().after('email' as (keyof User)[number]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', function (table) {
    table.dropColumn('password' as (keyof User)[number]);
  });
}

