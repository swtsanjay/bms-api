import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import { S3Service } from '../../../../lib/Multer';

export default class FileController {
    static async upload(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            if (!req.file) {
                return Response.fail(res, 'No file uploaded', null, 400);
            }
            
            const fileName = `${Date.now()}-${Math.random()}.${req.file.mimetype.split('/')[1]}`;
            const fileUrl = await S3Service.uploadFile(req.file, fileName);
            
            response.data = { path: fileUrl };
            response.message = Message.dataFound.message;
            response.code = Message.dataFound.code;
            
            Response.success(res, response);
        } catch (error: any) {
            console.log(error);
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