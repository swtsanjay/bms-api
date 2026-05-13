import { Router } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import Controller from './controller';
import { createTransaction } from '../../middlewares/databse/db';
import { inquirySaveValidation } from '../../middlewares/form-validation/Inquiry';

const allowedReferenceTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        cb(null, allowedReferenceTypes.includes(file.mimetype));
    }
});

const router = Router();

router.post('/submit', upload.single('reference'), createTransaction, inquirySaveValidation, Controller.submit);

export default router;
