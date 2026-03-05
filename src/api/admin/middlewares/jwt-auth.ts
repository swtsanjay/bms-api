import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Response from '../../../lib/api-response';
import config from '../../../config';

export const verifyJWT = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.fail(res, 'Unauthorized - No token provided', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secretKey || 'default_secret');
    // Attach user info to request
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return Response.fail(res, 'Unauthorized - Invalid or expired token', null, 401);
  }
};
