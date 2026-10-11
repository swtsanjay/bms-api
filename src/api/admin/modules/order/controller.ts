import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedOrderService from '../../../../shared-services/order';
import { checkedSalesmanAssignment, staffWorkflowFailure, StaffWorkflowError } from '../../../../shared-services/staff-assignment';

const salesmanOrderKeys = new Set(['id', 'client_id', 'status', 'payment_status', 'items']);
const salesmanItemKeys = new Set(['id', 'item_order', 'product_id', 'product_sizes_id', 'product_colors_id', 'product_images_id', 'quantity', 'price', 'status', 'payment_status']);

function assertDraftPayload(body: any) {
    if (body.status !== 'CREATED' || body.payment_status !== 'NOT_RECEIVED' ||
        !Array.isArray(body.items) || body.items.some((item: any) =>
            !item || typeof item !== 'object' || item.status !== 'CREATED' || item.payment_status !== 'NOT_RECEIVED')) {
        throw new StaffWorkflowError('Drafts cannot change production or payment status', 403);
    }
}

export default class OrderController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const query = req.staffUser?.user_type === 'SALES_MAN'
                ? { ...req.query, assigned_staff_id: req.staffUser.id }
                : { ...req.query };
            const { data, status, extra } = await SharedOrderService.list(query);
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
                response.qdata = { ...req.query, ...extra };
            }
            Response.success(res, response);
        } catch (error: any) {
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotSaved.message,
                    code: Message.dataNotSaved.code,
                    name: Message.dataNotSaved.name
                }, error)
            );
        }
    }
    static async details(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotFound.message,
            code: Message.dataNotFound.code
        };
        try {
            const { data, status } = await SharedOrderService.details({
                id: Number(req.params.id),
                ...(req.staffUser?.user_type === 'SALES_MAN' ? { assigned_staff_id: req.staffUser.id } : {})
            });
            if (!data) return res.status(404).json({ success: false, message: 'Order not found', data: null });
            if (status) {
                response.data = data;
                response.message = data ? Message.dataFound.message : Message.dataNotFound.message;
                response.code = data ? Message.dataFound.code : Message.dataNotFound.code;
            }
            Response.success(res, response);
        } catch (error: any) {
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotFound.message,
                    code: Message.dataNotFound.code,
                    name: Message.dataNotFound.name
                }, error)
            );
        }
    }
    static async save(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const actor = req.staffUser;
            if (!actor) throw new StaffWorkflowError('Staff authentication required', 401);
            const id = req.body.id === undefined ? null : Number(req.body.id);
            if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) throw new StaffWorkflowError('Invalid order id', 400);
            const existing = id ? await t('orders').where({ id }).forUpdate().first() : null;
            if (id && !existing) throw new StaffWorkflowError('Order not found', 404);
            const salesman = actor.user_type === 'SALES_MAN';
            if (salesman) {
                if (!existing || existing.assigned_staff_id !== actor.id || existing.workflow_state !== 'DRAFT') {
                    throw new StaffWorkflowError('Only your assigned draft may be edited', 403);
                }
                if (Number(req.body.client_id) !== Number(existing.client_id) ||
                    Object.keys(req.body).some((key) => !salesmanOrderKeys.has(key)) ||
                    req.body.items.some((item: any) => !item || typeof item !== 'object' ||
                        Array.isArray(item) || Object.keys(item).some((key) => !salesmanItemKeys.has(key)))) {
                    throw new StaffWorkflowError('Salesman may only prepare assigned draft items', 403);
                }
            } else if (existing && Object.hasOwn(req.body, 'assigned_staff_id')) {
                throw new StaffWorkflowError('Use the assignment action to reassign an order', 400);
            }
            const workflowState = existing?.workflow_state || req.body.workflow_state || 'FINALIZED';
            if (workflowState !== 'DRAFT' && workflowState !== 'FINALIZED') {
                throw new StaffWorkflowError('Invalid order workflow state', 400);
            }
            if (existing && req.body.workflow_state && req.body.workflow_state !== existing.workflow_state) {
                throw new StaffWorkflowError('Use the finalization action to finalize a draft', 403);
            }
            if (salesman || workflowState === 'DRAFT') assertDraftPayload(req.body);
            const assignedStaffId = existing
                ? existing.assigned_staff_id
                : Object.hasOwn(req.body, 'assigned_staff_id')
                    ? await checkedSalesmanAssignment(req.body.assigned_staff_id, t)
                    : null;
            const { data, status } = await SharedOrderService.save({
                id: id || undefined,
                client_id: req.body.client_id,
                user_id: existing?.user_id ?? actor.id,
                status: req.body.status,
                payment_status: req.body.payment_status,
                created_by: existing?.created_by || actor.id,
                assigned_staff_id: assignedStaffId,
                workflow_state: workflowState,
                items: req.body.items || []
            }, t);
            if (status) {
                response.data = data;
                response.message = Message.dataSaved.message;
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            await t.rollback();
            if (staffWorkflowFailure(res, error)) return;
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotSaved.message,
                    code: Message.dataNotSaved.code,
                    name: Message.dataNotSaved.name
                }, error)
            );
        }
    }

    static async assign(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0 || !Object.hasOwn(req.body, 'assigned_staff_id')) {
                throw new StaffWorkflowError('Order id and assignment are required', 400);
            }
            const existing = await t('orders').where({ id }).forUpdate().first();
            if (!existing) throw new StaffWorkflowError('Order not found', 404);
            const assignedStaffId = await checkedSalesmanAssignment(req.body.assigned_staff_id, t);
            await t('orders').where({ id }).update({ assigned_staff_id: assignedStaffId, updated_at: new Date() });
            await t.commit();
            return res.json({ success: true, message: 'Order assignment updated', data: { id, assigned_staff_id: assignedStaffId } });
        } catch (error) {
            await t.rollback();
            if (staffWorkflowFailure(res, error)) return;
            return res.status(500).json({ success: false, message: 'Unable to assign order', data: null });
        }
    }

    static async finalize(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const id = Number(req.params.id);
            if (!Number.isSafeInteger(id) || id <= 0) throw new StaffWorkflowError('Invalid order id', 400);
            const existing = await t('orders').where({ id }).forUpdate().first();
            if (!existing) throw new StaffWorkflowError('Order not found', 404);
            if (existing.workflow_state !== 'DRAFT') throw new StaffWorkflowError('Only drafts can be finalized', 409);
            await t('orders').where({ id }).update({ workflow_state: 'FINALIZED', updated_at: new Date() });
            await t.commit();
            return res.json({ success: true, message: 'Order finalized', data: { id, workflow_state: 'FINALIZED' } });
        } catch (error) {
            await t.rollback();
            if (staffWorkflowFailure(res, error)) return;
            return res.status(500).json({ success: false, message: 'Unable to finalize order', data: null });
        }
    }
}
