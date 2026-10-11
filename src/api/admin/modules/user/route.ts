import { Router } from 'express';
import UserController from './controller';
import { userChangePasswordValidation, userDeleteValidation, userSaveValidation } from '../../middlewares/form-validation/User';
import { createTransaction } from '../../middlewares/databse/db';
import { requireStaffRoles, STAFF_ROLES } from '../../middlewares/jwt-auth';
import type { Request, Response, NextFunction } from 'express';

function requireAdminOrOwnProfile(req: Request, res: Response, next: NextFunction) {
    if (req.staffUser?.user_type === 'ADMIN') return next();
    const body = req.body;
    const allowed = ['id', 'name', 'email', 'phone', 'user_type'];
    if (!req.staffUser || !body || typeof body !== 'object' || Array.isArray(body) ||
        Number(body.id) !== req.staffUser.id || body.user_type !== req.staffUser.user_type ||
        Object.keys(body).some((key) => !allowed.includes(key))) {
        return res.status(403).json({ success: false, message: 'Forbidden - User management requires an administrator', data: null });
    }
    // Non-admin staff may update only their own basic profile. All other
    // fields, including role and deletion state, are supplied by the server.
    req.body = {
        id: req.staffUser.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        user_type: req.staffUser.user_type
    };
    return next();
}

const appUserRoutes = Router();

appUserRoutes.get('/list', requireStaffRoles('ADMIN', 'EMPLOYEE', 'CHECKER'), UserController.list);
appUserRoutes.post('/save', requireAdminOrOwnProfile, createTransaction, userSaveValidation, UserController.updateProfile);
appUserRoutes.post('/create', requireStaffRoles('ADMIN'), createTransaction, userSaveValidation, UserController.createUser);
appUserRoutes.post('/delete', requireStaffRoles('ADMIN'), createTransaction, userDeleteValidation, UserController.delete);
appUserRoutes.post('/change-password', requireStaffRoles(...STAFF_ROLES), createTransaction, userChangePasswordValidation, UserController.changePassword);
export default appUserRoutes;
