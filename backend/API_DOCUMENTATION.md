# ALLOUL&Q Backend API Documentation

## Overview

ALLOUL&Q backend is a comprehensive communication and project management platform with integrated AI services, real-time collaboration features, and multi-platform integrations.

### Architecture

The backend is built on three core layers:

1. **Platform Registry** — Centralized management of all integrations (AI providers, communication services, CRM, payments)
2. **Service Orchestrator** — Workflow engine for managing multi-service tasks with dependency resolution
3. **AI Service Abstraction** — Unified interface for AI providers with automatic fallback chains

---

## Core Services API

### 1. Platform Registry Service

The Platform Registry manages all external integrations and provides a unified interface for platform configuration.

#### Available Platforms

| Category | Platform ID | Name | Features |
|----------|------------|------|----------|
| **AI** | `openai` | OpenAI | GPT models, embeddings |
| | `deepseek` | DeepSeek | Cost-effective LLM |
| | `ollama` | Ollama | Local LLM (private) |
| | `huggingface` | Hugging Face | Model hub access |
| **Communication** | `daily` | Daily.co | Video/voice calls |
| | `slack` | Slack | Team messaging |
| | `gmail` | Gmail | Email integration |
| **CRM** | `salesforce` | Salesforce | Customer management |
| | `hubspot` | HubSpot | Marketing/CRM |
| **Calendar** | `google_calendar` | Google Calendar | Schedule management |
| **Payments** | `stripe` | Stripe | Payment processing |

#### Methods

```python
# Get a specific platform
platform = registry.get_platform("openai")

# Get all platforms
all_platforms = registry.get_platforms()

# Get platforms by category
ai_platforms = registry.get_platforms_by_category("ai")

# Get configured platforms (with credentials)
configured = registry.get_configured_platforms()
```

---

### 2. Service Orchestrator

The Service Orchestrator manages complex workflows with task dependencies, error handling, and fallback mechanisms.

#### Task Execution Model

```python
from services.service_orchestrator import ServiceTask, ExecutionContext, ServiceOrchestrator

# Define tasks
task1 = ServiceTask(
    id="task1",
    name="Process Payment",
    service="stripe",
    params={"amount": 1000, "currency": "USD"}
)

task2 = ServiceTask(
    id="task2",
    name="Send Confirmation",
    service="email",
    params={"template": "payment_confirmation"},
    depends_on=["task1"]  # Wait for task1 to complete
)

# Execute workflow
orchestrator = ServiceOrchestrator()
context = ExecutionContext()

result = await orchestrator.execute([task1, task2], context)

# Result structure
{
    "status": "success" | "failure" | "partial",
    "executed": ["task1", "task2"],
    "failed": [],
    "errors": {},
    "context": {...}
}
```

#### Context Data Sharing

```python
# Tasks can share data through ExecutionContext
context.set_data("company_id", 42)
context.set_data("user_email", "user@example.com")

# Access shared data
company_id = context.get_data("company_id")
```

---

### 3. AI Service (Unified Provider Interface)

The AI Service provides a unified interface for all AI providers with automatic fallback support.

#### Provider Priority

**Private Mode** (for sensitive company data):
1. Ollama (local, most private)
2. Claude (remote, secure)
3. DeepSeek (fallback)

**Public Mode** (for general queries):
1. Claude (highest quality)
2. DeepSeek (cost-effective)
3. Ollama (local fallback)

#### Usage

```python
from services.ai_service import get_ai_service

service = get_ai_service()

# Synchronous completion
response = service.complete(
    prompt="Summarize this meeting",
    system="You are a helpful assistant",
    private=True,  # Use private provider chain
    max_tokens=200
)

# Asynchronous completion
response = await service.complete_async(
    prompt="Summarize this meeting",
    system="You are a helpful assistant",
    private=True,
    max_tokens=200
)

# Streaming completion
async for chunk in service.stream_complete(
    prompt="Summarize this meeting",
    system="You are a helpful assistant",
    private=False
):
    print(chunk)
```

---

## API Endpoints

### Authentication

All authenticated endpoints require:
- **Header**: `Authorization: Bearer {jwt_token}`
- **Method**: Get token from `/auth/login` or `/auth/signup`

### Settings & Integrations

#### GET `/settings/integrations`

Get all platform integrations for the current company.

**Response:**
```json
{
  "integrations": [
    {
      "platform_id": "openai",
      "status": "available",
      "is_configured": true,
      "is_active": true,
      "error_message": null
    }
  ],
  "configured_count": 2,
  "available_platforms": [
    {
      "id": "openai",
      "name": "OpenAI",
      "category": "ai",
      "description": "GPT models and embeddings",
      "priority": 1
    }
  ]
}
```

#### POST `/settings/integrations/{platform_id}`

Save or update credentials for a platform.

**Request:**
```json
{
  "platform_id": "openai",
  "api_key": "sk-...",
  "api_secret": null,
  "custom_params": {}
}
```

**Response:**
```json
{
  "platform_id": "openai",
  "api_key": "***...",  // masked for security
  "api_secret": null,
  "custom_params": {},
  "is_active": true,
  "last_tested_at": "2026-04-15T10:30:00Z",
  "last_error": null
}
```

#### POST `/settings/integrations/{platform_id}/test`

Test a platform connection (dry run).

**Request:**
```json
{
  "api_key": "sk-...",
  "custom_params": {}
}
```

**Response:**
```json
{
  "success": true,
  "platform_id": "openai",
  "message": "Connected to OpenAI",
  "status": "available"
}
```

#### DELETE `/settings/integrations/{platform_id}`

Delete integration credentials.

**Response:** `204 No Content`

#### POST `/settings/integrations/{platform_id}/deactivate`

Disable an integration without deleting it.

**Response:**
```json
{
  "status": "deactivated",
  "platform_id": "openai"
}
```

#### GET `/settings/summary`

Get a summary of all settings and integration status.

**Response:**
```json
{
  "total_platforms": 12,
  "configured": 3,
  "active": 2,
  "unconfigured": 9,
  "integrations": [...]
}
```

### Agent & Chat

#### POST `/agent/chat`

Send a message to the AI agent with company context.

**Request:**
```json
{
  "message": "Summarize today's calls",
  "mode": "company" | "media",
  "stream": false
}
```

**Response (non-streaming):**
```json
{
  "response": "Here's a summary of today's calls...",
  "provider_used": "claude",
  "tokens_used": 150,
  "execution_time_ms": 1200
}
```

**Response (streaming):**
Server-Sent Events (SSE) with chunks:
```
data: {"chunk": "Here's a"}
data: {"chunk": " summary"}
...
```

#### POST `/agent/dispatch-task`

Analyze a task and determine which services are needed.

**Request:**
```json
{
  "task_title": "Schedule meeting with sales team",
  "task_description": "Create a 1-hour meeting next Tuesday at 2 PM",
  "task_type": "calendar",
  "params": {
    "attendees": ["sales@company.com"]
  }
}
```

**Response:**
```json
{
  "task_id": "task_uuid",
  "analysis": "Need to use Google Calendar to create the meeting",
  "required_services": ["google_calendar"],
  "confidence": 0.95,
  "execution_plan": [
    {
      "service": "google_calendar",
      "action": "create_event",
      "params": {...}
    }
  ]
}
```

---

## Service Integration Patterns

### Pattern 1: Simple Service Call

```python
from services.platform_registry import get_registry

registry = get_registry()
stripe_platform = registry.get_platform("stripe")

# Use the platform to make API calls
payment = stripe_platform.make_request(
    method="POST",
    endpoint="/charges",
    data={"amount": 1000, "currency": "usd"}
)
```

### Pattern 2: Multi-Service Workflow

```python
from services.service_orchestrator import ServiceTask, ExecutionContext, ServiceOrchestrator

tasks = [
    ServiceTask(
        id="charge",
        name="Process Payment",
        service="stripe",
        params={"amount": 1000}
    ),
    ServiceTask(
        id="notify_sales",
        name="Notify Sales Team",
        service="slack",
        params={"channel": "#sales", "message": "Payment received"},
        depends_on=["charge"]
    ),
    ServiceTask(
        id="send_invoice",
        name="Send Invoice",
        service="email",
        params={"template": "invoice"},
        depends_on=["charge"]
    )
]

orchestrator = ServiceOrchestrator()
context = ExecutionContext()
context.set_data("customer_id", customer_id)

result = await orchestrator.execute(tasks, context)
```

### Pattern 3: AI-Powered Analysis

```python
from services.ai_service import get_ai_service

service = get_ai_service()

# Analyze company data with private provider
analysis = await service.complete_async(
    prompt=f"Analyze these sales figures: {sales_data}",
    system="You are a sales analyst. Provide actionable insights.",
    private=True  # Use internal/secure providers
)
```

---

## Credential Encryption

All API keys and secrets are encrypted at rest using Fernet symmetric encryption.

### Encryption/Decryption Flow

```python
from services.credential_encryption import get_encryptor

encryptor = get_encryptor()

# When saving credentials
api_key = "sk-1234567890"
encrypted_key = encryptor.encrypt(api_key)
# Store encrypted_key in database

# When retrieving credentials
encrypted_from_db = "gAAAAAB..."
decrypted_key = encryptor.decrypt(encrypted_from_db)  # "sk-1234567890"

# For API responses (mask sensitive data)
masked_key = encryptor.mask_key(api_key, show_chars=4)  # "***567890"
```

### Key Management

- **Environment Variable**: `CREDENTIAL_ENCRYPTION_KEY`
- **In Production**: Use AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
- **In Development**: Auto-generated key (with warning)
- **Rotation**: Implement periodic key rotation and re-encryption

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message",
  "error_code": "PLATFORM_UNAVAILABLE" | "INVALID_CREDENTIALS" | "RATE_LIMIT",
  "status_code": 400 | 401 | 403 | 404 | 429 | 500
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `PLATFORM_UNAVAILABLE` | 503 | Platform service is down |
| `INVALID_CREDENTIALS` | 401 | API key/secret is invalid |
| `RATE_LIMIT` | 429 | API rate limit exceeded |
| `NOT_CONFIGURED` | 400 | Integration not set up |
| `MISSING_PERMISSION` | 403 | User lacks required permission |
| `INTERNAL_ERROR` | 500 | Server error during execution |

---

## Testing

### Running Tests

```bash
# Install test dependencies
pip install -r backend/requirements.txt

# Run all tests
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_services.py -v

# Run with coverage
pytest backend/tests/ --cov=services --cov-report=html
```

### Test Structure

```
backend/tests/
├── conftest.py          # Pytest configuration and fixtures
├── test_smoke.py        # Health checks and basic routes
├── test_services.py     # Service integration tests
└── test_api_endpoints.py # API endpoint tests
```

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost/alloul"

# Authentication
SECRET_KEY="your-secret-key-at-least-32-chars"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30

# API Keys (for providers)
OPENAI_API_KEY="sk-..."
DEEPSEEK_API_KEY="sk-..."

# Encryption
CREDENTIAL_ENCRYPTION_KEY="your-fernet-key"

# Firebase
FIREBASE_CONFIG_JSON="{...}"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING="..."

# Environment
ENVIRONMENT="development" | "staging" | "production"
```

---

## Rate Limiting & Quotas

### API Rate Limits

- `/agent/chat`: 100 requests/minute per user
- `/agent/dispatch-task`: 50 requests/minute per company
- `/settings/integrations/*/test`: 5 requests/minute per platform
- General endpoints: 1000 requests/minute per user

### Token Limits

- Claude Haiku: Max 200k tokens per request
- DeepSeek: Max 100k tokens per request
- Ollama: Limited by local model

---

## Deployment Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Use secure database (PostgreSQL, not SQLite)
- [ ] Store encryption key in secure vault
- [ ] Enable HTTPS only
- [ ] Set up monitoring and logging (Sentry)
- [ ] Configure CORS for frontend domain
- [ ] Run database migrations
- [ ] Test all integrations before going live
- [ ] Set up CI/CD pipeline
- [ ] Enable rate limiting and DDoS protection

---

## Support & Troubleshooting

### Common Issues

**Issue**: "Platform not found"
- **Solution**: Ensure platform ID matches exactly (case-sensitive)

**Issue**: "Invalid credentials"
- **Solution**: Verify API key format, check expiration dates, test with test mode first

**Issue**: "Connection timeout"
- **Solution**: Check network connectivity, verify provider is responding, increase timeout

**Issue**: "Rate limit exceeded"
- **Solution**: Implement exponential backoff, upgrade provider plan, batch requests

---

## Version History

- **v1.0.0** (2026-04-15) — Initial release with Platform Registry, Service Orchestrator, and AI Service abstraction
- **v1.1.0** (Planned) — Real-time collaboration features
- **v2.0.0** (Planned) — Advanced analytics and reporting

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.
