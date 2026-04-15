"""
Workflow Automation Router
مسار إدارة سير العمل الآلي
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..tenant import CurrentTenant, get_tenant_context
from ..service_utils import (
    log_activity,
    OperationAction,
    AccessDeniedError,
    ResourceNotFoundError,
    ValidationError,
    PaginatedResponse,
    paginate,
    Role,
    can_perform_action,
    TimestampedResponse,
)
from ..workflow import (
    WorkflowDefinition,
    WorkflowExecution,
    WorkflowTask,
    WorkflowStatus,
    TaskStatus,
    TriggerType,
    WorkflowEngine,
    ActionHandler,
)
from ..query_filters import scope_query_by_company, ensure_company_scope

router = APIRouter(prefix="/workflows", tags=["workflows"])


# Pydantic models for request/response
class WorkflowTaskRequest(TimestampedResponse):
    name: str
    description: Optional[str] = None
    action: str
    inputs: Dict[str, Any]
    condition: Optional[str] = None
    retry_count: int = 0
    timeout_seconds: Optional[int] = None
    depends_on: List[str] = []


class WorkflowDefinitionRequest(TimestampedResponse):
    name: str
    description: Optional[str] = None
    trigger: TriggerType
    trigger_config: Dict[str, Any]
    tasks: List[WorkflowTaskRequest]
    status: WorkflowStatus = WorkflowStatus.DRAFT


class WorkflowResponse(TimestampedResponse):
    id: str
    company_id: str
    name: str
    description: Optional[str]
    trigger: TriggerType
    trigger_config: Dict[str, Any]
    tasks: List[Dict[str, Any]]
    status: WorkflowStatus
    created_by: str
    updated_by: str


class WorkflowExecutionResponse(TimestampedResponse):
    id: str
    workflow_id: str
    company_id: str
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    triggered_by: str
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    errors: List[str]
    task_results: Dict[str, Dict[str, Any]]


# Database models (simplified for example - in real implementation, these would be SQLAlchemy models)
class WorkflowDB:
    """Simulated database storage for workflows"""
    _workflows: Dict[str, Dict[str, Any]] = {}
    _executions: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def create_workflow(cls, company_id: str, data: Dict[str, Any]) -> str:
        import uuid
        workflow_id = str(uuid.uuid4())
        data["id"] = workflow_id
        data["company_id"] = company_id
        data["created_at"] = datetime.utcnow()
        data["updated_at"] = datetime.utcnow()
        cls._workflows[workflow_id] = data
        return workflow_id

    @classmethod
    def get_workflow(cls, workflow_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        workflow = cls._workflows.get(workflow_id)
        if workflow and workflow["company_id"] == company_id:
            return workflow
        return None

    @classmethod
    def list_workflows(cls, company_id: str, limit: int = 20, offset: int = 0) -> tuple:
        workflows = [w for w in cls._workflows.values() if w["company_id"] == company_id]
        total = len(workflows)
        paginated = workflows[offset : offset + limit]
        return paginated, total

    @classmethod
    def update_workflow(cls, workflow_id: str, company_id: str, data: Dict[str, Any]) -> bool:
        workflow = cls.get_workflow(workflow_id, company_id)
        if not workflow:
            return False
        data["updated_at"] = datetime.utcnow()
        cls._workflows[workflow_id].update(data)
        return True

    @classmethod
    def delete_workflow(cls, workflow_id: str, company_id: str) -> bool:
        workflow = cls.get_workflow(workflow_id, company_id)
        if not workflow:
            return False
        del cls._workflows[workflow_id]
        return True

    @classmethod
    def create_execution(cls, company_id: str, workflow_id: str, data: Dict[str, Any]) -> str:
        import uuid
        execution_id = str(uuid.uuid4())
        data["id"] = execution_id
        data["company_id"] = company_id
        data["workflow_id"] = workflow_id
        data["created_at"] = datetime.utcnow()
        cls._executions[execution_id] = data
        return execution_id

    @classmethod
    def get_execution(cls, execution_id: str, company_id: str) -> Optional[Dict[str, Any]]:
        execution = cls._executions.get(execution_id)
        if execution and execution["company_id"] == company_id:
            return execution
        return None

    @classmethod
    def get_workflow_executions(cls, workflow_id: str, company_id: str, limit: int = 20, offset: int = 0) -> tuple:
        executions = [e for e in cls._executions.values() 
                     if e["workflow_id"] == workflow_id and e["company_id"] == company_id]
        total = len(executions)
        paginated = sorted(executions, key=lambda x: x.get("created_at", datetime.utcnow()), reverse=True)[offset : offset + limit]
        return paginated, total

    @classmethod
    def update_execution(cls, execution_id: str, company_id: str, data: Dict[str, Any]) -> bool:
        execution = cls.get_execution(execution_id, company_id)
        if not execution:
            return False
        cls._executions[execution_id].update(data)
        return True


# Endpoints
@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    request: WorkflowDefinitionRequest,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Create a new workflow
    إنشاء سير عمل جديد
    """
    # Role check - MANAGER+ only
    if not can_perform_action(tenant.user.role, Role.MANAGER):
        raise AccessDeniedError("Only managers and above can create workflows")

    # Create workflow definition
    workflow_data = {
        "name": request.name,
        "description": request.description,
        "trigger": request.trigger,
        "trigger_config": request.trigger_config,
        "tasks": [
            {
                "name": task.name,
                "description": task.description,
                "action": task.action,
                "inputs": task.inputs,
                "condition": task.condition,
                "retry_count": task.retry_count,
                "timeout_seconds": task.timeout_seconds,
                "depends_on": task.depends_on,
                "status": TaskStatus.PENDING,
                "output": None,
                "error": None,
            }
            for task in request.tasks
        ],
        "status": request.status,
        "created_by": tenant.user.id,
        "updated_by": tenant.user.id,
    }

    # Validate workflow
    try:
        engine = WorkflowEngine()
        workflow_def = WorkflowDefinition(
            id="temp",
            name=workflow_data["name"],
            description=workflow_data["description"],
            trigger=workflow_data["trigger"],
            trigger_config=workflow_data["trigger_config"],
            tasks=[
                WorkflowTask(
                    id=f"task_{i}",
                    name=t["name"],
                    description=t["description"],
                    action=t["action"],
                    inputs=t["inputs"],
                    condition=t["condition"],
                    retry_count=t["retry_count"],
                    timeout_seconds=t["timeout_seconds"],
                    depends_on=t["depends_on"],
                    status=TaskStatus.PENDING,
                    output=None,
                    error=None,
                )
                for i, t in enumerate(workflow_data["tasks"])
            ],
            status=workflow_data["status"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        engine.validate_workflow(workflow_def)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Create in database
    workflow_id = WorkflowDB.create_workflow(tenant.company_id, workflow_data)

    # Log activity
    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "Workflow",
        workflow_id,
        {"name": workflow_data["name"], "tasks_count": len(workflow_data["tasks"])},
    )

    return WorkflowResponse(
        id=workflow_id,
        company_id=tenant.company_id,
        **workflow_data,
    )


@router.get("/", response_model=PaginatedResponse[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[WorkflowStatus] = None,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    List all workflows for current company
    قائمة جميع أسير العمل للشركة الحالية
    """
    workflows, total = WorkflowDB.list_workflows(tenant.company_id, limit, skip)

    # Filter by status if provided
    if status_filter:
        workflows = [w for w in workflows if w["status"] == status_filter]

    return paginate(
        items=[WorkflowResponse(**w) for w in workflows],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Get workflow by ID
    الحصول على سير العمل حسب المعرّف
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    return WorkflowResponse(**workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    request: WorkflowDefinitionRequest,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Update workflow
    تحديث سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    # Role check
    if not can_perform_action(tenant.user.role, Role.MANAGER):
        raise AccessDeniedError("Only managers and above can update workflows")

    # Cannot update active workflows
    if workflow["status"] == WorkflowStatus.ACTIVE:
        raise ValidationError("Cannot update active workflows")

    # Update data
    update_data = {
        "name": request.name,
        "description": request.description,
        "trigger": request.trigger,
        "trigger_config": request.trigger_config,
        "tasks": [
            {
                "name": task.name,
                "description": task.description,
                "action": task.action,
                "inputs": task.inputs,
                "condition": task.condition,
                "retry_count": task.retry_count,
                "timeout_seconds": task.timeout_seconds,
                "depends_on": task.depends_on,
                "status": TaskStatus.PENDING,
                "output": None,
                "error": None,
            }
            for task in request.tasks
        ],
        "status": request.status,
        "updated_by": tenant.user.id,
    }

    WorkflowDB.update_workflow(workflow_id, tenant.company_id, update_data)

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.UPDATE,
        "Workflow",
        workflow_id,
        {"name": update_data["name"]},
    )

    updated_workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    return WorkflowResponse(**updated_workflow)


@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    workflow_id: str,
    inputs: Dict[str, Any] = {},
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Execute a workflow
    تنفيذ سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    if workflow["status"] != WorkflowStatus.ACTIVE:
        raise ValidationError("Workflow must be ACTIVE to execute")

    # Create workflow definition for engine
    workflow_def = WorkflowDefinition(
        id=workflow_id,
        name=workflow["name"],
        description=workflow["description"],
        trigger=workflow["trigger"],
        trigger_config=workflow["trigger_config"],
        tasks=[
            WorkflowTask(
                id=f"task_{i}",
                name=t["name"],
                description=t["description"],
                action=t["action"],
                inputs=t["inputs"],
                condition=t["condition"],
                retry_count=t["retry_count"],
                timeout_seconds=t["timeout_seconds"],
                depends_on=t["depends_on"],
                status=TaskStatus.PENDING,
                output=None,
                error=None,
            )
            for i, t in enumerate(workflow["tasks"])
        ],
        status=workflow["status"],
        created_at=workflow["created_at"],
        updated_at=workflow["updated_at"],
    )

    # Execute workflow
    engine = WorkflowEngine()
    result = engine.execute_workflow(workflow_def, inputs)

    # Create execution record
    execution_data = {
        "status": result["status"],
        "started_at": result["started_at"],
        "completed_at": result["completed_at"],
        "triggered_by": tenant.user.id,
        "inputs": inputs,
        "outputs": result["outputs"],
        "errors": result["errors"],
        "task_results": result["task_results"],
    }

    execution_id = WorkflowDB.create_execution(tenant.company_id, workflow_id, execution_data)

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.CREATE,
        "WorkflowExecution",
        execution_id,
        {"workflow_id": workflow_id, "status": result["status"]},
    )

    return WorkflowExecutionResponse(id=execution_id, workflow_id=workflow_id, **execution_data)


@router.get("/{workflow_id}/executions", response_model=PaginatedResponse[WorkflowExecutionResponse])
async def get_workflow_executions(
    workflow_id: str,
    skip: int = 0,
    limit: int = 20,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Get execution history for a workflow
    الحصول على سجل التنفيذ لسير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    executions, total = WorkflowDB.get_workflow_executions(
        workflow_id, tenant.company_id, limit, skip
    )

    return paginate(
        items=[
            WorkflowExecutionResponse(id=e["id"], workflow_id=workflow_id, **e)
            for e in executions
        ],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/{workflow_id}/activate", response_model=WorkflowResponse)
async def activate_workflow(
    workflow_id: str,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Activate a workflow (change status to ACTIVE)
    تفعيل سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    if not can_perform_action(tenant.user.role, Role.MANAGER):
        raise AccessDeniedError("Only managers and above can activate workflows")

    WorkflowDB.update_workflow(workflow_id, tenant.company_id, {"status": WorkflowStatus.ACTIVE})

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.UPDATE,
        "Workflow",
        workflow_id,
        {"action": "activate"},
    )

    updated = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    return WorkflowResponse(**updated)


@router.post("/{workflow_id}/deactivate", response_model=WorkflowResponse)
async def deactivate_workflow(
    workflow_id: str,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Deactivate a workflow (change status to PAUSED)
    إيقاف سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    if not can_perform_action(tenant.user.role, Role.MANAGER):
        raise AccessDeniedError("Only managers and above can deactivate workflows")

    WorkflowDB.update_workflow(workflow_id, tenant.company_id, {"status": WorkflowStatus.PAUSED})

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.UPDATE,
        "Workflow",
        workflow_id,
        {"action": "deactivate"},
    )

    updated = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    return WorkflowResponse(**updated)


@router.post("/{workflow_id}/archive", response_model=WorkflowResponse)
async def archive_workflow(
    workflow_id: str,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Archive a workflow
    أرشفة سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    if not can_perform_action(tenant.user.role, Role.MANAGER):
        raise AccessDeniedError("Only managers and above can archive workflows")

    WorkflowDB.update_workflow(workflow_id, tenant.company_id, {"status": WorkflowStatus.ARCHIVED})

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.ARCHIVE,
        "Workflow",
        workflow_id,
        {},
    )

    updated = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    return WorkflowResponse(**updated)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: str,
    tenant: CurrentTenant = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    """
    Delete a workflow (only DRAFT status)
    حذف سير العمل
    """
    workflow = WorkflowDB.get_workflow(workflow_id, tenant.company_id)
    if not workflow:
        raise ResourceNotFoundError(f"Workflow {workflow_id} not found")

    if not can_perform_action(tenant.user.role, Role.ADMIN):
        raise AccessDeniedError("Only admins can delete workflows")

    if workflow["status"] != WorkflowStatus.DRAFT:
        raise ValidationError("Can only delete DRAFT workflows")

    WorkflowDB.delete_workflow(workflow_id, tenant.company_id)

    log_activity(
        db,
        tenant.company_id,
        tenant.user.id,
        OperationAction.DELETE,
        "Workflow",
        workflow_id,
        {},
    )

    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content={})
