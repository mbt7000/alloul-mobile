"""
ALLOUL&Q Enhanced Ollama Client
================================
Extends the base Ollama client with:
- Multi-model support (switch between models)
- Chat completion API (not just generate)
- Model management (pull, list, delete)
- Performance tracking
- Streaming support
- Arabic-optimized presets
"""
from __future__ import annotations
import os
import logging
import time
from typing import Optional, AsyncIterator, Any
import httpx

logger = logging.getLogger("alloul.ai.ollama")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")

# Model presets optimized for ALLOUL&Q workflows
MODEL_PRESETS = {
    "default": {
        "model": "llama3.2:3b",
        "temperature": 0.0,
        "description": "Default fast model for extraction",
    },
    "arabic_chat": {
        "model": "qwen2.5:7b",
        "temperature": 0.3,
        "description": "Arabic-optimized chat model",
    },
    "arabic_fast": {
        "model": "qwen2.5:3b",
        "temperature": 0.2,
        "description": "Fast Arabic model",
    },
    "creative": {
        "model": "qwen2.5:7b",
        "temperature": 0.7,
        "description": "Creative content generation",
    },
    "structured": {
        "model": "llama3.2:3b",
        "temperature": 0.0,
        "description": "Deterministic structured extraction",
    },
}


class OllamaEnhanced:
    """
    Enhanced Ollama client with multi-model support, chat API, and performance tracking.
    """

    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        """
        Initialize OllamaEnhanced client.

        Args:
            base_url: Base URL for Ollama service
        """
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient()
        self._stats = {
            "total_requests": 0,
            "total_errors": 0,
            "total_latency": 0.0,
            "by_model": {},
        }
        logger.info(f"OllamaEnhanced initialized with {self.base_url}")

    async def generate(
        self,
        prompt: str,
        model: Optional[str] = None,
        preset: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: int = 512,
    ) -> str:
        """
        Generate text completion.

        Args:
            prompt: Input prompt
            model: Model name (overrides preset)
            preset: Preset name from MODEL_PRESETS
            temperature: Sampling temperature (0.0-1.0)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text

        Raises:
            ValueError: If model/preset not found
        """
        if preset and preset not in MODEL_PRESETS:
            raise ValueError(f"Unknown preset: {preset}")

        # Resolve model and temperature
        if model is None:
            if preset is None:
                preset = "default"
            model = MODEL_PRESETS[preset]["model"]
            if temperature is None:
                temperature = MODEL_PRESETS[preset]["temperature"]

        if temperature is None:
            temperature = 0.3

        logger.debug(f"Generate: model={model}, tokens={max_tokens}, temp={temperature}")

        start_time = time.time()
        try:
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,
                "temperature": temperature,
                "num_predict": max_tokens,
            }

            response = await self._client.post(
                f"{self.base_url}/api/generate", json=payload, timeout=60.0
            )
            response.raise_for_status()
            result = response.json()

            self._record_request(model, time.time() - start_time, success=True)
            return result.get("response", "")

        except Exception as e:
            self._record_request(model, time.time() - start_time, success=False)
            logger.error(f"Generation failed: {e}")
            raise

    async def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        preset: Optional[str] = None,
        system: Optional[str] = None,
    ) -> str:
        """
        Chat completion using /api/chat endpoint.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (overrides preset)
            preset: Preset name from MODEL_PRESETS
            system: System prompt/instruction

        Returns:
            Assistant response

        Raises:
            ValueError: If model/preset not found
        """
        if preset and preset not in MODEL_PRESETS:
            raise ValueError(f"Unknown preset: {preset}")

        # Resolve model
        if model is None:
            preset = preset or "default"
            model = MODEL_PRESETS[preset]["model"]

        logger.debug(f"Chat: model={model}, messages={len(messages)}")

        start_time = time.time()
        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
            }

            if system:
                payload["system"] = system

            response = await self._client.post(
                f"{self.base_url}/api/chat", json=payload, timeout=60.0
            )
            response.raise_for_status()
            result = response.json()

            self._record_request(model, time.time() - start_time, success=True)
            return result.get("message", {}).get("content", "")

        except Exception as e:
            self._record_request(model, time.time() - start_time, success=False)
            logger.error(f"Chat failed: {e}")
            raise

    async def stream_chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        system: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """
        Streaming chat completion.

        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model name (defaults to default preset)
            system: System prompt/instruction

        Yields:
            Text chunks as they are generated

        Raises:
            ValueError: If model not found
        """
        if model is None:
            model = MODEL_PRESETS["default"]["model"]

        logger.debug(f"Stream chat: model={model}, messages={len(messages)}")

        start_time = time.time()
        tokens_generated = 0

        try:
            payload = {
                "model": model,
                "messages": messages,
                "stream": True,
            }

            if system:
                payload["system"] = system

            async with self._client.stream(
                "POST", f"{self.base_url}/api/chat", json=payload, timeout=60.0
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = response.json() if hasattr(response, "json") else {}
                            # Handle streaming response format
                            msg = chunk.get("message", {})
                            content = msg.get("content", "")
                            if content:
                                tokens_generated += len(content.split())
                                yield content
                        except Exception:
                            # Try to parse line as JSON
                            import json

                            try:
                                chunk = json.loads(line)
                                msg = chunk.get("message", {})
                                content = msg.get("content", "")
                                if content:
                                    tokens_generated += len(content.split())
                                    yield content
                            except json.JSONDecodeError:
                                continue

            self._record_request(model, time.time() - start_time, success=True)

        except Exception as e:
            self._record_request(model, time.time() - start_time, success=False)
            logger.error(f"Stream chat failed: {e}")
            raise

    async def embed(self, text: str, model: str = "nomic-embed-text") -> list[float]:
        """
        Generate embeddings using /api/embeddings endpoint.

        Args:
            text: Text to embed
            model: Embedding model name

        Returns:
            Embedding vector

        Raises:
            Exception: If embedding fails
        """
        logger.debug(f"Embed: model={model}, text_len={len(text)}")

        start_time = time.time()
        try:
            payload = {"model": model, "prompt": text}

            response = await self._client.post(
                f"{self.base_url}/api/embeddings", json=payload, timeout=30.0
            )
            response.raise_for_status()
            result = response.json()

            self._record_request(model, time.time() - start_time, success=True)
            return result.get("embedding", [])

        except Exception as e:
            self._record_request(model, time.time() - start_time, success=False)
            logger.error(f"Embedding failed: {e}")
            raise

    async def list_models(self) -> list[dict]:
        """
        List all installed models with metadata.

        Returns:
            List of model info dicts
        """
        logger.debug("List models")

        try:
            response = await self._client.get(
                f"{self.base_url}/api/tags", timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])

            formatted = []
            for m in models:
                formatted.append(
                    {
                        "name": m.get("name"),
                        "size": m.get("size"),
                        "modified_at": m.get("modified_at"),
                        "digest": m.get("digest"),
                    }
                )

            return formatted

        except Exception as e:
            logger.error(f"List models failed: {e}")
            raise

    async def pull_model(self, model_name: str) -> dict:
        """
        Pull/download a model from Ollama library.

        Args:
            model_name: Model name (e.g., 'qwen2.5:7b')

        Returns:
            Status dict

        Raises:
            Exception: If pull fails
        """
        logger.info(f"Pull model: {model_name}")

        try:
            payload = {"name": model_name}

            async with self._client.stream(
                "POST", f"{self.base_url}/api/pull", json=payload, timeout=3600.0
            ) as response:
                response.raise_for_status()

                status_lines = []
                async for line in response.aiter_lines():
                    if line:
                        import json

                        try:
                            status = json.loads(line)
                            status_lines.append(status)
                        except json.JSONDecodeError:
                            pass

                return {
                    "status": "completed",
                    "model": model_name,
                    "updates": status_lines,
                }

        except Exception as e:
            logger.error(f"Pull model failed: {e}")
            raise

    async def model_info(self, model_name: str) -> dict:
        """
        Get detailed information about a model.

        Args:
            model_name: Model name

        Returns:
            Model info dict

        Raises:
            Exception: If query fails
        """
        logger.debug(f"Model info: {model_name}")

        try:
            payload = {"name": model_name}

            response = await self._client.post(
                f"{self.base_url}/api/show", json=payload, timeout=10.0
            )
            response.raise_for_status()
            return response.json()

        except Exception as e:
            logger.error(f"Model info failed: {e}")
            raise

    async def health(self) -> dict:
        """
        Detailed health check with model availability.

        Returns:
            Health status dictionary
        """
        logger.debug("Health check")

        health_status = {
            "status": "unhealthy",
            "ollama_available": False,
            "models": [],
            "timestamp": time.time(),
        }

        try:
            response = await self._client.get(
                f"{self.base_url}/api/tags", timeout=5.0
            )
            if response.status_code == 200:
                health_status["ollama_available"] = True
                data = response.json()
                models = data.get("models", [])
                health_status["models"] = [m.get("name") for m in models]

                if models:
                    health_status["status"] = "healthy"
                else:
                    health_status["status"] = "degraded"

        except Exception as e:
            logger.warning(f"Health check failed: {e}")

        return health_status

    def get_stats(self) -> dict:
        """
        Get usage statistics.

        Returns:
            Statistics dictionary
        """
        stats = dict(self._stats)

        # Calculate averages
        if stats["total_requests"] > 0:
            stats["avg_latency"] = (
                stats["total_latency"] / stats["total_requests"]
            )
            stats["error_rate"] = stats["total_errors"] / stats["total_requests"]
        else:
            stats["avg_latency"] = 0.0
            stats["error_rate"] = 0.0

        return stats

    def reset_stats(self):
        """Reset all statistics."""
        self._stats = {
            "total_requests": 0,
            "total_errors": 0,
            "total_latency": 0.0,
            "by_model": {},
        }
        logger.info("Statistics reset")

    # Private helper methods

    def _record_request(
        self, model: str, latency: float, success: bool = True
    ):
        """Record request metrics."""
        self._stats["total_requests"] += 1
        self._stats["total_latency"] += latency

        if not success:
            self._stats["total_errors"] += 1

        if model not in self._stats["by_model"]:
            self._stats["by_model"][model] = {
                "count": 0,
                "errors": 0,
                "total_latency": 0.0,
            }

        self._stats["by_model"][model]["count"] += 1
        self._stats["by_model"][model]["total_latency"] += latency

        if not success:
            self._stats["by_model"][model]["errors"] += 1

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()
        logger.info("OllamaEnhanced client closed")


# Singleton instance
ollama_enhanced = OllamaEnhanced()
