import type { Request, Response } from 'express';
import { CommerceReturnError, customerReturnContext, requestCustomerReturn, staffReturn, staffReturns, decideStaffReturn } from './service';

function fail(res: Response, error: unknown) {
    if (error instanceof CommerceReturnError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Commerce return request failed', error);
    return res.status(500).json({ success: false, message: 'Unable to process return request', data: null });
}

function pageValue(value: unknown, name: string, fallback: number, max: number) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || Number(value) > max) {
        throw new CommerceReturnError(`${name} must be a whole number from 1 to ${max}`, 422);
    }
    return Number(value);
}

export async function customerReturns(req: Request, res: Response) {
    try { return res.json({ success: true, data: await customerReturnContext(String(req.params.publicId), Number(req.commerceCustomer!.id)) }); }
    catch (error) { return fail(res, error); }
}

export async function createCustomerReturn(req: Request, res: Response) {
    try {
        const request = await requestCustomerReturn(String(req.params.publicId), Number(req.commerceCustomer!.id), req.body.items, req.body.reason_code, req.body.customer_note);
        return res.status(201).json({ success: true, message: 'Return request submitted for staff review', data: { request } });
    } catch (error) { return fail(res, error); }
}

export async function listStaffReturns(req: Request, res: Response) {
    try {
        const status = req.query.status;
        if (status !== undefined && (typeof status !== 'string' || !['REQUESTED', 'APPROVED', 'REJECTED'].includes(status))) {
            throw new CommerceReturnError('Invalid return status', 422);
        }
        return res.json({ success: true, data: await staffReturns(pageValue(req.query.page, 'Page', 1, 10000), pageValue(req.query.limit, 'Limit', 25, 100), status as string | undefined) });
    } catch (error) { return fail(res, error); }
}

export async function getStaffReturn(req: Request, res: Response) {
    try { return res.json({ success: true, data: await staffReturn(String(req.params.publicId)) }); }
    catch (error) { return fail(res, error); }
}

export async function reviewStaffReturn(req: Request, res: Response) {
    try {
        const result = await decideStaffReturn(String(req.params.publicId), req.body.decision, req.body.note, Number(req.staffUser!.id));
        return res.json({ success: true, message: 'Return decision recorded', data: result });
    } catch (error) { return fail(res, error); }
}
