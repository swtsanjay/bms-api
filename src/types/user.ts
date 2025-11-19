export type User = {
    id: number;
    name: string;
    email: string;
    phone: string;
    user_type: 'EMPLOYEE' | 'SUPER_ADMIN' | 'SUB_ADMIN' | 'USER' | 'COMPANY';
    adhar_url: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
}