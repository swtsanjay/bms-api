export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

export type Inquiry = {
    id: number;
    user_id: number | null;
    name: string;
    email: string;
    phone: string;
    company_brand_name: string | null;
    requirements: string;
    reference_file_url: string | null;
    status: InquiryStatus;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
};
