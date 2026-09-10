export interface NormalizedCallData {
  callId: string;
  provider: string;
  direction?: 'inbound' | 'outbound' | 'unknown';
  from?: string;
  to?: string;
  status?: string;
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
}

export interface NormalizedWebhookEvent {
  eventId: string;
  eventType: string;
  provider: string;
  callId: string;
  timestamp?: Date;
  callData?: Partial<NormalizedCallData>;
  rawPayload: Record<string, any>;
}

export interface NormalizedCallbackEvent {
  eventId?: string;
  eventType: string;
  provider: string;
  callId: string;
  status?: string;
  duration?: number;
  transcript?: string;
  summary?: string;
  recordingUrl?: string;
  intent?: string;
  outcome?: string;
  metadata?: Record<string, any>;
  rawPayload: Record<string, any>;
}

export interface VoiceProviderAdapter {
  readonly providerName: string;

  verifySignature(
    rawBody: string | Buffer,
    headers: Record<string, any>,
    secret?: string
  ): boolean;

  parseWebhook(body: any): NormalizedWebhookEvent;

  parseCallback(body: any): NormalizedCallbackEvent;

  normalizeCallData(
    event: NormalizedWebhookEvent | NormalizedCallbackEvent
  ): Partial<NormalizedCallData>;
}
