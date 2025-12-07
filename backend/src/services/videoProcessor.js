import { Video } from '../models/Video.js';
import { logInfo, logError } from '../utils/logger.js';
import { moderateVideo } from './contentModeration.js';

export async function processVideo(videoId, io) {
  try {
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    await Video.findByIdAndUpdate(videoId, {
      status: 'processing',
      processingProgress: 0,
    });

    io.to(`user:${video.userId}`).emit('video:processing', {
      videoId: video._id.toString(),
      progress: 0,
      status: 'processing',
    });

    const processingSteps = 8;
    
    for (let i = 1; i <= processingSteps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const progress = Math.round((i / processingSteps) * 80);
      
      await Video.findByIdAndUpdate(videoId, {
        processingProgress: progress,
      });

      io.to(`user:${video.userId}`).emit('video:processing', {
        videoId: video._id.toString(),
        progress,
        status: 'processing',
      });
    }

    io.to(`user:${video.userId}`).emit('video:processing', {
      videoId: video._id.toString(),
      progress: 85,
      status: 'processing',
      message: 'Analyzing content...',
    });

    const sensitivityStatus = await moderateVideo(video.s3Key, video._id.toString(), video.userId.toString(), io);

    await Video.findByIdAndUpdate(videoId, {
      status: 'completed',
      sensitivityStatus,
      processingProgress: 100,
    });

    io.to(`user:${video.userId}`).emit('video:completed', {
      videoId: video._id.toString(),
      status: 'completed',
      sensitivityStatus,
    });

    logInfo(`Video ${videoId} processed successfully`, { sensitivityStatus });
  } catch (error) {
    logError(`Error processing video ${videoId}`, error);
    
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
    });

    const video = await Video.findById(videoId);
    if (video && io) {
      io.to(`user:${video.userId}`).emit('video:failed', {
        videoId: video._id.toString(),
        status: 'failed',
      });
    }
  }
}

