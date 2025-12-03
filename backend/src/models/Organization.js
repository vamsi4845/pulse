import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: true,
});

organizationSchema.index({ name: 1 });

export const Organization = mongoose.model('Organization', organizationSchema);

