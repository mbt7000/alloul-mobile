"""
AI Extraction Core
==================
Orchestrates the full parse pipeline:
  1. Build module-specific prompt
  2. Call Ollama
  3. Parse JSON response
  4. Validate against Pydantic schema
  5. If invalid: retry once with stricter instructions
  6. If still invalid: return safe fallback with warnings
  7. Enrich ExtractionResult with org context (set by API layer)

Rules enforced here:
- AI NEVER writes to the database (this layer is pure extraction/preview)
- Each module is isolated — no shared logic between task/handover/transaction/note
- Partial extractions are always returned; never fail silently
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Callable

from .client import ollama_generate, ollama_health as _health
from .prompts import task_prompt, handover_prompt, transaction_prompt, note_prompt
from .schemas import (
    ExtractionResult,
    HandoverExtraction,
    NoteSummary,
    TaskExtraction,
    TransactionExtraction,
)

logger = logging.getLogger("alloul.ai.extractor")

# ─── JSON parsing ────────────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict | None:
    """
    Try to extract a JSON object from raw model output.
    Handles common model quirks: code fences, leading prose, trailing text.
    """
    # Strip code fences
    cleaned = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip()

    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try to find first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return None


# ─── Fallbacks ───────────────────────────────────────────────────────────────

_FALLBACKS: dict[str, Callable[[], dict]] = {
    "task": lambda: TaskExtraction().model_dump(),
    "handover": lambda: HandoverExtraction().model_dump(),
    "transaction": lambda: TransactionExtraction().model_dump(),
    "note": lambda: NoteSummary().model_dump(),
}

_SCHEMAS: dict[str, type] = {
    "task": TaskExtraction,
    "handover": HandoverExtraction,
    "transaction": TransactionExtraction,
    "note": NoteSummary,
}

_PROMPTS: dict[str, Callable] = {
    "task": task_prompt,
    "handover": handover_prompt,
    "transaction": transaction_prompt,
    "note": note_prompt,
}


# ─── Core extraction ─────────────────────────────────────────────────────────

async def _extract(
    module: str,
    text: str,
    user_context: dict | None,
) -> ExtractionResult:
    """
    Internal extraction loop.
    Attempt 1 → validate → if fail, attempt 2 (strict) → validate → if fail, fallback.
    """
    prompt_fn = _PROMPTS[module]
    schema_cls = _SCHEMAS[module]
    warnings: list[str] = []

    for attempt in range(1, 3):
        strict = attempt == 2
        prompt = prompt_fn(text, user_context, strict=strict)
        try:
            raw = await ollama_generate(prompt)
        except Exception as exc:
            logger.error("Ollama call failed (module=%s attempt=%d): %s", module, attempt, exc)
            if attempt == 2:
                warnings.append(f"AI engine unavailable: {exc}")
                return ExtractionResult(
                    success=False,
                    module=module,
                    data=_FALLBACKS[module](),
                    warnings=warnings,
                    raw_text=text,
                )
            continue

        parsed = _parse_json(raw)
        if parsed is None:
            logger.warning("JSON parse failed (module=%s attempt=%d)", module, attempt)
            warnings.append(f"Could not parse JSON on attempt {attempt}.")
            continue

        try:
            validated = schema_cls.model_validate(parsed)
            if attempt > 1:
                warnings.append("Extraction required a retry — review carefully.")
            return ExtractionResult(
                success=True,
                module=module,
                data=validated.model_dump(),
                warnings=warnings,
                raw_text=text,
            )
        except Exception as exc:
            logger.warning("Schema validation failed (module=%s attempt=%d): %s", module, attempt, exc)
            warnings.append(f"Validation warning on attempt {attempt}: {exc}")
            # Continue to retry

    # Both attempts failed — return safe fallback
    warnings.append("AI extraction failed after 2 attempts. Returning empty template.")
    return ExtractionResult(
        success=False,
        module=module,
        data=_FALLBACKS[module](),
        warnings=warnings,
        raw_text=text,
    )


# ─── Public API ──────────────────────────────────────────────────────────────

async def parse_task(text: str, user_context: dict | None = None) -> ExtractionResult:
    """Parse free-form text into a structured task. Does NOT save to DB."""
    return await _extract("task", text, user_context)


async def parse_handover(text: str, user_context: dict | None = None) -> ExtractionResult:
    """Parse free-form text into a structured handover record. Does NOT save to DB."""
    return await _extract("handover", text, user_context)


async def parse_transaction(text: str, user_context: dict | None = None) -> ExtractionResult:
    """Parse free-form text into a structured sales/purchase record. Does NOT save to DB."""
    return await _extract("transaction", text, user_context)


async def summarize_note(text: str, user_context: dict | None = None) -> ExtractionResult:
    """Summarize operational notes and extract signals. Does NOT save to DB."""
    return await _extract("note", text, user_context)


async def engine_health() -> bool:
    """Return True if Ollama is reachable and model is ready."""
    return await _health()
