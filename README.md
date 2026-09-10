# Production-Ready Voice Agent Webhook & Callback Gateway

A high-reliability, provider-agnostic integration gateway built with Node.js, TypeScript, Express, and MongoDB. Designed to receive voice-agent webhook events and call completion callbacks, validate payloads, enforce event idempotency, log structured audit data, and persist call states.

---

## 📑 Table of Contents

- [Architecture & Data Flow](#architecture--data-flow)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start & Installation](#quick-start--installation)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [1. Health Check (`GET /api/health`)](#1-health-check-get-apihealth)
  - [2. Voice Webhook (`POST /api/voice/webhook`)](#2-voice-webhook-post-apivoicewebhook)
  - [3. Voice Callback (`POST /api/voice/callback`)](#3-voice-callback-post-apivoicecallback)
  - [4. Interactive API Docs (`GET /api/docs`)](#4-interactive-api-docs-get-apidocs)
- [Authentication & Signature Verification](#authentication--signature-verification)
- [Idempotency & Deduplication](#idempotency--deduplication)
- [Standardized Error Codes](#standardized-error-codes)
- [Local Testing & Example cURL Commands](#local-testing--example-curl-commands)
- [Automated Testing](#automated-testing)
- [Provider Integration Guide (Vapi, Retell, Twilio, ElevenLabs, Bland)](#provider-integration-guide)
- [Deployment (Render Blueprint)](#deployment-render-blueprint)

---

## 🏛️ Architecture & Data Flow

```
                                  VOICE AGENT PROVIDER
                        (Vapi, Retell, Twilio, ElevenLabs, Bland)
                                         |
                                         | HTTPS POST
                                         v
                            +--------------------------+
                            |     Express Gateway      |
                            |   (Helmet, CORS, Limit)  |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            | Authentication / Sig Val |
                            +--------------------------+
                                         |
                                         v
                            +--------------------------+
                            |   Zod Payload Validator  |
                            +--------------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
                       v                                   v
             [Webhook Controller]                [Callback Controller]
                       |                                   |
                       v                                   v
             [Webhook Service]                   [Callback Service]
             /               \                             |
            v                 v                            |
    +---------------+   +-------------------+              |
    | WebhookEvent  |   | Voice Provider    |              |
    | (Idempotency) |   | Adapter Layer     |              |
    +---------------+   +-------------------+              |
                              |                            |
                              v                            v
                        [Call Service] <-------------------+
                              |
                              v
                        +-----------+
                        |  Call DB  |
                        | (MongoDB) |
                        +-----------+
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (>= 18.x) & TypeScript (ES2022) |
| **Framework** | Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Validation** | Zod |
| **Security** | Helmet, CORS, Express-Rate-Limit, Raw Body Capturing |
| **Logging** | Pino Structured Logger with Sensitive Field Redaction |
| **Testing** | Jest, Supertest, MongoMemoryServer |
| **Documentation** | OpenAPI 3.0 & Swagger UI |

---

## 📁 Project Structure

```
.
├── src/
│   ├── adapters/                  # Provider normalization & signature adapter layer
│   │   ├── VoiceProviderAdapter.ts# Interface for voice providers
│   │   └── GenericVoiceAdapter.ts # Reference implementation with Bearer/HMAC validation
│   ├── config/
│   │   ├── database.ts            # Mongoose connection & lifecycle handlers
│   │   └── env.ts                 # Zod validated environment variables
│   ├── controllers/
│   │   ├── callback.controller.ts # Call outcome / completion controller
│   │   ├── health.controller.ts   # System & DB health controller
│   │   └── webhook.controller.ts  # Webhook ingestion controller
│   ├── docs/
│   │   └── swagger.ts             # OpenAPI 3.0 specification definition
│   ├── middleware/
│   │   ├── auth.middleware.ts     # Bearer token & webhook signature auth
│   │   ├── error.middleware.ts    # Centralized error handler & AppError
│   │   └── rateLimit.middleware.ts# Rate limiting middleware
│   ├── models/
│   │   ├── Call.ts                # Mongoose schema for Call records
│   │   └── WebhookEvent.ts        # Mongoose schema for idempotency & audit
│   ├── routes/
│   │   ├── callback.routes.ts     # Routes for /api/voice/callback
│   │   ├── health.routes.ts       # Routes for /api/health
│   │   └── webhook.routes.ts      # Routes for /api/voice/webhook
│   ├── services/
│   │   ├── call.service.ts        # Call persistence, lookup, and updates
│   │   ├── callback.service.ts    # Callback parsing & transcript/summary updates
│   │   └── webhook.service.ts     # Webhook deduplication & event ingestion
│   ├── utils/
│   │   ├── logger.ts              # Pino logger with redaction
│   │   └── response.ts            # Standardized API response formatters
│   ├── validators/
│   │   └── voice.validator.ts     # Zod payload schemas
│   ├── app.ts                     # Express app setup and middleware configuration
│   └── server.ts                  # Server bootstrap and graceful shutdown
├── tests/
│   ├── callback.test.ts           # Callback endpoint integration tests
│   ├── health.test.ts             # Health check tests
│   ├── setup.ts                   # In-memory MongoDB Jest setup
│   └── webhook.test.ts            # Webhook endpoint integration & idempotency tests
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
├── render.yaml                    # Render deployment blueprint
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- Node.js 18+ and npm
- Local or cloud MongoDB instance (e.g. MongoDB Atlas)

### 2. Clone & Install
```bash
git clone <repo-url>
cd voice-agent-gateway
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```
Edit `.env` as needed:
```ini
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/voice_agent
ENABLE_WEBHOOK_AUTH=true
VOICE_WEBHOOK_SECRET=change-me-to-a-secure-secret
LOG_LEVEL=info
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build & Run in Production
```bash
npm run build
npm start
```

---

## 🔒 Environment Variables

| Variable | Description | Default | Required |
|---|---|---|---|
| `NODE_ENV` | Environment (`development`, `test`, `production`) | `development` | No |
| `PORT` | Server listening port | `5000` | No |
| `HOST` | Server bind interface (`0.0.0.0` for Docker/Render) | `0.0.0.0` | No |
| `MONGODB_URI` | MongoDB Connection URI string | `mongodb://localhost:27017/voice_agent` | Yes in prod |
| `ENABLE_WEBHOOK_AUTH` | Enable or disable webhook authentication | `true` | No |
| `VOICE_WEBHOOK_SECRET`| Shared secret for webhook Bearer token / HMAC | `change-me-to-a-secure-secret` | Yes |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins or `*` | `*` | No |
| `MAX_REQUEST_SIZE` | Maximum body parser size limit | `1mb` | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | `60000` (1 min) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per IP within window | `100` | No |
| `LOG_LEVEL` | Pino logging level | `info` | No |

---

## 📡 API Reference

### 1. Health Check (`GET /api/health`)
Checks the gateway status and MongoDB connectivity.

**Request:**
```http
GET /api/health HTTP/1.1
Host: localhost:5000
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "service": "voice-agent-gateway",
  "version": "1.0.0",
  "timestamp": "2026-09-10T11:45:00.000Z",
  "uptime": 142.3,
  "database": "connected"
}
```

---

### 2. Voice Webhook (`POST /api/voice/webhook`)
Receives real-time telephony and voice lifecycle events.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

**Generic Payload Example:**
```json
{
  "event": "call.started",
  "eventId": "evt_prod_001",
  "timestamp": "2026-09-10T10:00:00Z",
  "call": {
    "callId": "call_987654",
    "direction": "inbound",
    "from": "+919999999999",
    "to": "+918888888888",
    "status": "started"
  },
  "data": {
    "campaignId": "support_inbound",
    "agentVersion": "v2.1"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "received": true,
  "eventId": "evt_prod_001",
  "callId": "call_987654",
  "duplicate": false
}
```

---

### 3. Voice Callback (`POST /api/voice/callback`)
Receives post-call summaries, transcripts, duration, and recordings.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

**Payload Example:**
```json
{
  "event": "call.completed",
  "eventId": "cb_prod_001",
  "callId": "call_987654",
  "status": "completed",
  "duration": 145,
  "transcript": "Agent: Hi, thanks for calling. Customer: I want to schedule a product demo.",
  "summary": "Customer booked a demo for Friday 3 PM.",
  "recordingUrl": "https://cdn.example.com/recordings/call_987654.wav",
  "intent": "schedule_demo",
  "outcome": "demo_booked",
  "metadata": {
    "customerTier": "enterprise",
    "leadScore": 95
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "callId": "call_987654",
  "status": "processed",
  "isNewCall": false
}
```

---

### 4. Interactive API Docs (`GET /api/docs`)
Open `http://localhost:5000/api/docs` in your browser to access the full Swagger / OpenAPI interface with interactive request execution.

---

## 🔐 Authentication & Signature Verification

The gateway supports two primary authentication modes configured via `ENABLE_WEBHOOK_AUTH`:

1. **Bearer Token Header** (Default):
   ```http
   Authorization: Bearer <VOICE_WEBHOOK_SECRET>
   ```
2. **Custom Secret Header**:
   ```http
   X-Webhook-Secret: <VOICE_WEBHOOK_SECRET>
   ```
3. **HMAC-SHA256 Signature Verification** (Provider-ready):
   ```http
   X-Webhook-Signature: <computed_hmac_hex>
   ```
   The application captures raw request bodies via `(req as any).rawBody` to guarantee timing-safe cryptographic verification without JSON formatting drift.

---

## ⚡ Idempotency & Deduplication

Telephony providers frequently implement retry mechanisms with exponential backoff on transient network failures.

- When a webhook is received, the gateway inspects the `WebhookEvent` collection for the unique `eventId`.
- If the `eventId` was already processed, the gateway returns `200 OK` with `duplicate: true`, preventing redundant database mutations or duplicate Call records.

---

## ⚠️ Standardized Error Codes

All errors adhere to a predictable, consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Validation failed for request payload",
    "details": [
      { "field": "event", "message": "Event name cannot be empty" }
    ]
  }
}
```

| Error Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `INVALID_PAYLOAD` | 400 | Payload failed schema validation or malformed JSON |
| `NOT_FOUND` | 404 | Endpoint route does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | IP surpassed rate limits |
| `INTERNAL_ERROR` | 500 | Unhandled internal server error (stack traces hidden) |

---

## 💻 Local Testing & Example cURL Commands

### 1. Health Check
```bash
curl -X GET http://localhost:5000/api/health
```

### 2. Send Start Webhook
```bash
curl -X POST http://localhost:5000/api/voice/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-secure-secret" \
  -d '{
    "event": "call.started",
    "eventId": "evt_001",
    "timestamp": "2026-09-10T10:00:00Z",
    "call": {
      "callId": "call_demo_100",
      "direction": "inbound",
      "from": "+919999999999",
      "to": "+918888888888",
      "status": "started"
    },
    "data": {
      "source": "website_click_to_call"
    }
  }'
```

### 3. Send Call Completion Callback
```bash
curl -X POST http://localhost:5000/api/voice/callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer change-me-to-a-secure-secret" \
  -d '{
    "event": "call.completed",
    "eventId": "cb_001",
    "callId": "call_demo_100",
    "status": "completed",
    "duration": 145,
    "transcript": "Agent: Welcome to Qorex Voice. Caller: I need info about API integration.",
    "summary": "Customer queried API integration details and was assisted.",
    "recordingUrl": "https://storage.googleapis.com/voice-recordings/call_demo_100.wav",
    "outcome": "inquiry_answered"
  }'
```

---

## 🧪 Automated Testing

The automated test suite runs in-memory using `mongodb-memory-server` and requires no external database instance:

```bash
# Run test suite
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 🔌 Provider Integration Guide (Retell AI)

The gateway includes native support for **Retell AI** out-of-the-box via `RetellAdapter.ts`.

### Connecting Retell AI Dashboard:
1. Log into your [Retell AI Dashboard](https://beta.retellai.com/).
2. Navigate to **API & Webhook Settings** or your specific **Agent Configuration**.
3. Set your Webhook URLs:
   - **Inbound/Outbound Call Webhook**: `https://<YOUR-DOMAIN>/api/voice/webhook`
   - **Call Analysis Callback**: `https://<YOUR-DOMAIN>/api/voice/callback`
4. Set the **Webhook Secret** (or Authorization Header) in Retell:
   - Enter your `VOICE_WEBHOOK_SECRET` value.
5. Supported Retell Events:
   - `call_started`: Stores initial call metadata, agent ID, from/to numbers, and direction.
   - `call_ended`: Updates status to ended/completed with final timestamps.
   - `call_analyzed`: Ingests complete transcript, call summary, duration, user sentiment, call success outcome, and audio recording URL.
6. Retell Security:
   - The gateway automatically verifies `x-retell-signature` HMAC-SHA256 headers or Bearer tokens.

---

## ☁️ Deployment (Render Blueprint)

This repository includes a production `render.yaml` blueprint.

### Deploying to Render:
1. Connect this repository to Render.
2. In the Render Dashboard, create a **Web Service** from Blueprint.
3. Configure the following environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI
   - `VOICE_WEBHOOK_SECRET`: A high-entropy random secret (e.g. generated via `openssl rand -hex 32`)
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Your live URLs will be:
   - Webhook: `https://<YOUR-RENDER-APP>.onrender.com/api/voice/webhook`
   - Callback: `https://<YOUR-RENDER-APP>.onrender.com/api/voice/callback`
   - Health: `https://<YOUR-RENDER-APP>.onrender.com/api/health`
   - Docs: `https://<YOUR-RENDER-APP>.onrender.com/api/docs`
