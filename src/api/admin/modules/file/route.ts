import { Router } from 'express';
import FileController from './controller';
import multerUploader from '../../../../lib/Multer';
import multer, { StorageEngine } from 'multer';

const appFileRoutes = Router();

// Configure multer storage to use uploads folder
const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const extension = file.mimetype.split('/')[1];
        cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`);
    }
});

const uploadMiddleware = multerUploader(uploadStorage);

appFileRoutes.post('/upload', uploadMiddleware.single('file'), FileController.upload);
export default appFileRoutes;