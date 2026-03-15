export type OrderItem = {
    id: number;
    order_id: number;
    product_id: number;
    product_sizes_id: number;
    product_colors_id: number | null;
    product_images_id: number | null;
    quantity: number;
    price: number;
    status: 'CREATED' | 'FABRIC_PURCHASING' | 'PATTERN_MAKING' | 'CUTTING' | 'STITCHING' | 'KAJ_BUTTON' | 'DHAGA_CUTTING' | 'PRESSING' | 'PACKING';
    payment_status: 'RECEIVED' | 'NOT_RECEIVED';
    created_by: number;
    created_at: Date;
    updated_at: Date;
}
