import { GenericVoiceAdapter } from '../adapters/GenericVoiceAdapter';
import { VoiceProviderAdapter } from '../adapters/VoiceProviderAdapter';
import { WebhookEvent } from '../models/WebhookEvent';
import { logger } from '../utils/logger';
import { callService } from './call.service';

const defaultAdapter = new GenericVoiceAdapter();

export class WebhookService {
  async processWebhook(
    body: any,
    adapter: VoiceProviderAdapter = defaultAdapter
  ): Promise<{ eventId: string; duplicate: boolean; callId: string }> {
    const parsed = adapter.parseWebhook(body);
    const { eventId, eventType, provider, callId, rawPayload } = parsed;

    logger.info(
      {
        event: 'webhook_received',
        eventId,
        callId,
        eventType,
        provider
      },
      'Incoming voice webhook received'
    );

    // 1. Idempotency Check: check if eventId was already processed
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent) {
      logger.warn(
        {
          event: 'duplicate_webhook_detected',
          eventId,
          callId,
          status: existingEvent.status
        },
        'Duplicate webhook event detected; skipping reprocessing'
      );

      return {
        eventId,
        duplicate: true,
        callId: existingEvent.callId || callId
      };
    }

    // 2. Persist WebhookEvent record
    const webhookEvent = new WebhookEvent({
      eventId,
      eventType,
      provider,
      callId,
      payload: rawPayload,
      receivedAt: new Date(),
      status: 'received'
    });

    await webhookEvent.save();

    try {
      // 3. Normalize and sync Call record
      const normalizedCallData = adapter.normalizeCallData(parsed);
      await callService.upsertCall(normalizedCallData as any);

      // 4. Mark WebhookEvent as processed
      webhookEvent.status = 'processed';
      webhookEvent.processedAt = new Date();
      await webhookEvent.save();

      logger.info(
        {
          event: 'webhook_processed_success',
          eventId,
          callId
        },
        'Webhook successfully processed and call record updated'
      );

      return {
        eventId,
        duplicate: false,
        callId
      };
    } catch (error: any) {
      webhookEvent.status = 'failed';
      webhookEvent.error = error.message;
      await webhookEvent.save();

      logger.error(
        {
          event: 'webhook_processing_failed',
          eventId,
          callId,
          error: error.message
        },
        'Failed to process webhook event'
      );

      throw error;
    }
  }
}

export const webhookService = new WebhookService();
