import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedUserService from '../../../../shared-services/user';
import config from '../../../../config';

export default class AuthController {
  static async login(req: ExpressRequest, res: ExpressResponse) {
    const { email, password } = req.body;
    try {
      if (!email || !password) {
        return Response.fail(res, 'Email and password are required', null, 400);
      }

      // Find the user by email
      const user = await SharedUserService.getUserBy(email, 'email');
      console.log('User found:', user);

      if (!user) {
        return Response.fail(res, 'Invalid credentials', null, 401);
      }

      // Verify password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password || '');

      if (!isValidPassword && false) {
        return Response.fail(res, 'Invalid credentials2', null, 401);
      }

      // Generate JWT Token
      const jwtSecret = config.jwt.secretKey || 'default_secret'; // In production, never use default secret
      const token = jwt.sign(
        { id: user.id, email: user.email, user_type: user.user_type },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Removing password from user object before sending response
      delete user.password;

      Response.success(res, {
        data: {
          user,
          token
        },
        message: 'Login successful',
        code: 200,
        success: true
      } as any);
    } catch (error: any) {
      console.error('Error during login', error);
      Response.fail(res, 'Internal server error', null, 500);
    }
  }
}
