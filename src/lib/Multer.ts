import multer, { StorageEngine, Multer, FileFilterCallback } from 'multer';
import { Request } from 'express';
import S3Service from './S3Service';

function multerUploader(useS3: boolean = false, multerFilter: ((req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void) | null = null): Multer {
    let multerStorage: StorageEngine;

    if (useS3) {
        multerStorage = multer.memoryStorage();
    } else {
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

    if (!multerFilter) {
        multerFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
            cb(null, true);
        };
    }

    const upload = multer({
        storage: multerStorage,
        fileFilter: multerFilter,
    });

    return upload;
}

export default multerUploader;
export { S3Service };