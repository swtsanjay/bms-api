import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import axios from 'axios';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import config from '../../../../config';
import SharedCustomerService from '../../../../shared-services/customer';
import ShopifyCustomerAuthService from './customer-auth';
import ShopifyApisService from './service';
import { getCustomerGidFromIdToken, getStringParam, isGError } from './utils';

type CustomerAddressBody = {
    first_name?: unknown;
    firstName?: unknown;
    last_name?: unknown;
    lastName?: unknown;
    company?: unknown;
    address1?: unknown;
    address2?: unknown;
    city?: unknown;
    province_code?: unknown;
    provinceCode?: unknown;
    country_code?: unknown;
    countryCode?: unknown;
    zip?: unknown;
    phone?: unknown;
    set_as_default?: unknown;
    setAsDefault?: unknown;
    address_id?: unknown;
    addressId?: unknown;
};

function stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function boolValue(value: unknown): boolean {
    return value === true || value === 'true' || value === 'on';
}

function getAddressId(req: ExpressRequest): string | null {
    return stringValue((req.body as CustomerAddressBody).address_id)
        || stringValue((req.body as CustomerAddressBody).addressId);
}

function buildShopifyAddressInput(body: CustomerAddressBody) {
    return {
        firstName: stringValue(body.firstName) || stringValue(body.first_name),
        lastName: stringValue(body.lastName) || stringValue(body.last_name),
        company: stringValue(body.company),
        address1: stringValue(body.address1),
        address2: stringValue(body.address2),
        city: stringValue(body.city),
        provinceCode: stringValue(body.provinceCode) || stringValue(body.province_code),
        countryCode: stringValue(body.countryCode) || stringValue(body.country_code) || 'IN',
        zip: stringValue(body.zip),
        phone: stringValue(body.phone)
    };
}

async function getLoggedInShopifyCustomer(req: ExpressRequest) {
    const customerId = Number((req as any).shopifyCustomer?.id);
    return customerId ? await SharedCustomerService.getCustomerById(customerId) : null;
}

export default class ShopifyApisController {
    static async customerDetails(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            const shopifyCustomer = await ShopifyApisService.fetchAdminCustomerByLegacyId(
                customer.shopify_customer_id
            );

            return Response.success(res, {
                data: shopifyCustomer || customer,
                message: 'Customer details found',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            return Response.fail(res, 'Failed to fetch customer details', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async customerAddresses(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            const shopifyCustomer = await ShopifyApisService.fetchAdminCustomerByLegacyId(
                customer.shopify_customer_id
            );

            return Response.success(res, {
                data: {
                    addresses: shopifyCustomer?.addresses || [],
                    defaultAddress: shopifyCustomer?.defaultAddress || null
                },
                message: 'Customer addresses found',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            return Response.fail(res, 'Failed to fetch customer addresses', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async createCustomerAddress(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            const address = await ShopifyApisService.createCustomerAddress(
                customer.shopify_customer_id,
                buildShopifyAddressInput(req.body),
                boolValue((req.body as CustomerAddressBody).setAsDefault || (req.body as CustomerAddressBody).set_as_default)
            );

            return Response.success(res, {
                data: address,
                message: 'Customer address created',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(res, 'Failed to create customer address', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async updateCustomerAddress(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);
            const addressId = getAddressId(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            if (!addressId) {
                return Response.fail(res, 'addressId is required', null, StatusCodes.BAD_REQUEST);
            }

            const address = await ShopifyApisService.updateCustomerAddress(
                customer.shopify_customer_id,
                addressId,
                buildShopifyAddressInput(req.body),
                boolValue((req.body as CustomerAddressBody).setAsDefault || (req.body as CustomerAddressBody).set_as_default)
            );

            return Response.success(res, {
                data: address,
                message: 'Customer address updated',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(res, 'Failed to update customer address', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async deleteCustomerAddress(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);
            const addressId = getAddressId(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            if (!addressId) {
                return Response.fail(res, 'addressId is required', null, StatusCodes.BAD_REQUEST);
            }

            const deletedAddressId = await ShopifyApisService.deleteCustomerAddress(
                customer.shopify_customer_id,
                addressId
            );

            return Response.success(res, {
                data: { deletedAddressId },
                message: 'Customer address deleted',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(res, 'Failed to delete customer address', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async setDefaultCustomerAddress(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);
            const addressId = getAddressId(req);

            if (!customer) {
                return Response.fail(res, 'Customer not found', null, StatusCodes.NOT_FOUND);
            }

            if (!addressId) {
                return Response.fail(res, 'addressId is required', null, StatusCodes.BAD_REQUEST);
            }

            await ShopifyApisService.setDefaultCustomerAddress(
                customer.shopify_customer_id,
                addressId
            );

            return Response.success(res, {
                data: { addressId },
                message: 'Default customer address updated',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(res, 'Failed to set default customer address', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async loginCustomerByShopifyToken(req: ExpressRequest, res: ExpressResponse) {
        const code = getStringParam(req, 'code');
        const codeVerifier = getStringParam(req, 'code_verifier') || getStringParam(req, 'codeVerifier');

        if (!code || !codeVerifier) {
            return Response.fail(
                res,
                'code and code_verifier are required',
                null,
                StatusCodes.BAD_REQUEST
            );
        }

        if (!config.shopify.tokenUrl || !config.shopify.clientId || !config.shopify.redirectUri) {
            return Response.fail(
                res,
                'Shopify configuration is missing',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }

        try {
            const formData = new URLSearchParams();
            formData.append('grant_type', 'authorization_code');
            formData.append('client_id', config.shopify.clientId);
            formData.append('redirect_uri', config.shopify.redirectUri);
            formData.append('code', code);
            formData.append('code_verifier', codeVerifier);

            const { data } = await ShopifyApisService.exchangeCodeForToken(formData);
            const customerGid = getCustomerGidFromIdToken(data);
            const shopifyCustomer = customerGid
                ? await ShopifyApisService.fetchAdminCustomerById(customerGid)
                : null;

            if (!shopifyCustomer) {
                return Response.fail(
                    res,
                    'Shopify customer not found',
                    null,
                    StatusCodes.NOT_FOUND
                );
            }

            const loginData = await ShopifyCustomerAuthService.createLoginData(shopifyCustomer);

            return Response.success(res, {
                data: loginData,
                message: 'Login successful',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            if (axios.isAxiosError(error)) {
                const statusCode = error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR;
                const errorData = error.response?.data || null;
                return Response.fail(
                    res,
                    'Shopify token exchange failed',
                    errorData,
                    statusCode
                );
            }

            return Response.fail(
                res,
                'Shopify login failed',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }
}
