import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedInvoiceService from '../../../../shared-services/invoice';

export default class InvoiceController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status, extra } = await SharedInvoiceService.list({ ...req.query });
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
            const { data, status } = await SharedInvoiceService.details({ id: Number(req.query.id || req.params.id) });
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

    static async invoiceData(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotFound.message,
            code: Message.dataNotFound.code
        };
        try {
            const { data, status } = await SharedInvoiceService.invoiceData(Number(req.query.id || req.params.id));
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
            const createdBy = Number((req as any).user?.id || req.body.created_by);
            const { data, status } = await SharedInvoiceService.save({
                id: req.body.id,
                client_id: Number(req.body.client_id),
                seller_user_id: req.body.seller_user_id ? Number(req.body.seller_user_id) : null,
                order_id: req.body.order_id ? Number(req.body.order_id) : null,
                created_by: createdBy,
                invoice_no: req.body.invoice_no,
                invoice_date: req.body.invoice_date,
                challan_no: req.body.challan_no,
                challan_date: req.body.challan_date,
                eway_bill_no: req.body.eway_bill_no,
                transport_name: req.body.transport_name,
                transport_id: req.body.transport_id,
                place_of_supply: req.body.place_of_supply,
                currency: req.body.currency,
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
                subtotal: req.body.subtotal,
                tax_total: req.body.tax_total,
                discount_total: req.body.discount_total,
                round_off: req.body.round_off,
                total_amount: req.body.total_amount,
                amount_in_words: req.body.amount_in_words,
                notes: req.body.notes,
                terms_conditions: req.body.terms_conditions,
                declaration: req.body.declaration,
                customer_signature_label: req.body.customer_signature_label,
                authorized_signatory_label: req.body.authorized_signatory_label,
                footer_note: req.body.footer_note,
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
