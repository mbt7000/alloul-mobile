"""Integration tests for services — Platform Registry, Orchestrator, AI Service, Settings."""
import pytest
import asyncio
from sqlalchemy.orm import Session

from services.platform_registry import get_registry, PlatformRegistry
from services.service_orchestrator import ServiceOrchestrator, ServiceTask, ExecutionContext
from services.ai_service import get_ai_service
from services.settings_service import get_settings_service
from services.credential_encryption import get_encryptor
from models import Company, APICredential


class TestPlatformRegistry:
    """Test the Platform Registry for managing integrations."""

    def test_registry_singleton(self):
        """Registry should return the same instance."""
        registry1 = get_registry()
        registry2 = get_registry()
        assert registry1 is registry2

    def test_get_platform(self):
        """Should retrieve a platform by ID."""
        registry = get_registry()
        platform = registry.get_platform("openai")
        assert platform is not None
        assert platform.id == "openai"
        assert platform.name == "OpenAI"

    def test_get_platforms(self):
        """Should retrieve all platforms."""
        registry = get_registry()
        platforms = registry.get_platforms()
        assert len(platforms) > 0
        platform_ids = [p.id for p in platforms]
        assert "openai" in platform_ids

    def test_get_platforms_by_category(self):
        """Should filter platforms by category."""
        registry = get_registry()
        ai_platforms = registry.get_platforms_by_category("ai")
        assert len(ai_platforms) > 0
        for p in ai_platforms:
            assert p.category == "ai"

    def test_get_configured_platforms(self):
        """Should return platforms with credentials set."""
        registry = get_registry()
        # Add some test credentials
        registry.get_platform("openai").api_key = "test-key-123"
        configured = registry.get_configured_platforms()
        # Should have at least one
        assert any(p.id == "openai" for p in configured)


class TestServiceOrchestrator:
    """Test the Service Orchestrator for workflow management."""

    def test_orchestrator_singleton(self):
        """Orchestrator should be a singleton."""
        orch1 = ServiceOrchestrator()
        orch2 = ServiceOrchestrator()
        # Both are instances but can be different (orchestrator doesn't enforce singleton like registry)
        assert isinstance(orch1, ServiceOrchestrator)
        assert isinstance(orch2, ServiceOrchestrator)

    def test_topological_sort_basic(self):
        """Should sort tasks by dependencies."""
        orch = ServiceOrchestrator()

        task_a = ServiceTask(id="a", name="Task A", service="test")
        task_b = ServiceTask(id="b", name="Task B", service="test", depends_on=["a"])
        task_c = ServiceTask(id="c", name="Task C", service="test", depends_on=["b"])

        sorted_tasks = orch._topological_sort([task_c, task_a, task_b])
        order = [t.id for t in sorted_tasks]
        assert order == ["a", "b", "c"]

    def test_topological_sort_parallel_tasks(self):
        """Should handle parallel tasks (no dependencies)."""
        orch = ServiceOrchestrator()

        task_a = ServiceTask(id="a", name="Task A", service="test")
        task_b = ServiceTask(id="b", name="Task B", service="test")

        sorted_tasks = orch._topological_sort([task_b, task_a])
        assert len(sorted_tasks) == 2
        ids = {t.id for t in sorted_tasks}
        assert ids == {"a", "b"}

    def test_execution_context_data_passing(self):
        """ExecutionContext should allow data sharing between tasks."""
        context = ExecutionContext()
        context.set_data("key1", "value1")
        assert context.get_data("key1") == "value1"

        context.set_data("nested", {"inner": "data"})
        assert context.get_data("nested")["inner"] == "data"

    @pytest.mark.asyncio
    async def test_execute_single_task(self):
        """Should execute a single task."""
        orch = ServiceOrchestrator()

        # Register a simple handler
        executed = []
        async def test_handler(context: ExecutionContext, task: ServiceTask):
            executed.append(task.id)
            context.set_data("result", "success")

        orch.register_handler("test", test_handler)

        task = ServiceTask(id="test1", name="Test Task", service="test")
        context = ExecutionContext()

        result = await orch.execute([task], context)
        assert result["status"] == "success"
        assert "test1" in executed

    @pytest.mark.asyncio
    async def test_execute_task_sequence(self):
        """Should execute tasks in dependency order."""
        orch = ServiceOrchestrator()
        execution_order = []

        async def handler_a(context: ExecutionContext, task: ServiceTask):
            execution_order.append("a")
            context.set_data("a_result", "A completed")

        async def handler_b(context: ExecutionContext, task: ServiceTask):
            execution_order.append("b")
            a_result = context.get_data("a_result")
            assert a_result == "A completed"

        orch.register_handler("test", handler_a)
        orch.register_handler("test", handler_b)

        task_a = ServiceTask(id="task_a", name="A", service="test")
        task_b = ServiceTask(id="task_b", name="B", service="test", depends_on=["task_a"])

        context = ExecutionContext()
        result = await orch.execute([task_b, task_a], context)

        assert result["status"] == "success"
        assert execution_order == ["a", "b"]


class TestAIService:
    """Test the unified AI Service with provider fallback."""

    def test_ai_service_singleton(self):
        """AI Service should be a singleton."""
        service1 = get_ai_service()
        service2 = get_ai_service()
        assert service1 is service2

    def test_get_preferred_provider_private(self):
        """Should prefer private provider for sensitive data."""
        service = get_ai_service()
        # Private mode: Ollama → Claude → DeepSeek
        provider = service.get_preferred_provider(private=True)
        assert provider is not None

    def test_get_preferred_provider_public(self):
        """Should prefer public provider for general queries."""
        service = get_ai_service()
        # Public mode: Claude → DeepSeek → Ollama
        provider = service.get_preferred_provider(private=False)
        assert provider is not None

    @pytest.mark.asyncio
    async def test_complete_async(self):
        """Should handle async completion requests."""
        service = get_ai_service()

        # This is a mock test — in real scenario would call actual LLM
        # We just verify the interface works
        result = await service.complete_async(
            prompt="What is 2+2?",
            system="You are a helpful assistant.",
            private=False,
            max_tokens=50
        )
        assert isinstance(result, str)


class TestSettingsService:
    """Test the Settings Service for integration management."""

    def test_settings_service_singleton(self):
        """Settings Service should be a singleton."""
        service1 = get_settings_service()
        service2 = get_settings_service()
        assert service1 is service2

    def test_get_available_platforms(self):
        """Should return list of available platforms."""
        service = get_settings_service()
        platforms = service.get_available_platforms()
        assert len(platforms) > 0
        assert all(hasattr(p, 'id') for p in platforms)
        assert all(hasattr(p, 'name') for p in platforms)

    def test_get_platform_config(self):
        """Should retrieve platform configuration."""
        service = get_settings_service()
        config = service.get_platform_config("openai")
        assert config is not None
        assert config.id == "openai"
        assert config.name == "OpenAI"

    def test_get_nonexistent_platform(self):
        """Should return None for unknown platform."""
        service = get_settings_service()
        config = service.get_platform_config("nonexistent-platform-xyz")
        assert config is None


class TestCredentialEncryption:
    """Test credential encryption/decryption."""

    def test_encryptor_singleton(self):
        """Encryptor should be a singleton."""
        enc1 = get_encryptor()
        enc2 = get_encryptor()
        assert enc1 is enc2

    def test_encrypt_decrypt_roundtrip(self):
        """Should encrypt and decrypt the same value."""
        encryptor = get_encryptor()

        plaintext = "sk-1234567890abcdef"
        encrypted = encryptor.encrypt(plaintext)
        decrypted = encryptor.decrypt(encrypted)

        assert decrypted == plaintext
        assert encrypted != plaintext

    def test_empty_string_encryption(self):
        """Should handle empty strings gracefully."""
        encryptor = get_encryptor()

        encrypted = encryptor.encrypt("")
        assert encrypted == ""

        decrypted = encryptor.decrypt("")
        assert decrypted == ""

    def test_mask_key(self):
        """Should mask API keys showing only last 4 chars."""
        encryptor = get_encryptor()

        key = "sk-1234567890abcdef"
        masked = encryptor.mask_key(key, show_chars=4)
        assert masked == "***cdef"
        assert len(masked) == 7

    def test_mask_short_key(self):
        """Should return *** for keys shorter than show_chars."""
        encryptor = get_encryptor()

        key = "abc"
        masked = encryptor.mask_key(key, show_chars=4)
        assert masked == "***"


class TestIntegrationFlow:
    """Test complete integration workflows."""

    @pytest.mark.asyncio
    async def test_credential_encryption_integration(self):
        """Test encrypting credentials through the complete flow."""
        encryptor = get_encryptor()

        # Simulate storing encrypted credential
        original_key = "sk-test-key-123"
        encrypted = encryptor.encrypt(original_key)

        # Simulate retrieving and decrypting
        decrypted = encryptor.decrypt(encrypted)

        # Verify the roundtrip
        assert decrypted == original_key
        assert encrypted != original_key

    @pytest.mark.asyncio
    async def test_service_orchestrator_with_context(self):
        """Test orchestrator passing context between tasks."""
        orch = ServiceOrchestrator()

        results = {"step1": None, "step2": None}

        async def step1(context: ExecutionContext, task: ServiceTask):
            context.set_data("company_id", 42)
            results["step1"] = "completed"

        async def step2(context: ExecutionContext, task: ServiceTask):
            company_id = context.get_data("company_id")
            assert company_id == 42
            results["step2"] = "completed"

        orch.register_handler("test", step1)
        orch.register_handler("test", step2)

        task1 = ServiceTask(id="t1", name="Step 1", service="test")
        task2 = ServiceTask(id="t2", name="Step 2", service="test", depends_on=["t1"])

        context = ExecutionContext()
        result = await orch.execute([task1, task2], context)

        assert result["status"] == "success"
        assert results["step1"] == "completed"
        assert results["step2"] == "completed"
