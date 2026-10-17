/** Shiprocket's Custom Order API; no website channel synchronization is assumed. */
export class ShiprocketError extends Error {
    constructor(message: string, public readonly statusCode = 502, public readonly uncertain = false) { super(message); }
}

type Json = Record<string, any>;
let cachedToken: { value: string; expires: number } | null = null;
const origin = 'https://apiv2.shiprocket.in/v1/external';

function credentials() {
    const email = process.env.SHIPROCKET_API_EMAIL;
    const password = process.env.SHIPROCKET_API_PASSWORD;
    if (!email || !password) throw new ShiprocketError('Shiprocket API user is not configured', 503);
    return { email, password };
}

async function request(path: string, method = 'GET', body?: Json): Promise<Json> {
    const auth = async () => {
        if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
        const { email, password } = credentials();
        let response: globalThis.Response;
        try {
            response = await fetch(`${origin}/auth/login`, {
                method: 'POST', headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(12000)
            });
        } catch {
            throw new ShiprocketError('Shiprocket authentication did not answer. Check the API connection and retry.', 502);
        }
        const data = await response.json() as Json;
        if (!response.ok || !data.token) throw new ShiprocketError('Shiprocket API user authentication failed');
        cachedToken = { value: String(data.token), expires: Date.now() + 23 * 60 * 60 * 1000 };
        return cachedToken.value;
    };
    const call = async (retryAuth: boolean): Promise<Json> => {
        const token = await auth();
        let response: globalThis.Response;
        try {
            response = await fetch(`${origin}${path}`, {
                method,
                headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
                ...(body ? { body: JSON.stringify(body) } : {}),
                signal: AbortSignal.timeout(15000)
            });
        } catch {
            throw new ShiprocketError('Shiprocket did not answer. Reconcile this operation before trying it again.', 502, method !== 'GET');
        }
        if (response.status === 401 && retryAuth) { cachedToken = null; return call(false); }
        const data = await response.json().catch(() => ({})) as Json;
        if (!response.ok || data.status_code >= 400) {
            const detail = typeof data.message === 'string' ? data.message : `HTTP ${response.status}`;
            throw new ShiprocketError(`Shiprocket: ${detail}`, response.status >= 500 ? 502 : 422, response.status >= 500 && method !== 'GET');
        }
        return data;
    };
    return call(true);
}

export type Parcel = { pickup_location: string; pickup_postcode: string; weight: number; length: number; breadth: number; height: number };
export function validateParcel(input: Parcel): Parcel {
    const pickup_location = String(input.pickup_location || '').trim();
    const pickup_postcode = String(input.pickup_postcode || '').trim();
    if (!pickup_location || pickup_location.length > 150 || !/^\d{6}$/.test(pickup_postcode)) throw new ShiprocketError('Select a valid Shiprocket pickup location', 422);
    for (const [key, minimum] of [['weight', 0], ['length', 0.5], ['breadth', 0.5], ['height', 0.5]] as const) {
        const value = Number(input[key]);
        if (!Number.isFinite(value) || value <= minimum || value > (key === 'weight' ? 100 : 200)) throw new ShiprocketError(`Enter the packed parcel's actual ${key}`, 422);
    }
    return { pickup_location, pickup_postcode, weight: Number(input.weight), length: Number(input.length), breadth: Number(input.breadth), height: Number(input.height) };
}

export async function pickupLocations() {
    const data = await request('/settings/company/pickup?is_order_creation=true');
    return (data.data?.shipping_address || []).map((row: Json) => ({
        id: Number(row.id), name: String(row.pickup_location), postcode: String(row.pin_code),
        address: [row.address, row.city, row.state].filter(Boolean).join(', ')
    })).filter((row: Json) => row.name && /^\d{6}$/.test(row.postcode));
}

export async function serviceableCouriers(parcel: Parcel, deliveryPostcode: string, cod: boolean, declaredValue: number) {
    const query = new URLSearchParams({ pickup_postcode: parcel.pickup_postcode, delivery_postcode: deliveryPostcode,
        weight: String(parcel.weight), cod: cod ? '1' : '0', declared_value: String(declaredValue),
        length: String(parcel.length), breadth: String(parcel.breadth), height: String(parcel.height) });
    const data = await request(`/courier/serviceability/?${query}`);
    return (data.data?.available_courier_companies || []).map((row: Json) => ({
        courier_id: Number(row.courier_company_id), courier_name: String(row.courier_name || ''),
        freight_charge: Number(row.freight_charge || 0), cod_charges: Number(row.cod_charges || 0),
        estimated_delivery_days: row.estimated_delivery_days == null ? null : Number(row.estimated_delivery_days),
        etd: row.etd ? String(row.etd) : null
    })).filter((row: Json) => Number.isInteger(row.courier_id) && row.courier_id > 0 && row.courier_name);
}

export const shiprocketApi = {
    create: (payload: Json) => request('/orders/create/adhoc', 'POST', payload),
    findOrder: (merchantReference: string) => request(`/orders?${new URLSearchParams({ search: merchantReference, filter_by: 'channel_order_id', filter: merchantReference, per_page: '50' })}`),
    showOrder: (orderId: string) => request(`/orders/show/${encodeURIComponent(orderId)}`),
    assignAwb: (shipmentId: string, courierId: number) => request('/courier/assign/awb', 'POST', { shipment_id: Number(shipmentId), courier_id: courierId }),
    pickup: (shipmentId: string) => request('/courier/generate/pickup', 'POST', { shipment_id: [Number(shipmentId)] }),
    label: (shipmentId: string) => request('/courier/generate/label', 'POST', { shipment_id: [Number(shipmentId)] }),
    tracking: (shipmentId: string) => request(`/courier/track/shipment/${encodeURIComponent(shipmentId)}`),
    cancel: (orderId: string) => request('/orders/cancel', 'POST', { ids: [Number(orderId)] })
};
