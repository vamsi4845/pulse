import multer from 'multer';
import { uploadToS3, generateS3Key } from '../services/s3Service.js';
import { S3_BUCKET } from '../config/s3.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

export async function uploadToS3Middleware(req, res, next) {
  if (!req.file) {
    return next(new Error('No file uploaded'));
  }

  try {
    const userId = req.user._id;
    const organizationId = req.user.organizationId;
    
    if (!userId || !organizationId) {
      return next(new Error('User information is incomplete'));
    }

    const s3Key = generateS3Key(userId, organizationId, req.file.originalname);

    await uploadToS3(s3Key, req.file.buffer, req.file.mimetype);

    req.s3Key = s3Key;
    req.s3Bucket = S3_BUCKET;
    next();
  } catch (error) {
    next(error);
  }
}

