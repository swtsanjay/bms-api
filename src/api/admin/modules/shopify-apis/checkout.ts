import { Request as ExpressRequest } from 'express';
import SharedCustomerService from '../../../../shared-services/customer';
import SharedCustomerTokenService from '../../../../shared-services/customerToken';
import { Customer } from '../../../../types/customer';

export default class ShopifyCheckoutService {
    static async getLoggedInCustomer(req: ExpressRequest): Promise<Customer | null> {
        const customerId = Number((req as any).shopifyCustomer?.id);
        return customerId
            ? await SharedCustomerService.getCustomerById(customerId)
            : null;
    }

    static isValidForCheckout(customer: {
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
    }): boolean {
        return Boolean(
            customer.first_name?.trim()
            && customer.last_name?.trim()
            && SharedCustomerService.normalizePhone(customer.phone || null)?.length === 10
        );
    }

    static async getAccessTokenForRequest(req: ExpressRequest): Promise<string | null> {
        const jwtKey = (req as any).shopifyCustomerJwtKey as string | undefined;
        if (!jwtKey) {
            return null;
        }

        const customerToken = await SharedCustomerTokenService.getByJwtKey(jwtKey);
        return customerToken?.access_token || null;
    }

    static async getCheckoutContext(req: ExpressRequest) {
        const customer = await ShopifyCheckoutService.getLoggedInCustomer(req);
        const validForCheckout = customer
            ? ShopifyCheckoutService.isValidForCheckout(customer)
            : false;
        const accessToken = validForCheckout
            ? await ShopifyCheckoutService.getAccessTokenForRequest(req)
            : null;

        return {
            customer,
            valid_for_checkout: validForCheckout,
            access_token: accessToken
        };
    }
}
