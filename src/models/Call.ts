import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  callId: string;
  provider: string;
  direction: 'inbound' | 'outbound' | 'unknown';
  from?: string;
  to?: string;
  status: string;
  startedAt?: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  intent?: string;
  outcome?: string;
  metadata?: Record<string, any>;
  rawLastEvent?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema: Schema = new Schema(
  {
    callId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    provider: {
      type: String,
      default: 'generic',
      index: true,
      trim: true
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound', 'unknown'],
      default: 'unknown'
    },
    from: {
      type: String,
      trim: true
    },
    to: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      default: 'unknown',
      index: true,
      trim: true
    },
    startedAt: {
      type: Date
    },
    answeredAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    duration: {
      type: Number,
      min: 0
    },
    transcript: {
      type: String
    },
    summary: {
      type: String
    },
    recordingUrl: {
      type: String
    },
    intent: {
      type: String
    },
    outcome: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    rawLastEvent: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Call = mongoose.model<ICall>('Call', CallSchema);
