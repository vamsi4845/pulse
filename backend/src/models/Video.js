import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  s3Bucket: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    default: 0,
  },
  mimeType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading',
  },
  sensitivityStatus: {
    type: String,
    enum: ['safe', 'flagged', null],
    default: null,
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

videoSchema.index({ userId: 1 });
videoSchema.index({ organizationId: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ sensitivityStatus: 1 });
videoSchema.index({ createdAt: -1 });

export const Video = mongoose.model('Video', videoSchema);

