export type ProductSize = {
    id: number;
    product_id: number;
    size: string;
    created_at: Date;
    updated_at: Date;
};

export type ProductImage = {
    id: number;
    product_id: number;
    url: string;
    created_at: Date;
    updated_at: Date;
};

export type ProductColor = {
    id: number;
    product_id: number;
    color: string;
    created_at: Date;
    updated_at: Date;
};

export type Product = {
    id: number;
    name: string;
    price: number;
    created_at: Date;
    updated_at: Date;
    sizes?: ProductSize[];
    images?: ProductImage[];
    colors?: ProductColor[];
};
