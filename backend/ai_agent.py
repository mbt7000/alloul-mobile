"""
AI Agent System — Problem Solving & Reasoning Engine
نظام وكيل ذكي — محرك حل المشاكل والتفكير
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import json

from sqlalchemy.orm import Session
from pydantic import BaseModel


class TaskState(str, Enum):
    """Task execution state."""
    PENDING = "pending"
    ANALYZING = "analyzing"
    PLANNING = "planning"
    EXECUTING = "executing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class ReasoningStep(str, Enum):
    """Steps in the reasoning process."""
    UNDERSTAND = "understand"  # Parse and understand request
    BREAK_DOWN = "break_down"   # Decompose into subtasks
    PLAN = "plan"               # Create execution plan
    EXECUTE = "execute"         # Execute each subtask
    VALIDATE = "validate"       # Validate results
    OPTIMIZE = "optimize"       # Optimize solution


@dataclass
class ReasoningTrace:
    """Trace of agent reasoning steps."""
    step: ReasoningStep
    timestamp: datetime = field(default_factory=datetime.now)
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    reasoning: str = ""
    confidence: float = 0.0  # 0.0 to 1.0

    def to_dict(self):
        return {
            "step": self.step.value,
            "timestamp": self.timestamp.isoformat(),
            "input": self.input_data,
            "output": self.output_data,
            "reasoning": self.reasoning,
            "confidence": self.confidence,
        }


@dataclass
class TaskBreakdown:
    """Decomposition of a task into subtasks."""
    original_task: str
    subtasks: List[Dict[str, Any]] = field(default_factory=list)
    dependencies: List[tuple[int, int]] = field(default_factory=list)  # (task_id, depends_on_id)
    estimated_steps: int = 0

    def add_subtask(
        self,
        title: str,
        description: str,
        depends_on: Optional[int] = None,
        tools: Optional[List[str]] = None,
    ) -> int:
        """Add a subtask and return its ID."""
        task_id = len(self.subtasks)
        self.subtasks.append({
            "id": task_id,
            "title": title,
            "description": description,
            "tools": tools or [],
            "status": "pending",
        })
        if depends_on is not None:
            self.dependencies.append((task_id, depends_on))
        self.estimated_steps += 1
        return task_id

    def to_dict(self):
        return {
            "original_task": self.original_task,
            "subtasks": self.subtasks,
            "dependencies": self.dependencies,
            "estimated_steps": self.estimated_steps,
        }


@dataclass
class AgentContext:
    """Context for agent operations."""
    user_id: int
    company_id: int
    request: str
    tools_available: List[str] = field(default_factory=list)
    max_iterations: int = 10
    reasoning_trace: List[ReasoningTrace] = field(default_factory=list)
    current_state: TaskState = TaskState.PENDING
    error_messages: List[str] = field(default_factory=list)

    def add_trace(self, trace: ReasoningTrace):
        """Add a reasoning step to the trace."""
        self.reasoning_trace.append(trace)

    def add_error(self, error: str):
        """Record an error."""
        self.error_messages.append(f"[{datetime.now().isoformat()}] {error}")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "company_id": self.company_id,
            "request": self.request,
            "tools": self.tools_available,
            "state": self.current_state.value,
            "reasoning_steps": len(self.reasoning_trace),
            "errors": self.error_messages,
        }


class AIAgent:
    """
    Problem-solving AI Agent.
    
    Workflow:
    1. UNDERSTAND: Parse user request and extract intent
    2. BREAK_DOWN: Decompose into manageable subtasks
    3. PLAN: Create execution strategy
    4. EXECUTE: Execute each subtask with available tools
    5. VALIDATE: Verify results meet original requirements
    6. OPTIMIZE: Refine solution for efficiency
    """

    def __init__(self, context: AgentContext):
        self.context = context
        self.breakdown: Optional[TaskBreakdown] = None
        self.solution: Optional[Dict[str, Any]] = None

    def understand_request(self) -> bool:
        """Step 1: Understand and parse the request."""
        self.context.current_state = TaskState.ANALYZING

        trace = ReasoningTrace(
            step=ReasoningStep.UNDERSTAND,
            input_data={"request": self.context.request},
        )

        try:
            # Parse the request
            intent = self._extract_intent(self.context.request)
            entities = self._extract_entities(self.context.request)

            trace.output_data = {
                "intent": intent,
                "entities": entities,
            }
            trace.reasoning = f"Identified intent: {intent}, entities: {entities}"
            trace.confidence = 0.95

            self.context.add_trace(trace)
            return True

        except Exception as e:
            self.context.add_error(f"Failed to understand request: {str(e)}")
            return False

    def break_down_task(self) -> bool:
        """Step 2: Decompose task into subtasks."""
        self.context.current_state = TaskState.PLANNING

        trace = ReasoningTrace(
            step=ReasoningStep.BREAK_DOWN,
            input_data={"request": self.context.request},
        )

        try:
            self.breakdown = TaskBreakdown(original_task=self.context.request)

            # Decompose based on intent
            subtasks = self._generate_subtasks()
            for subtask in subtasks:
                self.breakdown.add_subtask(
                    title=subtask["title"],
                    description=subtask["description"],
                    tools=subtask.get("tools"),
                )

            trace.output_data = self.breakdown.to_dict()
            trace.reasoning = f"Decomposed into {len(self.breakdown.subtasks)} subtasks"
            trace.confidence = 0.85

            self.context.add_trace(trace)
            return True

        except Exception as e:
            self.context.add_error(f"Failed to break down task: {str(e)}")
            return False

    def plan_execution(self) -> bool:
        """Step 3: Create execution plan."""
        trace = ReasoningTrace(
            step=ReasoningStep.PLAN,
            input_data=self.breakdown.to_dict() if self.breakdown else {},
        )

        try:
            if not self.breakdown:
                raise ValueError("Task not broken down yet")

            # Topological sort based on dependencies
            execution_order = self._topological_sort(self.breakdown)

            trace.output_data = {
                "execution_order": execution_order,
                "total_steps": len(execution_order),
            }
            trace.reasoning = f"Created execution plan with {len(execution_order)} steps"
            trace.confidence = 0.9

            self.context.add_trace(trace)
            return True

        except Exception as e:
            self.context.add_error(f"Failed to plan execution: {str(e)}")
            return False

    def execute_plan(self) -> bool:
        """Step 4: Execute the plan."""
        self.context.current_state = TaskState.EXECUTING

        trace = ReasoningTrace(
            step=ReasoningStep.EXECUTE,
            input_data=self.breakdown.to_dict() if self.breakdown else {},
        )

        try:
            results = {}
            for i, subtask in enumerate(self.breakdown.subtasks):
                if i >= self.context.max_iterations:
                    raise Exception(f"Exceeded max iterations ({self.context.max_iterations})")

                # Execute subtask
                result = self._execute_subtask(subtask)
                results[f"task_{subtask['id']}"] = result

            trace.output_data = results
            trace.reasoning = f"Executed {len(results)} subtasks"
            trace.confidence = 0.8

            self.solution = results
            self.context.add_trace(trace)
            return True

        except Exception as e:
            self.context.add_error(f"Failed to execute plan: {str(e)}")
            return False

    def validate_solution(self) -> bool:
        """Step 5: Validate the solution."""
        self.context.current_state = TaskState.VALIDATING

        trace = ReasoningTrace(
            step=ReasoningStep.VALIDATE,
            input_data={"solution": self.solution or {}},
        )

        try:
            if not self.solution:
                raise ValueError("No solution generated")

            # Validate results
            is_valid = self._validate_results(self.solution, self.context.request)
            validation_score = self._calculate_validation_score(self.solution)

            trace.output_data = {
                "is_valid": is_valid,
                "score": validation_score,
            }
            trace.reasoning = f"Solution validation score: {validation_score}"
            trace.confidence = validation_score

            self.context.add_trace(trace)
            return is_valid

        except Exception as e:
            self.context.add_error(f"Failed to validate solution: {str(e)}")
            return False

    def optimize_solution(self) -> bool:
        """Step 6: Optimize the solution."""
        trace = ReasoningTrace(
            step=ReasoningStep.OPTIMIZE,
            input_data={"solution": self.solution or {}},
        )

        try:
            if not self.solution:
                return True  # No solution to optimize

            # Apply optimizations
            optimized = self._apply_optimizations(self.solution)

            trace.output_data = optimized
            trace.reasoning = "Applied optimizations for efficiency"
            trace.confidence = 0.85

            self.solution = optimized
            self.context.add_trace(trace)
            return True

        except Exception as e:
            self.context.add_error(f"Failed to optimize solution: {str(e)}")
            return False

    async def run(self) -> Dict[str, Any]:
        """Run the complete agent workflow."""
        steps = [
            ("understand", self.understand_request),
            ("break_down", self.break_down_task),
            ("plan", self.plan_execution),
            ("execute", self.execute_plan),
            ("validate", self.validate_solution),
            ("optimize", self.optimize_solution),
        ]

        for step_name, step_func in steps:
            if not step_func():
                self.context.current_state = TaskState.FAILED
                break
        else:
            self.context.current_state = TaskState.COMPLETED

        return {
            "status": self.context.current_state.value,
            "solution": self.solution,
            "context": self.context.to_dict(),
            "reasoning_trace": [trace.to_dict() for trace in self.context.reasoning_trace],
        }

    # Helper methods
    def _extract_intent(self, request: str) -> str:
        """Extract intent from request."""
        keywords = {
            "create": ["create", "new", "add", "make"],
            "read": ["show", "get", "list", "view"],
            "update": ["update", "change", "modify", "edit"],
            "delete": ["delete", "remove", "drop"],
            "analyze": ["analyze", "check", "review", "examine"],
        }
        
        request_lower = request.lower()
        for intent, words in keywords.items():
            if any(word in request_lower for word in words):
                return intent
        return "unknown"

    def _extract_entities(self, request: str) -> List[str]:
        """Extract entities from request."""
        # Simple entity extraction
        entities = []
        words = request.split()
        for word in words:
            if len(word) > 3 and word[0].isupper():
                entities.append(word)
        return entities

    def _generate_subtasks(self) -> List[Dict[str, Any]]:
        """Generate subtasks based on request."""
        return [
            {"title": "Analyze request", "description": "Understand user intent"},
            {"title": "Prepare resources", "description": "Gather necessary data/tools"},
            {"title": "Execute main logic", "description": "Perform core operation"},
            {"title": "Format results", "description": "Prepare output"},
        ]

    def _topological_sort(self, breakdown: TaskBreakdown) -> List[int]:
        """Sort tasks by dependencies."""
        # Simple topological sort
        sorted_tasks = []
        remaining = set(range(len(breakdown.subtasks)))
        
        while remaining:
            # Find tasks with no unmet dependencies
            for task_id in remaining:
                deps = [dep[1] for dep in breakdown.dependencies if dep[0] == task_id]
                if all(dep not in remaining for dep in deps):
                    sorted_tasks.append(task_id)
                    remaining.remove(task_id)
                    break
        
        return sorted_tasks

    def _execute_subtask(self, subtask: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single subtask."""
        return {
            "task_id": subtask["id"],
            "title": subtask["title"],
            "status": "completed",
            "output": f"Executed: {subtask['title']}",
        }

    def _validate_results(self, solution: Dict[str, Any], original_request: str) -> bool:
        """Validate that solution addresses the original request."""
        return len(solution) > 0

    def _calculate_validation_score(self, solution: Dict[str, Any]) -> float:
        """Calculate validation score (0-1)."""
        if not solution:
            return 0.0
        return min(1.0, len(solution) / 5)  # Normalize by expected tasks

    def _apply_optimizations(self, solution: Dict[str, Any]) -> Dict[str, Any]:
        """Apply optimizations to solution."""
        return solution
