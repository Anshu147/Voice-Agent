export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Voice Agent Webhook & Callback Gateway API',
    version: '1.0.0',
    description:
      'Production-ready webhook and callback gateway for voice and telephony agents (Vapi, Retell, Twilio, ElevenLabs, Bland, Generic).'
  },
  servers: [
    {
      url: '/',
      description: 'Current Environment Gateway'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Webhook authorization token header: `Authorization: Bearer <VOICE_WEBHOOK_SECRET>`'
      }
    },
    schemas: {
      StandardSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true }
        }
      },
      StandardError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_PAYLOAD' },
              message: { type: 'string', example: 'Validation failed for request payload' },
              details: { type: 'object' }
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          status: { type: 'string', example: 'healthy' },
          service: { type: 'string', example: 'voice-agent-gateway' },
          version: { type: 'string', example: '1.0.0' },
          timestamp: { type: 'string', example: '2026-09-10T10:00:00.000Z' },
          uptime: { type: 'number', example: 120.5 },
          database: { type: 'string', example: 'connected' }
        }
      },
      WebhookRequest: {
        type: 'object',
        required: ['event'],
        properties: {
          event: { type: 'string', example: 'call.started' },
          eventId: { type: 'string', example: 'evt_001_abc' },
          provider: { type: 'string', example: 'generic' },
          timestamp: { type: 'string', example: '2026-09-10T10:00:00Z' },
          call: {
            type: 'object',
            properties: {
              callId: { type: 'string', example: 'call_123' },
              direction: { type: 'string', enum: ['inbound', 'outbound', 'unknown'], example: 'inbound' },
              from: { type: 'string', example: '+919999999999' },
              to: { type: 'string', example: '+918888888888' },
              status: { type: 'string', example: 'started' }
            }
          },
          data: {
            type: 'object',
            description: 'Arbitrary provider-specific payload data',
            example: { custom_var: 'value' }
          }
        }
      },
      WebhookResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          received: { type: 'boolean', example: true },
          eventId: { type: 'string', example: 'evt_001_abc' },
          callId: { type: 'string', example: 'call_123' },
          duplicate: { type: 'boolean', example: false }
        }
      },
      CallbackRequest: {
        type: 'object',
        required: ['callId'],
        properties: {
          callId: { type: 'string', example: 'call_123' },
          event: { type: 'string', example: 'call.completed' },
          eventId: { type: 'string', example: 'cb_123_xyz' },
          provider: { type: 'string', example: 'generic' },
          status: { type: 'string', example: 'completed' },
          duration: { type: 'number', example: 145 },
          transcript: { type: 'string', example: 'Agent: Hello, how can I help you today? User: I want to book a demo.' },
          summary: { type: 'string', example: 'Customer inquired about booking a product demo.' },
          recordingUrl: { type: 'string', example: 'https://recordings.example.com/call_123.mp3' },
          intent: { type: 'string', example: 'book_demo' },
          outcome: { type: 'string', example: 'demo_scheduled' },
          metadata: {
            type: 'object',
            example: { customerTier: 'enterprise' }
          }
        }
      },
      CallbackResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          callId: { type: 'string', example: 'call_123' },
          status: { type: 'string', example: 'processed' },
          isNewCall: { type: 'boolean', example: false }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Service Health and Readiness Check',
        description: 'Returns operational status of the gateway and database connectivity.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Gateway is healthy and operational',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' }
              }
            }
          },
          '503': {
            description: 'Gateway is degraded (e.g. database disconnected)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' }
              }
            }
          }
        }
      }
    },
    '/api/voice/webhook': {
      post: {
        summary: 'Voice Provider Webhook Ingestion',
        description: 'Main webhook endpoint for telephony and voice-agent events. Validates, deduplicates, logs, and synchronizes Call state.',
        tags: ['Voice Gateway'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook accepted and processed (or duplicate acknowledged)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid webhook payload structure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid authentication credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          }
        }
      }
    },
    '/api/voice/callback': {
      post: {
        summary: 'Voice Provider Callback Ingestion',
        description: 'Endpoint for call completion events, final transcripts, summary, and recording recordings.',
        tags: ['Voice Gateway'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CallbackRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Callback processed and Call updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CallbackResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid callback payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          },
          '401': {
            description: 'Missing or invalid authentication credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' }
              }
            }
          }
        }
      }
    }
  }
};
