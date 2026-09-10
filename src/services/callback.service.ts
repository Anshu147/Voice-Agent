import crypto from 'crypto';
import { GenericVoiceAdapter } from '../adapters/GenericVoiceAdapter';
import { VoiceProviderAdapter } from '../adapters/VoiceProviderAdapter';
import { WebhookEvent } from '../models/WebhookEvent';
import { logger } from '../utils/logger';
import { callService } from './call.service';

const defaultAdapter = new GenericVoiceAdapter();

export class CallbackService {
  async processCallback(
    body: any,
    adapter: VoiceProviderAdapter = defaultAdapter
  ): Promise<{ callId: string; status: string; isNewCall: boolean }> {
    const parsed = adapter.parseCallback(body);
    const { callId, status, duration, transcript, summary, recordingUrl, metadata, rawPayload, provider } = parsed;
    const eventId = parsed.eventId || `cb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    logger.info(
      {
        event: 'callback_received',
        callId,
        eventId,
        provider,
        status,
        hasTranscript: Boolean(transcript),
        hasSummary: Boolean(summary),
        duration
      },
      'Call completion callback received'
    );

    // Record WebhookEvent for callback audit
    const callbackEvent = new WebhookEvent({
      eventId,
      eventType: parsed.eventType || 'call.completed',
      provider,
      callId,
      payload: rawPayload,
      receivedAt: new Date(),
      status: 'received'
    });
    await callbackEvent.save();

    let isNewCall = false;

    try {
      const existingCall = await callService.getCallById(callId);

      const updatePayload: any = {
        provider: provider || 'generic',
        status: status || 'completed',
        endedAt: new Date(),
        rawLastEvent: rawPayload
      };

      if (duration !== undefined) updatePayload.duration = duration;
      if (transcript !== undefined) updatePayload.transcript = transcript;
      if (summary !== undefined) updatePayload.summary = summary;
      if (recordingUrl !== undefined) updatePayload.recordingUrl = recordingUrl;
      if (parsed.intent !== undefined) updatePayload.intent = parsed.intent;
      if (parsed.outcome !== undefined) updatePayload.outcome = parsed.outcome;
      if (metadata && Object.keys(metadata).length > 0) {
        updatePayload.metadata = existingCall?.metadata
          ? { ...existingCall.metadata, ...metadata }
          : metadata;
      }

      if (existingCall) {
        await callService.updateCall(callId, updatePayload);
        logger.info({ event: 'callback_call_updated', callId }, 'Existing call updated from callback');
      } else {
        isNewCall = true;
        await callService.createPendingCall({
          callId,
          ...updatePayload
        });
        logger.warn(
          { event: 'callback_call_not_found_created_pending', callId },
          'Call not found for callback; created pending call record'
        );
      }

      callbackEvent.status = 'processed';
      callbackEvent.processedAt = new Date();
      await callbackEvent.save();

      return {
        callId,
        status: 'processed',
        isNewCall
      };
    } catch (error: any) {
      callbackEvent.status = 'failed';
      callbackEvent.error = error.message;
      await callbackEvent.save();

      logger.error(
        {
          event: 'callback_processing_failed',
          callId,
          error: error.message
        },
        'Failed to process call callback'
      );

      throw error;
    }
  }
}

export const callbackService = new CallbackService();
