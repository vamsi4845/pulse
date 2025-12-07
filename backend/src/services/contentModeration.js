import { RekognitionClient, StartContentModerationCommand, GetContentModerationCommand } from '@aws-sdk/client-rekognition';
import { s3Client, S3_BUCKET } from '../config/s3.js';
import { getObjectStream, uploadToS3 } from './s3Service.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { logInfo, logError } from '../utils/logger.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MIN_CONFIDENCE = parseFloat(process.env.REKOGNITION_MIN_CONFIDENCE || '30');
const POLL_INTERVAL = parseInt(process.env.REKOGNITION_POLL_INTERVAL || '5000');
const MAX_POLL_ATTEMPTS = parseInt(process.env.REKOGNITION_MAX_POLL_ATTEMPTS || '120');

const SUPPORTED_FORMATS = ['.mp4', '.mov', '.mpeg4'];
const SUPPORTED_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/mpeg'];

export async function moderateVideo(s3Key, videoId, userId, io) {
  let convertedS3Key = null;
  const tempDir = path.join(__dirname, '../../temp');
  const tempVideoPath = path.join(tempDir, `${videoId}_original`);
  const convertedVideoPath = path.join(tempDir, `${videoId}_converted.mp4`);

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (io && userId) {
      io.to(`user:${userId}`).emit('video:processing', {
        videoId: videoId.toString(),
        progress: 90,
        status: 'processing',
        message: 'Preparing video for analysis...',
      });
    }

    logInfo('Starting AWS Rekognition content moderation', { videoId, s3Key });

    const videoExtension = path.extname(s3Key).toLowerCase();
    const needsConversion = !SUPPORTED_FORMATS.includes(videoExtension);

    let videoS3Key = s3Key;

    if (needsConversion) {
      logInfo('Video format not supported by Rekognition, converting to MP4', {
        videoId,
        originalFormat: videoExtension,
      });

      if (io && userId) {
        io.to(`user:${userId}`).emit('video:processing', {
          videoId: videoId.toString(),
          progress: 91,
          status: 'processing',
          message: 'Converting video format...',
        });
      }

      const videoStream = await getObjectStream(s3Key);
      const writeStream = fs.createWriteStream(tempVideoPath);

      if (videoStream instanceof Readable || typeof videoStream.pipe === 'function') {
        await new Promise((resolve, reject) => {
          videoStream.pipe(writeStream);
          videoStream.on('end', () => {
            writeStream.end();
            resolve();
          });
          videoStream.on('error', reject);
          writeStream.on('error', reject);
        });
      } else if (videoStream && typeof videoStream.getReader === 'function') {
        const chunks = [];
        const reader = videoStream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(Buffer.from(value));
          }
          const buffer = Buffer.concat(chunks);
          writeStream.end(buffer);
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
        } catch (error) {
          reader.releaseLock();
          throw error;
        }
      } else {
        const chunks = [];
        for await (const chunk of videoStream) {
          chunks.push(Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        writeStream.end(buffer);
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }

      try {
        await execAsync(
          `ffmpeg -i "${tempVideoPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${convertedVideoPath}" -y`
        );
      } catch (ffmpegError) {
        logError('FFmpeg conversion error', ffmpegError);
        throw new Error('Video conversion failed. Please ensure ffmpeg is installed.');
      }

      if (!fs.existsSync(convertedVideoPath)) {
        throw new Error('Converted video file not created');
      }

      const convertedBuffer = fs.readFileSync(convertedVideoPath);
      convertedS3Key = `${s3Key}.converted.mp4`;
      
      await uploadToS3(convertedS3Key, convertedBuffer, 'video/mp4');
      videoS3Key = convertedS3Key;

      logInfo('Video converted and uploaded', { videoId, convertedS3Key });
    }

    if (io && userId) {
      io.to(`user:${userId}`).emit('video:processing', {
        videoId: videoId.toString(),
        progress: 92,
        status: 'processing',
        message: 'Starting content analysis...',
      });
    }

    const startCommand = new StartContentModerationCommand({
      Video: {
        S3Object: {
          Bucket: S3_BUCKET,
          Name: videoS3Key,
        },
      },
      MinConfidence: MIN_CONFIDENCE,
      NotificationChannel: process.env.REKOGNITION_SNS_TOPIC_ARN ? {
        RoleArn: process.env.REKOGNITION_ROLE_ARN,
        SNSTopicArn: process.env.REKOGNITION_SNS_TOPIC_ARN,
      } : undefined,
    });

    const startResponse = await rekognitionClient.send(startCommand);
    const jobId = startResponse.JobId;

    if (!jobId) {
      logError('Failed to start Rekognition job', { videoId });
      return 'safe';
    }

    logInfo('Rekognition job started', { videoId, jobId, videoS3Key });

    if (io && userId) {
      io.to(`user:${userId}`).emit('video:processing', {
        videoId: videoId.toString(),
        progress: 93,
        status: 'processing',
        message: 'Analyzing video content...',
      });
    }

    const moderationResult = await pollModerationJob(jobId, videoId, userId, io);

    if (!moderationResult) {
      logError('Moderation result is null - job may have failed or timed out', { videoId, jobId });
      return 'safe';
    }

    logInfo('Rekognition moderation result received', {
      videoId,
      jobId,
      hasModerationLabels: !!moderationResult.ModerationLabels,
      moderationLabelsCount: moderationResult.ModerationLabels?.length || 0,
      fullResult: JSON.stringify(moderationResult, null, 2),
    });

    if (moderationResult.ModerationLabels && moderationResult.ModerationLabels.length > 0) {
      const labelsWithDetails = moderationResult.ModerationLabels.map(label => ({
        name: label.ModerationLabel?.Name,
        confidence: label.ModerationLabel?.Confidence,
        parentName: label.ModerationLabel?.ParentName,
        timestamp: label.Timestamp,
      }));

      logInfo('Moderation labels found', {
        videoId,
        jobId,
        labels: labelsWithDetails,
        minConfidence: MIN_CONFIDENCE,
      });

      const hasExplicitContent = moderationResult.ModerationLabels.some(
        label => label.ModerationLabel && label.ModerationLabel.Confidence > MIN_CONFIDENCE
      );

      const flaggedLabels = moderationResult.ModerationLabels.filter(
        label => label.ModerationLabel && label.ModerationLabel.Confidence > MIN_CONFIDENCE
      );

      const sensitivityStatus = hasExplicitContent ? 'flagged' : 'safe';

      logInfo('Video moderation completed', {
        videoId,
        jobId,
        totalLabelsFound: moderationResult.ModerationLabels.length,
        flaggedLabelsCount: flaggedLabels.length,
        flaggedLabels: flaggedLabels.map(l => ({
          name: l.ModerationLabel?.Name,
          confidence: l.ModerationLabel?.Confidence,
        })),
        sensitivityStatus,
        minConfidenceThreshold: MIN_CONFIDENCE,
      });

      return sensitivityStatus;
    }

    logInfo('Video moderation completed - no moderation labels found', { 
      videoId, 
      jobId,
      moderationResultKeys: Object.keys(moderationResult || {}),
    });
    return 'safe';
  } catch (error) {
    logError('Content moderation error', error);
    
    if (error.message && error.message.includes('Unsupported codec/format')) {
      logError('Rekognition does not support this video format even after conversion', { videoId, s3Key });
    }
    
    return 'safe';
  } finally {
    try {
      if (convertedS3Key) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: convertedS3Key,
          });
          await s3Client.send(deleteCommand);
          logInfo('Cleaned up converted video from S3', { convertedS3Key });
        } catch (deleteError) {
          logError('Failed to delete converted video from S3', { convertedS3Key, deleteError });
        }
      }

      if (fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      if (fs.existsSync(convertedVideoPath)) {
        fs.unlinkSync(convertedVideoPath);
      }
    } catch (cleanupError) {
      logError('Cleanup error', cleanupError);
    }
  }
}

async function pollModerationJob(jobId, videoId, userId, io) {
  let attempts = 0;
  let lastProgress = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    try {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const getCommand = new GetContentModerationCommand({ JobId: jobId });
      const response = await rekognitionClient.send(getCommand);

      const status = response.JobStatus;

      if (status === 'SUCCEEDED') {
        logInfo('Rekognition job succeeded', {
          videoId,
          jobId,
          hasModerationLabels: !!response.ModerationLabels,
          moderationLabelsCount: response.ModerationLabels?.length || 0,
        });

        if (io && userId) {
          io.to(`user:${userId}`).emit('video:processing', {
            videoId: videoId.toString(),
            progress: 98,
            status: 'processing',
            message: 'Finalizing analysis...',
          });
        }
        return response;
      }

      if (status === 'FAILED') {
        logError('Rekognition job failed', {
          videoId,
          jobId,
          statusMessage: response.StatusMessage,
        });
        return null;
      }

      if (status === 'IN_PROGRESS') {
        const progress = Math.min(93 + Math.floor((attempts / MAX_POLL_ATTEMPTS) * 5), 97);
        
        if (progress !== lastProgress && io && userId) {
          io.to(`user:${userId}`).emit('video:processing', {
            videoId: videoId.toString(),
            progress,
            status: 'processing',
            message: 'Analyzing video content...',
          });
          lastProgress = progress;
        }
      }

      attempts++;
    } catch (error) {
      logError('Error polling Rekognition job', { videoId, jobId, error });
      attempts++;
      
      if (attempts >= MAX_POLL_ATTEMPTS) {
        return null;
      }
    }
  }

  logError('Rekognition job timeout', { videoId, jobId, attempts });
  return null;
}
