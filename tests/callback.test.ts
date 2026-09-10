import request from 'supertest';
import { createApp } from '../src/app';
import { Call } from '../src/models/Call';
import { WebhookEvent } from '../src/models/WebhookEvent';

const app = createApp();
const AUTH_HEADER = 'Bearer test-webhook-secret';

describe('POST /api/voice/callback', () => {
  it('should update an existing call with completion metadata, transcript, summary, duration, and recordingUrl', async () => {
    // 1. Create an existing call record
    await Call.create({
      callId: 'call_existing_999',
      provider: 'generic',
      direction: 'inbound',
      from: '+919999999999',
      to: '+918888888888',
      status: 'started',
      startedAt: new Date(Date.now() - 120000)
    });

    const callbackPayload = {
      event: 'call.completed',
      eventId: 'cb_evt_999',
      callId: 'call_existing_999',
      status: 'completed',
      duration: 120,
      transcript: 'User: Hello Agent. Agent: Hi there, how can I assist you?',
      summary: 'Caller requested assistance with voice setup.',
      recordingUrl: 'https://cdn.example.com/recordings/call_999.wav',
      intent: 'support_inquiry',
      outcome: 'resolved',
      metadata: { satisfaction: 'high' }
    };

    const res = await request(app)
      .post('/api/voice/callback')
      .set('Authorization', AUTH_HEADER)
      .send(callbackPayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      callId: 'call_existing_999',
      status: 'processed',
      isNewCall: false
    });

    // Verify Call document updated in MongoDB
    const updatedCall = await Call.findOne({ callId: 'call_existing_999' });
    expect(updatedCall).not.toBeNull();
    expect(updatedCall?.status).toBe('completed');
    expect(updatedCall?.duration).toBe(120);
    expect(updatedCall?.transcript).toBe('User: Hello Agent. Agent: Hi there, how can I assist you?');
    expect(updatedCall?.summary).toBe('Caller requested assistance with voice setup.');
    expect(updatedCall?.recordingUrl).toBe('https://cdn.example.com/recordings/call_999.wav');
    expect(updatedCall?.outcome).toBe('resolved');
    expect(updatedCall?.metadata).toHaveProperty('satisfaction', 'high');
    expect(updatedCall?.endedAt).toBeDefined();

    // Verify WebhookEvent audit record
    const event = await WebhookEvent.findOne({ eventId: 'cb_evt_999' });
    expect(event).not.toBeNull();
    expect(event?.status).toBe('processed');
  });

  it('should create a pending call record when callback is received for an unknown callId', async () => {
    const callbackPayload = {
      event: 'call.completed',
      callId: 'call_unknown_888',
      status: 'completed',
      duration: 45,
      transcript: 'Direct callback without webhook start',
      summary: 'Call processed immediately'
    };

    const res = await request(app)
      .post('/api/voice/callback')
      .set('Authorization', AUTH_HEADER)
      .send(callbackPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.callId).toBe('call_unknown_888');
    expect(res.body.isNewCall).toBe(true);

    const createdCall = await Call.findOne({ callId: 'call_unknown_888' });
    expect(createdCall).not.toBeNull();
    expect(createdCall?.status).toBe('completed');
    expect(createdCall?.duration).toBe(45);
    expect(createdCall?.transcript).toBe('Direct callback without webhook start');
  });

  it('should return 400 INVALID_PAYLOAD when callId is missing', async () => {
    const res = await request(app)
      .post('/api/voice/callback')
      .set('Authorization', AUTH_HEADER)
      .send({
        event: 'call.completed',
        duration: 50
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('should return 401 UNAUTHORIZED when authentication header is missing', async () => {
    const res = await request(app)
      .post('/api/voice/callback')
      .send({
        callId: 'call_test_auth'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
