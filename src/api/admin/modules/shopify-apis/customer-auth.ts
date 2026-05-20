import jwt from 'jsonwebtoken';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import config from '../../../../config';
import Response from '../../../../lib/api-response';
import SharedCustomerService, { CustomerSavePayload } from '../../../../shared-services/customer';
import { Customer, ShopifyCustomerMetafield } from '../../../../types/customer';
import { CustomerLoginData, ShopifyAdminCustomer } from './types';
import { getShopifyCustomerIdFromGid } from './utils';

export default class ShopifyCustomerAuthService {
    static async createLoginData(shopifyCustomer: ShopifyAdminCustomer): Promise<CustomerLoginData> {

        let phone: any = shopifyCustomer.phone?.trim();
        // if (!phone) {
        //     throw Response.createError({
        //         message: 'Shopify customer phone is required',
        //         code: StatusCodes.UNPROCESSABLE_ENTITY,
        //         name: 'ShopifyCustomerPhoneMissing'
        //     });
        // }
        if(!phone) {
            phone = null;
        }

        const customer = await knexInstance.transaction(async (trx: Knex.Transaction) => {
            return await SharedCustomerService.saveByPhone(
                ShopifyCustomerAuthService.buildCustomerPayload(shopifyCustomer, phone),
                trx
            );
        });

        return {
            customer,
            token: ShopifyCustomerAuthService.signCustomerToken(customer)
        };
    }

    private static buildCustomerPayload(
        shopifyCustomer: ShopifyAdminCustomer,
        phone: string
    ): CustomerSavePayload {
        return {
            shopify_customer_id: getShopifyCustomerIdFromGid(shopifyCustomer.id),
            email: shopifyCustomer.email ?? null,
            first_name: shopifyCustomer.firstName ?? null,
            last_name: shopifyCustomer.lastName ?? null,
            phone,
            created_at: shopifyCustomer.createdAt ? new Date(shopifyCustomer.createdAt) : null,
            updated_at: shopifyCustomer.updatedAt ? new Date(shopifyCustomer.updatedAt) : null
        };
    }

    private static mapMetafields(shopifyCustomer: ShopifyAdminCustomer): ShopifyCustomerMetafield[] {
        return shopifyCustomer.metafields?.edges
            ?.map((edge) => edge.node)
            .filter((node): node is ShopifyCustomerMetafield => Boolean(node)) || [];
    }

    private static signCustomerToken(customer: Customer): string {
        return jwt.sign(
            {
                id: customer.id,
                shopify_customer_id: customer.shopify_customer_id,
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                phone: customer.phone,
                state: customer.state,
                tags: customer.tags,
                verified_email: customer.verified_email,
                tax_exempt: customer.tax_exempt,
                note: customer.note,
                metafields: customer.metafields,
                type: 'CUSTOMER'
            },
            config.jwt.secretKey,
            { expiresIn: '24h' }
        );
    }

    private static stringifyJsonValue(value: unknown[] | null | undefined): string | null {
        if (!value || value.length === 0) {
            return null;
        }

        return JSON.stringify(value);
    }

    private static toNullableString(value: string | null | undefined): string | null {
        if (typeof value !== 'string' || !value.trim()) {
            return null;
        }

        return value;
    }
}
