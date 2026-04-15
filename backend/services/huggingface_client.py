"""
ALLOUL&Q Hugging Face Client
==============================
Integration with Hugging Face models for:
- Arabic language models (Qwen2.5, AceGPT, ALLaM)
- Text embeddings (multilingual-e5, bge-m3)
- Text classification (AraBERT)
- Summarization (mT5)

Supports two modes:
1. Local: Models converted to GGUF and served via Ollama
2. API: HF Inference API for cloud-based inference
"""
from __future__ import annotations
import os
import logging
from typing import Optional, Any
import httpx

logger = logging.getLogger("alloul.ai.huggingface")

# Configuration constants
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
HF_API_URL = "https://api-inference.huggingface.co/models"

# Recommended models for ALLOUL&Q
ARABIC_MODELS = {
    "chat": "Qwen/Qwen2.5-7B-Instruct",
    "chat_fast": "Qwen/Qwen2.5-3B-Instruct",
    "arabic_specialist": "FreedomIntelligence/AceGPT-7B",
    "arabic_llm": "ALLaM-AI/ALLaM-7B-Instruct",
}

EMBEDDING_MODELS = {
    "multilingual": "intfloat/multilingual-e5-large",
    "bge": "BAAI/bge-m3",
}

SPECIALIST_MODELS = {
    "arabic_bert": "aubmindlab/bert-base-arabertv2",
    "summarizer": "csebuetnlp/mT5_multilingual_XLSum",
}

# Ollama names for locally-hosted HF models
OLLAMA_HF_MODELS = {
    "qwen2.5:7b": "Qwen2.5 7B (Arabic optimized)",
    "qwen2.5:3b": "Qwen2.5 3B (Fast)",
    "llama3.2:3b": "Llama 3.2 3B (Default)",
}

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")


class HuggingFaceClient:
    """
    Client for interfacing with Hugging Face models via local Ollama or HF Inference API.
    """

    def __init__(self, ollama_url: str = OLLAMA_BASE_URL, hf_token: Optional[str] = None):
        """
        Initialize HuggingFace client.

        Args:
            ollama_url: Base URL for Ollama service
            hf_token: Hugging Face API token (defaults to HF_API_TOKEN env var)
        """
        self.ollama_url = ollama_url.rstrip("/")
        self.hf_token = hf_token or HF_API_TOKEN
        self._client = httpx.AsyncClient()
        logger.info(f"HuggingFaceClient initialized with Ollama: {self.ollama_url}")

    async def generate(
        self,
        prompt: str,
        model_key: str = "chat",
        max_tokens: int = 512,
        temperature: Optional[float] = 0.3,
    ) -> str:
        """
        Generate text using Arabic language models.

        Args:
            prompt: Input text prompt
            model_key: Model key from ARABIC_MODELS
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            Generated text

        Raises:
            ValueError: If model not found or no provider available
        """
        if model_key not in ARABIC_MODELS:
            raise ValueError(f"Unknown model key: {model_key}")

        model_name = ARABIC_MODELS[model_key]
        logger.debug(f"Generate request: model={model_key}, tokens={max_tokens}, temp={temperature}")

        # Try local Ollama first
        ollama_model = self._get_ollama_equivalent(model_name)
        if ollama_model:
            try:
                return await self._generate_ollama(
                    prompt, ollama_model, max_tokens, temperature
                )
            except Exception as e:
                logger.warning(f"Ollama generation failed: {e}, falling back to HF API")

        # Fall back to HF Inference API
        if not self.hf_token:
            raise ValueError(
                "No local Ollama model available and HF_API_TOKEN not set. "
                "Please install locally via Ollama or provide HF API token."
            )

        return await self._generate_hf_api(prompt, model_name, max_tokens, temperature)

    async def embed(
        self, texts: list[str], model_key: str = "multilingual"
    ) -> list[list[float]]:
        """
        Generate embeddings for texts.

        Args:
            texts: List of texts to embed
            model_key: Model key from EMBEDDING_MODELS

        Returns:
            List of embedding vectors
        """
        if model_key not in EMBEDDING_MODELS:
            raise ValueError(f"Unknown embedding model key: {model_key}")

        model_name = EMBEDDING_MODELS[model_key]
        logger.debug(f"Embed request: model={model_key}, texts={len(texts)}")

        # Try local embedding first (via sentence-transformers)
        try:
            return await self._embed_local(texts, model_name)
        except Exception as e:
            logger.debug(f"Local embedding unavailable: {e}, using HF API")

        # Fall back to HF Inference API
        if not self.hf_token:
            raise ValueError(
                "Local embedding unavailable and HF_API_TOKEN not set. "
                "Please set HF_API_TOKEN environment variable."
            )

        return await self._embed_hf_api(texts, model_name)

    async def classify(
        self, text: str, labels: list[str], model_key: str = "arabic_bert"
    ) -> dict:
        """
        Zero-shot text classification.

        Args:
            text: Text to classify
            labels: List of possible labels
            model_key: Model key from SPECIALIST_MODELS

        Returns:
            Dictionary mapping labels to scores
        """
        if model_key not in SPECIALIST_MODELS:
            raise ValueError(f"Unknown classifier model key: {model_key}")

        model_name = SPECIALIST_MODELS[model_key]
        logger.debug(f"Classification request: model={model_key}, labels={len(labels)}")

        if not self.hf_token:
            raise ValueError(
                "Classification requires HF_API_TOKEN. "
                "Please set HF_API_TOKEN environment variable."
            )

        return await self._classify_hf_api(text, labels, model_name)

    async def summarize(
        self, text: str, model_key: str = "summarizer", max_length: int = 200
    ) -> str:
        """
        Summarize text.

        Args:
            text: Text to summarize
            model_key: Model key from SPECIALIST_MODELS
            max_length: Maximum length of summary

        Returns:
            Summary text
        """
        if model_key not in SPECIALIST_MODELS:
            raise ValueError(f"Unknown summarizer model key: {model_key}")

        model_name = SPECIALIST_MODELS[model_key]
        logger.debug(f"Summarization request: model={model_key}, max_length={max_length}")

        if not self.hf_token:
            raise ValueError(
                "Summarization requires HF_API_TOKEN. "
                "Please set HF_API_TOKEN environment variable."
            )

        return await self._summarize_hf_api(text, model_name, max_length)

    async def list_available_models(self) -> dict:
        """
        List available models from both local and remote sources.

        Returns:
            Dictionary with keys: local, remote, recommended
        """
        logger.debug("Listing available models")
        result = {"local": [], "remote": [], "recommended": list(ARABIC_MODELS.keys())}

        # Check Ollama for local models
        try:
            response = await self._client.get(f"{self.ollama_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                for model in data.get("models", []):
                    model_name = model.get("name")
                    if any(
                        hf_model in model_name for hf_model in OLLAMA_HF_MODELS.keys()
                    ):
                        result["local"].append(
                            {
                                "name": model_name,
                                "size": model.get("size"),
                                "description": OLLAMA_HF_MODELS.get(
                                    model_name, "HF Model via Ollama"
                                ),
                            }
                        )
        except Exception as e:
            logger.debug(f"Could not connect to Ollama: {e}")

        # List remote models if HF token available
        if self.hf_token:
            result["remote"] = [
                {
                    "name": model_id,
                    "type": "chat",
                    "description": desc,
                }
                for model_id, desc in ARABIC_MODELS.items()
            ]

        return result

    async def download_model(self, model_name: str, target: str = "ollama") -> dict:
        """
        Download and prepare a model for local use.

        Args:
            model_name: Model identifier (HF repo or Ollama name)
            target: Target system ('ollama' or 'gguf')

        Returns:
            Status dictionary with instructions
        """
        logger.info(f"Download request: model={model_name}, target={target}")

        if target == "ollama":
            return {
                "status": "pending",
                "message": f"To install {model_name} locally:",
                "command": f"ollama pull {model_name}",
                "docs": "https://ollama.ai/library/" + model_name.split(":")[0],
            }
        else:
            return {
                "status": "pending",
                "message": f"To convert {model_name} to GGUF:",
                "instructions": [
                    "1. Clone llama.cpp: git clone https://github.com/ggerganov/llama.cpp",
                    "2. Download model: huggingface-cli download " + model_name,
                    "3. Convert: python llama.cpp/convert.py <model_path> --outfile model.gguf",
                    "4. Quantize: ./llama.cpp/quantize model.gguf model-q4.gguf q4_k_m",
                    "5. Import to Ollama via Modelfile",
                ],
            }

    async def health(self) -> dict:
        """
        Check health status of available providers.

        Returns:
            Health status dictionary
        """
        logger.debug("Health check")
        health_status = {
            "ollama": False,
            "ollama_models": [],
            "hf_api": False,
            "status": "degraded",
        }

        # Check Ollama
        try:
            response = await self._client.get(
                f"{self.ollama_url}/api/tags", timeout=2.0
            )
            if response.status_code == 200:
                health_status["ollama"] = True
                data = response.json()
                health_status["ollama_models"] = [
                    m.get("name") for m in data.get("models", [])
                ]
        except Exception as e:
            logger.debug(f"Ollama health check failed: {e}")

        # Check HF API
        if self.hf_token:
            try:
                response = await self._client.get(
                    f"{HF_API_URL}/Qwen/Qwen2.5-3B-Instruct",
                    headers={"Authorization": f"Bearer {self.hf_token}"},
                    timeout=2.0,
                )
                health_status["hf_api"] = response.status_code == 200
            except Exception as e:
                logger.debug(f"HF API health check failed: {e}")

        # Determine overall status
        if health_status["ollama"] or health_status["hf_api"]:
            health_status["status"] = "healthy"
        elif health_status["ollama"] and health_status["hf_api"]:
            health_status["status"] = "fully_operational"

        return health_status

    # Private helper methods

    def _get_ollama_equivalent(self, hf_model_name: str) -> Optional[str]:
        """Map HF model name to Ollama equivalent if available."""
        for ollama_name in OLLAMA_HF_MODELS.keys():
            if any(
                part.lower() in hf_model_name.lower()
                for part in ollama_name.split(":")
            ):
                return ollama_name
        return None

    async def _generate_ollama(
        self, prompt: str, model: str, max_tokens: int, temperature: Optional[float]
    ) -> str:
        """Generate text using local Ollama."""
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "temperature": temperature if temperature is not None else 0.3,
            "num_predict": max_tokens,
        }

        response = await self._client.post(
            f"{self.ollama_url}/api/generate", json=payload, timeout=30.0
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "")

    async def _generate_hf_api(
        self, prompt: str, model: str, max_tokens: int, temperature: Optional[float]
    ) -> str:
        """Generate text using HF Inference API."""
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_tokens,
                "temperature": temperature if temperature is not None else 0.3,
            },
        }

        response = await self._client.post(
            f"{HF_API_URL}/{model}",
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()
        if isinstance(result, list) and result:
            return result[0].get("generated_text", "")
        return ""

    async def _embed_local(self, texts: list[str], model: str) -> list[list[float]]:
        """Generate embeddings using local sentence-transformers (via Ollama)."""
        try:
            from sentence_transformers import SentenceTransformer

            st_model = SentenceTransformer(model)
            embeddings = st_model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
        except ImportError:
            raise ImportError(
                "sentence-transformers not installed. Install with: pip install sentence-transformers"
            )

    async def _embed_hf_api(self, texts: list[str], model: str) -> list[list[float]]:
        """Generate embeddings using HF Inference API."""
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {"inputs": texts}

        response = await self._client.post(
            f"{HF_API_URL}/{model}",
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    async def _classify_hf_api(
        self, text: str, labels: list[str], model: str
    ) -> dict:
        """Perform zero-shot classification using HF Inference API."""
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {"inputs": text, "parameters": {"candidate_labels": labels}}

        response = await self._client.post(
            f"{HF_API_URL}/{model}",
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()

        # Convert to {label: score} dict
        scores = result.get("scores", [])
        label_result = {labels[i]: scores[i] for i in range(len(labels))}
        return label_result

    async def _summarize_hf_api(
        self, text: str, model: str, max_length: int
    ) -> str:
        """Summarize text using HF Inference API."""
        headers = {"Authorization": f"Bearer {self.hf_token}"}
        payload = {
            "inputs": text,
            "parameters": {
                "max_length": max_length,
            },
        }

        response = await self._client.post(
            f"{HF_API_URL}/{model}",
            json=payload,
            headers=headers,
            timeout=30.0,
        )
        response.raise_for_status()
        result = response.json()
        if isinstance(result, list) and result:
            return result[0].get("summary_text", "")
        return ""

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()


# Singleton instance
hf_client = HuggingFaceClient()
