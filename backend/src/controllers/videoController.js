import { Video } from '../models/Video.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { getPresignedUrl } from '../services/s3Service.js';
import { processVideo } from '../services/videoProcessor.js';
import { streamVideo } from '../services/streamingService.js';
import { filterByOrganization } from '../middleware/rbac.js';

export const uploadVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  const userId = req.user._id;
  const organizationId = req.user.organizationId;
  const { s3Key, s3Bucket } = req;

  if (!userId || !organizationId) {
    return next(new AppError('User information is incomplete', 400));
  }

  const video = await Video.create({
    filename: req.file.originalname,
    originalName: req.file.originalname,
    s3Key,
    s3Bucket,
    size: req.file.size,
    mimeType: req.file.mimetype,
    status: 'uploading',
    userId,
    organizationId,
  });

  await Video.findByIdAndUpdate(video._id, { status: 'processing' });

  processVideo(video._id, req.io).catch((error) => {
    console.error('Error starting video processing:', error);
  });

  res.status(201).json({
    success: true,
    data: { video },
  });
});

export const getVideos = asyncHandler(async (req, res) => {
  const { status, sensitivityStatus, page = 1, limit = 10 } = req.query;
  const { organizationId } = req.user;

  const query = filterByOrganization({}, organizationId);
  
  if (status) {
    query.status = status;
  }
  
  if (sensitivityStatus) {
    query.sensitivityStatus = sensitivityStatus;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const videos = await Video.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('userId', 'email');

  const total = await Video.countDocuments(query);

  res.json({
    success: true,
    data: {
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

export const getVideo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { organizationId } = req.user;

  const video = await Video.findOne({
    _id: id,
    organizationId,
  }).populate('userId', 'email');

  if (!video) {
    return next(new AppError('Video not found', 404));
  }

  const streamUrl = await getPresignedUrl(video.s3Key, 3600);

  res.json({
    success: true,
    data: {
      video: {
        ...video.toObject(),
        streamUrl,
      },
    },
  });
});

export const streamVideoHandler = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { organizationId } = req.user;
  const range = req.headers.range;

  const video = await Video.findOne({
    _id: id,
    organizationId,
  });

  if (!video) {
    return next(new AppError('Video not found', 404));
  }

  if (video.status !== 'completed') {
    return next(new AppError('Video is not ready for streaming', 400));
  }

  try {
    const streamData = await streamVideo(video.s3Key, range);

    const headers = {
      'Accept-Ranges': 'bytes',
      'Content-Length': streamData.chunksize,
      'Content-Type': streamData.contentType,
    };

    if (range) {
      headers['Content-Range'] = `bytes ${streamData.start}-${streamData.end}/${streamData.fileSize}`;
    }

    res.writeHead(streamData.statusCode, headers);

    const stream = streamData.stream;
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const chunkBuffer = range 
      ? buffer.slice(streamData.start, streamData.end + 1)
      : buffer;
    
    res.end(chunkBuffer);
  } catch (error) {
    next(new AppError('Error streaming video', 500));
  }
});

export const deleteVideo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { organizationId, role } = req.user;

  const video = await Video.findOne({
    _id: id,
    organizationId,
  });

  if (!video) {
    return next(new AppError('Video not found', 404));
  }

  if (role !== 'admin' && video.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to delete this video', 403));
  }

  await Video.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Video deleted successfully',
  });
});

