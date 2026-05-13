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
}
