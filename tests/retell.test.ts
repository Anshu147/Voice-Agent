import request from 'supertest';
import { createApp } from '../src/app';
import { Call } from '../src/models/Call';

const app = createApp();
const AUTH_HEADER = 'Bearer test-webhook-secret';

describe('Retell AI Integration Tests', () => {
  const retellCallStartedPayload = {
    event: 'call_started',
    call: {
      call_id: 'call_retell_101',
      agent_id: 'agent_retell_alpha',
      call_status: 'ongoing',
      start_timestamp: 1700000000000,
      from_number: '+15551234567',
      to_number: '+15557654321',
      direction: 'inbound',
      metadata: {
        crm_lead_id: 'lead_999'
      }
    }
  };

  const retellCallAnalyzedPayload = {
    event: 'call_analyzed',
    call: {
      call_id: 'call_retell_101',
      agent_id: 'agent_retell_alpha',
      call_status: 'ended',
      start_timestamp: 1700000000000,
      end_timestamp: 1700000180000,
      duration_ms: 180000,
      transcript: 'Agent: Thank you for calling support. Caller: I need my invoice. Agent: Invoice sent to your email.',
      recording_url: 'https://cdn.retellai.com/recordings/call_retell_101.wav',
      disconnection_reason: 'user_hangup',
      call_analysis: {
        call_summary: 'Customer requested their latest billing invoice. Agent verified account and emailed the invoice.',
        user_sentiment: 'Positive',
        call_successful: true,
        custom_analysis_data: {
          invoice_requested: true
        }
      }
    }
  };

  it('should accept Retell call_started webhook and persist Call with Retell metadata', async () => {
    const res = await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send(retellCallStartedPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.callId).toBe('call_retell_101');

    const call = await Call.findOne({ callId: 'call_retell_101' });
    expect(call).not.toBeNull();
    expect(call?.provider).toBe('retell');
    expect(call?.from).toBe('+15551234567');
    expect(call?.to).toBe('+15557654321');
    expect(call?.direction).toBe('inbound');
    expect(call?.metadata).toHaveProperty('agentId', 'agent_retell_alpha');
    expect(call?.metadata).toHaveProperty('crm_lead_id', 'lead_999');
  });

  it('should process Retell call_analyzed callback and update transcript, summary, duration, recording URL, and outcome', async () => {
    // First initiate call
    await request(app)
      .post('/api/voice/webhook')
      .set('Authorization', AUTH_HEADER)
      .send(retellCallStartedPayload);

    // Send Retell completion callback
    const res = await request(app)
      .post('/api/voice/callback')
      .set('Authorization', AUTH_HEADER)
      .send(retellCallAnalyzedPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.callId).toBe('call_retell_101');
    expect(res.body.status).toBe('processed');

    const call = await Call.findOne({ callId: 'call_retell_101' });
    expect(call).not.toBeNull();
    expect(call?.status).toBe('ended');
    expect(call?.duration).toBe(180); // 180000ms converted to seconds
    expect(call?.transcript).toContain('Invoice sent to your email');
    expect(call?.summary).toContain('Customer requested their latest billing invoice');
    expect(call?.recordingUrl).toBe('https://cdn.retellai.com/recordings/call_retell_101.wav');
    expect(call?.outcome).toBe('successful');
    expect(call?.metadata).toHaveProperty('userSentiment', 'Positive');
  });

  it('should accept Retell callback with x-retell-signature HMAC authentication', async () => {
    const crypto = require('crypto');
    const secret = 'test-webhook-secret';
    const payloadStr = JSON.stringify(retellCallAnalyzedPayload);
    const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    const res = await request(app)
      .post('/api/voice/callback')
      .set('Content-Type', 'application/json')
      .set('x-retell-signature', signature)
      .send(payloadStr);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
