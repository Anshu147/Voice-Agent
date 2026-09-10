import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhookEvent extends Document {
  eventId: string;
  eventType: string;
  provider: string;
  callId?: string;
  payload: Record<string, any>;
  receivedAt: Date;
  processedAt?: Date;
  status: 'received' | 'processed' | 'failed' | 'duplicate';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema: Schema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    provider: {
      type: String,
      default: 'generic',
      index: true,
      trim: true
    },
    callId: {
      type: String,
      index: true,
      trim: true
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'duplicate'],
      default: 'received',
      index: true
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const WebhookEvent = mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
