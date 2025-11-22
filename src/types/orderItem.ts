export type OrderItem = {
    id: number;
    name: string | null;
    quantity: number;
    pp_price: number;
    order_id: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}