import type { Application } from 'express';
import { isIP } from 'node:net';

/** Only socket peers in this explicit list may supply forwarding headers. */
export function trustedProxyAddresses(raw: string | undefined): string[] {
    if (!raw?.trim()) return [];
    const addresses = raw.split(',').map((value) => value.trim());
    if (addresses.some((value) => !value)) throw new Error('TRUSTED_PROXY_CIDRS contains an empty entry');
    for (const address of addresses) {
        const parts = address.split('/');
        const family = isIP(parts[0]);
        const maximum = family === 4 ? 32 : 128;
        if (!family || parts.length > 2 ||
            (parts.length === 2 && (!/^(0|[1-9][0-9]*)$/.test(parts[1]) || Number(parts[1]) < 1 || Number(parts[1]) > maximum))) {
            throw new Error('TRUSTED_PROXY_CIDRS must contain only explicit IP addresses or CIDR ranges');
        }
    }
    return addresses;
}

export function configureTrustedProxies(app: Application, raw = process.env.TRUSTED_PROXY_CIDRS): void {
    const addresses = trustedProxyAddresses(raw);
    // Empty configuration uses Express's socket-address default. It is safer
    // than accepting client-controlled X-Forwarded-For from every peer.
    app.set('trust proxy', addresses.length ? addresses : false);
}
