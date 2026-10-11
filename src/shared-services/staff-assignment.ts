import type { Knex } from 'knex';

export class StaffWorkflowError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
    }
}

export async function checkedSalesmanAssignment(value: unknown, trx: Knex.Transaction): Promise<number | null> {
    if (value === null) return null;
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new StaffWorkflowError('Select an active salesman or clear the assignment', 400);
    }
    const user = await trx('users').select('id').where({ id, user_type: 'SALES_MAN' }).whereNull('deleted_at').first();
    if (!user) throw new StaffWorkflowError('Assigned salesman is unavailable', 400);
    return id;
}

export function staffWorkflowFailure(res: import('express').Response, error: unknown): boolean {
    if (!(error instanceof StaffWorkflowError)) return false;
    res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    return true;
}
