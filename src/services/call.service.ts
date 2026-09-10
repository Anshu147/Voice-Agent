import { Call, ICall } from '../models/Call';
import { logger } from '../utils/logger';

export class CallService {
  async getCallById(callId: string): Promise<ICall | null> {
    return Call.findOne({ callId });
  }

  async upsertCall(callData: Partial<ICall>): Promise<ICall> {
    if (!callData.callId) {
      throw new Error('callId is required to upsert call record');
    }

    const filter = { callId: callData.callId };
    const update: any = {
      $set: {},
      $setOnInsert: {
        createdAt: new Date()
      }
    };

    // Filter out undefined keys to prevent erasing existing values
    Object.entries(callData).forEach(([key, value]) => {
      if (value !== undefined && key !== '_id' && key !== 'createdAt') {
        update.$set[key] = value;
      }
    });

    // If startedAt was not set and status is started/in-progress
    if (
      !callData.startedAt &&
      (callData.status === 'started' || callData.status === 'in-progress')
    ) {
      update.$setOnInsert.startedAt = new Date();
    }

    const call = await Call.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true
    });

    logger.debug({ event: 'call_upserted', callId: call.callId, status: call.status }, 'Call record upserted');
    return call;
  }

  async updateCall(callId: string, updateData: Partial<ICall>): Promise<ICall | null> {
    const cleanUpdate: any = {};
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined && key !== '_id') {
        cleanUpdate[key] = value;
      }
    });

    const call = await Call.findOneAndUpdate(
      { callId },
      { $set: cleanUpdate },
      { new: true, runValidators: true }
    );

    return call;
  }

  async createPendingCall(callData: Partial<ICall>): Promise<ICall> {
    const newCall = new Call({
      ...callData,
      status: callData.status || 'pending',
      direction: callData.direction || 'unknown'
    });

    const saved = await newCall.save();
    logger.info(
      { event: 'pending_call_created', callId: saved.callId },
      'Created pending call record from callback for missing callId'
    );
    return saved;
  }
}

export const callService = new CallService();
