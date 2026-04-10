"""
Ollama HTTP Client
==================
Thin async wrapper around the Ollama /api/generate endpoint.
Bound to 127.0.0.1 — the AI engine never reaches the public internet.

Environment variables (set in .env on the server):
  OLLAMA_BASE_URL   default: http://127.0.0.1:11434
  OLLAMA_MODEL      default: llama3.2:3b
  OLLAMA_TIMEOUT    default: 60  (seconds)
"""

from __future__ import annotations

import os
import logging
from typing import Optional

import httpx

logger = logging.getLogger("alloul.ai.client")

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TIMEOUT: float = float(os.getenv("OLLAMA_TIMEOUT", "60"))

# Generation options tuned for deterministic structured output
_DEFAULT_OPTIONS: dict = {
    "temperature": 0.0,      # fully deterministic
    "top_p": 1.0,
    "repeat_penalty": 1.1,
    "num_predict": 512,
    "stop": ["\n\n\n", "```"],
}


async def ollama_generate(
    prompt: str,
    *,
    model: Optional[str] = None,
    options: Optional[dict] = None,
    timeout: Optional[float] = None,
) -> str:
    """
    Send a prompt to Ollama and return the raw text response.
    Raises httpx.HTTPError or TimeoutError on failure — callers must handle.
    """
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": model or OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": options or _DEFAULT_OPTIONS,
    }
    async with httpx.AsyncClient(timeout=timeout or OLLAMA_TIMEOUT) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()


async def ollama_health() -> bool:
    """Return True if Ollama is reachable and the model is loaded."""
    try:
        url = f"{OLLAMA_BASE_URL}/api/tags"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            models = [m.get("name", "") for m in r.json().get("models", [])]
            target = OLLAMA_MODEL.split(":")[0]  # e.g. "llama3.2" from "llama3.2:3b"
            return any(target in m for m in models)
    except Exception as exc:
        logger.warning("Ollama health check failed: %s", exc)
        return False
