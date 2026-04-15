"""
ALLOUL&Q DeepSeek Client
========================
OpenAI-compatible client for DeepSeek API.

DeepSeek is used as a fallback tier when Claude isn't available (or to reduce
cost). It speaks the OpenAI chat completions protocol, so we use the `openai`
SDK pointed at api.deepseek.com.

Public surface mirrors services.claude_client.ClaudeClient so the two are
swappable inside the AI router:
    - chat(messages, system_prompt, model, max_tokens, temperature) -> dict
    - stream_chat(...) -> async iterator
    - is_available() -> bool
"""

from __future__ import annotations

import logging
import time
from typing import AsyncIterator, Optional

logger = logging.getLogger("alloul.ai.deepseek")


class DeepSeekClient:
    """Lightweight async client for DeepSeek's OpenAI-compatible API."""

    def __init__(self):
        self._client = None
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._request_count = 0
        self._error_count = 0

    def _get_client(self):
        """Lazy-load the AsyncOpenAI client pointed at DeepSeek."""
        if self._client is not None:
            return self._client

        try:
            from config import settings
            if not settings.DEEPSEEK_API_KEY:
                logger.warning("DEEPSEEK_API_KEY not set")
                return None

            try:
                from openai import AsyncOpenAI
            except ImportError:
                logger.error("openai SDK not installed — `pip install openai`")
                return None

            self._client = AsyncOpenAI(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL,
            )
            logger.info("DeepSeek client initialized")
            return self._client
        except Exception as e:
            logger.error("Failed to initialize DeepSeek client: %s", e)
            return None

    def is_available(self) -> bool:
        """Quick check: do we have a key and SDK installed?"""
        try:
            from config import settings
            if not settings.DEEPSEEK_API_KEY:
                return False
            import openai  # noqa: F401
            return True
        except Exception:
            return False

    async def chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> dict:
        """Send a chat request. Returns the same shape as ClaudeClient.chat()."""
        client = self._get_client()
        if not client:
            raise RuntimeError("DeepSeek client not available")

        from config import settings
        use_model = model or settings.DEEPSEEK_MODEL

        # DeepSeek / OpenAI expects system message inline
        oai_messages: list[dict] = []
        if system_prompt:
            oai_messages.append({"role": "system", "content": system_prompt})
        oai_messages.extend(messages)

        start = time.time()
        try:
            resp = await client.chat.completions.create(
                model=use_model,
                messages=oai_messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = resp.choices[0].message.content or ""
            usage = resp.usage
            input_tokens = getattr(usage, "prompt_tokens", 0) or 0
            output_tokens = getattr(usage, "completion_tokens", 0) or 0

            self._total_input_tokens += input_tokens
            self._total_output_tokens += output_tokens
            self._request_count += 1

            latency_ms = (time.time() - start) * 1000
            logger.info(
                "DeepSeek chat ok: model=%s input=%d output=%d latency=%.0fms",
                use_model, input_tokens, output_tokens, latency_ms,
            )

            return {
                "content": content,
                "tokens_used": {
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": input_tokens + output_tokens,
                },
                "cost": 0.0,  # DeepSeek pricing is ~$0.14 / 1M input, not tracked here
                "model": use_model,
                "latency_ms": latency_ms,
            }
        except Exception as e:
            self._error_count += 1
            logger.error("DeepSeek chat failed: %s", e)
            raise

    async def stream_chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> AsyncIterator[str]:
        """Stream tokens as they arrive."""
        client = self._get_client()
        if not client:
            raise RuntimeError("DeepSeek client not available")

        from config import settings
        use_model = model or settings.DEEPSEEK_MODEL

        oai_messages: list[dict] = []
        if system_prompt:
            oai_messages.append({"role": "system", "content": system_prompt})
        oai_messages.extend(messages)

        try:
            stream = await client.chat.completions.create(
                model=use_model,
                messages=oai_messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
            self._request_count += 1
        except Exception as e:
            self._error_count += 1
            logger.error("DeepSeek stream failed: %s", e)
            raise

    def get_stats(self) -> dict:
        return {
            "provider": "deepseek",
            "requests": {"total": self._request_count, "failed": self._error_count},
            "tokens": {
                "input": self._total_input_tokens,
                "output": self._total_output_tokens,
                "total": self._total_input_tokens + self._total_output_tokens,
            },
        }


# Singleton
deepseek_client = DeepSeekClient()
