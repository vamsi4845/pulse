import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requireMultiTenant } from '../middleware/rbac.js';
import { upload, uploadToS3Middleware } from '../middleware/upload.js';
import {
  uploadVideo,
  getVideos,
  getVideo,
  streamVideoHandler,
  deleteVideo,
} from '../controllers/videoController.js';
import { asyncHandler } from '../utils/errors.js';

const router = express.Router();

router.use(authenticate);
router.use(requireMultiTenant);

router.post(
  '/upload',
  requireRole('editor', 'admin'),
  upload.single('video'),
  uploadToS3Middleware,
  asyncHandler(uploadVideo)
);

router.get('/', asyncHandler(getVideos));
router.get('/:id', asyncHandler(getVideo));
router.get('/:id/stream', asyncHandler(streamVideoHandler));
router.delete('/:id', requireRole('editor', 'admin'), asyncHandler(deleteVideo));

export default router;

