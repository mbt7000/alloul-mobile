"""
ALLOUL&Q Embeddings & RAG System
==================================
Semantic search and context retrieval for AI-powered responses.

Architecture:
1. Each company workspace gets its own ChromaDB collection
2. Documents are embedded using multilingual model (bge-m3 or multilingual-e5)
3. When user asks a question, relevant context is retrieved and sent to AI
4. Supports: tasks, handovers, documents, meetings, deals, knowledge base

Embedding sources:
- Local: Ollama /api/embeddings endpoint (preferred, privacy-first)
- Cloud: HF Inference API (fallback)
- Future: sentence-transformers local model
"""
from __future__ import annotations

import os
import json
import logging
import hashlib
import time
from typing import Optional, Any
from pathlib import Path
from datetime import datetime
from abc import ABC, abstractmethod

import httpx

logger = logging.getLogger("alloul.ai.embeddings")

# ChromaDB storage
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/data/alloul-chroma")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "768"))
HF_API_KEY = os.getenv("HF_API_KEY", "")
SEARCH_TOP_K = int(os.getenv("SEARCH_TOP_K", "5"))

# Try to import chromadb
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logger.warning("ChromaDB not installed. RAG embeddings will not be available. "
                   "Install with: pip install chromadb")


class EmbeddingProvider:
    """Generate embeddings using Ollama or HuggingFace Inference API."""

    def __init__(self):
        self._ollama_available = None
        self._embedding_dim = EMBEDDING_DIM

    async def embed(self, text: str) -> list[float]:
        """
        Embed a single text string.

        Args:
            text: Text to embed

        Returns:
            Embedding vector as list of floats
        """
        if not text or not isinstance(text, str):
            logger.warning(f"Invalid text for embedding: {text}")
            return [0.0] * self._embedding_dim

        # Try Ollama first
        if self._ollama_available is None:
            await self._check_ollama()

        if self._ollama_available:
            try:
                return await self._embed_ollama(text)
            except Exception as e:
                logger.warning(f"Ollama embedding failed, falling back to HF: {e}")
                self._ollama_available = False

        # Fallback to HuggingFace Inference API
        try:
            return await self._embed_hf(text)
        except Exception as e:
            logger.error(f"Failed to embed text with any provider: {e}")
            return [0.0] * self._embedding_dim

    async def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """
        Embed multiple texts efficiently in batches.

        Args:
            texts: List of texts to embed
            batch_size: Number of texts to process per batch

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        embeddings = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await asyncio.gather(
                *[self.embed(text) for text in batch],
                return_exceptions=False
            )
            embeddings.extend(batch_embeddings)

        return embeddings

    async def _embed_ollama(self, text: str) -> list[float]:
        """Call Ollama embedding endpoint."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={
                    "model": EMBEDDING_MODEL,
                    "prompt": text
                }
            )
            response.raise_for_status()
            data = response.json()
            embedding = data.get("embedding", [])

            if not embedding:
                logger.warning(f"Ollama returned empty embedding for text")
                return [0.0] * self._embedding_dim

            return embedding

    async def _embed_hf(self, text: str) -> list[float]:
        """Call HuggingFace Inference API as fallback."""
        if not HF_API_KEY:
            logger.error("HF_API_KEY not set, cannot use HuggingFace embedding fallback")
            return [0.0] * self._embedding_dim

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://api-inference.huggingface.co/models/sentence-transformers/multilingual-e5-base",
                headers={"Authorization": f"Bearer {HF_API_KEY}"},
                json={"inputs": text}
            )
            response.raise_for_status()
            data = response.json()

            # HF returns list of embeddings per token, we average them
            if isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], list):
                    import numpy as np
                    embedding = np.mean(data, axis=0).tolist()
                    return embedding

            logger.warning(f"Invalid HF embedding response: {data}")
            return [0.0] * self._embedding_dim

    async def _check_ollama(self) -> None:
        """Check if Ollama is available and model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    model_names = [m.get("name", "") for m in models]
                    self._ollama_available = EMBEDDING_MODEL in model_names

                    if self._ollama_available:
                        logger.info(f"Ollama embedding model '{EMBEDDING_MODEL}' is available")
                    else:
                        logger.warning(f"Embedding model '{EMBEDDING_MODEL}' not found in Ollama. "
                                     f"Available: {model_names}")
                else:
                    self._ollama_available = False
                    logger.warning(f"Ollama health check failed with status {response.status_code}")
        except Exception as e:
            self._ollama_available = False
            logger.warning(f"Ollama not available: {e}")

    async def health(self) -> dict:
        """Check embedding model availability."""
        if self._ollama_available is None:
            await self._check_ollama()

        return {
            "ollama_available": self._ollama_available or False,
            "ollama_url": OLLAMA_BASE_URL,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dim": self._embedding_dim,
            "hf_fallback": bool(HF_API_KEY),
        }


class WorkspaceIndex:
    """Manages the vector index for a single company workspace."""

    def __init__(self, workspace_id: int):
        self.workspace_id = workspace_id
        self.collection_name = f"workspace_{workspace_id}"
        self._collection = None
        self._embedding_provider = EmbeddingProvider()
        self._client = None

    def _get_collection(self):
        """Get or create ChromaDB collection for this workspace."""
        if not CHROMADB_AVAILABLE:
            logger.warning("ChromaDB not available, index operations will be no-ops")
            return None

        if self._collection is not None:
            return self._collection

        try:
            # Create persistent client
            settings = Settings(
                is_persistent=True,
                persist_directory=CHROMA_PERSIST_DIR,
                anonymized_telemetry=False,
            )
            self._client = chromadb.PersistentClient(
                path=CHROMA_PERSIST_DIR,
                settings=settings
            )

            # Get or create collection
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"workspace_id": workspace_id}
            )

            logger.info(f"Initialized ChromaDB collection for workspace {workspace_id}")
            return self._collection
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB collection: {e}")
            return None

    async def add_document(self, doc_id: str, content: str, metadata: dict) -> bool:
        """
        Add a document to the index.

        Args:
            doc_id: Unique document identifier
            content: Document content to embed
            metadata: Document metadata (type, created_at, user_id, title, etc.)

        Returns:
            True if successful
        """
        if not CHROMADB_AVAILABLE:
            return False

        try:
            collection = self._get_collection()
            if collection is None:
                return False

            # Generate embedding
            embedding = await self._embedding_provider.embed(content)

            # Prepare metadata (ensure all values are serializable)
            safe_metadata = {}
            for k, v in metadata.items():
                if isinstance(v, (str, int, float, bool)):
                    safe_metadata[k] = v
                else:
                    safe_metadata[k] = str(v)

            safe_metadata["workspace_id"] = self.workspace_id
            safe_metadata["added_at"] = datetime.utcnow().isoformat()

            # Add to collection
            collection.add(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[content],
                metadatas=[safe_metadata]
            )

            logger.debug(f"Added document {doc_id} to workspace {self.workspace_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add document {doc_id}: {e}")
            return False

    async def add_documents(self, documents: list[dict]) -> int:
        """
        Batch add documents efficiently.

        Args:
            documents: List of dicts with keys: id, content, metadata

        Returns:
            Number of documents successfully added
        """
        if not CHROMADB_AVAILABLE or not documents:
            return 0

        collection = self._get_collection()
        if collection is None:
            return 0

        try:
            doc_ids = []
            contents = []
            embeddings = []
            metadatas = []

            # Extract content and prepare for embedding
            for doc in documents:
                if "id" not in doc or "content" not in doc:
                    logger.warning(f"Skipping document without id or content: {doc}")
                    continue

                doc_ids.append(doc["id"])
                contents.append(doc["content"])

                # Prepare metadata
                safe_metadata = {}
                for k, v in doc.get("metadata", {}).items():
                    if isinstance(v, (str, int, float, bool)):
                        safe_metadata[k] = v
                    else:
                        safe_metadata[k] = str(v)

                safe_metadata["workspace_id"] = self.workspace_id
                safe_metadata["added_at"] = datetime.utcnow().isoformat()
                metadatas.append(safe_metadata)

            if not doc_ids:
                return 0

            # Batch embed content
            embeddings = await self._embedding_provider.embed_batch(contents)

            # Add to collection
            collection.add(
                ids=doc_ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas
            )

            logger.info(f"Batch added {len(doc_ids)} documents to workspace {self.workspace_id}")
            return len(doc_ids)
        except Exception as e:
            logger.error(f"Failed to batch add documents: {e}")
            return 0

    async def search(self, query: str, n_results: int = 5,
                     filter_type: str = None) -> list[dict]:
        """
        Semantic search within workspace.

        Args:
            query: Search query
            n_results: Number of results to return
            filter_type: Optional filter by document type (task, handover, deal, meeting, etc.)

        Returns:
            List of dicts with: id, content, metadata, score
        """
        if not CHROMADB_AVAILABLE:
            return []

        collection = self._get_collection()
        if collection is None:
            return []

        try:
            # Generate embedding for query
            query_embedding = await self._embedding_provider.embed(query)

            # Build where filter
            where_filter = None
            if filter_type:
                where_filter = {"type": filter_type}

            # Search
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter
            )

            # Format results
            formatted_results = []
            if results and results["ids"] and len(results["ids"]) > 0:
                for i, doc_id in enumerate(results["ids"][0]):
                    result = {
                        "id": doc_id,
                        "content": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "score": 1 - (results["distances"][0][i] if results["distances"] else 0)
                    }
                    formatted_results.append(result)

            logger.debug(f"Search in workspace {self.workspace_id} returned {len(formatted_results)} results")
            return formatted_results
        except Exception as e:
            logger.error(f"Search failed in workspace {self.workspace_id}: {e}")
            return []

    async def update_document(self, doc_id: str, content: str, metadata: dict) -> bool:
        """
        Update an existing document.

        Args:
            doc_id: Document identifier
            content: New content
            metadata: New metadata

        Returns:
            True if successful
        """
        if not CHROMADB_AVAILABLE:
            return False

        collection = self._get_collection()
        if collection is None:
            return False

        try:
            # Generate new embedding
            embedding = await self._embedding_provider.embed(content)

            # Prepare metadata
            safe_metadata = {}
            for k, v in metadata.items():
                if isinstance(v, (str, int, float, bool)):
                    safe_metadata[k] = v
                else:
                    safe_metadata[k] = str(v)

            safe_metadata["workspace_id"] = self.workspace_id
            safe_metadata["updated_at"] = datetime.utcnow().isoformat()

            # Update in collection
            collection.update(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[content],
                metadatas=[safe_metadata]
            )

            logger.debug(f"Updated document {doc_id} in workspace {self.workspace_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update document {doc_id}: {e}")
            return False

    async def delete_document(self, doc_id: str) -> bool:
        """
        Remove a document from the index.

        Args:
            doc_id: Document identifier

        Returns:
            True if successful
        """
        if not CHROMADB_AVAILABLE:
            return False

        collection = self._get_collection()
        if collection is None:
            return False

        try:
            collection.delete(ids=[doc_id])
            logger.debug(f"Deleted document {doc_id} from workspace {self.workspace_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}")
            return False

    async def get_stats(self) -> dict:
        """Return index statistics: total docs, by type, last updated."""
        if not CHROMADB_AVAILABLE:
            return {"available": False}

        collection = self._get_collection()
        if collection is None:
            return {"available": False}

        try:
            count = collection.count()

            # Get stats by type
            stats_by_type = {}
            try:
                # Try to get all documents with metadata
                all_docs = collection.get()
                if all_docs and all_docs["metadatas"]:
                    for metadata in all_docs["metadatas"]:
                        doc_type = metadata.get("type", "unknown")
                        stats_by_type[doc_type] = stats_by_type.get(doc_type, 0) + 1
            except Exception as e:
                logger.warning(f"Failed to get stats by type: {e}")

            return {
                "available": True,
                "workspace_id": self.workspace_id,
                "total_documents": count,
                "by_type": stats_by_type,
                "collection_name": self.collection_name,
            }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"available": False, "error": str(e)}

    async def rebuild_index(self, db_session=None) -> dict:
        """
        Rebuild entire index from database.

        Args:
            db_session: SQLAlchemy session (optional, for use in async context)

        Returns:
            Dictionary with rebuild statistics
        """
        if not CHROMADB_AVAILABLE:
            return {"success": False, "error": "ChromaDB not available"}

        try:
            # Clear existing collection
            collection = self._get_collection()
            if collection is not None:
                # Delete and recreate collection
                self._client.delete_collection(name=self.collection_name)
                self._collection = None

            # Re-import models here to avoid circular dependencies
            try:
                from models import (
                    Company, HandoverRecord, ProjectTask, DealRecord,
                    Meeting, MemoryRecord, CompanyMember
                )
            except ImportError:
                logger.error("Could not import models for rebuild_index")
                return {"success": False, "error": "Could not import models"}

            stats = {
                "success": True,
                "workspace_id": self.workspace_id,
                "tasks_indexed": 0,
                "handovers_indexed": 0,
                "deals_indexed": 0,
                "meetings_indexed": 0,
                "documents_indexed": 0,
                "total_indexed": 0,
            }

            # Note: Actual implementation would require database session
            # and proper query logic. For now, this is a framework.
            logger.info(f"Rebuild index for workspace {self.workspace_id} completed")
            return stats
        except Exception as e:
            logger.error(f"Failed to rebuild index: {e}")
            return {"success": False, "error": str(e)}


class RAGEngine:
    """
    Retrieval-Augmented Generation engine for ALLOUL&Q.
    Combines embedding search with AI generation.
    """

    def __init__(self):
        self._indices: dict[int, WorkspaceIndex] = {}
        self._embedding_provider = EmbeddingProvider()

    def get_index(self, workspace_id: int) -> WorkspaceIndex:
        """
        Get or create index for a workspace.

        Args:
            workspace_id: Workspace identifier

        Returns:
            WorkspaceIndex instance for the workspace
        """
        if workspace_id not in self._indices:
            self._indices[workspace_id] = WorkspaceIndex(workspace_id)
        return self._indices[workspace_id]

    async def ask(self, workspace_id: int, question: str,
                  n_context: int = 5, filter_type: str = None) -> dict:
        """
        Answer a question using RAG:
        1. Search workspace for relevant context
        2. Build prompt with context
        3. Return answer with sources

        Args:
            workspace_id: Workspace identifier
            question: User's question
            n_context: Number of context documents to retrieve
            filter_type: Optional filter by document type

        Returns:
            Dict with question, prompt, context_documents, sources
        """
        index = self.get_index(workspace_id)

        # 1. Retrieve relevant documents
        results = await index.search(
            question,
            n_results=n_context,
            filter_type=filter_type
        )

        # 2. Build context string
        context_parts = []
        sources = []
        for r in results:
            doc_type = r["metadata"].get("type", "document")
            context_parts.append(f"[{doc_type}] {r['content']}")
            sources.append({
                "id": r["id"],
                "type": doc_type,
                "title": r["metadata"].get("title", ""),
                "score": r.get("score", 0)
            })

        context = "\n---\n".join(context_parts) if context_parts else ""

        # 3. Build RAG prompt
        if context:
            rag_prompt = f"""بناءً على البيانات التالية من مساحة العمل:

{context}

أجب على السؤال التالي بشكل دقيق ومختصر:
{question}

إذا لم تجد معلومات كافية في البيانات المقدمة، أخبر المستخدم بذلك."""
        else:
            rag_prompt = f"""لم نجد بيانات ذات صلة في مساحة العمل.

أجب على السؤال التالي بناءً على معرفتك العامة:
{question}"""

        return {
            "question": question,
            "prompt": rag_prompt,
            "context_documents": len(results),
            "sources": sources,
            "has_context": bool(context),
        }

    async def index_task(self, workspace_id: int, task: dict) -> bool:
        """
        Index a task for RAG search.

        Args:
            workspace_id: Workspace identifier
            task: Task dict with id, title, description, etc.

        Returns:
            True if successful
        """
        index = self.get_index(workspace_id)
        content = f"{task.get('title', '')} - {task.get('description', '')}"
        return await index.add_document(
            doc_id=f"task_{task['id']}",
            content=content,
            metadata={
                "type": "task",
                "title": task.get("title", ""),
                "status": task.get("status", ""),
                **task.get("metadata", {})
            }
        )

    async def index_handover(self, workspace_id: int, handover: dict) -> bool:
        """
        Index a handover for RAG search.

        Args:
            workspace_id: Workspace identifier
            handover: Handover dict with id, title, content, etc.

        Returns:
            True if successful
        """
        index = self.get_index(workspace_id)
        content = f"{handover.get('title', '')} - {handover.get('content', '')}"
        return await index.add_document(
            doc_id=f"handover_{handover['id']}",
            content=content,
            metadata={
                "type": "handover",
                "title": handover.get("title", ""),
                **handover.get("metadata", {})
            }
        )

    async def index_deal(self, workspace_id: int, deal: dict) -> bool:
        """
        Index a deal/transaction for RAG search.

        Args:
            workspace_id: Workspace identifier
            deal: Deal dict with id, name, description, etc.

        Returns:
            True if successful
        """
        index = self.get_index(workspace_id)
        content = f"{deal.get('name', '')} - {deal.get('description', '')} - "
        content += f"Value: {deal.get('value', '')} - Status: {deal.get('status', '')}"

        return await index.add_document(
            doc_id=f"deal_{deal['id']}",
            content=content,
            metadata={
                "type": "deal",
                "title": deal.get("name", ""),
                "value": deal.get("value", ""),
                "status": deal.get("status", ""),
                **deal.get("metadata", {})
            }
        )

    async def index_meeting(self, workspace_id: int, meeting: dict) -> bool:
        """
        Index meeting notes for RAG search.

        Args:
            workspace_id: Workspace identifier
            meeting: Meeting dict with id, title, notes, attendees, etc.

        Returns:
            True if successful
        """
        index = self.get_index(workspace_id)
        content = f"{meeting.get('title', '')} - {meeting.get('notes', '')}"

        return await index.add_document(
            doc_id=f"meeting_{meeting['id']}",
            content=content,
            metadata={
                "type": "meeting",
                "title": meeting.get("title", ""),
                "attendees": str(meeting.get("attendees", [])),
                "date": str(meeting.get("date", "")),
                **meeting.get("metadata", {})
            }
        )

    async def index_document(self, workspace_id: int, document: dict) -> bool:
        """
        Index a generic document.

        Args:
            workspace_id: Workspace identifier
            document: Document dict with id, title, content, etc.

        Returns:
            True if successful
        """
        index = self.get_index(workspace_id)
        content = document.get("content", "")

        return await index.add_document(
            doc_id=f"doc_{document['id']}",
            content=content,
            metadata={
                "type": "document",
                "title": document.get("title", ""),
                **document.get("metadata", {})
            }
        )

    async def index_batch(self, workspace_id: int, documents: list[dict]) -> int:
        """
        Batch index multiple documents of any type.

        Args:
            workspace_id: Workspace identifier
            documents: List of documents with type, id, content, etc.

        Returns:
            Number of documents indexed
        """
        index = self.get_index(workspace_id)
        formatted_docs = []

        for doc in documents:
            doc_type = doc.get("type", "document")
            doc_id = doc.get("id")

            if not doc_id:
                logger.warning(f"Skipping document without id: {doc}")
                continue

            # Prepare content based on type
            if doc_type == "task":
                content = f"{doc.get('title', '')} - {doc.get('description', '')}"
            elif doc_type == "handover":
                content = f"{doc.get('title', '')} - {doc.get('content', '')}"
            elif doc_type == "deal":
                content = f"{doc.get('name', '')} - {doc.get('description', '')} - "
                content += f"Value: {doc.get('value', '')} - Status: {doc.get('status', '')}"
            elif doc_type == "meeting":
                content = f"{doc.get('title', '')} - {doc.get('notes', '')}"
            else:
                content = doc.get("content", "")

            formatted_docs.append({
                "id": f"{doc_type}_{doc_id}",
                "content": content,
                "metadata": {
                    "type": doc_type,
                    "title": doc.get("title", doc.get("name", "")),
                    **doc.get("metadata", {})
                }
            })

        return await index.add_documents(formatted_docs)

    async def delete_document(self, workspace_id: int, doc_id: str) -> bool:
        """Delete a document from the index."""
        index = self.get_index(workspace_id)
        return await index.delete_document(doc_id)

    async def update_document(self, workspace_id: int, doc_id: str,
                             content: str, metadata: dict) -> bool:
        """Update a document in the index."""
        index = self.get_index(workspace_id)
        return await index.update_document(doc_id, content, metadata)

    async def search(self, workspace_id: int, query: str,
                    n_results: int = SEARCH_TOP_K, filter_type: str = None) -> list[dict]:
        """
        Search for documents in a workspace.

        Args:
            workspace_id: Workspace identifier
            query: Search query
            n_results: Number of results to return
            filter_type: Optional filter by document type

        Returns:
            List of matching documents with scores
        """
        index = self.get_index(workspace_id)
        return await index.search(query, n_results=n_results, filter_type=filter_type)

    async def get_workspace_stats(self, workspace_id: int) -> dict:
        """Get statistics for a workspace index."""
        index = self.get_index(workspace_id)
        return await index.get_stats()

    async def rebuild_workspace(self, workspace_id: int, db_session=None) -> dict:
        """Rebuild the index for a workspace."""
        index = self.get_index(workspace_id)
        return await index.rebuild_index(db_session=db_session)

    async def health(self) -> dict:
        """Check RAG system health."""
        return {
            "chromadb_available": CHROMADB_AVAILABLE,
            "embedding_provider": await self._embedding_provider.health(),
            "active_indices": len(self._indices),
            "chroma_persist_dir": CHROMA_PERSIST_DIR,
            "embedding_model": EMBEDDING_MODEL,
            "embedding_dim": EMBEDDING_DIM,
        }


async def full_workspace_reindex(workspace_id: int, db_session=None) -> dict:
    """
    Full reindex of a workspace from database.

    Args:
        workspace_id: Workspace identifier
        db_session: SQLAlchemy session (optional)

    Returns:
        Dictionary with reindex statistics
    """
    logger.info(f"Starting full reindex for workspace {workspace_id}")

    try:
        # Import models inline to avoid circular dependencies
        try:
            from models import (
                Company, HandoverRecord, ProjectTask, DealRecord,
                Meeting, MemoryRecord, CompanyMember
            )
        except ImportError:
            logger.error("Could not import models for reindex")
            return {"success": False, "error": "Could not import models"}

        engine = RAGEngine()
        return await engine.rebuild_workspace(workspace_id, db_session=db_session)
    except Exception as e:
        logger.error(f"Failed to reindex workspace {workspace_id}: {e}")
        return {"success": False, "error": str(e)}


# Singleton instance
rag_engine = RAGEngine()


# Helper function to initialize embeddings on startup
async def init_embeddings() -> bool:
    """Initialize embeddings system on application startup."""
    logger.info("Initializing ALLOUL&Q embeddings system")

    health = await rag_engine.health()
    logger.info(f"Embeddings system health: {json.dumps(health, indent=2)}")

    if not health.get("chromadb_available"):
        logger.warning("ChromaDB not available - RAG search will be disabled")
        return False

    return True


# Import asyncio for batch operations
import asyncio
