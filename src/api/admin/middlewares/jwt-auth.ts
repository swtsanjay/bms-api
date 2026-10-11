import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import Response from '../../../lib/api-response';
import config from '../../../config';
import SharedUserService from '../../../shared-services/user';
import type { User } from '../../../types/user';

export const STAFF_TOKEN_TYPE = 'BMS_STAFF';
export const STAFF_TOKEN_AUDIENCE = 'bms-admin';

export const STAFF_ROLES = ['ADMIN', 'EMPLOYEE', 'CHECKER', 'SALES_MAN'] as const;
export type StaffRole = typeof STAFF_ROLES[number];

export function isStaffRole(role: unknown): role is StaffRole {
  return typeof role === 'string' && STAFF_ROLES.some((allowed) => allowed === role);
}

declare module 'express-serve-static-core' {
  interface Request {
    staffUser?: Pick<User, 'id' | 'email' | 'user_type'>;
  }
}

export const verifyJWT = async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) {
    return Response.fail(res, 'Unauthorized - No token provided', null, 401);
  }

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(match[1], config.jwt.secretKey, {
      audience: STAFF_TOKEN_AUDIENCE,
      algorithms: ['HS256']
    });
  } catch {
    return Response.fail(res, 'Unauthorized - Invalid or expired token', null, 401);
  }

  if (typeof decoded === 'string' || decoded.type !== STAFF_TOKEN_TYPE ||
      !Number.isSafeInteger(decoded.id) || decoded.id <= 0) {
    return Response.fail(res, 'Unauthorized - Invalid staff token', null, 401);
  }

  try {
    // The lookup excludes soft-deleted users. The database, rather than a JWT role claim,
    // is authoritative for current staff eligibility and permissions.
    const user = await SharedUserService.getActiveStaffById(decoded.id);
    if (!user || !isStaffRole(user.user_type)) {
      return Response.fail(res, 'Unauthorized - Staff account unavailable', null, 401);
    }
    req.staffUser = { id: user.id, email: user.email, user_type: user.user_type };
    (req as any).user = req.staffUser;
    return next();
  } catch (error) {
    return next(error);
  }
};

export function requireStaffRoles(...roles: readonly StaffRole[]) {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    if (!req.staffUser || !roles.includes(req.staffUser.user_type as StaffRole)) {
      return Response.fail(res, 'Forbidden - Insufficient staff role', null, 403);
    }
    return next();
  };
}
