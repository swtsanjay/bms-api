import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedUserSellerDetailService from '../../../../shared-services/userSellerDetail';

export default class UserSellerDetailController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status, extra } = await SharedUserSellerDetailService.list({ ...req.query });
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
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedUserSellerDetailService.details({ id: req.params.id ? Number(req.params.id) : undefined, user_id: req.params.user_id ? Number(req.params.user_id) : undefined });
            if (status && data) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
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

    static async save(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const payload = {
                id: req.body.id,
                user_id: req.body.user_id,
                seller_name: req.body.seller_name,
                seller_tagline: req.body.seller_tagline,
                seller_address: req.body.seller_address,
                seller_phone: req.body.seller_phone,
                seller_email: req.body.seller_email,
                seller_website: req.body.seller_website,
                seller_pan: req.body.seller_pan,
                seller_gstin: req.body.seller_gstin,
                bank_name: req.body.bank_name,
                bank_branch: req.body.bank_branch,
                bank_account_no: req.body.bank_account_no,
                bank_ifsc: req.body.bank_ifsc,
                bank_upi_id: req.body.bank_upi_id,
                upi_qr_image_url: req.body.upi_qr_image_url,
                terms_conditions: req.body.terms_conditions,
                declaration: req.body.declaration,
                customer_signature_label: req.body.customer_signature_label,
                authorized_signatory_label: req.body.authorized_signatory_label,
                footer_note: req.body.footer_note,
                created_at: req.body.created_at,
                updated_at: req.body.updated_at
            };

            const { data, status } = await SharedUserSellerDetailService.saveByKeys(payload, t);
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
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

    static async delete(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const id = Number(req.body.id);
            const { data, status } = await SharedUserSellerDetailService.deleteById(id, t);
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
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

}
