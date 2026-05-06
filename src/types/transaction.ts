export type TransactionType = 'EXPENSE' | 'PAYMENT' | 'SALARY';

export type Transaction = {
    id: number;
    user_id: number;
    transaction_id: string | null;
    type: TransactionType;
    amount: number;
    comment: string | null;
    receipt_url: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    deleted_by: number | null;
    payment_transfer_to: number | null;
}
