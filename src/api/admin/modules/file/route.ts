import { Router } from 'express';
import Controller from './controller';
import multerUploader from '../../../../lib/Multer';

const fileRoutes = Router();
const upload = multerUploader(true);

fileRoutes.post('/upload', upload.single('file'), Controller.upload);

export default fileRoutes;