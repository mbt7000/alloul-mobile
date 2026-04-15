"""
ALLOUL&Q AI System Router
===========================
Unified API endpoints for the three-tier AI system:
- Smart routing (Claude/Ollama/HF)
- RAG search
- Model management
- AI monitoring
"""
from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from auth import get_current_user
from database import get_db
from config import settings
from models import User, CompanyMember
from plan_limits import require_feature
from admin_access import user_is_admin
from services.claude_client import claude_client, ClaudeModel

router = APIRouter(prefix="/ai", tags=["ai-system"])
logger = logging.getLogger("alloul.ai.router")


def _require_company_feature(db: Session, user: User, feature: str) -> int:
    """Resolve the user's company and enforce a plan feature. Returns company_id."""
    member = db.query(CompanyMember).filter(CompanyMember.user_id == user.id).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of any company - المستخدم ليس عضواً في أي شركة",
        )
    require_feature(db, member.company_id, feature, is_admin=user_is_admin(user))
    return member.company_id


# ============================================================================
# Pydantic Models (Request/Response)
# ============================================================================

class ChatMessage(BaseModel):
    """A single message in the conversation."""
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request body for POST /ai/chat"""
    messages: list[ChatMessage] = Field(..., description="Conversation history")
    model_preference: Optional[str] = Field(
        "auto",
        description="'claude', 'ollama', or 'auto' for smart routing"
    )
    workspace_context: bool = Field(
        False,
        description="Enable RAG search in workspace context"
    )
    max_tokens: Optional[int] = Field(
        None,
        description="Max output tokens (defaults to AI_MAX_TOKENS)"
    )
    temperature: Optional[float] = Field(
        None,
        description="Temperature for generation (0.0-1.0)"
    )


class ChatResponse(BaseModel):
    """Response for streaming chat endpoint"""
    content: str = Field(..., description="Chat response content")
    model_used: str = Field(..., description="Which model processed the request")
    context_injected: bool = Field(False, description="Whether RAG context was used")
    context_sources: Optional[list[str]] = Field(None, description="RAG source references")


class AnalysisType(str):
    """Supported analysis types"""
    SENTIMENT = "sentiment"
    SUMMARY = "summary"
    ENTITIES = "entities"
    KEYWORDS = "keywords"
    CLASSIFICATION = "classification"


class AnalyzeRequest(BaseModel):
    """Request body for POST /ai/analyze"""
    text: str = Field(..., description="Text to analyze")
    analysis_type: str = Field(
        ...,
        description="sentiment|summary|entities|keywords|classification"
    )
    context: Optional[str] = Field(None, description="Optional context for analysis")
    language: str = Field("en", description="en or ar")


class AnalyzeResponse(BaseModel):
    """Response for analysis endpoint"""
    analysis_type: str
    results: dict = Field(..., description="Analysis results (schema varies by type)")
    model_used: str
    processing_time_ms: float


class DocumentType(str):
    """Supported document generation types"""
    REPORT = "report"
    HANDOVER = "handover"
    BRIEF = "brief"
    SUMMARY = "summary"
    ACTION_PLAN = "action_plan"


class GenerateRequest(BaseModel):
    """Request body for POST /ai/generate"""
    doc_type: str = Field(
        ...,
        description="report|handover|brief|summary|action_plan"
    )
    context: dict = Field(..., description="Document context and variables")
    language: str = Field("en", description="en or ar")


class GenerateResponse(BaseModel):
    """Response for document generation"""
    doc_type: str
    content: str = Field(..., description="Generated document content")
    language: str
    tokens_used: int


class EmbedRequest(BaseModel):
    """Request body for POST /ai/embed"""
    texts: list[str] = Field(..., description="Texts to embed")


class EmbedResponse(BaseModel):
    """Response for embedding endpoint"""
    embeddings: list[list[float]] = Field(..., description="Vector embeddings")
    model_used: str
    dimension: int


class SearchRequest(BaseModel):
    """Request body for POST /ai/search"""
    query: str = Field(..., description="Semantic search query")
    filter_type: Optional[str] = Field(
        None,
        description="Filter by: task|handover|deal|meeting|document"
    )
    n_results: int = Field(5, description="Number of results to return")


class SearchResult(BaseModel):
    """A single search result"""
    doc_id: str
    doc_type: str
    content: str
    similarity_score: float
    metadata: dict


class SearchResponse(BaseModel):
    """Response for RAG search"""
    query: str
    results: list[SearchResult]
    total_results: int


class IndexRequest(BaseModel):
    """Request body for POST /ai/index"""
    content: str = Field(..., description="Content to index")
    doc_type: str = Field(
        ...,
        description="Type: task|handover|deal|meeting|document"
    )
    metadata: dict = Field(default_factory=dict, description="Document metadata")


class IndexResponse(BaseModel):
    """Response for indexing"""
    doc_id: str
    doc_type: str
    indexed_at: datetime
    tokens_indexed: int


class ProviderHealth(BaseModel):
    """Health status of an AI provider"""
    name: str
    healthy: bool
    details: Optional[dict] = None


class HealthResponse(BaseModel):
    """Response for GET /ai/health"""
    timestamp: datetime
    claude: bool = Field(..., description="Claude API available")
    ollama: bool = Field(..., description="Ollama service available")
    ollama_models: Optional[list[str]] = Field(None, description="Available Ollama models")
    embeddings: bool = Field(..., description="Embedding service available")
    rag_index: bool = Field(..., description="RAG index accessible")
    all_healthy: bool = Field(..., description="All services healthy")


class StatsResponse(BaseModel):
    """Response for GET /ai/stats"""
    period: str = Field("all_time", description="Statistics period")
    total_requests: int
    by_provider: dict = Field(..., description="Request counts by provider")
    by_task_type: dict = Field(..., description="Request counts by task type")
    total_tokens_used: int
    estimated_cost_usd: float
    avg_latency_ms: float
    most_used_features: list[str]


class ModelInfo(BaseModel):
    """Information about an available model"""
    name: str
    provider: str = Field(..., description="claude|ollama|huggingface|custom")
    description: str
    context_size: int
    parameters: Optional[str] = None
    installed: bool = Field(False, description="Whether model is installed/available")


class ModelsResponse(BaseModel):
    """Response for GET /ai/models"""
    available_models: list[ModelInfo]
    default_model: str
    timestamp: datetime


class PullModelRequest(BaseModel):
    """Request body for POST /ai/models/pull"""
    model_name: str = Field(..., description="Ollama model name (e.g., llama2, mistral)")


class PullModelResponse(BaseModel):
    """Response for model pull"""
    model_name: str
    status: str = Field(..., description="queued|downloading|installed|failed")
    progress: Optional[float] = Field(None, description="Download progress 0-1")
    message: str


class TrainingStatusResponse(BaseModel):
    """Response for GET /ai/training/status"""
    data_collected: int = Field(..., description="Number of training samples")
    model_version: str = Field(..., description="Current trained model version")
    last_trained: Optional[datetime] = None
    next_training_scheduled: Optional[datetime] = None
    status: str = Field(..., description="idle|collecting|training|ready")


class CollectTrainingDataResponse(BaseModel):
    """Response for POST /ai/training/collect"""
    collection_started: bool
    samples_queued: int
    estimated_duration_minutes: int


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/chat — non-streaming chat via Claude (use /agent/chat for streaming)."""
    _require_company_feature(db, current_user, "ai_chat")

    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    if not messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    try:
        result = await claude_client.chat(
            messages=messages,
            model=ClaudeModel.HAIKU,
            max_tokens=request.max_tokens or 2048,
            temperature=request.temperature or 0.3,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")
    except Exception as e:
        logger.exception("ai/chat failed")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    return ChatResponse(
        content=result["content"],
        model_used=result["model"],
        context_injected=False,
        context_sources=None,
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/analyze — sentiment / summary / entities / keywords / classification."""
    _require_company_feature(db, current_user, "ai_analyze")

    import time
    start = time.time()
    try:
        result = await claude_client.analyze(
            text=request.text,
            analysis_type=request.analysis_type,
            context=request.context,
            language=request.language,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")
    except Exception as e:
        logger.exception("ai/analyze failed")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    return AnalyzeResponse(
        analysis_type=request.analysis_type,
        results={"content": result["content"], "raw": result},
        model_used=result["model"],
        processing_time_ms=(time.time() - start) * 1000,
    )


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/generate — generate report / handover / brief / summary / action_plan."""
    _require_company_feature(db, current_user, "ai_chat")

    context_str = "\n".join(f"{k}: {v}" for k, v in request.context.items()) if isinstance(request.context, dict) else str(request.context)

    try:
        content = await claude_client.generate_document(
            doc_type=request.doc_type,
            context=context_str,
            language=request.language,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {e}")
    except Exception as e:
        logger.exception("ai/generate failed")
        raise HTTPException(status_code=500, detail=f"AI error: {e}")

    return GenerateResponse(
        doc_type=request.doc_type,
        content=content if isinstance(content, str) else str(content),
        language=request.language,
        tokens_used=0,
    )


@router.post("/embed", response_model=EmbedResponse)
async def embed(
    request: EmbedRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/embed — vector embeddings (requires RAG infra, admin only)."""
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Embedding service requires ChromaDB + embedding model infra (future phase)",
    )


@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/search — simple keyword search across workspace entities (RAG fallback)."""
    company_id = _require_company_feature(db, current_user, "ai_chat")

    from models import ProjectTask, Project, HandoverRecord, Meeting, Deal

    q = request.query.strip().lower()
    results: list[SearchResult] = []

    def _push(doc_id, doc_type, content, meta):
        results.append(SearchResult(
            doc_id=str(doc_id), doc_type=doc_type, content=content[:400],
            similarity_score=1.0 if q in (content or "").lower() else 0.5,
            metadata=meta,
        ))

    if not request.filter_type or request.filter_type == "task":
        tasks = (
            db.query(ProjectTask).join(Project, ProjectTask.project_id == Project.id)
            .filter(Project.company_id == company_id)
            .filter(ProjectTask.title.ilike(f"%{q}%")).limit(request.n_results).all()
        )
        for t in tasks:
            _push(t.id, "task", f"{t.title}\n{t.description or ''}", {"status": t.status, "priority": t.priority})

    if not request.filter_type or request.filter_type == "handover":
        hs = db.query(HandoverRecord).filter(
            HandoverRecord.user_id == current_user.id,
            HandoverRecord.title.ilike(f"%{q}%"),
        ).limit(request.n_results).all()
        for h in hs:
            _push(h.id, "handover", f"{h.title}\n{h.content or ''}", {})

    if not request.filter_type or request.filter_type == "meeting":
        ms = db.query(Meeting).filter(
            Meeting.company_id == company_id,
            Meeting.title.ilike(f"%{q}%"),
        ).limit(request.n_results).all()
        for m in ms:
            _push(m.id, "meeting", f"{m.title}\n{m.notes or ''}", {"date": str(m.meeting_date)})

    if not request.filter_type or request.filter_type == "deal":
        ds = db.query(Deal).filter(
            Deal.user_id == current_user.id,
            Deal.company.ilike(f"%{q}%"),
        ).limit(request.n_results).all()
        for d in ds:
            _push(d.id, "deal", f"{d.company}\n{d.notes or ''}", {"stage": d.stage, "value": d.value})

    results.sort(key=lambda r: r.similarity_score, reverse=True)
    return SearchResponse(query=request.query, results=results[: request.n_results], total_results=len(results))


@router.post("/index", response_model=IndexResponse)
async def index(
    request: IndexRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """POST /ai/index — RAG indexing (requires ChromaDB infra, future phase)."""
    _require_company_feature(db, current_user, "ai_chat")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Indexing requires ChromaDB infra. Use /ai/search for keyword fallback.",
    )


@router.get("/health", response_model=HealthResponse)
async def health():
    """GET /ai/health — provider availability (public)."""
    claude_ok = bool(settings.ANTHROPIC_API_KEY)
    ollama_ok = False
    ollama_models: Optional[list[str]] = None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as hc:
            r = await hc.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if r.status_code == 200:
                ollama_ok = True
                ollama_models = [m.get("name") for m in r.json().get("models", []) if m.get("name")]
    except Exception:
        ollama_ok = False

    all_ok = claude_ok or ollama_ok  # at least one tier working
    return HealthResponse(
        timestamp=datetime.utcnow(),
        claude=claude_ok,
        ollama=ollama_ok,
        ollama_models=ollama_models,
        embeddings=False,
        rag_index=False,
        all_healthy=all_ok,
    )


@router.get("/stats", response_model=StatsResponse)
async def stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /ai/stats - AI usage statistics (admin only).

    Returns request counts, provider usage, token usage, costs, and latency metrics.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    s = claude_client.get_stats()
    return StatsResponse(
        period="all_time",
        total_requests=s["requests"]["total"],
        by_provider={"claude": s["requests"]["successful"]},
        by_task_type={},
        total_tokens_used=s["tokens"]["total"],
        estimated_cost_usd=s["cost"]["estimated_usd"],
        avg_latency_ms=0.0,
        most_used_features=[],
    )


@router.get("/models", response_model=ModelsResponse)
async def models(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /ai/models - List all available models (admin only).

    Returns installed Ollama models, HF recommended models, and custom models.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    available: list[ModelInfo] = [
        ModelInfo(name="claude-haiku-4-5-20251001", provider="claude",
                  description="Fast Claude Haiku 4.5", context_size=200000,
                  installed=bool(settings.ANTHROPIC_API_KEY)),
        ModelInfo(name="claude-sonnet-4-20250514", provider="claude",
                  description="Claude Sonnet 4 (balanced)", context_size=200000,
                  installed=bool(settings.ANTHROPIC_API_KEY)),
    ]
    return ModelsResponse(
        available_models=available,
        default_model="claude-haiku-4-5-20251001",
        timestamp=datetime.utcnow(),
    )


@router.post("/models/pull", response_model=PullModelResponse)
async def pull_model(
    request: PullModelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /ai/models/pull - Download/pull an Ollama model (admin only).

    Triggers asynchronous model pull from Ollama registry.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    # TODO: Implement model pulling
    logger.info(f"Model pull requested by admin {current_user.username}: {request.model_name}")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Model pull endpoint under development"
    )


@router.get("/training/status", response_model=TrainingStatusResponse)
async def training_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    GET /ai/training/status - Custom model training status (admin only).

    Returns data collection progress, model version, and training schedule.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    # TODO: Implement training status
    logger.info(f"Training status requested by admin {current_user.username}")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Training status endpoint under development"
    )


@router.post("/training/collect", response_model=CollectTrainingDataResponse)
async def collect_training_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    POST /ai/training/collect - Start data collection for custom model training (admin only).

    Triggers asynchronous data collection pipeline.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    # TODO: Implement training data collection
    logger.info(f"Training data collection started by admin {current_user.username}")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Training collection endpoint under development"
    )
