import { z } from 'zod';

export const webhookPayloadSchema = z.object({
  event: z.string({
    required_error: "Event name is required (e.g. 'call.started', 'call.in-progress')"
  }).min(1, 'Event name cannot be empty'),
  eventId: z.string().optional(),
  provider: z.string().optional(),
  timestamp: z.string().optional(),
  call: z
    .object({
      callId: z.string().optional(),
      call_id: z.string().optional(),
      direction: z.enum(['inbound', 'outbound', 'unknown']).optional(),
      from: z.string().optional(),
      from_number: z.string().optional(),
      to: z.string().optional(),
      to_number: z.string().optional(),
      status: z.string().optional(),
      call_status: z.string().optional(),
      startedAt: z.string().or(z.date()).optional(),
      start_timestamp: z.number().or(z.string()).optional(),
      answeredAt: z.string().or(z.date()).optional(),
      endedAt: z.string().or(z.date()).optional(),
      end_timestamp: z.number().or(z.string()).optional(),
      duration: z.number().optional(),
      duration_ms: z.number().optional(),
      transcript: z.string().optional(),
      summary: z.string().optional(),
      recordingUrl: z.string().optional(),
      recording_url: z.string().optional(),
      intent: z.string().optional(),
      outcome: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })
    .passthrough()
    .optional(),
  callId: z.string().optional(),
  call_id: z.string().optional(),
  status: z.string().optional(),
  data: z.record(z.any()).optional()
}).passthrough(); // Allow arbitrary provider-specific fields

export const callbackPayloadSchema = z
  .object({
    callId: z.string().optional(),
    call_id: z.string().optional(),
    call: z
      .object({
        call_id: z.string().optional(),
        callId: z.string().optional(),
        status: z.string().optional(),
        call_status: z.string().optional(),
        duration: z.number().optional(),
        duration_ms: z.number().optional(),
        transcript: z.string().optional(),
        recording_url: z.string().optional(),
        recordingUrl: z.string().optional(),
        call_analysis: z.record(z.any()).optional()
      })
      .passthrough()
      .optional(),
    event: z.string().optional(),
    eventId: z.string().optional(),
    event_id: z.string().optional(),
    provider: z.string().optional(),
    status: z.string().optional(),
    duration: z.number().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    recordingUrl: z.string().optional(),
    recording_url: z.string().optional(),
    intent: z.string().optional(),
    outcome: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    data: z.record(z.any()).optional()
  })
  .passthrough()
  .refine(
    (data) => Boolean(data.callId || data.call_id || data.call?.call_id || data.call?.callId),
    {
      message: 'A call identifier (callId, call_id, or call.call_id) is required for callback events',
      path: ['callId']
    }
  ); // Allow additional provider-specific fields
