import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex('vsq_shipping_rates')
        .whereIn('method_id', knex('vsq_shipping_methods').select('id').where({ code: 'STANDARD_MANUAL' }))
        .update({ amount: 0, free_above_amount: 0, updated_at: new Date() });
}

export async function down(_knex: Knex): Promise<void> {
    // Pricing changes are not safely reversible: existing zones may have had
    // custom rates before this migration, so do not invent a paid rate.
}
