export type Transaction = {
    id: number;
    user_id: number;
    transaction_id: string | null;
    type: 'EXPENSE' | 'PAYMENT';
    amount: number;
    comment: string | null;
    receipt_url: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}