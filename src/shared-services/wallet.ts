import { Knex } from 'knex';
import { WalletEntryType, WalletOwnerType, WalletSettings, WalletSource, WalletSummary } from '../types/wallet';

type CreditInput = {
    owner_type: WalletOwnerType;
    owner_id: number;
    entry_type?: WalletEntryType;
    source: WalletSource;
    coins: number;
    description?: string | null;
    reference_type?: string | null;
    reference_id?: string | number | null;
};

function parsePositiveNumber(value: unknown, fallback: number) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function randomCode(prefix: string, id: number) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}${id}${suffix}`.slice(0, 32);
}

export default class SharedWalletService {
    static async settings(trx: Knex.Transaction | null = null): Promise<WalletSettings> {
        const query = knexInstance('wallet_settings').select('*');
        if (trx) query.transacting(trx);
        const rows = await query as Array<{ setting_key: string; setting_value: string }>;
        const settings = rows.reduce<Record<string, string>>((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});

        return {
            coin_rupee_value: parsePositiveNumber(settings.coin_rupee_value, 1),
            referral_reward_coins: parsePositiveNumber(settings.referral_reward_coins, 100)
        };
    }

    static async saveSettings(data: Partial<WalletSettings>, trx: Knex.Transaction): Promise<WalletSettings> {
        const next = {
            coin_rupee_value: parsePositiveNumber(data.coin_rupee_value, 1),
            referral_reward_coins: parsePositiveNumber(data.referral_reward_coins, 100)
        };

        for (const [key, value] of Object.entries(next)) {
            await trx('wallet_settings')
                .insert({ setting_key: key, setting_value: String(value), created_at: new Date(), updated_at: new Date() })
                .onConflict('setting_key')
                .merge({ setting_value: String(value), updated_at: new Date() });
        }

        return await SharedWalletService.settings(trx);
    }

    static async ensureReferralCode(
        ownerType: WalletOwnerType,
        ownerId: number,
        trx: Knex.Transaction | null = null
    ): Promise<string> {
        const table = ownerType === 'CUSTOMER' ? 'customers' : 'users';
        const prefix = ownerType === 'CUSTOMER' ? 'CC' : 'CU';
        const query = knexInstance(table).select('referral_code').where({ id: ownerId });
        if (trx) query.transacting(trx);
        const row = await query.first() as { referral_code?: string | null } | undefined;
        if (row?.referral_code) {
            return row.referral_code;
        }

        let code = randomCode(prefix, ownerId);
        let exists = true;
        while (exists) {
            const existingQuery = knexInstance(table).where({ referral_code: code }).first();
            if (trx) existingQuery.transacting(trx);
            exists = Boolean(await existingQuery);
            if (exists) code = randomCode(prefix, ownerId);
        }

        const updateQuery = knexInstance(table).where({ id: ownerId }).update({ referral_code: code, updated_at: new Date() });
        if (trx) updateQuery.transacting(trx);
        await updateQuery;
        return code;
    }

    static async applyCustomerReferralCode(customerId: number, referralCode?: string | null, trx: Knex.Transaction | null = null) {
        if (!referralCode) return { applied: false, message: 'Referral code is required' };
        const code = referralCode.trim();
        if (!code) return { applied: false, message: 'Referral code is required' };

        const existingQuery = knexInstance('customers').select('referred_by_customer_id').where({ id: customerId }).first();
        const referrerQuery = knexInstance('customers').select('id').where({ referral_code: code }).whereNot({ id: customerId }).first();
        if (trx) {
            existingQuery.transacting(trx);
            referrerQuery.transacting(trx);
        }
        const [existing, referrer] = await Promise.all([
            existingQuery as Promise<{ referred_by_customer_id?: number | null } | undefined>,
            referrerQuery as Promise<{ id: number } | undefined>
        ]);
        if (existing?.referred_by_customer_id) {
            return { applied: false, message: 'Referral code already applied' };
        }
        if (!referrer) {
            return { applied: false, message: 'Invalid referral code' };
        }

        const updateQuery = knexInstance('customers')
            .where({ id: customerId })
            .whereNull('referred_by_customer_id')
            .update({ referred_by_customer_id: referrer.id, updated_at: new Date() });
        if (trx) updateQuery.transacting(trx);
        await updateQuery;
        return { applied: true, message: 'Referral code applied' };
    }

    static async addLedgerEntry(input: CreditInput, trx: Knex.Transaction): Promise<number> {
        const settings = await SharedWalletService.settings(trx);
        const coins = parsePositiveNumber(input.coins, 0);
        if (!coins) return 0;

        const [id] = await trx('wallet_ledger').insert({
            owner_type: input.owner_type,
            owner_id: input.owner_id,
            entry_type: input.entry_type || 'CREDIT',
            source: input.source,
            coins,
            coin_rupee_value: settings.coin_rupee_value,
            description: input.description || null,
            reference_type: input.reference_type || null,
            reference_id: input.reference_id === undefined || input.reference_id === null ? null : String(input.reference_id),
            created_at: new Date(),
            updated_at: new Date()
        }) as [number];
        return id;
    }

    static async rewardCustomerReferralAfterOrder(
        customerId: number,
        orderType: string,
        orderId: string | number,
        trx: Knex.Transaction
    ) {
        const customer = await trx('customers')
            .select('id', 'referred_by_customer_id')
            .where({ id: customerId })
            .first() as { id: number; referred_by_customer_id?: number | null } | undefined;
        if (!customer?.referred_by_customer_id) return;

        const existingReward = await trx('referral_rewards')
            .where({ referee_type: 'CUSTOMER', referee_id: customer.id })
            .first();
        if (existingReward) return;

        const settings = await SharedWalletService.settings(trx);
        await trx('referral_rewards').insert({
            referrer_type: 'CUSTOMER',
            referrer_id: customer.referred_by_customer_id,
            referee_type: 'CUSTOMER',
            referee_id: customer.id,
            order_type: orderType,
            order_id: String(orderId),
            reward_coins: settings.referral_reward_coins,
            status: 'REWARDED',
            created_at: new Date(),
            updated_at: new Date()
        });
        await SharedWalletService.addLedgerEntry({
            owner_type: 'CUSTOMER',
            owner_id: customer.referred_by_customer_id,
            source: 'REFERRAL',
            coins: settings.referral_reward_coins,
            description: 'Referral reward after successful order delivery',
            reference_type: orderType,
            reference_id: orderId
        }, trx);
    }

    static async rewardUserReferralAfterOrder(
        userId: number,
        orderId: string | number,
        trx: Knex.Transaction
    ) {
        const user = await trx('users')
            .select('id', 'referred_by_user_id')
            .where({ id: userId })
            .first() as { id: number; referred_by_user_id?: number | null } | undefined;
        if (!user?.referred_by_user_id) return;

        const existingReward = await trx('referral_rewards')
            .where({ referee_type: 'USER', referee_id: user.id })
            .first();
        if (existingReward) return;

        const settings = await SharedWalletService.settings(trx);
        await trx('referral_rewards').insert({
            referrer_type: 'USER',
            referrer_id: user.referred_by_user_id,
            referee_type: 'USER',
            referee_id: user.id,
            order_type: 'LOCAL_ORDER',
            order_id: String(orderId),
            reward_coins: settings.referral_reward_coins,
            status: 'REWARDED',
            created_at: new Date(),
            updated_at: new Date()
        });
        await SharedWalletService.addLedgerEntry({
            owner_type: 'USER',
            owner_id: user.referred_by_user_id,
            source: 'REFERRAL',
            coins: settings.referral_reward_coins,
            description: 'Referral reward after successful order delivery',
            reference_type: 'LOCAL_ORDER',
            reference_id: orderId
        }, trx);
    }

    static async summary(ownerType: WalletOwnerType, ownerId: number, limit = 50): Promise<WalletSummary> {
        const settings = await SharedWalletService.settings();
        const referralCode = await SharedWalletService.ensureReferralCode(ownerType, ownerId);
        const ownerTable = ownerType === 'CUSTOMER' ? 'customers' : 'users';
        const referredColumn = ownerType === 'CUSTOMER' ? 'referred_by_customer_id' : 'referred_by_user_id';
        const owner = await knexInstance(ownerTable)
            .select('created_at', referredColumn)
            .where({ id: ownerId })
            .first() as Record<string, unknown> | undefined;
        const balanceRows = await knexInstance('wallet_ledger')
            .select('entry_type', 'coins')
            .where({ owner_type: ownerType, owner_id: ownerId });
        const rows = await knexInstance('wallet_ledger')
            .select('*')
            .where({ owner_type: ownerType, owner_id: ownerId })
            .orderBy('id', 'desc')
            .limit(limit);

        const balance = balanceRows.reduce((sum, row) => {
            const coins = Number(row.coins || 0);
            return row.entry_type === 'DEBIT' ? sum - coins : sum + coins;
        }, 0);
        const createdAt = owner?.created_at ? new Date(String(owner.created_at)) : null;
        const ageInDays = createdAt
            ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
            : Number.POSITIVE_INFINITY;
        const canApplyReferral = !owner?.[referredColumn];

        return {
            balance,
            rupee_value: balance * settings.coin_rupee_value,
            coin_rupee_value: settings.coin_rupee_value,
            referral_reward_coins: settings.referral_reward_coins,
            referral_reward_rupee_value: settings.referral_reward_coins * settings.coin_rupee_value,
            referral_code: referralCode,
            can_apply_referral: canApplyReferral,
            should_show_referral_prompt: canApplyReferral && ageInDays <= 14,
            history: rows.map((row) => ({
                ...row,
                coins: Number(row.coins || 0),
                coin_rupee_value: Number(row.coin_rupee_value || settings.coin_rupee_value)
            }))
        };
    }
}
