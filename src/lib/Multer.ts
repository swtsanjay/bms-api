import multer, { StorageEngine, Multer, FileFilterCallback } from 'multer';
import { Request } from 'express';

function multerUploader(multerStorage: StorageEngine | null = null, multerFilter: ((req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void) | null = null): Multer {
    // Setting default storage to diskStorage if none provided
    if (!multerStorage) {
        multerStorage = multer.diskStorage({
            destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
                cb(null, 'public');
            },
            filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
                const extension = file.mimetype.split('/')[1];
                cb(null, `${Date.now()}${Math.random()}.${extension}`);
            },
        });
    }

    // Set default file filter to allow all files if none provided
    if (!multerFilter) {
        multerFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
            // if (file.mimetype.split('/')[1] === 'pdf') {
            cb(null, true);
            // } else {
            //     cb(new Error('Not a PDF file'), false);
            // }
        };
    }

    // Create and return Multer instance
    const upload = multer({
        storage: multerStorage,
        fileFilter: multerFilter,
    });

    return upload;
}

export default multerUploader;