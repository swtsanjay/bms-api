import crypto from 'crypto';
import type { Knex } from 'knex';

function referralCode() {
    return `VSQ${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_customer_referral_profiles', (table) => {
        table.bigInteger('customer_id').unsigned().primary();
        table.string('referral_code', 20).notNullable().unique();
        table.bigInteger('default_referrer_customer_id').unsigned().nullable();
        table.timestamp('default_attributed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_crp_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.foreign('default_referrer_customer_id', 'vsq_crp_referrer_fk').references('id').inTable('vsq_customers').onDelete('SET NULL');
        table.index(['default_referrer_customer_id'], 'vsq_crp_referrer_idx');
    });

    await knex.schema.createTable('vsq_referral_claims', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.bigInteger('referrer_customer_id').unsigned().notNullable();
        table.string('referral_code_snapshot', 20).notNullable();
        table.enu('status', ['PENDING', 'CONSUMED', 'EXPIRED', 'INVALID', 'SUPERSEDED']).notNullable().defaultTo('PENDING');
        table.enu('source', ['SIGNUP', 'SIGNIN', 'CHECKOUT', 'SIGNED_IN_VISIT']).notNullable();
        table.timestamp('claimed_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('expires_at').notNullable();
        table.timestamp('consumed_at').nullable();
        table.bigInteger('consumed_order_id').unsigned().nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_rc_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.foreign('referrer_customer_id', 'vsq_rc_referrer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.foreign('consumed_order_id', 'vsq_rc_order_fk').references('id').inTable('vsq_orders').onDelete('SET NULL');
        table.index(['customer_id', 'status', 'expires_at'], 'vsq_rc_customer_status_idx');
        table.index(['referrer_customer_id', 'claimed_at'], 'vsq_rc_referrer_date_idx');
    });

    await knex.schema.createTable('vsq_order_referrals', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('order_id').unsigned().notNullable().unique();
        table.bigInteger('buyer_customer_id').unsigned().notNullable();
        table.bigInteger('referrer_customer_id').unsigned().notNullable();
        table.bigInteger('referral_claim_id').unsigned().nullable();
        table.string('referral_code_snapshot', 20).notNullable();
        table.enu('attribution_type', ['DEFAULT', 'OVERRIDE']).notNullable();
        table.integer('reward_rate_bps').unsigned().notNullable().defaultTo(500);
        table.bigInteger('eligible_amount_minor').unsigned().notNullable().defaultTo(0);
        table.bigInteger('reward_amount_minor').unsigned().notNullable().defaultTo(0);
        table.bigInteger('reversed_amount_minor').unsigned().notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.enu('status', ['ATTRIBUTED', 'PENDING', 'AVAILABLE', 'PARTIALLY_REVERSED', 'REVERSED', 'VOIDED']).notNullable().defaultTo('ATTRIBUTED');
        table.timestamp('earned_at').nullable();
        table.timestamp('available_at').nullable();
        table.timestamp('reversed_at').nullable();
        table.string('void_reason', 500).nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('order_id', 'vsq_or_order_fk').references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.foreign('buyer_customer_id', 'vsq_or_buyer_fk').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.foreign('referrer_customer_id', 'vsq_or_referrer_fk').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.foreign('referral_claim_id', 'vsq_or_claim_fk').references('id').inTable('vsq_referral_claims').onDelete('SET NULL');
        table.index(['referrer_customer_id', 'status', 'created_at'], 'vsq_or_referrer_status_idx');
        table.index(['buyer_customer_id', 'created_at'], 'vsq_or_buyer_date_idx');
    });

    await knex.schema.createTable('vsq_credit_accounts', (table) => {
        table.bigInteger('customer_id').unsigned().primary();
        table.bigInteger('pending_balance_minor').notNullable().defaultTo(0);
        table.bigInteger('available_balance_minor').notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.integer('version').unsigned().notNullable().defaultTo(1);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_credit_account_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
    });

    await knex.schema.createTable('vsq_credit_transactions', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.bigInteger('order_id').unsigned().nullable();
        table.bigInteger('order_referral_id').unsigned().nullable();
        table.enu('type', ['REFERRAL_PENDING', 'REFERRAL_RELEASED', 'REFERRAL_REVERSED', 'REDEMPTION', 'REDEMPTION_REFUND', 'ADMIN_ADJUSTMENT']).notNullable();
        table.bigInteger('pending_delta_minor').notNullable().defaultTo(0);
        table.bigInteger('available_delta_minor').notNullable().defaultTo(0);
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('idempotency_key', 191).notNullable().unique();
        table.string('description', 500).nullable();
        table.json('metadata').nullable();
        table.bigInteger('actor_id').unsigned().nullable();
        table.string('actor_type', 40).notNullable().defaultTo('SYSTEM');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('customer_id', 'vsq_ct_customer_fk').references('id').inTable('vsq_customers').onDelete('RESTRICT');
        table.foreign('order_id', 'vsq_ct_order_fk').references('id').inTable('vsq_orders').onDelete('SET NULL');
        table.foreign('order_referral_id', 'vsq_ct_order_referral_fk').references('id').inTable('vsq_order_referrals').onDelete('SET NULL');
        table.index(['customer_id', 'created_at'], 'vsq_ct_customer_date_idx');
        table.index(['order_id', 'type'], 'vsq_ct_order_type_idx');
    });

    const customers = await knex('vsq_customers').select('id');
    for (const customer of customers) {
        let inserted = false;
        while (!inserted) {
            try {
                await knex('vsq_customer_referral_profiles').insert({
                    customer_id: customer.id,
                    referral_code: referralCode(),
                    created_at: new Date(),
                    updated_at: new Date()
                });
                await knex('vsq_credit_accounts').insert({ customer_id: customer.id, created_at: new Date(), updated_at: new Date() });
                inserted = true;
            } catch (error) {
                const duplicate = String((error as { code?: string }).code || '').includes('DUP');
                if (!duplicate) throw error;
            }
        }
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_credit_transactions');
    await knex.schema.dropTableIfExists('vsq_credit_accounts');
    await knex.schema.dropTableIfExists('vsq_order_referrals');
    await knex.schema.dropTableIfExists('vsq_referral_claims');
    await knex.schema.dropTableIfExists('vsq_customer_referral_profiles');
}
