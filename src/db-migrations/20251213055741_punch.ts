import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('punch', function (table) {
    table.increments('id').unsigned().primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');
    table.enu('type', ['IN', 'OUT'], {
      useNative: true,
      enumName: 'punch_type',
    }).notNullable;
    table.timestamp('punched_at', { useTz: true }).notNullable;
    table.timestamps(true, true);

    /* indexs */
    table.index(['user_id', 'punched_at'], 'idx_punch_user_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('punches');
}
