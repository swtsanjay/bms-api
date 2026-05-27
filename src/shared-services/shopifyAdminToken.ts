import { Knex } from 'knex';
import { decryptData, encryptData } from '../lib/utils';
import { ShopifyAdminToken, ShopifyAdminTokenSaveData } from '../types/shopifyAdminToken';

export default class SharedShopifyAdminTokenService {
    static async save(
        data: ShopifyAdminTokenSaveData,
        trx: Knex.Transaction
    ): Promise<ShopifyAdminToken> {
        const shopDomain = SharedShopifyAdminTokenService.normalizeShopDomain(data.shop_domain);
        const payload = {
            shop_domain: shopDomain,
            encrypted_access_token: encryptData(data.access_token),
            scope: data.scope || null,
            expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
            updated_at: new Date()
        };

        const existingToken = await trx('shopify_admin_tokens')
            .where({ shop_domain: shopDomain })
            .first() as ShopifyAdminToken | undefined;

        if (existingToken) {
            await trx('shopify_admin_tokens')
                .where({ shop_domain: shopDomain })
                .update(payload);

            return await trx('shopify_admin_tokens')
                .where({ shop_domain: shopDomain })
                .first() as ShopifyAdminToken;
        }

        await trx('shopify_admin_tokens').insert({
            ...payload,
            created_at: new Date()
        });

        return await trx('shopify_admin_tokens')
            .where({ shop_domain: shopDomain })
            .first() as ShopifyAdminToken;
    }

    static async getByShopDomain(shopDomain: string): Promise<ShopifyAdminToken | null> {
        const token = await knexInstance('shopify_admin_tokens')
            .where({ shop_domain: SharedShopifyAdminTokenService.normalizeShopDomain(shopDomain) })
            .first() as ShopifyAdminToken | undefined;

        return token || null;
    }

    static async getDecryptedAccessToken(shopDomain: string): Promise<string | null> {
        const token = await SharedShopifyAdminTokenService.getByShopDomain(shopDomain);
        if (!token?.encrypted_access_token) {
            return null;
        }

        return decryptData(token.encrypted_access_token);
    }

    static normalizeShopDomain(shopDomain: string): string {
        return shopDomain
            .trim()
            .replace(/^https?:\/\//i, '')
            .replace(/\/+$/g, '');
    }
}
