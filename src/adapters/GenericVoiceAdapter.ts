import crypto from 'crypto';
import {
  NormalizedCallbackEvent,
  NormalizedCallData,
  NormalizedWebhookEvent,
  VoiceProviderAdapter
} from './VoiceProviderAdapter';

export class GenericVoiceAdapter implements VoiceProviderAdapter {
  readonly providerName = 'generic';

  /**
   * Signature verification abstraction for generic provider.
   * Can be extended for HMAC-SHA256 signature checking or Bearer token matching.
   */
  verifySignature(
    _rawBody: string | Buffer,
    headers: Record<string, any>,
    secret?: string
  ): boolean {
    if (!secret) return true;

    // Check Authorization Bearer header
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (match && match[1] === secret) {
        return true;
      }
    }

    // Check optional custom header x-webhook-secret
    const customSecret = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
    if (customSecret && customSecret === secret) {
      return true;
    }

    // Check optional HMAC signature header x-webhook-signature
    const signature = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
    if (signature && _rawBody) {
      const hmac = crypto.createHmac('sha256', secret);
      const computed = hmac.update(typeof _rawBody === 'string' ? _rawBody : _rawBody.toString('utf-8')).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed))) {
        return true;
      }
    }

    return false;
  }

  parseWebhook(body: any): NormalizedWebhookEvent {
    const eventId = body.eventId || `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const eventType = body.event || body.eventType || 'call.event';
    const callObj = body.call || {};
    const callId = callObj.callId || body.callId || `call_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    const direction: 'inbound' | 'outbound' | 'unknown' =
      callObj.direction === 'inbound' || callObj.direction === 'outbound'
        ? callObj.direction
        : 'unknown';

    return {
      eventId,
      eventType,
      provider: body.provider || this.providerName,
      callId,
      timestamp,
      callData: {
        callId,
        provider: body.provider || this.providerName,
        direction,
        from: callObj.from,
        to: callObj.to,
        status: callObj.status || body.status || 'started',
        startedAt: callObj.startedAt ? new Date(callObj.startedAt) : undefined,
        answeredAt: callObj.answeredAt ? new Date(callObj.answeredAt) : undefined,
        endedAt: callObj.endedAt ? new Date(callObj.endedAt) : undefined,
        duration: callObj.duration ?? body.duration,
        transcript: callObj.transcript ?? body.transcript,
        summary: callObj.summary ?? body.summary,
        recordingUrl: callObj.recordingUrl ?? body.recordingUrl,
        intent: callObj.intent ?? body.intent,
        outcome: callObj.outcome ?? body.outcome,
        metadata: { ...(callObj.metadata || {}), ...(body.data || {}) },
        rawLastEvent: body
      },
      rawPayload: body
    };
  }

  parseCallback(body: any): NormalizedCallbackEvent {
    const callId = body.callId;
    const eventType = body.event || body.eventType || 'call.completed';

    return {
      eventId: body.eventId,
      eventType,
      provider: body.provider || this.providerName,
      callId,
      status: body.status || 'completed',
      duration: body.duration,
      transcript: body.transcript,
      summary: body.summary,
      recordingUrl: body.recordingUrl,
      intent: body.intent,
      outcome: body.outcome,
      metadata: body.metadata || body.data || {},
      rawPayload: body
    };
  }

  normalizeCallData(
    event: NormalizedWebhookEvent | NormalizedCallbackEvent
  ): Partial<NormalizedCallData> {
    if ('callData' in event && event.callData) {
      return event.callData;
    }

    const callback = event as NormalizedCallbackEvent;
    return {
      callId: callback.callId,
      provider: callback.provider,
      status: callback.status || 'completed',
      duration: callback.duration,
      transcript: callback.transcript,
      summary: callback.summary,
      recordingUrl: callback.recordingUrl,
      intent: callback.intent,
      outcome: callback.outcome,
      metadata: callback.metadata,
      rawLastEvent: callback.rawPayload
    };
  }
}
