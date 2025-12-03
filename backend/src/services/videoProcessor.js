import { Video } from '../models/Video.js';
import { logInfo, logError } from '../utils/logger.js';

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

    const processingTime = 5000 + Math.random() * 10000;
    const steps = 10;
    const stepTime = processingTime / steps;

    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepTime));
      
      const progress = Math.round((i / steps) * 100);
      
      await Video.findByIdAndUpdate(videoId, {
        processingProgress: progress,
      });

      io.to(`user:${video.userId}`).emit('video:processing', {
        videoId: video._id.toString(),
        progress,
        status: 'processing',
      });
    }

    const sensitivityStatus = Math.random() < 0.7 ? 'safe' : 'flagged';

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

