import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import axios from 'axios';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import config from '../../../../config';
import SharedCustomerService from '../../../../shared-services/customer';
import SharedCustomerTokenService from '../../../../shared-services/customerToken';
import SharedShopifyCollectionService from '../../../../shared-services/shopifyCollection';
import ShopifyCheckoutService from './checkout';
import ShopifyCustomerAuthService from './customer-auth';
import ShopifyApisService from './service';
import SharedWalletService from '../../../../shared-services/wallet';
import { getAccessTokenFromTokenResponse, getCustomerGidFromIdToken, getStringParam, isGError } from './utils';

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

function getRouteParam(req: ExpressRequest, key: string): string {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : String(value || '');
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

function splitCustomerName(name: string | null) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return { first_name: null, last_name: null };
    }

    return {
        first_name: parts[0],
        last_name: parts.slice(1).join(' ') || null
    };
}

async function getLoggedInShopifyCustomer(req: ExpressRequest) {
    const customerId = Number((req as any).shopifyCustomer?.id);
    return customerId ? await SharedCustomerService.getCustomerById(customerId) : null;
}

export default class ShopifyApisController {
    static async relatedProducts(req: ExpressRequest, res: ExpressResponse) {
        try {
            const shopifyProductId = getStringParam(req, 'shopify_product_id');
            const products = await SharedShopifyCollectionService.getRelatedProducts(shopifyProductId || '');

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    products
                }
            });
        } catch (error: unknown) {
            console.log('Related Products API Error', error);
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not found'
            });
        }
    }

    static async collectionBySlug(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { category, products, extra } = await SharedShopifyCollectionService.getCollectionBySlug(
                getRouteParam(req, 'slug'),
                { ...req.query },
                true
            );

            return Response.success(res, {
                data: {
                    category,
                    products
                },
                message: 'Collection found',
                code: StatusCodes.OK,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(
                res,
                'Collection not found',
                null,
                StatusCodes.NOT_FOUND
            );
        }
    }

    static async storeShopifyAdminAccessToken(req: ExpressRequest, res: ExpressResponse) {
        const clientId = getStringParam(req, 'client_id') || config.shopify.adminApiClientId;
        const clientSecret = getStringParam(req, 'client_secret') || config.shopify.adminApiSecret;
        const grantType = getStringParam(req, 'grant_type') || 'client_credentials';
        const shopDomain = getStringParam(req, 'shop_domain') || config.shopify.adminShopDomain;

        if (!clientId || !clientSecret || !shopDomain) {
            return Response.fail(
                res,
                'client_id, client_secret and shop_domain are required',
                null,
                StatusCodes.BAD_REQUEST
            );
        }

        try {
            const token = await ShopifyApisService.fetchAndStoreAdminAccessToken({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: grantType,
                shop_domain: shopDomain
            });

            return Response.success(res, {
                data: token,
                message: 'Shopify Admin access token stored',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return Response.fail(
                res,
                'Failed to store Shopify Admin access token',
                null,
                StatusCodes.INTERNAL_SERVER_ERROR
            );
        }
    }

    static async customerOrders(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await ShopifyCheckoutService.getLoggedInCustomer(req);
            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            const ordersData = await ShopifyApisService.fetchCustomerOrders(
                customer.shopify_customer_id,
                ShopifyApisController.getPaginationLimit(req),
                ShopifyApisController.getQueryString(req, 'after')
            );

            return res.status(StatusCodes.OK).json({
                success: true,
                data: ordersData
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch customer orders'
            });
        }
    }

    static async checkoutValidity(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { customer, valid_for_checkout, access_token } = await ShopifyCheckoutService.getCheckoutContext(req);
            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    valid_for_checkout,
                    ...(access_token && { access_token })
                }
            });
        } catch (error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to verify checkout validity'
            });
        }
    }

    static async updateCheckoutCustomerDetails(req: ExpressRequest, res: ExpressResponse) {
        const firstName = ShopifyApisController.getBodyString(req, 'first_name')
            || ShopifyApisController.getBodyString(req, 'firstName');
        const lastName = ShopifyApisController.getBodyString(req, 'last_name')
            || ShopifyApisController.getBodyString(req, 'lastName');
        const phone = ShopifyApisController.getBodyString(req, 'phone')
            || ShopifyApisController.getBodyString(req, 'mobile_number')
            || ShopifyApisController.getBodyString(req, 'mobileNumber');
        const normalizedPhone = SharedCustomerService.normalizePhone(phone);

        if (!firstName || !lastName || !normalizedPhone) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                error: 'first_name, last_name and phone are required'
            });
        }

        try {
            const customer = await ShopifyCheckoutService.getLoggedInCustomer(req);
            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            const shopifyCustomer = await ShopifyApisService.updateCustomerProfile(
                customer.shopify_customer_id,
                {
                    firstName,
                    lastName,
                    phone: normalizedPhone
                }
            );

            if (!shopifyCustomer) {
                return res.status(StatusCodes.BAD_GATEWAY).json({
                    success: false,
                    error: 'Shopify customer update failed'
                });
            }

            const updatedCustomer = await knexInstance.transaction(async (trx: Knex.Transaction) => {
                return await SharedCustomerService.updateById(
                    customer.id,
                    {
                        first_name: shopifyCustomer.firstName ?? firstName,
                        last_name: shopifyCustomer.lastName ?? lastName,
                        phone: shopifyCustomer.phone ?? normalizedPhone,
                        updated_at: shopifyCustomer.updatedAt ? new Date(shopifyCustomer.updatedAt) : new Date()
                    },
                    trx
                );
            });
            const validForCheckout = updatedCustomer
                ? ShopifyCheckoutService.isValidForCheckout(updatedCustomer)
                : false;
            const accessToken = validForCheckout
                ? await ShopifyCheckoutService.getAccessTokenForRequest(req)
                : null;

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    customer: updatedCustomer,
                    valid_for_checkout: validForCheckout,
                    ...(accessToken && { access_token: accessToken })
                }
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to update customer details'
            });
        }
    }

    static async customerAccessToken(req: ExpressRequest, res: ExpressResponse) {
        const jwtKey = (req as any).shopifyCustomerJwtKey as string | undefined;

        if (!jwtKey) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        try {
            const customerToken = await SharedCustomerTokenService.getByJwtKey(jwtKey);
            if (!customerToken) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Access token not found'
                });
            }

            return res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    access_token: customerToken.access_token
                }
            });
        } catch (error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch access token'
            });
        }
    }

    private static getBodyString(req: ExpressRequest, key: string): string | null {
        const value = req.body?.[key];
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    private static getQueryString(req: ExpressRequest, key: string): string | null {
        const value = req.query?.[key];
        return typeof value === 'string' && value.trim() ? value.trim() : null;
    }

    private static getPaginationLimit(req: ExpressRequest): number {
        const limit = Number(req.query?.limit || req.query?.first || 20);
        if (!Number.isInteger(limit) || limit < 1) {
            return 20;
        }

        return Math.min(limit, 50);
    }

    static async customerDetails(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
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
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch customer details'
            });
        }
    }

    static async customerProfile(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            return Response.success(res, {
                data: customer,
                message: 'Customer profile found',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to fetch customer profile'
            });
        }
    }

    static async updateCustomerProfile(req: ExpressRequest, res: ExpressResponse) {
        try {
            const customer = await getLoggedInShopifyCustomer(req);

            if (!customer) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    error: 'Customer not found'
                });
            }

            const nameParts = splitCustomerName(stringValue(req.body.name));
            const updatedCustomer = await knexInstance.transaction(async (trx) => {
                return await SharedCustomerService.updateProfile(customer.id, {
                    first_name: nameParts.first_name,
                    last_name: nameParts.last_name,
                    email: stringValue(req.body.email),
                    phone: stringValue(req.body.phone),
                    note: stringValue(req.body.profile_notes) || stringValue(req.body.note)
                }, trx);
            });

            return Response.success(res, {
                data: updatedCustomer,
                message: 'Customer profile updated',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            if (isGError(error)) {
                return Response.fail(res, error);
            }

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Failed to update customer profile'
            });
        }
    }

    private static getCustomerGid(shopifyCustomerId: string) {
        if (shopifyCustomerId.startsWith('gid://shopify/Customer/')) {
            return shopifyCustomerId;
        }

        return `gid://shopify/Customer/${shopifyCustomerId}`;
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
        console.log('loginCustomerByShopifyToken', codeVerifier);
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
            console.log('Going to Exchange Token');
            const formData = new URLSearchParams();
            formData.append('grant_type', 'authorization_code');
            formData.append('client_id', config.shopify.clientId);
            formData.append('redirect_uri', config.shopify.redirectUri);
            formData.append('code', code);
            formData.append('code_verifier', codeVerifier);
            console.log('Form Data', formData.toString());
            const { data } = await ShopifyApisService.exchangeCodeForToken(formData);
            console.log('Exchange Code For Token', data);
            const accessToken = getAccessTokenFromTokenResponse(data);
            if (!accessToken) {
                return Response.fail(
                    res,
                    'Shopify access token not found',
                    null,
                    StatusCodes.BAD_GATEWAY
                );
            }
            
            const customerGid = getCustomerGidFromIdToken(data);

            const shopifyCustomer = customerGid
                ? await ShopifyApisService.fetchAdminCustomerById(customerGid)
                : null;

            console.log('shopifyCustomer', shopifyCustomer);
            if (!shopifyCustomer) {
                return Response.fail(
                    res,
                    'Shopify customer not found',
                    null,
                    StatusCodes.NOT_FOUND
                );
            }

            const loginData = await ShopifyCustomerAuthService.createLoginData(shopifyCustomer, accessToken);
            await knexInstance.transaction(async (trx) => {
                await SharedWalletService.ensureReferralCode('CUSTOMER', loginData.customer.id, trx);
                await SharedWalletService.applyCustomerReferralCode(
                    loginData.customer.id,
                    stringValue(req.body.referral_code) || stringValue(req.body.referralCode),
                    trx
                );
            });

            return Response.success(res, {
                data: loginData,
                message: 'Login successful',
                code: StatusCodes.OK,
                success: true
            });
        } catch (error: unknown) {
            console.log('Error while loginCustomerByShopifyToken', error);
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
