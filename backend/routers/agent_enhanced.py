"""
Enhanced AI Agent Router
نظام وكيل ذكي محسّن
- Multi-step problem solving
- Reasoning trace and explainability
- Integration with company context
"""

from __future__ import annotations

from typing import Annotated, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from tenant import CurrentTenant
from ai_agent import AIAgent, AgentContext, TaskState
from service_utils import log_activity, OperationAction

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRequest(BaseModel):
    """Agent problem-solving request."""
    query: str
    context: Optional[dict] = None
    tools: Optional[List[str]] = None
    max_iterations: int = 10


class ReasoningStepResponse(BaseModel):
    """Response for a reasoning step."""
    step: str
    timestamp: str
    reasoning: str
    confidence: float
    input: dict
    output: dict


class AgentResponse(BaseModel):
    """Response from AI Agent."""
    status: str
    request: str
    solution: Optional[dict] = None
    reasoning_steps: int = 0
    completed_steps: List[ReasoningStepResponse] = []
    errors: List[str] = []


@router.post("/solve", response_model=AgentResponse)
async def solve_problem(
    body: AgentRequest,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Submit a problem to the AI Agent for solving.
    
    The agent will:
    1. Understand the request
    2. Break it down into subtasks
    3. Plan execution
    4. Execute the plan
    5. Validate results
    6. Optimize the solution
    """
    
    # Create agent context
    context = AgentContext(
        user_id=tenant.user.id,
        company_id=tenant.company_id,
        request=body.query,
        tools_available=body.tools or [],
        max_iterations=body.max_iterations,
    )

    # Create and run agent
    agent = AIAgent(context)
    result = await agent.run()

    # Log activity
    log_activity(
        db, tenant.company_id, tenant.user.id,
        OperationAction.CREATE, "AgentTask", 0,
        f"Agent solved: {body.query[:50]}"
    )

    # Build response with reasoning trace
    reasoning_steps = [
        ReasoningStepResponse(
            step=trace["step"],
            timestamp=trace["timestamp"],
            reasoning=trace["reasoning"],
            confidence=trace["confidence"],
            input=trace["input"],
            output=trace["output"],
        )
        for trace in result["reasoning_trace"]
    ]

    return AgentResponse(
        status=result["status"],
        request=body.query,
        solution=result["solution"],
        reasoning_steps=len(reasoning_steps),
        completed_steps=reasoning_steps,
        errors=context.error_messages,
    )


@router.get("/reasoning/{task_id}")
async def get_reasoning_trace(
    task_id: str,
    tenant: CurrentTenant,
    db: Annotated[Session, Depends(get_db)],
):
    """Get detailed reasoning trace for a specific agent task."""
    # In production, retrieve from database
    return {
        "task_id": task_id,
        "company_id": tenant.company_id,
        "reasoning_steps": [],
    }


@router.get("/capabilities")
async def get_agent_capabilities(
    tenant: CurrentTenant,
):
    """Get list of available tools and capabilities for the agent."""
    return {
        "tools": [
            "database_query",
            "external_api",
            "math_compute",
            "text_analysis",
            "code_generation",
            "data_validation",
        ],
        "max_iterations": 10,
        "max_request_size": 4000,
        "supported_languages": ["en", "ar"],
    }
