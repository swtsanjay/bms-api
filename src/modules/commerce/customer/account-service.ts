import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { CommerceAuthError } from './auth-service';

function normalizePhone(phone?: string | null) {
    const normalized = String(phone || '').replace(/\D/g, '');
    return normalized || null;
}

export default class CommerceCustomerAccountService {
    static async updateProfile(customerId: number, input: Record<string, unknown>) {
        return knexInstance.transaction(async (trx) => {
            const customer = await trx('vsq_customers').where({ id: customerId }).whereNull('deleted_at').forUpdate().first();
            if (!customer) throw new CommerceAuthError('Customer not found', 404);
            const phone = input.phone === undefined ? customer.phone : String(input.phone || '').trim() || null;
            const phoneNormalized = normalizePhone(phone);
            if (phoneNormalized) {
                const existing = await trx('vsq_customers')
                    .select('id')
                    .where({ phone_normalized: phoneNormalized })
                    .whereNot({ id: customerId })
                    .whereNull('deleted_at')
                    .first();
                if (existing) throw new CommerceAuthError('Phone number is already in use', 409);
            }
            await trx('vsq_customers').where({ id: customerId }).update({
                first_name: input.first_name === undefined ? customer.first_name : String(input.first_name || '').trim() || null,
                last_name: input.last_name === undefined ? customer.last_name : String(input.last_name || '').trim() || null,
                phone,
                phone_normalized: phoneNormalized,
                phone_verified_at: phoneNormalized === customer.phone_normalized ? customer.phone_verified_at : null,
                updated_at: new Date(),
                version: trx.raw('version + 1')
            });
            return await trx('vsq_customers')
                .select('id', 'public_id', 'email', 'phone', 'first_name', 'last_name', 'status', 'email_verified_at', 'phone_verified_at', 'created_at', 'updated_at')
                .where({ id: customerId })
                .first();
        });
    }

    static async changePassword(customerId: number, sessionPublicId: string, currentPassword: string, newPassword: string) {
        return knexInstance.transaction(async (trx) => {
            const credential = await trx('vsq_customer_credentials').where({ customer_id: customerId }).forUpdate().first();
            if (!credential || !(await bcrypt.compare(currentPassword, credential.password_hash))) {
                throw new CommerceAuthError('Current password is incorrect', 422);
            }
            const now = new Date();
            await trx('vsq_customer_credentials').where({ customer_id: customerId }).update({
                password_hash: await bcrypt.hash(newPassword, 12),
                password_changed_at: now,
                failed_login_count: 0,
                locked_until: null,
                updated_at: now
            });
            await trx('vsq_customer_sessions')
                .where({ customer_id: customerId })
                .whereNull('revoked_at')
                .whereNot({ public_id: sessionPublicId })
                .update({ revoked_at: now, revoked_reason: 'PASSWORD_CHANGED', updated_at: now });
        });
    }

    static async addresses(customerId: number) {
        return await knexInstance('vsq_customer_addresses')
            .select('*')
            .where({ customer_id: customerId })
            .whereNull('deleted_at')
            .orderBy('is_default_shipping', 'desc')
            .orderBy('id', 'desc');
    }

    static async saveAddress(customerId: number, input: Record<string, unknown>, publicId?: string) {
        return knexInstance.transaction(async (trx) => {
            const existing = publicId
                ? await trx('vsq_customer_addresses').where({ public_id: publicId, customer_id: customerId }).whereNull('deleted_at').forUpdate().first()
                : null;
            if (publicId && !existing) throw new CommerceAuthError('Address not found', 404);
            const now = new Date();
            const payload = {
                customer_id: customerId,
                type: String(input.type || existing?.type || 'SHIPPING').toUpperCase(),
                first_name: String(input.first_name || existing?.first_name || '').trim(),
                last_name: String(input.last_name || existing?.last_name || '').trim() || null,
                company: String(input.company || existing?.company || '').trim() || null,
                address_line_1: String(input.address_line_1 || existing?.address_line_1 || '').trim(),
                address_line_2: String(input.address_line_2 || existing?.address_line_2 || '').trim() || null,
                city: String(input.city || existing?.city || '').trim(),
                state: String(input.state || existing?.state || '').trim(),
                state_code: String(input.state_code || existing?.state_code || '').trim() || null,
                postcode: String(input.postcode || existing?.postcode || '').trim(),
                country: String(input.country || existing?.country || 'India').trim(),
                country_code: String(input.country_code || existing?.country_code || 'IN').trim().toUpperCase(),
                phone: String(input.phone || existing?.phone || '').trim() || null,
                validation_status: 'UNVERIFIED',
                updated_at: now
            };
            if (!payload.first_name || !payload.address_line_1 || !payload.city || !payload.state || !payload.postcode) {
                throw new CommerceAuthError('Address is incomplete', 422);
            }
            let addressId: number;
            if (existing) {
                addressId = Number(existing.id);
                await trx('vsq_customer_addresses').where({ id: addressId }).update(payload);
            } else {
                const [createdId] = await trx('vsq_customer_addresses').insert({
                    public_id: crypto.randomUUID(),
                    ...payload,
                    created_at: now
                });
                addressId = Number(createdId);
            }
            if (input.is_default_shipping) {
                await trx('vsq_customer_addresses').where({ customer_id: customerId }).whereNull('deleted_at').update({ is_default_shipping: false, updated_at: now });
                await trx('vsq_customer_addresses').where({ id: addressId }).update({ is_default_shipping: true, updated_at: now });
            }
            if (input.is_default_billing) {
                await trx('vsq_customer_addresses').where({ customer_id: customerId }).whereNull('deleted_at').update({ is_default_billing: false, updated_at: now });
                await trx('vsq_customer_addresses').where({ id: addressId }).update({ is_default_billing: true, updated_at: now });
            }
            return await trx('vsq_customer_addresses').where({ id: addressId }).first();
        });
    }

    static async deleteAddress(customerId: number, publicId: string) {
        const updated = await knexInstance('vsq_customer_addresses')
            .where({ customer_id: customerId, public_id: publicId })
            .whereNull('deleted_at')
            .update({ deleted_at: new Date(), is_default_shipping: false, is_default_billing: false, updated_at: new Date() });
        if (!updated) throw new CommerceAuthError('Address not found', 404);
    }

    static async wishlist(customerId: number) {
        const wishlist = await knexInstance('vsq_wishlists').where({ customer_id: customerId }).first();
        if (!wishlist) return [];
        return await knexInstance('vsq_wishlist_items as wi')
            .join('vsq_products as p', 'p.id', 'wi.product_id')
            .leftJoin('vsq_product_media as pm', function () {
                this.on('pm.product_id', '=', 'p.id').andOn('pm.position', '=', knexInstance.raw('0'));
            })
            .leftJoin('vsq_media_assets as ma', 'ma.id', 'pm.media_asset_id')
            .select('wi.id', 'wi.created_at', 'p.public_id as product_public_id', 'p.slug', 'p.title', 'ma.public_url as image_url')
            .where({ 'wi.wishlist_id': wishlist.id })
            .whereNull('p.deleted_at')
            .orderBy('wi.id', 'desc');
    }

    static async toggleWishlist(customerId: number, productPublicId: string) {
        return knexInstance.transaction(async (trx) => {
            let wishlist = await trx('vsq_wishlists').where({ customer_id: customerId }).first();
            if (!wishlist) {
                const [wishlistId] = await trx('vsq_wishlists').insert({
                    public_id: crypto.randomUUID(),
                    customer_id: customerId,
                    name: 'Favorites',
                    created_at: new Date(),
                    updated_at: new Date()
                });
                wishlist = { id: wishlistId };
            }
            const product = await trx('vsq_products').select('id').where({ public_id: productPublicId }).whereNull('deleted_at').first();
            if (!product) throw new CommerceAuthError('Product not found', 404);
            const item = await trx('vsq_wishlist_items').where({ wishlist_id: wishlist.id, product_id: product.id }).first();
            if (item) {
                await trx('vsq_wishlist_items').where({ id: item.id }).delete();
                return false;
            }
            await trx('vsq_wishlist_items').insert({ wishlist_id: wishlist.id, product_id: product.id, created_at: new Date() });
            return true;
        });
    }
}
