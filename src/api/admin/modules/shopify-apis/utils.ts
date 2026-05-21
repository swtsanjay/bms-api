import { Request as ExpressRequest } from 'express';
import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import { ShopifyTokenResponse } from './types';

export const getStringParam = (req: ExpressRequest, key: string): string | null => {
    const value = req.body?.[key] ?? req.query?.[key] ?? req.params?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const getCustomerGidFromIdToken = (data: ShopifyTokenResponse): string | null => {
    const idToken = data.id_token;
    if (typeof idToken !== 'string' || !idToken.trim()) {
        return null;
    }

    const decodedToken = jwt.decode(idToken);
    if (!isJwtPayload(decodedToken) || !decodedToken.sub) {
        return null;
    }

    return normalizeCustomerGid(decodedToken.sub);
};

export const getAccessTokenFromTokenResponse = (data: ShopifyTokenResponse): string | null => {
    const accessToken = data.access_token;
    return typeof accessToken === 'string' && accessToken.trim() ? accessToken.trim() : null;
};

export const getShopifyCustomerIdFromGid = (customerGid: string): string => {
    return customerGid.split('/').filter(Boolean).pop() || customerGid;
};

export const isGError = (error: unknown): error is GError => {
    return error instanceof Error && 'code' in error;
};

export const toShopifyError = (error: unknown, message: string): GError => {
    if (axios.isAxiosError(error)) {
        return Response.createError({
            message,
            code: error.response?.status || StatusCodes.INTERNAL_SERVER_ERROR,
            name: 'ShopifyApiError',
            data: (error.response?.data || null) as GTypeAll
        });
    }

    return Response.createError({
        message,
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        name: 'ShopifyApiError'
    });
};

const isJwtPayload = (decodedToken: string | JwtPayload | null): decodedToken is JwtPayload => {
    return typeof decodedToken === 'object' && decodedToken !== null;
};

const normalizeCustomerGid = (customerId: string | number): string => {
    const normalizedCustomerId = String(customerId);
    if (normalizedCustomerId.startsWith('gid://shopify/Customer/')) {
        return normalizedCustomerId;
    }

    return `gid://shopify/Customer/${normalizedCustomerId}`;
};
