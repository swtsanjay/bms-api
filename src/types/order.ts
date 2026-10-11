export type Order = {
    id: number;
    assigned_staff_id: number | null;
    workflow_state: 'DRAFT' | 'FINALIZED';
    status: 'CREATED' | 'FABRIC_PURCHASING' | 'PATTERN_MAKING' | 'CUTTING' | 'STITCHING' | 'KAJ_BUTTON' | 'DHAGA_CUTTING' | 'PRESSING' | 'PACKING';
    payment_status: 'RECEIVED' | 'NOT_RECEIVED';
    client_id: number;
    created_by: number;
    created_at: Date;
    updated_at: Date;
}
