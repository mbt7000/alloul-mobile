"""
ALLOUL&Q Smart AI Router
=========================
Three-tier AI system that routes requests to the optimal provider:

Tier 1 (Claude API): Complex tasks - reports, documents, strategic analysis
Tier 2 (Ollama/HF): Fast tasks - classification, tagging, extraction, quick summaries
Tier 3 (Custom Model): Future - ALLOUL&Q-specific tasks trained on platform data

Fallback chain: Claude → Ollama → Error (or Ollama → Claude → Error)
"""

from __future__ import annotations

import logging
import time
import os
import httpx
from typing import Optional, Any, AsyncIterator
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger("alloul.ai.router")


class AIProvider(str, Enum):
    """Available AI providers."""
    CLAUDE = "claude"
    OLLAMA = "ollama"
    HUGGINGFACE = "huggingface"
    CUSTOM = "custom"


class AITask(str, Enum):
    """Task types and their preferred tiers."""
    # Tier 1: Claude
    GENERATE_REPORT = "generate_report"
    WRITE_DOCUMENT = "write_document"
    COMPLEX_ANALYSIS = "complex_analysis"
    STRATEGIC_ADVICE = "strategic_advice"
    MEETING_SUMMARY = "meeting_summary"
    HANDOVER_ANALYSIS = "handover_analysis"
    LONG_FORM_CHAT = "long_form_chat"
    CREATIVE_WRITING = "creative_writing"
    CODE_GENERATION = "code_generation"

    # Tier 2: Ollama/HF
    CLASSIFY = "classify"
    TAG = "tag"
    EXTRACT_KEYWORDS = "extract_keywords"
    QUICK_SUMMARY = "quick_summary"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    EXTRACT_ENTITIES = "extract_entities"
    TRANSLATE_SHORT = "translate_short"
    INTENT_DETECTION = "intent_detection"
    STRUCTURED_EXTRACTION = "structured_extraction"

    # Tier 3: Custom (future)
    ALLOUL_SPECIFIC = "alloul_specific"
    ARABIC_BUSINESS = "arabic_business"
    HANDOVER_GENERATION = "handover_generation"
    TASK_ORGANIZATION = "task_organization"


@dataclass
class AIRequest:
    """Request to route to an AI provider."""
    task: AITask | str
    prompt: str
    system_prompt: Optional[str] = None
    model_override: Optional[str] = None
    temperature: float = 0.3
    max_tokens: int = 2048
    stream: bool = False
    metadata: dict = field(default_factory=dict)
    language: str = "ar"


@dataclass
class AIResponse:
    """Response from an AI provider."""
    content: str
    provider: AIProvider
    model: str
    latency_ms: float
    tokens_used: Optional[int] = None
    cached: bool = False
    fallback_used: bool = False
    metadata: dict = field(default_factory=dict)


class AIRouter:
    """Smart AI router that routes requests to optimal providers."""

    # Task-to-tier mappings
    _TIER_1_TASKS = {
        AITask.GENERATE_REPORT,
        AITask.WRITE_DOCUMENT,
        AITask.COMPLEX_ANALYSIS,
        AITask.STRATEGIC_ADVICE,
        AITask.MEETING_SUMMARY,
        AITask.HANDOVER_ANALYSIS,
        AITask.LONG_FORM_CHAT,
        AITask.CREATIVE_WRITING,
        AITask.CODE_GENERATION,
    }

    _TIER_2_TASKS = {
        AITask.CLASSIFY,
        AITask.TAG,
        AITask.EXTRACT_KEYWORDS,
        AITask.QUICK_SUMMARY,
        AITask.SENTIMENT_ANALYSIS,
        AITask.EXTRACT_ENTITIES,
        AITask.TRANSLATE_SHORT,
        AITask.INTENT_DETECTION,
        AITask.STRUCTURED_EXTRACTION,
    }

    _TIER_3_TASKS = {
        AITask.ALLOUL_SPECIFIC,
        AITask.ARABIC_BUSINESS,
        AITask.HANDOVER_GENERATION,
        AITask.TASK_ORGANIZATION,
    }

    def __init__(self):
        """Initialize the AI router."""
        self._claude_client = None
        self._ollama_available = None
        self._hf_client = None
        self._usage_stats = {"claude": 0, "ollama": 0, "hf": 0, "custom": 0}
        self._error_stats = {"claude": 0, "ollama": 0, "hf": 0, "custom": 0}
        self._initialized_at = datetime.now()
        self._cache_hits = 0

        logger.info("AIRouter initialized")

    def _get_claude_client(self) -> Optional[object]:
        """Lazy-load the Claude client."""
        if self._claude_client is not None:
            return self._claude_client

        try:
            from services.claude_client import claude_client
            self._claude_client = claude_client
            logger.info("Claude client loaded")
            return self._claude_client
        except Exception as e:
            logger.warning("Failed to load Claude client: %s", e)
            return None

    async def _check_ollama_available(self) -> bool:
        """Check if Ollama is available (cache result for 60 seconds)."""
        if self._ollama_available is not None:
            return self._ollama_available

        try:
            from services.ai_engine.client import ollama_health
            available = await ollama_health()
            self._ollama_available = available
            if available:
                logger.info("Ollama is available")
            else:
                logger.warning("Ollama health check failed")
            return available
        except Exception as e:
            logger.warning("Ollama availability check failed: %s", e)
            self._ollama_available = False
            return False

    def _get_provider(self, task: AITask | str) -> AIProvider:
        """Determine the optimal provider for a task."""
        # Convert string to AITask if needed
        if isinstance(task, str):
            try:
                task = AITask(task)
            except ValueError:
                logger.warning("Unknown task type: %s, defaulting to CLAUDE", task)
                return AIProvider.CLAUDE

        # Check if it's explicitly a custom task
        if task in self._TIER_3_TASKS:
            return AIProvider.CUSTOM

        # Tier 1: Claude
        if task in self._TIER_1_TASKS:
            return AIProvider.CLAUDE

        # Tier 2: Ollama (fast, cheap)
        if task in self._TIER_2_TASKS:
            return AIProvider.OLLAMA

        # Default to Claude for unknown tasks
        logger.warning("Task %s not in any tier, defaulting to CLAUDE", task)
        return AIProvider.CLAUDE

    def _get_fallback(self, provider: AIProvider) -> AIProvider:
        """Get the fallback provider for a given provider."""
        fallback_map = {
            AIProvider.CLAUDE: AIProvider.OLLAMA,
            AIProvider.OLLAMA: AIProvider.CLAUDE,
            AIProvider.HUGGINGFACE: AIProvider.OLLAMA,
            AIProvider.CUSTOM: AIProvider.CLAUDE,
        }
        return fallback_map.get(provider, AIProvider.CLAUDE)

    async def _execute_claude(
        self,
        request: AIRequest,
        is_fallback: bool = False,
    ) -> AIResponse:
        """Call Claude API."""
        start_time = time.time()
        client = self._get_claude_client()

        if not client:
            raise RuntimeError("Claude client not available")

        try:
            model = request.model_override or "claude-sonnet-4-20250514"
            messages = [{"role": "user", "content": request.prompt}]

            result = await client.chat(
                messages=messages,
                system_prompt=request.system_prompt,
                model=model,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            )

            latency_ms = (time.time() - start_time) * 1000
            self._usage_stats["claude"] += 1

            logger.info(
                "Claude execution successful: task=%s, latency=%.0fms, fallback=%s",
                request.task, latency_ms, is_fallback
            )

            return AIResponse(
                content=result["content"],
                provider=AIProvider.CLAUDE,
                model=result["model"],
                latency_ms=latency_ms,
                tokens_used=result["tokens_used"]["total"],
                fallback_used=is_fallback,
                metadata={
                    "cost_usd": result.get("cost", 0),
                    "tokens": result["tokens_used"],
                },
            )

        except Exception as e:
            self._error_stats["claude"] += 1
            logger.error("Claude execution failed: %s", e)
            raise

    async def _execute_ollama(
        self,
        request: AIRequest,
        is_fallback: bool = False,
    ) -> AIResponse:
        """Call local Ollama instance."""
        start_time = time.time()

        try:
            from services.ai_engine.client import (
                ollama_generate,
                OLLAMA_MODEL,
                OLLAMA_TIMEOUT,
            )

            model = request.model_override or OLLAMA_MODEL

            # Build prompt with system context if provided
            prompt = request.prompt
            if request.system_prompt:
                prompt = f"{request.system_prompt}\n\n{prompt}"

            response = await ollama_generate(
                prompt=prompt,
                model=model,
                timeout=OLLAMA_TIMEOUT,
            )

            latency_ms = (time.time() - start_time) * 1000
            self._usage_stats["ollama"] += 1

            logger.info(
                "Ollama execution successful: task=%s, model=%s, latency=%.0fms, fallback=%s",
                request.task, model, latency_ms, is_fallback
            )

            return AIResponse(
                content=response,
                provider=AIProvider.OLLAMA,
                model=model,
                latency_ms=latency_ms,
                fallback_used=is_fallback,
                metadata={"local": True},
            )

        except Exception as e:
            self._error_stats["ollama"] += 1
            logger.error("Ollama execution failed: %s", e)
            raise

    async def _execute_hf(
        self,
        request: AIRequest,
        is_fallback: bool = False,
    ) -> AIResponse:
        """Call Hugging Face model (placeholder for future implementation)."""
        raise NotImplementedError("Hugging Face provider not yet implemented")

    async def route(self, request: AIRequest) -> AIResponse:
        """
        Route request to optimal provider with fallback.

        Args:
            request: AIRequest with task, prompt, and parameters

        Returns:
            AIResponse with content and metadata
        """
        provider = self._get_provider(request.task)

        logger.info("Routing task=%s to provider=%s", request.task, provider.value)

        try:
            return await self._execute(provider, request, is_fallback=False)
        except Exception as e:
            logger.warning(
                "Primary provider %s failed for task %s, attempting fallback: %s",
                provider.value, request.task, e
            )

            fallback = self._get_fallback(provider)
            if fallback == provider:
                logger.error("No fallback available, raising error")
                raise

            try:
                return await self._execute(fallback, request, is_fallback=True)
            except Exception as fallback_error:
                logger.error("Fallback provider %s also failed: %s", fallback.value, fallback_error)
                raise

    async def _execute(
        self,
        provider: AIProvider,
        request: AIRequest,
        is_fallback: bool = False,
    ) -> AIResponse:
        """Execute a request on a specific provider."""
        if provider == AIProvider.CLAUDE:
            return await self._execute_claude(request, is_fallback=is_fallback)
        elif provider == AIProvider.OLLAMA:
            # Check availability first
            available = await self._check_ollama_available()
            if not available:
                raise RuntimeError("Ollama not available")
            return await self._execute_ollama(request, is_fallback=is_fallback)
        elif provider == AIProvider.HUGGINGFACE:
            return await self._execute_hf(request, is_fallback=is_fallback)
        elif provider == AIProvider.CUSTOM:
            raise NotImplementedError("Custom provider not yet implemented")
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def stream(self, request: AIRequest) -> AsyncIterator[str]:
        """
        Stream response from Claude (Ollama doesn't stream well).

        Args:
            request: AIRequest to stream

        Yields:
            Text chunks as they arrive
        """
        provider = self._get_provider(request.task)

        if provider != AIProvider.CLAUDE:
            # Fall back to Claude for streaming
            provider = AIProvider.CLAUDE
            logger.info("Switching to Claude for streaming")

        client = self._get_claude_client()
        if not client:
            raise RuntimeError("Claude client not available for streaming")

        try:
            model = request.model_override or "claude-sonnet-4-20250514"
            messages = [{"role": "user", "content": request.prompt}]

            async for chunk in await client.stream_chat(
                messages=messages,
                system_prompt=request.system_prompt,
                model=model,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
            ):
                yield chunk

            self._usage_stats["claude"] += 1
            logger.info("Claude streaming completed for task=%s", request.task)

        except Exception as e:
            self._error_stats["claude"] += 1
            logger.error("Claude streaming failed: %s", e)
            raise

    async def health_check(self) -> dict:
        """
        Check health of all providers.

        Returns:
            Dict with health status for each provider
        """
        health = {
            "claude": False,
            "ollama": False,
            "huggingface": False,
            "timestamp": datetime.now().isoformat(),
        }

        # Check Claude
        try:
            client = self._get_claude_client()
            health["claude"] = client is not None
        except Exception as e:
            logger.warning("Claude health check failed: %s", e)

        # Check Ollama
        try:
            health["ollama"] = await self._check_ollama_available()
        except Exception as e:
            logger.warning("Ollama health check failed: %s", e)

        # HuggingFace check (placeholder)
        health["huggingface"] = False  # Not yet implemented

        return health

    def get_usage_stats(self) -> dict:
        """
        Return usage statistics for all providers.

        Returns:
            Dict with request counts, errors, uptime, and efficiency metrics
        """
        uptime_seconds = (datetime.now() - self._initialized_at).total_seconds()
        total_requests = sum(self._usage_stats.values())
        total_errors = sum(self._error_stats.values())

        return {
            "usage": dict(self._usage_stats),
            "errors": dict(self._error_stats),
            "total_requests": total_requests,
            "total_errors": total_errors,
            "success_rate": (total_requests / (total_requests + total_errors) * 100) if (total_requests + total_errors) > 0 else 0,
            "cache_hits": self._cache_hits,
            "uptime_seconds": uptime_seconds,
            "providers": {
                "claude": "available" if self._get_claude_client() else "unavailable",
                "ollama": "checking",
            },
        }


# Singleton instance
ai_router = AIRouter()
