export const HANDED_OVER_STATUSES = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ISSUE', 'RETURN_TO_ORIGIN', 'DELIVERED'];

const nextStatuses: Record<string, string[]> = {
    PENDING: ['SHIPPED'],
    PREPARING: ['SHIPPED'],
    SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ISSUE', 'DELIVERED'],
    IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERY_ISSUE', 'DELIVERED'],
    OUT_FOR_DELIVERY: ['DELIVERY_ISSUE', 'DELIVERED'],
    DELIVERY_ISSUE: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
};

export function allowedShipmentStatuses(current: string): string[] {
    return nextStatuses[current] || [];
}

export function validatedTrackingUrl(value?: string | null): string | null {
    if (!value?.trim()) return null;
    try {
        const url = new URL(value.trim());
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
        return url.toString();
    } catch {
        throw new Error('Tracking URL must be a valid HTTP or HTTPS link');
    }
}
