"""
Service Orchestrator — Manages workflows and coordinates multiple services.

This module handles:
  - Task analysis (what services are needed)
  - Service sequencing (execution order)
  - Error handling and fallbacks
  - Cross-service data passing
  - Async/concurrent execution
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Callable, Any, Dict, List
from datetime import datetime

from services.platform_registry import Platform, PlatformStatus


class WorkflowStatus(Enum):
    """Status of a workflow execution."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"  # Some steps succeeded, others failed


@dataclass
class ServiceTask:
    """A single task within a workflow."""
    id: str                                    # Task ID
    service_id: str                            # Platform ID to use
    operation: str                             # What to do (send_email, create_meeting, etc)
    params: Dict[str, Any] = field(default_factory=dict)  # Input parameters
    depends_on: List[str] = field(default_factory=list)  # Task IDs that must complete first
    result: Optional[Any] = None               # Output
    error: Optional[str] = None
    status: WorkflowStatus = WorkflowStatus.PENDING


@dataclass
class ExecutionContext:
    """Context that flows through a workflow."""
    workflow_id: str
    user_id: int
    company_id: int
    created_at: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)  # Shared data between tasks


class ServiceOrchestrator:
    """
    Orchestrates multi-service workflows.

    Usage:
        orchestrator = ServiceOrchestrator()

        # Define tasks
        tasks = [
            ServiceTask("t1", "gmail", "send_email", {"to": "...", "subject": "..."}),
            ServiceTask("t2", "salesforce", "update_deal", {"deal_id": 123}, depends_on=["t1"]),
        ]

        # Execute
        result = await orchestrator.execute(tasks, context)
    """

    def __init__(self):
        self._service_handlers: Dict[str, Callable] = {}
        self._task_results: Dict[str, Any] = {}
        self._task_errors: Dict[str, str] = {}

    def register_handler(
        self,
        service_id: str,
        operation: str,
        handler: Callable
    ) -> None:
        """Register a handler for a service operation.

        Args:
            service_id: Platform ID (e.g., 'gmail')
            operation: Operation name (e.g., 'send_email')
            handler: Async function(context, params) -> result
        """
        key = f"{service_id}:{operation}"
        self._service_handlers[key] = handler

    async def execute(
        self,
        tasks: List[ServiceTask],
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """
        Execute a workflow of tasks.

        Returns:
            {
                'status': 'success' | 'failed' | 'partial',
                'results': {task_id: result},
                'errors': {task_id: error_msg},
            }
        """
        # Validate dependencies
        task_ids = {t.id for t in tasks}
        for task in tasks:
            for dep in task.depends_on:
                if dep not in task_ids:
                    return {
                        "status": "failed",
                        "error": f"Task {task.id} depends on unknown task {dep}",
                        "results": {},
                        "errors": {},
                    }

        # Build execution plan (topological sort)
        execution_order = self._topological_sort(tasks)
        if execution_order is None:
            return {
                "status": "failed",
                "error": "Circular dependency detected",
                "results": {},
                "errors": {},
            }

        # Execute tasks in order
        results: Dict[str, Any] = {}
        errors: Dict[str, str] = {}
        successful_tasks = 0

        for task in execution_order:
            # Check dependencies
            if not all(dep in results for dep in task.depends_on):
                errors[task.id] = "Dependency failed"
                task.status = WorkflowStatus.FAILED
                continue

            # Execute task
            try:
                task.status = WorkflowStatus.RUNNING
                result = await self._execute_task(task, context, results)
                results[task.id] = result
                task.result = result
                task.status = WorkflowStatus.SUCCESS
                successful_tasks += 1
            except Exception as e:
                error_msg = str(e)
                errors[task.id] = error_msg
                task.error = error_msg
                task.status = WorkflowStatus.FAILED

        # Determine overall status
        if not errors:
            status = "success"
        elif successful_tasks > 0:
            status = "partial"
        else:
            status = "failed"

        return {
            "status": status,
            "results": results,
            "errors": errors,
            "completed": successful_tasks,
            "total": len(execution_order),
        }

    async def _execute_task(
        self,
        task: ServiceTask,
        context: ExecutionContext,
        previous_results: Dict[str, Any],
    ) -> Any:
        """Execute a single service task."""
        handler_key = f"{task.service_id}:{task.operation}"
        handler = self._service_handlers.get(handler_key)

        if not handler:
            raise ValueError(f"No handler registered for {handler_key}")

        # Merge params with previous results (pass-through)
        merged_params = {**task.params}
        for dep_id in task.depends_on:
            if dep_id in previous_results:
                merged_params[f"_{dep_id}"] = previous_results[dep_id]

        # Execute handler
        result = await handler(context, merged_params)
        return result

    def _topological_sort(self, tasks: List[ServiceTask]) -> Optional[List[ServiceTask]]:
        """Topologically sort tasks by dependency. Returns None if cycle detected."""
        task_map = {t.id: t for t in tasks}
        visited = set()
        visiting = set()
        result = []

        def visit(task_id: str) -> bool:
            if task_id in visiting:
                return False  # Cycle detected
            if task_id in visited:
                return True

            visiting.add(task_id)
            task = task_map[task_id]

            for dep in task.depends_on:
                if not visit(dep):
                    return False

            visiting.remove(task_id)
            visited.add(task_id)
            result.append(task)
            return True

        for task in tasks:
            if task.id not in visited:
                if not visit(task.id):
                    return None

        return result

    def get_task_result(self, task_id: str) -> Optional[Any]:
        """Get the result of a completed task."""
        return self._task_results.get(task_id)

    def get_task_error(self, task_id: str) -> Optional[str]:
        """Get the error of a failed task."""
        return self._task_errors.get(task_id)


# Example handlers (to be implemented by service modules)

async def example_email_handler(context: ExecutionContext, params: Dict[str, Any]) -> Dict[str, str]:
    """Example handler for sending email via Gmail."""
    # In real implementation:
    # - Validate params (to, subject, body, etc)
    # - Call Gmail API
    # - Return message_id
    return {"message_id": "msg_123", "status": "sent"}


async def example_crm_handler(context: ExecutionContext, params: Dict[str, Any]) -> Dict[str, Any]:
    """Example handler for updating CRM."""
    # In real implementation:
    # - Validate params
    # - Call CRM API
    # - Return updated deal/contact info
    return {"id": params.get("deal_id"), "updated_at": datetime.utcnow().isoformat()}


# Global singleton orchestrator
_orchestrator: Optional[ServiceOrchestrator] = None


def get_orchestrator() -> ServiceOrchestrator:
    """Get or create the global orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ServiceOrchestrator()
        # Register built-in handlers here
        _orchestrator.register_handler("gmail", "send_email", example_email_handler)
        _orchestrator.register_handler("salesforce", "update_deal", example_crm_handler)
    return _orchestrator
