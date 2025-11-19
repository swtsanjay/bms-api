import multer, { StorageEngine, FileFilterCallback } from 'multer';
import { Request } from 'express';

export default function () {
    const multerStorage: StorageEngine = multer.diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
            cb(null, 'public');
        },

        filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
            cb(null, `${Date.now()}${Math.random()}.${file.mimetype.split('/')[1]}`);
        }
    });

    const multerFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // if (file.mimetype.split('/')[1] === 'pdf') {
        cb(null, true);
        // } else {
        //     cb(new Error('Not a pdf file'), false);
        // }
    };

    const upload = multer({
        storage: multerStorage,
        fileFilter: multerFilter
    });

    return upload;
}
