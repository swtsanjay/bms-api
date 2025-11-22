export type Order = {
    id: number;
    user_id: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}