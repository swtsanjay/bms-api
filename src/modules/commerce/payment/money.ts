export function toMinorUnits(value: unknown): number {
    const normalized = String(value ?? '').trim();
    const match = normalized.match(/^(\d+)(?:\.(\d{1,4}))?$/);
    if (!match) throw new Error('Invalid monetary amount');

    const fraction = (match[2] || '').padEnd(4, '0');
    if (fraction.slice(2) !== '00') {
        throw new Error('Monetary amount has unsupported fractional paise');
    }

    const minor = (BigInt(match[1]) * 100n) + BigInt(fraction.slice(0, 2) || '0');
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Monetary amount is too large');
    return Number(minor);
}

export function fromMinorUnits(value: number): string {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid minor-unit amount');
    const major = Math.floor(value / 100);
    const fraction = String(value % 100).padStart(2, '0');
    return `${major}.${fraction}`;
}
