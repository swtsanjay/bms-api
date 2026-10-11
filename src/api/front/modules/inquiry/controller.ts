import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import { S3Service } from '../../../../lib/Multer';
import SharedInquiryService from '../../../../shared-services/inquiry';

export default class InquiryController {
    static async submit(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code,
            success: false
        };

        try {
            let referenceFileUrl: string | null = req.body.reference_file_url || null;
            if (req.file) {
                const extension = req.file.mimetype === 'application/pdf' ? 'pdf' : req.file.mimetype.split('/')[1];
                const fileName = `inquiries/${Date.now()}-${Math.random()}.${extension}`;
                referenceFileUrl = await S3Service.uploadFile(req.file, fileName);
            }

            const { data, status } = await SharedInquiryService.save({
                user_id: req.inquiryIdentity?.kind === 'legacy' ? req.inquiryIdentity.id : null,
                commerce_customer_id: req.inquiryIdentity?.kind === 'commerce' ? req.inquiryIdentity.id : null,
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
                response.success = true;
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

    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: [],
            message: Message.dataNotFound.message,
            code: Message.dataNotFound.code,
            success: false
        };

        try {
            const identity = req.inquiryIdentity;
            if (!identity || identity.kind === 'guest') {
                return res.status(401).json({ success: false, message: 'Authentication required', data: null });
            }
            const { data, status, extra } = await SharedInquiryService.list({
                ...req.query,
                user_id: identity.kind === 'legacy' ? identity.id : undefined,
                commerce_customer_id: identity.kind === 'commerce' ? identity.id : undefined,
                ownership_source: identity.kind === 'legacy' ? 'LEGACY_FRONT' : 'COMMERCE_CUSTOMER'
            });

            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
                response.qdata = { ...req.query, ...extra };
                response.success = true;
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

    static async details(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotFound.message,
            code: Message.dataNotFound.code,
            success: false
        };

        try {
            const identity = req.inquiryIdentity;
            if (!identity || identity.kind === 'guest') {
                return res.status(401).json({ success: false, message: 'Authentication required', data: null });
            }
            const { data, status } = await SharedInquiryService.details({
                id: Number(req.params.id),
                user_id: identity.kind === 'legacy' ? identity.id : undefined,
                commerce_customer_id: identity.kind === 'commerce' ? identity.id : undefined,
                ownership_source: identity.kind === 'legacy' ? 'LEGACY_FRONT' : 'COMMERCE_CUSTOMER'
            });

            if (!data) return res.status(404).json({ success: false, message: 'Inquiry not found', data: null });

            if (status && data) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
                response.success = true;
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
}
