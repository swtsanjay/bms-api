import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import { S3Service } from '../../../../lib/Multer';
import SharedInquiryService from '../../../../shared-services/inquiry';
import { InquiryStatus } from '../../../../types/inquiry';
import { checkedSalesmanAssignment, staffWorkflowFailure, StaffWorkflowError } from '../../../../shared-services/staff-assignment';

export default class InquiryController {
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
            const { data, status, extra } = await SharedInquiryService.list(query);
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
            const { data, status } = await SharedInquiryService.details({
                id: Number(req.params.id),
                ...(req.staffUser?.user_type === 'SALES_MAN' ? { assigned_staff_id: req.staffUser.id } : {})
            });
            if (!data) return res.status(404).json({ success: false, message: 'Inquiry not found', data: null });
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

    static async submit(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            let referenceFileUrl: string | null = req.body.reference_file_url || null;
            if (req.file) {
                const extension = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.split('/')[1];
                const fileName = `inquiries/${Date.now()}-${Math.random()}.${extension}`;
                referenceFileUrl = await S3Service.uploadFile(req.file, fileName);
            }

            const { data, status } = await SharedInquiryService.save({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                company_brand_name: req.body.company_brand_name,
                requirements: req.body.requirements,
                reference_file_url: referenceFileUrl
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

    static async updateStatus(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const inquiry = await t('inquiries').where({ id: Number(req.body.id) }).whereNull('deleted_at').forUpdate().first();
            if (!inquiry) throw new StaffWorkflowError('Inquiry not found', 404);
            if (req.staffUser?.user_type === 'SALES_MAN' && inquiry.assigned_staff_id !== req.staffUser.id) {
                throw new StaffWorkflowError('Inquiry is not assigned to you', 403);
            }
            const { data, status } = await SharedInquiryService.updateStatus(
                Number(req.body.id),
                req.body.status as InquiryStatus,
                t
            );
            if (status) {
                response.data = data;
                response.message = Message.dataSaved.message;
                response.code = Message.dataSaved.code;
            } else {
                response.message = Message.dataNotFound.message;
                response.code = Message.dataNotFound.code;
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
            const id = Number(req.body.id);
            if (!Number.isSafeInteger(id) || id <= 0 || !Object.hasOwn(req.body, 'assigned_staff_id')) {
                throw new StaffWorkflowError('Inquiry id and assignment are required', 400);
            }
            const inquiry = await t('inquiries').where({ id }).whereNull('deleted_at').forUpdate().first();
            if (!inquiry) throw new StaffWorkflowError('Inquiry not found', 404);
            const assignedStaffId = await checkedSalesmanAssignment(req.body.assigned_staff_id, t);
            await t('inquiries').where({ id }).update({ assigned_staff_id: assignedStaffId, updated_at: new Date() });
            await t.commit();
            return res.json({ success: true, message: 'Inquiry assignment updated', data: { id, assigned_staff_id: assignedStaffId } });
        } catch (error) {
            await t.rollback();
            if (staffWorkflowFailure(res, error)) return;
            return res.status(500).json({ success: false, message: 'Unable to assign inquiry', data: null });
        }
    }
}
