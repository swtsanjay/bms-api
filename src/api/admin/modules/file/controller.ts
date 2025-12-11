import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';

export default class FileController {
    static async upload(req: ExpressRequest, res: ExpressResponse): Promise<void> {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            if (!req.file) {
                response.message = 'No file provided';
                response.code = 400;
                Response.fail(res, response.message);
                return;
            }
            
            // File uploaded successfully
            response.data = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                destination: req.file.destination
            };
            response.message = Message.dataFound.message;
            response.code = Message.dataFound.code;
            
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
}