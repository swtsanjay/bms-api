const requiredFields = [
    ['first_name', 'First name', 100],
    ['address_line_1', 'Address line 1', 255],
    ['city', 'City', 120],
    ['state', 'State', 120]
] as const;

const optionalFields = [
    ['last_name', 'Last name', 100],
    ['company', 'Company', 150],
    ['address_line_2', 'Address line 2', 255],
    ['state_code', 'State code', 20],
    ['country', 'Country', 120],
    ['country_code', 'Country code', 2],
    ['phone', 'Phone', 30]
] as const;

export function indianAddressValidationError(address: unknown): string | null {
    if (!address || typeof address !== 'object' || Array.isArray(address)) return 'Address is invalid';
    const values = address as Record<string, unknown>;
    for (const [field, label, max] of requiredFields) {
        const value = values[field];
        if (typeof value !== 'string' || !value.trim()) return `${label} is required`;
        if (value.trim().length > max) return `${label} is too long`;
    }
    const postcode = values.postcode;
    if (typeof postcode !== 'string' || !/^[1-9][0-9]{5}$/.test(postcode.trim())) {
        return 'PIN code must be a valid 6-digit Indian postcode';
    }
    for (const [field, label, max] of optionalFields) {
        const value = values[field];
        if (value === undefined || value === null) continue;
        if (typeof value !== 'string') return `${label} is invalid`;
        if (value.trim().length > max) return `${label} is too long`;
    }
    const phone = values.phone;
    if (typeof phone === 'string' && phone.trim() && phone.trim().length < 8) return 'Phone must be at least 8 characters';
    return null;
}
