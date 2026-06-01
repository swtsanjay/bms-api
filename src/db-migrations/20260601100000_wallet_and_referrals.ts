import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('customers')) {
        const hasReferralCode = await knex.schema.hasColumn('customers', 'referral_code');
        const hasReferredBy = await knex.schema.hasColumn('customers', 'referred_by_customer_id');
        await knex.schema.alterTable('customers', function (table) {
            if (!hasReferralCode) {
                table.string('referral_code', 32).nullable().unique('customers_referral_code_unique').after('metafields');
            }
            if (!hasReferredBy) {
                table.integer('referred_by_customer_id').unsigned().nullable().after('referral_code')
                    .references('id').inTable('customers')
                    .onDelete('SET NULL').onUpdate('CASCADE');
            }
        });
    }

    if (await knex.schema.hasTable('users')) {
        const hasReferralCode = await knex.schema.hasColumn('users', 'referral_code');
        const hasReferredBy = await knex.schema.hasColumn('users', 'referred_by_user_id');
        await knex.schema.alterTable('users', function (table) {
            if (!hasReferralCode) {
                table.string('referral_code', 32).nullable().unique('users_referral_code_unique').after('profile_notes');
            }
            if (!hasReferredBy) {
                table.integer('referred_by_user_id').unsigned().nullable().after('referral_code')
                    .references('id').inTable('users')
                    .onDelete('SET NULL').onUpdate('CASCADE');
            }
        });
    }

    if (!(await knex.schema.hasTable('wallet_settings'))) {
        await knex.schema.createTable('wallet_settings', function (table) {
            table.string('setting_key', 80).primary();
            table.string('setting_value', 255).notNullable();
            table.timestamps(true, true);
        });

        await knex('wallet_settings').insert([
            { setting_key: 'coin_rupee_value', setting_value: '1' },
            { setting_key: 'referral_reward_coins', setting_value: '100' }
        ]);
    }

    if (!(await knex.schema.hasTable('wallet_ledger'))) {
        await knex.schema.createTable('wallet_ledger', function (table) {
            table.increments('id').unsigned().primary();
            table.enu('owner_type', ['CUSTOMER', 'USER']).notNullable();
            table.integer('owner_id').unsigned().notNullable();
            table.enu('entry_type', ['CREDIT', 'DEBIT']).notNullable();
            table.enu('source', ['REFERRAL', 'ORDER', 'MANUAL', 'ADJUSTMENT']).notNullable().defaultTo('ADJUSTMENT');
            table.decimal('coins', 12, 2).notNullable();
            table.decimal('coin_rupee_value', 12, 2).notNullable().defaultTo(1);
            table.string('description', 500).nullable();
            table.string('reference_type', 80).nullable();
            table.string('reference_id', 120).nullable();
            table.timestamps(true, true);

            table.index(['owner_type', 'owner_id'], 'wallet_ledger_owner_idx');
            table.index(['source'], 'wallet_ledger_source_idx');
            table.index(['reference_type', 'reference_id'], 'wallet_ledger_reference_idx');
        });
    }

    if (!(await knex.schema.hasTable('referral_rewards'))) {
        await knex.schema.createTable('referral_rewards', function (table) {
            table.increments('id').unsigned().primary();
            table.enu('referrer_type', ['CUSTOMER', 'USER']).notNullable();
            table.integer('referrer_id').unsigned().notNullable();
            table.enu('referee_type', ['CUSTOMER', 'USER']).notNullable();
            table.integer('referee_id').unsigned().notNullable();
            table.string('order_type', 80).nullable();
            table.string('order_id', 120).nullable();
            table.decimal('reward_coins', 12, 2).notNullable();
            table.enu('status', ['REWARDED', 'CANCELLED']).notNullable().defaultTo('REWARDED');
            table.timestamps(true, true);

            table.unique(['referee_type', 'referee_id'], 'referral_rewards_referee_unique');
            table.index(['referrer_type', 'referrer_id'], 'referral_rewards_referrer_idx');
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('referral_rewards')) {
        await knex.schema.dropTable('referral_rewards');
    }
    if (await knex.schema.hasTable('wallet_ledger')) {
        await knex.schema.dropTable('wallet_ledger');
    }
    if (await knex.schema.hasTable('wallet_settings')) {
        await knex.schema.dropTable('wallet_settings');
    }
    if (await knex.schema.hasTable('users')) {
        await knex.schema.alterTable('users', function (table) {
            table.dropColumn('referred_by_user_id');
            table.dropColumn('referral_code');
        });
    }
    if (await knex.schema.hasTable('customers')) {
        await knex.schema.alterTable('customers', function (table) {
            table.dropColumn('referred_by_customer_id');
            table.dropColumn('referral_code');
        });
    }
}
