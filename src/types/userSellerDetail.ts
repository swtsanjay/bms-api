export type UserSellerDetail = {
    id: number;
    user_id: number;
    seller_name: string | null;
    seller_tagline: string | null;
    seller_address: string | null;
    seller_phone: string | null;
    seller_email: string | null;
    seller_website: string | null;
    seller_pan: string | null;
    seller_gstin: string | null;
    bank_name: string | null;
    bank_branch: string | null;
    bank_account_no: string | null;
    bank_ifsc: string | null;
    bank_upi_id: string | null;
    upi_qr_image_url: string | null;
    terms_conditions: string | null;
    declaration: string | null;
    customer_signature_label: string | null;
    authorized_signatory_label: string | null;
    footer_note: string | null;
    created_at: Date;
    updated_at: Date;
}
