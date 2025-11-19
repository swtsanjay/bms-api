import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { validationResult } from 'express-validator';
import { Message } from '../../../../lib/Messages';
import Response from '../../../../lib/api-response';

export function checkFormValidations(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        next(Response.createError({
            message: Message.formValidationError.message,
            code: Message.formValidationError.code,
            name: Message.formValidationError.name,
            extra: errors.array({ onlyFirstError: true })
        }));
    } else {
        next();
    }
}
