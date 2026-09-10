import crypto from 'crypto';
import {
  NormalizedCallbackEvent,
  NormalizedCallData,
  NormalizedWebhookEvent,
  VoiceProviderAdapter
} from './VoiceProviderAdapter';

export class RetellAdapter implements VoiceProviderAdapter {
  readonly providerName = 'retell';

  /**
   * Retell signature verification.
   * Checks `x-retell-signature` HMAC-SHA256 or Authorization Bearer header.
   */
  verifySignature(
    rawBody: string | Buffer,
    headers: Record<string, any>,
    secret?: string
  ): boolean {
    if (!secret) return true;

    // 1. Check Retell HMAC signature header
    const retellSignature = headers['x-retell-signature'] || headers['X-Retell-Signature'];
    if (retellSignature && rawBody) {
      try {
        const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
        const computed = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
        
        // Constant time comparison
        const signatureBuf = Buffer.from(retellSignature);
        const computedBuf = Buffer.from(computed);
        if (signatureBuf.length === computedBuf.length && crypto.timingSafeEqual(signatureBuf, computedBuf)) {
          return true;
        }
      } catch {
        // Continue to fallback auth checks
      }
    }

    // 2. Check Authorization Bearer header
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (match && match[1] === secret) {
        return true;
      }
    }

    // 3. Check custom header
    const customSecret = headers['x-webhook-secret'] || headers['X-Webhook-Secret'];
    if (customSecret && customSecret === secret) {
      return true;
    }

    return false;
  }

  parseWebhook(body: any): NormalizedWebhookEvent {
    const callObj = body.call || body;
    const callId = callObj.call_id || callObj.callId || `retell_${Date.now()}`;
    const eventType = body.event || 'call_started';
    const eventId = body.event_id || body.eventId || `retell_evt_${callId}_${eventType}`;

    const direction: 'inbound' | 'outbound' | 'unknown' =
      callObj.direction === 'inbound' || callObj.direction === 'outbound'
        ? callObj.direction
        : 'unknown';

    // Calculate duration in seconds
    const durationInSeconds = callObj.duration_ms
      ? Math.round(callObj.duration_ms / 1000)
      : callObj.duration;

    const startedAt = callObj.start_timestamp ? new Date(callObj.start_timestamp) : undefined;
    const endedAt = callObj.end_timestamp ? new Date(callObj.end_timestamp) : undefined;

    return {
      eventId,
      eventType,
      provider: this.providerName,
      callId,
      timestamp: startedAt || new Date(),
      callData: {
        callId,
        provider: this.providerName,
        direction,
        from: callObj.from_number || callObj.from,
        to: callObj.to_number || callObj.to,
        status: callObj.call_status || (eventType === 'call_ended' ? 'completed' : 'in-progress'),
        startedAt,
        endedAt,
        duration: durationInSeconds,
        transcript: callObj.transcript,
        summary: callObj.call_analysis?.call_summary || callObj.summary,
        recordingUrl: callObj.recording_url || callObj.recordingUrl,
        intent: callObj.call_analysis?.user_sentiment || callObj.intent,
        outcome: callObj.call_analysis?.call_successful ? 'successful' : callObj.outcome,
        metadata: {
          agentId: callObj.agent_id,
          disconnectionReason: callObj.disconnection_reason,
          customAnalysis: callObj.call_analysis?.custom_analysis_data,
          ...(callObj.metadata || {})
        },
        rawLastEvent: body
      },
      rawPayload: body
    };
  }

  parseCallback(body: any): NormalizedCallbackEvent {
    const callObj = body.call || body;
    const callId = callObj.call_id || callObj.callId || `retell_${Date.now()}`;
    const eventType = body.event || 'call_analyzed';
    const eventId = body.event_id || body.eventId || `retell_cb_${callId}`;

    const durationInSeconds = callObj.duration_ms
      ? Math.round(callObj.duration_ms / 1000)
      : callObj.duration;

    return {
      eventId,
      eventType,
      provider: this.providerName,
      callId,
      status: callObj.call_status || 'completed',
      duration: durationInSeconds,
      transcript: callObj.transcript,
      summary: callObj.call_analysis?.call_summary || callObj.summary,
      recordingUrl: callObj.recording_url || callObj.recordingUrl,
      intent: callObj.call_analysis?.user_sentiment,
      outcome: callObj.call_analysis?.call_successful ? 'successful' : 'unsuccessful',
      metadata: {
        agentId: callObj.agent_id,
        disconnectionReason: callObj.disconnection_reason,
        customAnalysis: callObj.call_analysis?.custom_analysis_data,
        userSentiment: callObj.call_analysis?.user_sentiment,
        ...(callObj.metadata || {})
      },
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
