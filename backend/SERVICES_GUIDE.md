# Services Architecture Guide

## Overview

ALLOUL&Q uses a three-layer architecture for managing services and integrations:

```
┌─────────────────────────────────────────────────────┐
│              Application Routes (FastAPI)           │
├─────────────────────────────────────────────────────┤
│           AI Service / Settings Service             │
│    (Unified interfaces for application logic)       │
├─────────────────────────────────────────────────────┤
│ Service Orchestrator (Workflow Engine with fallback)│
│          (Task dependency resolution)               │
├─────────────────────────────────────────────────────┤
│   Platform Registry (Central Integration Hub)       │
│        (Claude, DeepSeek, Ollama, Slack, etc.)    │
├─────────────────────────────────────────────────────┤
│         External Services (Remote APIs)             │
│   (OpenAI, Stripe, Slack, Google Calendar, etc.)   │
└─────────────────────────────────────────────────────┘
```

## Layer 1: Platform Registry

**Location**: `services/platform_registry.py`

The Platform Registry is the foundation layer that manages all external integrations.

### Key Concepts

```python
# Platform dataclass
@dataclass
class Platform:
    id: str                      # Unique identifier (e.g., "openai")
    name: str                    # Display name (e.g., "OpenAI")
    category: str               # Category (ai, communication, crm, payments, calendar)
    description: str            # Brief description
    priority: int               # Priority in fallback chain (1=highest)
    api_key: Optional[str]      # API key/token
    api_secret: Optional[str]   # Additional secret (if needed)
    status: PlatformStatus      # Current status (available, unavailable, etc.)
    last_error: Optional[str]   # Last error message
    custom_params: Dict[str, Any]  # Platform-specific parameters
```

### Adding a New Platform

```python
from services.platform_registry import get_registry, Platform, PlatformStatus

# In platform_registry.py, add to PLATFORMS list:
platforms = [
    # ... existing platforms
    Platform(
        id="my_service",
        name="My Service",
        category="communication",
        description="Integration with My Service API",
        priority=2,
        status=PlatformStatus.UNCONFIGURED,
    ),
]

# Or register dynamically:
registry = get_registry()
registry.register_platform(
    Platform(
        id="my_service",
        name="My Service",
        category="communication",
        description="Integration with My Service API",
        priority=2,
    )
)
```

### Using Platforms in Code

```python
from services.platform_registry import get_registry

registry = get_registry()

# Get specific platform
platform = registry.get_platform("slack")
if platform.api_key:
    # Use the API key
    client = slack_sdk.WebClient(token=platform.api_key)

# Get all platforms in a category
ai_platforms = registry.get_platforms_by_category("ai")

# Get only configured platforms
configured = registry.get_configured_platforms()
```

---

## Layer 2: Service Orchestrator

**Location**: `services/service_orchestrator.py`

The Service Orchestrator manages complex workflows with task dependencies and error handling.

### Key Concepts

```python
# ServiceTask - individual unit of work
@dataclass
class ServiceTask:
    id: str                          # Unique task ID
    name: str                        # Human-readable name
    service: str                     # Service/platform ID
    params: Dict[str, Any] = None    # Task parameters
    depends_on: List[str] = None     # Task IDs this depends on
    timeout: int = 30                # Timeout in seconds
    retry_count: int = 3             # Number of retries

# ExecutionContext - shared data between tasks
class ExecutionContext:
    def set_data(self, key: str, value: Any) -> None
    def get_data(self, key: str) -> Optional[Any]
    def get_all_data(self) -> Dict[str, Any]

# ServiceOrchestrator - workflow engine
class ServiceOrchestrator:
    async def execute(
        self,
        tasks: List[ServiceTask],
        context: ExecutionContext
    ) -> Dict[str, Any]
```

### Task Dependency Resolution

```python
# Tasks are automatically sorted by dependencies
task_a = ServiceTask(id="a", name="A", service="s1")
task_b = ServiceTask(id="b", name="B", service="s2", depends_on=["a"])
task_c = ServiceTask(id="c", name="C", service="s1", depends_on=["b"])

# Execution order is guaranteed: a → b → c
orchestrator = ServiceOrchestrator()
result = await orchestrator.execute([task_c, task_a, task_b], context)
```

### Implementing a Task Handler

```python
from services.service_orchestrator import ServiceOrchestrator, ServiceTask, ExecutionContext

orchestrator = ServiceOrchestrator()

async def handle_slack_message(context: ExecutionContext, task: ServiceTask):
    """Handler for Slack message tasks."""
    registry = get_registry()
    slack_platform = registry.get_platform("slack")
    
    if not slack_platform.api_key:
        context.errors.append(f"Slack not configured")
        return
    
    channel = task.params.get("channel")
    message = task.params.get("message")
    
    # Make API call
    client = slack_sdk.WebClient(token=slack_platform.api_key)
    try:
        response = client.chat_postMessage(channel=channel, text=message)
        context.set_data(f"{task.id}_result", response)
    except Exception as e:
        context.errors.append(f"Failed to send message: {str(e)}")

# Register handler
orchestrator.register_handler("slack", handle_slack_message)

# Use in workflow
task = ServiceTask(
    id="notify",
    name="Send Slack Message",
    service="slack",
    params={"channel": "#general", "message": "Hello!"}
)

context = ExecutionContext()
result = await orchestrator.execute([task], context)
```

### Error Handling & Fallbacks

```python
# Tasks can specify retry behavior
task = ServiceTask(
    id="send_email",
    name="Send Email",
    service="email",
    params={"to": "user@example.com"},
    timeout=30,
    retry_count=3  # Retry up to 3 times on failure
)

# Errors are collected and reported
result = await orchestrator.execute([task], context)
if result["status"] == "partial":
    print(f"Failed tasks: {result['failed']}")
    print(f"Errors: {result['errors']}")
```

---

## Layer 3: High-Level Services

**Locations**:
- `services/ai_service.py` — Unified AI provider interface
- `services/settings_service.py` — Integration settings management
- `services/credential_encryption.py` — Encrypted credential storage

### AI Service (Unified Provider Interface)

```python
from services.ai_service import get_ai_service

service = get_ai_service()

# Sync completion
response = service.complete(
    prompt="What is 2+2?",
    system="You are a helpful assistant.",
    private=True,  # Private: Ollama → Claude → DeepSeek
    max_tokens=100
)

# Async completion
response = await service.complete_async(
    prompt="Analyze this: ...",
    system="You are an analyst.",
    private=False,  # Public: Claude → DeepSeek → Ollama
    max_tokens=500
)

# Streaming
async for chunk in service.stream_complete(
    prompt="Tell me a story",
    system="You are a storyteller.",
    private=False
):
    print(chunk, end="", flush=True)
```

### Settings Service (Integration Management)

```python
from services.settings_service import get_settings_service
from sqlalchemy.orm import Session

service = get_settings_service()

# Get available platforms
platforms = service.get_available_platforms()

# Get company's integration status
integrations = service.get_company_integrations(db, company_id=42)

# Save/update credentials
credential = service.save_integration_credential(
    db=db,
    company_id=42,
    platform_id="openai",
    api_key="sk-...",
    api_secret=None,
    custom_params={"model": "gpt-4"}
)

# Test connection
result = await service.test_connection(
    platform_id="openai",
    api_key="sk-...",
    custom_params={"model": "gpt-4"}
)

# Deactivate integration
success = service.deactivate_integration(db, company_id=42, platform_id="openai")

# Remove integration
success = service.remove_integration(db, company_id=42, platform_id="openai")
```

### Credential Encryption

```python
from services.credential_encryption import get_encryptor

encryptor = get_encryptor()

# Encrypt for storage
plaintext = "sk-abc123def456"
encrypted = encryptor.encrypt(plaintext)  # "gAAAAAB..."

# Decrypt for use
decrypted = encryptor.decrypt(encrypted)  # "sk-abc123def456"

# Mask for display
masked = encryptor.mask_key(plaintext, show_chars=4)  # "***3def456"
```

---

## Integration with FastAPI Routes

### Example: Settings Route

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.settings_service import get_settings_service
from schemas_settings import IntegrationCredential

router = APIRouter(prefix="/settings", tags=["settings"])

@router.post("/integrations/{platform_id}")
def save_integration(
    platform_id: str,
    body: IntegrationCredential,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save credentials for a platform integration."""
    service = get_settings_service()
    
    # Validate platform exists
    if not service.get_platform_config(platform_id):
        raise HTTPException(status_code=404, detail="Platform not found")
    
    # Save credential (encrypted automatically)
    credential = service.save_integration_credential(
        db=db,
        company_id=get_company_id(current_user),
        platform_id=platform_id,
        api_key=body.api_key,
        api_secret=body.api_secret,
        custom_params=body.custom_params
    )
    
    return credential
```

### Example: Agent Route with Orchestration

```python
from services.service_orchestrator import ServiceTask, ExecutionContext

@router.post("/agent/dispatch-task")
async def dispatch_task(
    body: TaskDispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dispatch a task to appropriate services."""
    service = get_settings_service()
    ai_service = get_ai_service()
    
    # Use AI to analyze required services
    analysis = await ai_service.complete_async(
        prompt=f"What services are needed for: {body.task_description}",
        system="Analyze task requirements and list required services.",
        private=True
    )
    
    # Create orchestrator workflow
    orchestrator = ServiceOrchestrator()
    tasks = [
        ServiceTask(
            id="analyze",
            name="Analyze Task",
            service="ai",
            params={"analysis": analysis}
        ),
        ServiceTask(
            id="execute",
            name="Execute Task",
            service=extracted_service,
            depends_on=["analyze"]
        )
    ]
    
    context = ExecutionContext()
    context.set_data("company_id", get_company_id(current_user))
    
    result = await orchestrator.execute(tasks, context)
    
    return {
        "task_id": body.task_title,
        "status": result["status"],
        "result": context.get_all_data()
    }
```

---

## Best Practices

### 1. Always Check Platform Configuration

```python
# Bad
slack_platform = registry.get_platform("slack")
client = SlackClient(slack_platform.api_key)  # Might be None!

# Good
slack_platform = registry.get_platform("slack")
if not slack_platform or not slack_platform.api_key:
    raise ValueError("Slack not configured")
client = SlackClient(slack_platform.api_key)
```

### 2. Use ExecutionContext for Data Sharing

```python
# Bad
global_state = {}

# Good
context = ExecutionContext()
context.set_data("user_id", user_id)
context.set_data("company_id", company_id)
```

### 3. Handle Fallback Gracefully

```python
# The AI Service handles this automatically
service = get_ai_service()

# It will try: Ollama → Claude → DeepSeek
# No need to handle fallback manually
response = await service.complete_async(
    prompt="...",
    private=True  # Automatically uses best available provider
)
```

### 4. Encrypt Sensitive Data

```python
# All API keys should be encrypted
encryptor = get_encryptor()

# When storing
encrypted_key = encryptor.encrypt(api_key)
credential.api_key = encrypted_key

# When retrieving (done automatically by settings service)
decrypted_key = encryptor.decrypt(encrypted_key)
```

### 5. Log Important Events

```python
import logging
logger = logging.getLogger(__name__)

logger.info(f"Integration configured: {platform_id}")
logger.warning(f"Platform unavailable: {platform_id}")
logger.error(f"Task failed: {task.id}", exc_info=True)
```

---

## Adding a New Integration (Step-by-Step)

### Step 1: Define the Platform

```python
# In services/platform_registry.py
Platform(
    id="my_service",
    name="My Service",
    category="communication",
    description="Send notifications via My Service",
    priority=2,
    status=PlatformStatus.UNCONFIGURED,
)
```

### Step 2: Create a Settings Schema

```python
# In schemas_settings.py
class MyServiceConfig(BaseModel):
    api_key: str
    api_secret: Optional[str] = None
    webhook_url: Optional[str] = None
```

### Step 3: Implement a Handler

```python
# In services/orchestrator_handlers.py
async def handle_my_service_notification(
    context: ExecutionContext,
    task: ServiceTask
):
    registry = get_registry()
    platform = registry.get_platform("my_service")
    
    if not platform.api_key:
        context.errors.append("My Service not configured")
        return
    
    # Implement API call
    try:
        response = await call_my_service_api(
            api_key=platform.api_key,
            **task.params
        )
        context.set_data(f"{task.id}_result", response)
    except Exception as e:
        context.errors.append(str(e))
```

### Step 4: Register the Handler

```python
# In main.py or routers
orchestrator = ServiceOrchestrator()
orchestrator.register_handler("my_service", handle_my_service_notification)
```

### Step 5: Create an API Endpoint

```python
# In routers/integrations.py
@router.post("/integrations/my_service")
async def configure_my_service(
    config: MyServiceConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = get_settings_service()
    return service.save_integration_credential(
        db=db,
        company_id=get_company_id(current_user),
        platform_id="my_service",
        api_key=config.api_key,
        api_secret=config.api_secret,
        custom_params={"webhook_url": config.webhook_url}
    )
```

---

## Debugging & Troubleshooting

### Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Inspect Platform Status

```python
registry = get_registry()
for platform in registry.get_platforms():
    print(f"{platform.name}: {platform.status}")
```

### Test Integration

```python
service = get_settings_service()
result = await service.test_connection(
    platform_id="openai",
    api_key="sk-...",
    custom_params={}
)
print(result)  # {"success": true/false, "message": "..."}
```

### Check Encryption

```python
encryptor = get_encryptor()
plaintext = "test-secret"
encrypted = encryptor.encrypt(plaintext)
decrypted = encryptor.decrypt(encrypted)
assert decrypted == plaintext, "Encryption/decryption failed"
```

---

## Performance Optimization

### 1. Use Async Operations

```python
# Slow
response = service.complete(prompt="...")

# Fast
response = await service.complete_async(prompt="...")
```

### 2. Cache Platform Configurations

```python
# Registry caches platforms automatically
registry = get_registry()  # First call: loads from disk/db
registry = get_registry()  # Second call: returns cached instance
```

### 3. Batch Operations in Orchestrator

```python
# Instead of multiple sequential tasks
tasks = [
    ServiceTask(id="1", service="email", ...),
    ServiceTask(id="2", service="email", ...),  # These will run in parallel
    ServiceTask(id="3", service="slack", ...),   # This waits for both above
]
```

### 4. Set Appropriate Timeouts

```python
task = ServiceTask(
    id="send_email",
    service="email",
    timeout=10  # 10 seconds
)
```

---

## Security Checklist

- [ ] All API keys are encrypted at rest
- [ ] Encryption keys are stored in secure vault
- [ ] API keys are masked in API responses
- [ ] Sensitive data is not logged
- [ ] Secrets are not committed to Git
- [ ] HTTPS is enforced for all external API calls
- [ ] Rate limiting is implemented
- [ ] Input validation on all endpoints
- [ ] CORS is properly configured
- [ ] Database queries use parameterized statements (SQLAlchemy ORM does this)

---

## Next Steps

1. Review existing services in `services/` directory
2. Follow the step-by-step guide to add new integrations
3. Run tests to ensure integration works
4. Deploy and monitor in production
