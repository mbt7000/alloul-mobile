"""
Alloul AI Structuring Engine
=============================
Powered by a local Ollama instance (privacy-first, no external AI calls).

Modules:
  client.py    — async HTTP client for Ollama
  prompts.py   — prompt templates per business module
  schemas.py   — Pydantic models for validated extraction output
  extractor.py — core parse loop: call → validate → retry → fallback

Public API (imported by routers):
  parse_task(text, user_context)        → TaskExtraction
  parse_handover(text, user_context)    → HandoverExtraction
  parse_transaction(text, user_context) → TransactionExtraction
  summarize_note(text, user_context)    → NoteSummary
  engine_health()                       → bool
"""

from .extractor import (
    parse_task,
    parse_handover,
    parse_transaction,
    summarize_note,
    engine_health,
)

__all__ = [
    "parse_task",
    "parse_handover",
    "parse_transaction",
    "summarize_note",
    "engine_health",
]
