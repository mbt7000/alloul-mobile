"""
Workflow Automation Engine
محرك أتمتة سير العمل
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
from abc import ABC, abstractmethod
import json

from sqlalchemy.orm import Session
from pydantic import BaseModel


class WorkflowStatus(str, Enum):
    """Workflow execution status."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class TaskStatus(str, Enum):
    """Individual task status in workflow."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class TriggerType(str, Enum):
    """Workflow trigger types."""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    EVENT = "event"
    WEBHOOK = "webhook"


@dataclass
class WorkflowTask:
    """A single task in a workflow."""
    id: str
    name: str
    description: str
    action: str  # e.g., "send_email", "create_project", "notify_user"
    inputs: Dict[str, Any] = field(default_factory=dict)
    condition: Optional[str] = None  # Conditional expression
    retry_count: int = 3
    timeout_seconds: int = 300
    depends_on: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "action": self.action,
            "inputs": self.inputs,
            "condition": self.condition,
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
        }


@dataclass
class WorkflowDefinition:
    """Complete workflow definition."""
    id: str
    name: str
    description: str
    trigger: TriggerType
    trigger_config: Dict[str, Any] = field(default_factory=dict)
    tasks: List[WorkflowTask] = field(default_factory=list)
    status: WorkflowStatus = WorkflowStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def add_task(self, task: WorkflowTask):
        """Add a task to the workflow."""
        self.tasks.append(task)

    def get_task(self, task_id: str) -> Optional[WorkflowTask]:
        """Get a task by ID."""
        return next((t for t in self.tasks if t.id == task_id), None)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "trigger": self.trigger.value,
            "trigger_config": self.trigger_config,
            "tasks": [t.to_dict() for t in self.tasks],
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass
class WorkflowExecution:
    """Record of a workflow execution."""
    id: str
    workflow_id: str
    status: WorkflowStatus = WorkflowStatus.DRAFT
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    triggered_by: str = "manual"  # user_id or trigger name
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    task_results: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "triggered_by": self.triggered_by,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "errors": self.errors,
            "task_results": self.task_results,
        }


class ActionHandler(ABC):
    """Base class for workflow action handlers."""

    @abstractmethod
    async def execute(self, task: WorkflowTask, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the action and return output."""
        pass

    @abstractmethod
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate action inputs."""
        pass


class SendEmailAction(ActionHandler):
    """Send email action."""

    async def execute(self, task: WorkflowTask, context: Dict[str, Any]) -> Dict[str, Any]:
        """Send an email."""
        email = task.inputs.get("email")
        subject = task.inputs.get("subject")
        body = task.inputs.get("body")

        if not email or not subject or not body:
            raise ValueError("Missing required fields: email, subject, body")

        # In production, actually send email via SMTP
        return {
            "email": email,
            "subject": subject,
            "sent_at": datetime.now().isoformat(),
            "status": "sent",
        }

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        required = ["email", "subject", "body"]
        return all(key in inputs for key in required)


class CreateTaskAction(ActionHandler):
    """Create a task action."""

    async def execute(self, task: WorkflowTask, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task."""
        title = task.inputs.get("title")
        description = task.inputs.get("description")
        project_id = task.inputs.get("project_id")

        if not title or not project_id:
            raise ValueError("Missing required fields: title, project_id")

        # In production, create actual task in database
        return {
            "task_id": f"task_{datetime.now().timestamp()}",
            "title": title,
            "project_id": project_id,
            "created_at": datetime.now().isoformat(),
        }

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        required = ["title", "project_id"]
        return all(key in inputs for key in required)


class NotifyUserAction(ActionHandler):
    """Notify user action."""

    async def execute(self, task: WorkflowTask, context: Dict[str, Any]) -> Dict[str, Any]:
        """Notify a user."""
        user_id = task.inputs.get("user_id")
        message = task.inputs.get("message")
        notification_type = task.inputs.get("type", "info")

        if not user_id or not message:
            raise ValueError("Missing required fields: user_id, message")

        # In production, create notification record
        return {
            "user_id": user_id,
            "message": message,
            "type": notification_type,
            "created_at": datetime.now().isoformat(),
        }

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        required = ["user_id", "message"]
        return all(key in inputs for key in required)


# Registry of available actions
ACTION_HANDLERS: Dict[str, type[ActionHandler]] = {
    "send_email": SendEmailAction,
    "create_task": CreateTaskAction,
    "notify_user": NotifyUserAction,
}


class WorkflowEngine:
    """
    Workflow execution engine.
    
    Features:
    - Execute workflows with multiple tasks
    - Handle task dependencies
    - Error handling and retries
    - Conditional execution
    - Activity logging
    """

    def __init__(self):
        self.handlers: Dict[str, ActionHandler] = {}
        self._register_handlers()

    def _register_handlers(self):
        """Register available action handlers."""
        for action_name, handler_class in ACTION_HANDLERS.items():
            self.handlers[action_name] = handler_class()

    async def execute_workflow(
        self,
        workflow: WorkflowDefinition,
        inputs: Dict[str, Any],
    ) -> WorkflowExecution:
        """Execute a workflow."""
        execution = WorkflowExecution(
            id=f"exec_{datetime.now().timestamp()}",
            workflow_id=workflow.id,
            status=WorkflowStatus.DRAFT,
            inputs=inputs,
        )

        execution.status = WorkflowStatus.DRAFT
        execution.started_at = datetime.now()

        try:
            # Topological sort tasks by dependencies
            sorted_tasks = self._topological_sort(workflow.tasks)

            for task in sorted_tasks:
                # Check condition
                if task.condition and not self._evaluate_condition(task.condition, execution):
                    task.status = TaskStatus.SKIPPED
                    continue

                # Execute task
                try:
                    task.status = TaskStatus.RUNNING
                    handler = self.handlers.get(task.action)

                    if not handler:
                        raise ValueError(f"Unknown action: {task.action}")

                    output = await handler.execute(task, execution.to_dict())
                    task.status = TaskStatus.COMPLETED
                    task.output = output
                    execution.task_results[task.id] = output

                except Exception as e:
                    task.status = TaskStatus.FAILED
                    task.error = str(e)
                    execution.errors.append(f"Task {task.id} failed: {str(e)}")

                    # Retry logic
                    if task.retry_count > 0:
                        task.retry_count -= 1
                        # In production, implement actual retry
                    else:
                        raise

            execution.status = WorkflowStatus.COMPLETED
            execution.completed_at = datetime.now()

        except Exception as e:
            execution.status = WorkflowStatus.FAILED
            execution.errors.append(f"Workflow failed: {str(e)}")
            execution.completed_at = datetime.now()

        return execution

    def _topological_sort(self, tasks: List[WorkflowTask]) -> List[WorkflowTask]:
        """Sort tasks by dependencies."""
        sorted_tasks = []
        remaining = set(t.id for t in tasks)
        task_map = {t.id: t for t in tasks}

        while remaining:
            for task_id in list(remaining):
                task = task_map[task_id]
                # Check if all dependencies are done
                if all(dep not in remaining for dep in task.depends_on):
                    sorted_tasks.append(task)
                    remaining.remove(task_id)
                    break

        return sorted_tasks

    def _evaluate_condition(self, condition: str, execution: WorkflowExecution) -> bool:
        """Evaluate a conditional expression."""
        # Simple condition evaluation (in production, use safer evaluation)
        try:
            # Replace variables with actual values
            context = {
                "inputs": execution.inputs,
                "task_results": execution.task_results,
            }
            return eval(condition, {"__builtins__": {}}, context)
        except Exception:
            return True  # Default to True if condition evaluation fails

    def validate_workflow(self, workflow: WorkflowDefinition) -> List[str]:
        """Validate workflow definition."""
        errors = []

        if not workflow.tasks:
            errors.append("Workflow must have at least one task")

        for task in workflow.tasks:
            if task.action not in self.handlers:
                errors.append(f"Unknown action: {task.action}")

            handler = self.handlers.get(task.action)
            if handler and not handler.validate_inputs(task.inputs):
                errors.append(f"Invalid inputs for task {task.id}")

        return errors
