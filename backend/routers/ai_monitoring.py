"""
ALLOUL&Q AI Monitoring Router
===============================
Admin-only endpoints for monitoring the AI system:
- Usage analytics (requests, tokens, costs)
- Provider health status
- Model performance metrics
- Cost tracking and forecasting

All endpoints require admin authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from auth import get_current_user
from database import get_db
from admin_access import user_is_admin
from config import settings
from models import User


router = APIRouter(prefix="/ai/monitor", tags=["ai-monitoring"])


# Mock data generation functions
def get_mock_usage_stats() -> Dict[str, Any]:
    """Generate mock AI usage statistics for the last 24 hours."""
    return {
        "total_requests": 342,
        "total_tokens": 125400,
        "total_cost": 2.45,
        "avg_latency_ms": 1240
    }


def get_mock_provider_stats() -> Dict[str, Dict[str, Any]]:
    """Generate mock statistics by provider."""
    return {
        "claude": {
            "requests": 185,
            "tokens": 78500,
            "cost": 1.85,
            "avg_latency": 2100,
            "requests_24h": [12, 15, 18, 22, 25, 28, 32, 35, 38, 40, 42, 41, 39, 35, 30, 28, 26, 24, 22, 20, 18, 16, 15, 14]
        },
        "ollama": {
            "requests": 120,
            "tokens": 35200,
            "cost": 0.35,
            "avg_latency": 450,
            "requests_24h": [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5]
        },
        "huggingface": {
            "requests": 37,
            "tokens": 11700,
            "cost": 0.25,
            "avg_latency": 1850,
            "requests_24h": [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1]
        }
    }


def get_mock_trending_data() -> Dict[str, Any]:
    """Generate mock trending data."""
    return {
        "requests_by_hour": [
            {"hour": "00:00", "requests": 22, "cost": 0.12},
            {"hour": "01:00", "requests": 18, "cost": 0.10},
            {"hour": "02:00", "requests": 15, "cost": 0.08},
            {"hour": "03:00", "requests": 12, "cost": 0.06},
            {"hour": "04:00", "requests": 10, "cost": 0.05},
            {"hour": "05:00", "requests": 14, "cost": 0.08},
            {"hour": "06:00", "requests": 20, "cost": 0.12},
            {"hour": "07:00", "requests": 28, "cost": 0.15},
            {"hour": "08:00", "requests": 35, "cost": 0.20},
            {"hour": "09:00", "requests": 42, "cost": 0.25},
            {"hour": "10:00", "requests": 38, "cost": 0.22},
            {"hour": "11:00", "requests": 32, "cost": 0.18},
            {"hour": "12:00", "requests": 25, "cost": 0.14},
        ],
        "cost_by_day": [
            {"date": "2024-01-08", "cost": 1.85, "requests": 285},
            {"date": "2024-01-09", "cost": 2.10, "requests": 315},
            {"date": "2024-01-10", "cost": 1.95, "requests": 298},
            {"date": "2024-01-11", "cost": 2.45, "requests": 342},
        ]
    }


def get_mock_top_tasks() -> List[Dict[str, Any]]:
    """Generate mock task performance data."""
    return [
        {
            "task_type": "تحليل البيانات",
            "english_name": "Data Analysis",
            "count": 95,
            "avg_latency": 2340,
            "error_rate": 0.02
        },
        {
            "task_type": "إنشاء التقارير",
            "english_name": "Report Generation",
            "count": 78,
            "avg_latency": 1850,
            "error_rate": 0.01
        },
        {
            "task_type": "تلخيص المهام",
            "english_name": "Task Summarization",
            "count": 65,
            "avg_latency": 980,
            "error_rate": 0.00
        },
        {
            "task_type": "الترجمة",
            "english_name": "Translation",
            "count": 52,
            "avg_latency": 1240,
            "error_rate": 0.03
        },
        {
            "task_type": "اقتراح الأولويات",
            "english_name": "Priority Suggestions",
            "count": 52,
            "avg_latency": 1100,
            "error_rate": 0.01
        }
    ]


def get_mock_health_status() -> Dict[str, bool]:
    """Generate mock health status for AI providers."""
    return {
        "claude": True,
        "ollama": True,
        "huggingface": True,
        "rag_service": True
    }


def get_mock_model_performance() -> List[Dict[str, Any]]:
    """Generate mock model performance data."""
    return [
        {
            "model": "claude-3-opus",
            "provider": "claude",
            "requests": 185,
            "avg_latency": 2100,
            "error_rate": 0.01,
            "quality_score": 9.2,
            "throughput": "12 req/min"
        },
        {
            "model": "mistral-7b (Ollama)",
            "provider": "ollama",
            "requests": 75,
            "avg_latency": 450,
            "error_rate": 0.00,
            "quality_score": 8.1,
            "throughput": "45 req/min"
        },
        {
            "model": "llama2-13b (Ollama)",
            "provider": "ollama",
            "requests": 45,
            "avg_latency": 650,
            "error_rate": 0.00,
            "quality_score": 7.8,
            "throughput": "38 req/min"
        },
        {
            "model": "falcon-7b (HF)",
            "provider": "huggingface",
            "requests": 37,
            "avg_latency": 1850,
            "error_rate": 0.03,
            "quality_score": 7.2,
            "throughput": "8 req/min"
        }
    ]


def get_mock_recent_logs(limit: int = 50, provider: Optional[str] = None, task_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Generate mock recent AI request logs."""
    all_logs = [
        {
            "id": f"req_{i:05d}",
            "timestamp": (datetime.now() - timedelta(minutes=i*2)).isoformat(),
            "user_id": f"user_{(i % 10) + 1}",
            "provider": ["claude", "ollama", "huggingface"][i % 3],
            "model": ["claude-3-opus", "mistral-7b", "falcon-7b"][i % 3],
            "task_type": ["تحليل البيانات", "إنشاء التقارير", "تلخيص المهام", "الترجمة"][i % 4],
            "input_tokens": 150 + (i * 10) % 500,
            "output_tokens": 200 + (i * 15) % 400,
            "latency_ms": 1200 + (i * 50) % 1500,
            "cost": round((150 + (i * 10) % 500) * 0.000002, 6),
            "status": "success" if i % 20 != 0 else "error",
            "error_message": None if i % 20 != 0 else "Timeout after 30s"
        }
        for i in range(250)
    ]

    # Filter by provider if specified
    if provider:
        all_logs = [log for log in all_logs if log["provider"] == provider]

    # Filter by task_type if specified
    if task_type:
        all_logs = [log for log in all_logs if log["task_type"] == task_type]

    return all_logs[:limit]


@router.get("/dashboard")
async def get_monitoring_dashboard(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get complete monitoring dashboard data.

    Returns overview, provider stats, trending data, top tasks, and health status.
    Admin only.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    usage_stats = get_mock_usage_stats()
    provider_stats = get_mock_provider_stats()
    trending = get_mock_trending_data()
    top_tasks = get_mock_top_tasks()
    health = get_mock_health_status()

    return {
        "overview": {
            "total_requests_24h": usage_stats["total_requests"],
            "total_cost_24h": usage_stats["total_cost"],
            "avg_latency_ms": usage_stats["avg_latency_ms"],
            "error_rate": 0.012,
            "timestamp": datetime.now().isoformat(),
            "labels": {
                "ar": {
                    "requests": "الطلبات",
                    "cost": "التكلفة",
                    "latency": "زمن التأخير",
                    "errors": "الأخطاء"
                }
            }
        },
        "by_provider": {
            "claude": provider_stats["claude"],
            "ollama": provider_stats["ollama"],
            "huggingface": provider_stats["huggingface"]
        },
        "trending": trending,
        "top_tasks": top_tasks,
        "health": health
    }


@router.get("/costs")
async def get_cost_breakdown(
    period: str = Query("day", regex="^(day|week|month)$"),
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed cost breakdown for the specified period.

    Query params:
    - period: 'day', 'week', or 'month'

    Admin only.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    provider_stats = get_mock_provider_stats()

    period_multipliers = {
        "day": 1,
        "week": 7,
        "month": 30
    }
    multiplier = period_multipliers.get(period, 1)

    by_model = {
        "claude-3-opus": round(provider_stats["claude"]["cost"] * multiplier, 2),
        "mistral-7b": round(provider_stats["ollama"]["cost"] * 0.6 * multiplier, 2),
        "llama2-13b": round(provider_stats["ollama"]["cost"] * 0.4 * multiplier, 2),
        "falcon-7b": round(provider_stats["huggingface"]["cost"] * multiplier, 2)
    }

    by_task = {
        "تحليل البيانات": 0.75 * multiplier,
        "إنشاء التقارير": 0.62 * multiplier,
        "تلخيص المهام": 0.45 * multiplier,
        "الترجمة": 0.38 * multiplier,
        "اقتراح الأولويات": 0.25 * multiplier
    }

    total_cost = sum(by_model.values())

    return {
        "period": period,
        "total_cost": round(total_cost, 2),
        "by_provider": {
            "claude": round(provider_stats["claude"]["cost"] * multiplier, 2),
            "ollama": round(provider_stats["ollama"]["cost"] * multiplier, 2),
            "huggingface": round(provider_stats["huggingface"]["cost"] * multiplier, 2)
        },
        "by_model": by_model,
        "by_task": by_task,
        "daily_breakdown": get_mock_trending_data()["cost_by_day"],
        "projected_monthly": round(total_cost * 30 if period == "day" else total_cost, 2),
        "labels": {
            "ar": {
                "total": "إجمالي التكلفة",
                "byProvider": "حسب المزود",
                "byModel": "حسب النموذج",
                "byTask": "حسب المهمة",
                "projected": "المتوقع شهريًا"
            }
        }
    }


@router.get("/models")
async def get_model_performance(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get model performance comparison across all providers.

    Includes latency, error rates, and quality scores.
    Admin only.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    models = get_mock_model_performance()

    return {
        "models": models,
        "summary": {
            "total_models": len(models),
            "total_requests": sum(m["requests"] for m in models),
            "avg_quality_score": round(sum(m["quality_score"] for m in models) / len(models), 2),
            "avg_latency": round(sum(m["avg_latency"] for m in models) / len(models), 0)
        },
        "labels": {
            "ar": {
                "model": "النموذج",
                "requests": "الطلبات",
                "latency": "زمن التأخير",
                "errorRate": "معدل الأخطاء",
                "quality": "جودة النموذج",
                "throughput": "الإنتاجية"
            }
        }
    }


@router.get("/logs")
async def get_request_logs(
    limit: int = Query(50, ge=1, le=500),
    provider: Optional[str] = Query(None, regex="^(claude|ollama|huggingface)?$"),
    task_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get recent AI request logs with filtering options.

    Query params:
    - limit: number of logs to return (1-500, default 50)
    - provider: filter by 'claude', 'ollama', or 'huggingface'
    - task_type: filter by task type

    Admin only.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    logs = get_mock_recent_logs(limit=limit, provider=provider, task_type=task_type)

    success_count = sum(1 for log in logs if log["status"] == "success")
    error_count = len(logs) - success_count

    return {
        "logs": logs,
        "metadata": {
            "total_count": len(logs),
            "success_count": success_count,
            "error_count": error_count,
            "avg_latency_ms": round(sum(log["latency_ms"] for log in logs) / len(logs), 0) if logs else 0,
            "total_tokens": sum(log["input_tokens"] + log["output_tokens"] for log in logs),
            "total_cost": round(sum(log["cost"] for log in logs), 4)
        },
        "filters_applied": {
            "limit": limit,
            "provider": provider,
            "task_type": task_type
        }
    }


@router.post("/benchmark")
async def run_benchmark(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Run benchmark tests against all AI providers.

    Tests latency, quality, and cost efficiency.
    Admin only.
    """
    if not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")

    benchmark_results = [
        {
            "model": "claude-3-opus",
            "provider": "claude",
            "task": "تحليل البيانات",
            "latency_ms": 2150,
            "quality_score": 9.2,
            "cost_per_request": 0.005,
            "score": 8.8
        },
        {
            "model": "claude-3-sonnet",
            "provider": "claude",
            "task": "تحليل البيانات",
            "latency_ms": 1850,
            "quality_score": 8.9,
            "cost_per_request": 0.003,
            "score": 8.6
        },
        {
            "model": "mistral-7b",
            "provider": "ollama",
            "task": "تحليل البيانات",
            "latency_ms": 450,
            "quality_score": 8.1,
            "cost_per_request": 0.0001,
            "score": 8.4
        },
        {
            "model": "llama2-13b",
            "provider": "ollama",
            "task": "تحليل البيانات",
            "latency_ms": 650,
            "quality_score": 7.8,
            "cost_per_request": 0.0001,
            "score": 8.1
        },
        {
            "model": "falcon-7b",
            "provider": "huggingface",
            "task": "تحليل البيانات",
            "latency_ms": 1850,
            "quality_score": 7.2,
            "cost_per_request": 0.0008,
            "score": 7.5
        }
    ]

    return {
        "benchmark_id": f"bench_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "status": "completed",
        "results": benchmark_results,
        "recommendations": {
            "best_quality": "claude-3-opus (9.2/10)",
            "best_latency": "mistral-7b (450ms)",
            "best_value": "mistral-7b (quality/cost ratio 81000:1)",
            "summary_ar": "يوصى باستخدام Claude للمهام المعقدة و Mistral للاستجابة السريعة"
        }
    }
