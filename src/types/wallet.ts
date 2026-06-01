export type WalletOwnerType = 'CUSTOMER' | 'USER';
export type WalletEntryType = 'CREDIT' | 'DEBIT';
export type WalletSource = 'REFERRAL' | 'ORDER' | 'MANUAL' | 'ADJUSTMENT';

export type WalletSettings = {
    coin_rupee_value: number;
    referral_reward_coins: number;
};

export type WalletLedgerEntry = {
    id: number;
    owner_type: WalletOwnerType;
    owner_id: number;
    entry_type: WalletEntryType;
    source: WalletSource;
    coins: number;
    coin_rupee_value: number;
    description?: string | null;
    reference_type?: string | null;
    reference_id?: string | null;
    created_at?: Date | string;
    updated_at?: Date | string;
};

export type WalletSummary = {
    balance: number;
    rupee_value: number;
    coin_rupee_value: number;
    referral_reward_coins: number;
    referral_reward_rupee_value: number;
    referral_code: string;
    can_apply_referral?: boolean;
    should_show_referral_prompt?: boolean;
    history: WalletLedgerEntry[];
};
