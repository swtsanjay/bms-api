export type ManualOrderStatus = 'new' | 'contacted' | 'confirmed' | 'cancelled';

export type ManualOrder = {
    id: number;
    user_id: number | null;
    product_id: string | null;
    product_handle: string | null;
    product_title: string;
    product_image: string | null;
    size: string | null;
    quantity: number;
    customer_message: string | null;
    phone: string;
    email: string | null;
    status: ManualOrderStatus;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
};
