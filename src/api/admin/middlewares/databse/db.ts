import { Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
declare module 'express-serve-static-core' {
    interface Request {
        transaction?: null | Knex.Transaction;
    }
}

export async function createTransaction(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) {
    try {
        req.transaction = await knexInstance.transaction();
        next();
    } catch (error: any) {
        next(Response.createError({
            message: Message.internalServalError.message,
            code: Message.internalServalError.code,
            name: Message.internalServalError.name,
        }, error));
    }
}