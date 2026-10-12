export const VISIBLE_PRODUCT_STATUSES = ['ACTIVE', 'OUT_OF_STOCK'] as const;

export function isVisibleProductStatus(status: string): boolean {
    return status === 'ACTIVE' || status === 'OUT_OF_STOCK';
}
