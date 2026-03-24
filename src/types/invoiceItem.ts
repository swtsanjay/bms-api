export type InvoiceItem = {
    id: number;
    invoice_id: number;
    product_id: number | null;
    sort_order: number;
    description: string;
    hsn_sac: string | null;
    quantity: number;
    unit: string;
    rate: number;
    taxable_value: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number;
    created_at: Date;
    updated_at: Date;
}
