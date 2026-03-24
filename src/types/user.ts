import { UserSellerDetail } from './userSellerDetail';

export type User = {
    id: number;
    name: string;
    email: string;
    password?: string;
    phone: string;
    user_type: 'EMPLOYEE' | 'SUPER_ADMIN' | 'SUB_ADMIN' | 'USER' | 'COMPANY';
    adhar_url: string;
    billing_name?: string;
    company_name?: string;
    gstin?: string;
    pan_number?: string;
    billing_email?: string;
    billing_phone?: string;
    billing_address_line1?: string;
    billing_address_line2?: string;
    billing_city?: string;
    billing_state?: string;
    billing_country?: string;
    billing_pincode?: string;
    place_of_supply?: string;
    shipping_name?: string;
    shipping_phone?: string;
    shipping_address_line1?: string;
    shipping_address_line2?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_country?: string;
    shipping_pincode?: string;
    seller_details?: Partial<UserSellerDetail> | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}
