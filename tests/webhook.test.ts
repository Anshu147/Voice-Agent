import request from 'supertest';
import { createApp } from '../src/app';
import { Call } from '../src/models/Call';
import { WebhookEvent } from '../src/models/WebhookEvent';

const app = createApp();
const AUTH_HEADER = 'Bearer test-webhook-secret';

describe('POST /api/voice/webhook', () => {
  const validWebhookPayload = {
    event: 'call.started',
    eventId: 'evt_test_1001',
    timestamp: '2026-09-10T10:00:00Z',
    call: {
      callId: 'call_test_1001',
      direction: 'inbound',
      from: '+919999999999',
      to: '+918888888888',
      status: 'started'
    },
    data: {
      clientAccount: 'acct_premium'
    }
  };

  it('should accept valid webhook and create Call and WebhookEvent records', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send(validWebhookPayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      received: true,
      eventId: 'evt_test_1001',
      callId: 'call_test_1001',
      duplicate: false
    });

    // Check MongoDB Call record
    const call = await Call.findOne({ callId: 'call_test_1001' });
    expect(call).not.toBeNull();
    expect(call?.from).toBe('+919999999999');
    expect(call?.to).toBe('+918888888888');
    expect(call?.direction).toBe('inbound');
    expect(call?.status).toBe('started');
    expect(call?.metadata).toHaveProperty('clientAccount', 'acct_premium');

    // Check MongoDB WebhookEvent record
    const event = await WebhookEvent.findOne({ eventId: 'evt_test_1001' });
    expect(event).not.toBeNull();
    expect(event?.status).toBe('processed');
  });

  it('should handle duplicate webhook events idempotently without creating duplicate records', async () => {
    // Send first time
    const res1 = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send(validWebhookPayload);
    expect(res1.status).toBe(200);
    expect(res1.body.duplicate).toBe(false);

    // Send second time with same eventId
    const res2 = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send(validWebhookPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.duplicate).toBe(true);
    expect(res2.body.eventId).toBe('evt_test_1001');

    // Verify only 1 Call and 1 WebhookEvent exist
    const callCount = await Call.countDocuments({ callId: 'call_test_1001' });
    const eventCount = await WebhookEvent.countDocuments({ eventId: 'evt_test_1001' });
    expect(callCount).toBe(1);
    expect(eventCount).toBe(1);
  });

  it('should return 401 UNAUTHORIZED when Authorization header is missing', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .send(validWebhookPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 UNAUTHORIZED when secret is invalid', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', 'Bearer invalid-secret')
      .send(validWebhookPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 INVALID_PAYLOAD when event name is missing', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send({
        call: { callId: 'call_no_event' }
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('should return 400 INVALID_PAYLOAD on malformed JSON payload', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'application/json')
      .send('{"event": "call.started", invalid_json}');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });
});
