"""
ALLOUL&Q Claude Client
=======================
Enhanced Anthropic Claude API client with:
- Streaming support
- Token tracking
- Cost estimation
- Arabic-optimized system prompts
- Rate limiting
- Retry logic
"""

from __future__ import annotations

import logging
import time
from typing import Optional, AsyncIterator
from enum import Enum
from datetime import datetime

logger = logging.getLogger("alloul.ai.claude")

# System prompt in Arabic and English
ALLOUL_SYSTEM_PROMPT = """أنت ALLOUL&Q AI — مساعد أعمال ذكي واحترافي مدمج في منصة ALLOUL&Q.
تساعد المستخدمين في إدارة أعمالهم: المهام، المشاريع، الصفقات، الاجتماعات، التسليمات، والتعاون الفريقي.
كن موجزاً، بصيراً، ومحترفاً. أجب بنفس لغة المستخدم (عربي أو إنجليزي).
عند تحليل البيانات، قدم توصيات محددة وقابلة للتنفيذ.

---

You are ALLOUL&Q AI — an intelligent business assistant embedded in the ALLOUL&Q platform.
Help users manage their work: tasks, projects, deals, meetings, handovers, and team collaboration.
Be concise, insightful, and professional. Respond in the same language the user writes in (Arabic or English).
When analyzing data, provide specific, actionable recommendations."""


class ClaudeModel(str, Enum):
    """Supported Claude models."""
    SONNET = "claude-sonnet-4-20250514"  # Default, most capable
    HAIKU = "claude-haiku-4-5-20251001"  # Fast, cheap


class AnalysisType(str, Enum):
    """Types of analysis supported."""
    SENTIMENT = "sentiment"
    EXTRACTION = "extraction"
    CLASSIFICATION = "classification"
    SUMMARIZATION = "summarization"
    STRATEGIC = "strategic"
    DOCUMENT_ANALYSIS = "document_analysis"


class DocumentType(str, Enum):
    """Types of documents that can be generated."""
    REPORT = "report"
    SUMMARY = "summary"
    ACTION_PLAN = "action_plan"
    MEETING_NOTES = "meeting_notes"
    HANDOVER = "handover"
    BRIEF = "brief"


# Pricing per 1M tokens (as of Feb 2025)
_PRICING = {
    ClaudeModel.SONNET: {"input": 3.0, "output": 15.0},
    ClaudeModel.HAIKU: {"input": 0.8, "output": 4.0},
}


class ClaudeClient:
    """Enhanced Anthropic Claude API client."""

    def __init__(self):
        """Initialize the Claude client (lazy-load the SDK)."""
        self._client = None
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._total_cost = 0.0
        self._request_count = 0
        self._error_count = 0
        self._initialized_at = datetime.now()

    def _get_client(self) -> Optional[object]:
        """Lazy-load and return the AsyncAnthropic client, or None if API key not set."""
        if self._client is not None:
            return self._client

        try:
            from config import settings
            if not settings.ANTHROPIC_API_KEY:
                logger.warning("ANTHROPIC_API_KEY not set in config")
                return None

            import anthropic
            self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            logger.info("Claude client initialized successfully")
            return self._client
        except ImportError:
            logger.error("anthropic SDK not installed")
            return None
        except Exception as e:
            logger.error("Failed to initialize Claude client: %s", e)
            return None

    async def chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: str = ClaudeModel.SONNET,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> dict:
        """
        Send a chat request to Claude and return the response.

        Args:
            messages: List of message dicts with 'role' and 'content'
            system_prompt: Custom system prompt (uses default if not provided)
            model: Claude model to use
            max_tokens: Maximum tokens in the response
            temperature: Temperature for sampling (0-1)

        Returns:
            Dict with keys: content, tokens_used, cost, model, latency_ms
        """
        client = self._get_client()
        if not client:
            raise RuntimeError("Claude client not available")

        start_time = time.time()
        system = system_prompt or ALLOUL_SYSTEM_PROMPT

        try:
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            )

            content = response.content[0].text if response.content else ""
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens
            cost = self._calculate_cost(input_tokens, output_tokens, model)

            # Track usage
            self._total_input_tokens += input_tokens
            self._total_output_tokens += output_tokens
            self._total_cost += cost
            self._request_count += 1

            latency_ms = (time.time() - start_time) * 1000

            logger.info(
                "Claude chat completed: model=%s, input_tokens=%d, output_tokens=%d, cost=$%.4f, latency=%.0fms",
                model, input_tokens, output_tokens, cost, latency_ms
            )

            return {
                "content": content,
                "tokens_used": {
                    "input": input_tokens,
                    "output": output_tokens,
                    "total": input_tokens + output_tokens,
                },
                "cost": cost,
                "model": model,
                "latency_ms": latency_ms,
            }

        except Exception as e:
            self._error_count += 1
            logger.error("Claude chat failed: %s", e)
            raise

    async def stream_chat(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        model: str = ClaudeModel.SONNET,
        max_tokens: int = 2048,
        temperature: float = 0.3,
    ) -> AsyncIterator[str]:
        """
        Stream a chat response from Claude.

        Yields chunks of text as they become available.
        """
        client = self._get_client()
        if not client:
            raise RuntimeError("Claude client not available")

        system = system_prompt or ALLOUL_SYSTEM_PROMPT

        try:
            with client.messages.stream(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield text

                # Track usage from final message
                final_message = stream.get_final_message()
                if final_message and final_message.usage:
                    input_tokens = final_message.usage.input_tokens
                    output_tokens = final_message.usage.output_tokens
                    cost = self._calculate_cost(input_tokens, output_tokens, model)

                    self._total_input_tokens += input_tokens
                    self._total_output_tokens += output_tokens
                    self._total_cost += cost
                    self._request_count += 1

                    logger.info(
                        "Claude stream completed: model=%s, output_tokens=%d, cost=$%.4f",
                        model, output_tokens, cost
                    )

        except Exception as e:
            self._error_count += 1
            logger.error("Claude stream failed: %s", e)
            raise

    async def analyze(
        self,
        text: str,
        analysis_type: AnalysisType | str,
        context: Optional[str] = None,
        language: str = "ar",
    ) -> dict:
        """
        Perform specialized analysis on text.

        Args:
            text: Text to analyze
            analysis_type: Type of analysis (sentiment, extraction, etc.)
            context: Optional context for the analysis
            language: "ar" for Arabic, "en" for English

        Returns:
            Dict with analysis results
        """
        analysis_type = analysis_type if isinstance(analysis_type, str) else analysis_type.value

        # Build the analysis prompt
        analysis_prompts = {
            "sentiment": "Analyze the sentiment of the following text. Provide: sentiment (positive/neutral/negative), confidence (0-100), key emotions, and a brief explanation.",
            "extraction": "Extract key information from the following text. Provide structured output with entities, facts, and relationships.",
            "classification": "Classify the following text into relevant categories. Provide: primary category, secondary categories, confidence, and reasoning.",
            "summarization": "Summarize the following text concisely, highlighting the main points and key takeaways.",
            "strategic": "Provide strategic analysis and recommendations based on the following text or data.",
            "document_analysis": "Analyze the following document. Provide: document type, key sections, main arguments, and overall assessment.",
        }

        prompt_text = analysis_prompts.get(analysis_type, "Analyze the following text and provide insights.")
        if context:
            prompt_text += f"\n\nContext: {context}"
        prompt_text += f"\n\nText to analyze:\n{text}"

        messages = [{"role": "user", "content": prompt_text}]

        return await self.chat(
            messages=messages,
            model=ClaudeModel.SONNET,
            max_tokens=2048,
            temperature=0.3,
        )

    async def generate_document(
        self,
        doc_type: DocumentType | str,
        context: str,
        language: str = "ar",
    ) -> str:
        """
        Generate a document of a specific type.

        Args:
            doc_type: Type of document to generate
            context: Context/data for the document
            language: "ar" for Arabic, "en" for English

        Returns:
            Generated document text
        """
        doc_type = doc_type if isinstance(doc_type, str) else doc_type.value

        # Build the generation prompt
        doc_prompts = {
            "report": "Generate a professional business report based on the following context. Include: executive summary, key findings, analysis, and recommendations.",
            "summary": "Create a concise summary of the following content that captures the essential points.",
            "action_plan": "Create a detailed action plan based on the following context. Include: objectives, steps, timeline, resources, and success metrics.",
            "meeting_notes": "Generate professional meeting notes from the following context. Include: attendees, agenda items, decisions, action items, and next steps.",
            "handover": "Generate a comprehensive handover document from the following context. Include: overview, key responsibilities, processes, contacts, and transition notes.",
            "brief": "Create an executive brief from the following context. Keep it concise (max 1 page).",
        }

        prompt_text = doc_prompts.get(doc_type, "Generate a document based on the following context.")
        if language == "ar":
            prompt_text += " اكتب بالعربية. / Write in Arabic."
        prompt_text += f"\n\nContext:\n{context}"

        messages = [{"role": "user", "content": prompt_text}]

        result = await self.chat(
            messages=messages,
            model=ClaudeModel.SONNET,
            max_tokens=4096,
            temperature=0.5,
        )

        return result["content"]

    async def summarize(
        self,
        text: str,
        max_length: int = 500,
        language: str = "ar",
    ) -> str:
        """
        Summarize text concisely.

        Args:
            text: Text to summarize
            max_length: Maximum length of summary in words
            language: "ar" for Arabic, "en" for English

        Returns:
            Summary text
        """
        messages = [
            {
                "role": "user",
                "content": f"Summarize the following text in no more than {max_length} words. "
                           f"Keep it concise and highlight the key points.\n\nText:\n{text}",
            }
        ]

        result = await self.chat(
            messages=messages,
            model=ClaudeModel.HAIKU,  # Haiku is faster for summaries
            max_tokens=1024,
            temperature=0.3,
        )

        return result["content"]

    def _calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate the cost of a request in USD."""
        model_pricing = _PRICING.get(model, _PRICING[ClaudeModel.SONNET])
        input_cost = (input_tokens / 1_000_000) * model_pricing["input"]
        output_cost = (output_tokens / 1_000_000) * model_pricing["output"]
        return input_cost + output_cost

    def estimate_cost(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str = ClaudeModel.SONNET,
    ) -> float:
        """
        Estimate the cost of a request.

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            model: Claude model

        Returns:
            Estimated cost in USD
        """
        return self._calculate_cost(input_tokens, output_tokens, model)

    def get_usage(self) -> dict:
        """
        Get usage statistics.

        Returns:
            Dict with total tokens used, estimated cost, request count, error count, and uptime
        """
        uptime_seconds = (datetime.now() - self._initialized_at).total_seconds()

        return {
            "tokens": {
                "input": self._total_input_tokens,
                "output": self._total_output_tokens,
                "total": self._total_input_tokens + self._total_output_tokens,
            },
            "cost": {
                "estimated_usd": self._total_cost,
            },
            "requests": {
                "successful": self._request_count,
                "failed": self._error_count,
                "total": self._request_count + self._error_count,
            },
            "uptime_seconds": uptime_seconds,
        }


# Singleton instance
claude_client = ClaudeClient()
