"""
ALLOUL&Q Ollama Client — Privacy-First Local AI
================================================
Runs entirely on the company's own server. No data ever leaves the machine.
Used for privacy-sensitive operations: handover briefings, task analysis,
meeting notes, financial summaries — anything involving company content.

Default model: `qwen2.5:7b` (strong Arabic + reasoning, ~4.7GB)
Fallback: `llama3.2:3b` (faster, ~2GB, weaker on Arabic)

Setup on server:
    curl -fsSL https://ollama.com/install.sh | sh
    ollama pull qwen2.5:7b
    ollama serve   # auto-starts on 127.0.0.1:11434

Public API mirrors ClaudeClient / DeepSeekClient:
    - is_available() -> bool (health check cached for 60s)
    - chat(messages, system_prompt, model, max_tokens, temperature) -> dict
    - stream_chat(...) -> async iterator[str]
"""

from __future__ import annotations

import logging
import time
from typing import AsyncIterator, Optional

import httpx

logger = logging.getLogger("alloul.ai.ollama")

_HEALTH_CACHE: dict[str, object] = {"ok": None, "checked_at": 0.0}
_HEALTH_TTL_SECONDS = 60


class OllamaClient:
    """Async client for a local Ollama instance."""

    def __init__(self):
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._request_count = 0
        self._error_count = 0

    def _base_url(self) -> str:
        from config import settings
        return settings.OLLAMA_BASE_URL.rstrip("/")

    def _default_model(self) -> str:
        from config import settings
        return settings.OLLAMA_MODEL or "qwen2.5:7b"

    def _timeout(self) -> float:
        from config import settings
        return float(settings.OLLAMA_TIMEOUT or 120)

    async def is_available(self) -> bool:
        """Check health with a 60-second cache."""
        now = time.time()
        if _HEALTH_CACHE["ok"] is not None and (now - float(_HEALTH_CACHE["checked_at"])) < _HEALTH_TTL_SECONDS:
            return bool(_HEALTH_CACHE["ok"])

        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                r = await client.get(f"{self._base_url()}/api/tags")
                ok = r.status_code == 200
        except Exception:
            ok = False

        _HEALTH_CACHE["ok"] = ok
        _HEALTH_CACHE["checked_at"] = now
        if ok:
            logger.info("Ollama healthy at %s", self._base_url())
        else:
            logger.info("Ollama unavailable at %s", self._base_url())
        return ok

    async def chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> dict:
        """Single-turn chat. Returns same shape as ClaudeClient.chat()."""
        use_model = model or self._default_model()

        # Build Ollama chat messages
        oai_messages: list[dict] = []
        if system_prompt:
            oai_messages.append({"role": "system", "content": system_prompt})
        oai_messages.extend(messages)

        body = {
            "model": use_model,
            "messages": oai_messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        start = time.time()
        try:
            async with httpx.AsyncClient(timeout=self._timeout()) as client:
                r = await client.post(f"{self._base_url()}/api/chat", json=body)
                r.raise_for_status()
                data = r.json()

            content = (data.get("message") or {}).get("content", "")
            input_tokens = int(data.get("prompt_eval_count") or 0)
            output_tokens = int(data.get("eval_count") or 0)

            self._total_input_tokens += input_tokens
            self._total_output_tokens += output_tokens
            self._request_count += 1

            latency_ms = (time.time() - start) * 1000
            logger.info(
                "Ollama chat ok: model=%s input=%d output=%d latency=%.0fms",
                use_model, input_tokens, output_tokens, latency_ms,
            )

            return {
                "content": content,
                "tokens_used": {
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": input_tokens + output_tokens,
                },
                "cost": 0.0,  # Ollama is free
                "model": use_model,
                "latency_ms": latency_ms,
                "provider": "ollama",
            }
        except httpx.HTTPError as e:
            self._error_count += 1
            logger.error("Ollama HTTP error: %s", e)
            raise RuntimeError(f"Ollama request failed: {e}")
        except Exception as e:
            self._error_count += 1
            logger.error("Ollama chat failed: %s", e)
            raise

    async def stream_chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> AsyncIterator[str]:
        """Stream tokens. Ollama returns NDJSON chunks."""
        use_model = model or self._default_model()
        oai_messages: list[dict] = []
        if system_prompt:
            oai_messages.append({"role": "system", "content": system_prompt})
        oai_messages.extend(messages)

        body = {
            "model": use_model,
            "messages": oai_messages,
            "stream": True,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout()) as client:
                async with client.stream("POST", f"{self._base_url()}/api/chat", json=body) as r:
                    r.raise_for_status()
                    async for line in r.aiter_lines():
                        if not line:
                            continue
                        try:
                            import json as _json
                            chunk = _json.loads(line)
                            msg = chunk.get("message") or {}
                            text = msg.get("content") or ""
                            if text:
                                yield text
                            if chunk.get("done"):
                                break
                        except Exception:
                            continue
            self._request_count += 1
        except Exception as e:
            self._error_count += 1
            logger.error("Ollama stream failed: %s", e)
            raise

    def get_stats(self) -> dict:
        return {
            "provider": "ollama",
            "requests": {"total": self._request_count, "failed": self._error_count},
            "tokens": {
                "input": self._total_input_tokens,
                "output": self._total_output_tokens,
                "total": self._total_input_tokens + self._total_output_tokens,
            },
        }


# Singleton
ollama_client = OllamaClient()
