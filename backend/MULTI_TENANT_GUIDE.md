# Multi-Tenant Isolation Implementation Guide

## Overview
This document describes how multi-tenant isolation is implemented across the ALLOUL&Q platform to ensure company data is properly isolated and secure.

## Architecture

### 1. Database Layer
- **Company Isolation**: Every table that contains company-specific data has a `company_id` foreign key
- **Row-Level Security (RLS)**: PostgreSQL RLS policies ensure users can only query their company's data at the database level
- **Migration**: See `migrations/versions/0002_rls_multi_tenant.py`

### 2. Application Layer

#### Authentication & Context
```python
from tenant import get_tenant_context, CurrentTenant
from auth import get_current_user

# In your endpoint:
@router.get("/my-data")
def get_data(
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    # tenant.user_id — current user
    # tenant.company_id — current company
    # Automatically verified that user is a member of company
```

#### Request Header
All API requests that access company data must include:
```
X-Company-Id: <company_id>
```

Example:
```bash
curl -H "X-Company-Id: 123" \
     -H "Authorization: Bearer <token>" \
     https://api.alloul.app/projects
```

### 3. Query Filtering

Use `query_filters.scope_query_by_company()` to ensure all queries are tenant-scoped:

```python
from query_filters import scope_query_by_company

@router.get("/projects")
def list_projects(
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    query = scope_query_by_company(query, Project, tenant.company_id)
    projects = query.all()
    return projects
```

### 4. Implementing Multi-Tenant Routers

**Before:**
```python
@router.get("/projects")
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # No company filtering!
    projects = db.query(Project).all()
```

**After:**
```python
from tenant import CurrentTenant
from query_filters import scope_query_by_company

@router.get("/projects")
def list_projects(
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    # Automatically scoped to company
    query = db.query(Project)
    query = scope_query_by_company(query, Project, tenant.company_id)
    projects = query.all()
```

## Best Practices

### 1. Always Use CurrentTenant Dependency
❌ **Bad:**
```python
def create_task(body: TaskCreate, current_user: User = Depends(get_current_user)):
    # Missing company_id — data will be orphaned or shared!
    task = Task(title=body.title, company_id=???)
```

✅ **Good:**
```python
def create_task(
    body: TaskCreate,
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    # Company is automatically set
    task = Task(title=body.title, company_id=tenant.company_id)
```

### 2. Verify Scope on Updates/Deletes
❌ **Bad:**
```python
def update_project(project_id: int, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    # What if this project belongs to a different company?
    project.name = body.name
    db.commit()
```

✅ **Good:**
```python
def update_project(
    project_id: int,
    body: ProjectUpdate,
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.company_id != tenant.company_id:
        raise HTTPException(status_code=404)
    project.name = body.name
    db.commit()
```

### 3. Relationships Across Companies
Companies cannot directly reference another company's resources. Use company-scoped lookup:

```python
# Load a task's project
@router.get("/tasks/{task_id}/project")
def get_task_project(
    task_id: int,
    tenant: CurrentTenant,
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.company_id == tenant.company_id,
    ).first()
    if not task:
        raise HTTPException(status_code=404)
    
    # Project is automatically the same company (due to FK constraint)
    project = db.query(Project).filter(Project.id == task.project_id).first()
    return project
```

## Tenant-Aware Models

The following models are currently tenant-aware (have `company_id`):
- Project
- Task
- Meeting
- Channel
- Message
- Handover
- Department
- Team
- Workflow
- Template
- Document
- ActivityLog

## Migration Path for Existing Routers

To add multi-tenant isolation to an existing router:

1. **Add import:**
   ```python
   from tenant import CurrentTenant
   from query_filters import scope_query_by_company
   ```

2. **Update all endpoints:**
   - Replace `current_user` with `tenant: CurrentTenant`
   - Add `scope_query_by_company()` to all list queries
   - Add company verification to get/update/delete endpoints

3. **Test with X-Company-Id header:**
   ```bash
   curl -H "X-Company-Id: 123" \
        -H "Authorization: Bearer <token>" \
        https://api.alloul.app/projects
   ```

## Security Considerations

1. **X-Company-Id is trusted after verification** — We verify the user is a member before using it
2. **Cannot access another company's data** — CompanyMember check prevents cross-company access
3. **Database RLS is a second line of defense** — Query filters are primary, RLS catches logic errors
4. **ActivityLog is tenant-aware** — All changes are logged per company

## Testing Multi-Tenant Isolation

```python
# Test: User from Company A cannot see Company B's data
def test_company_isolation(db):
    user_a = create_user("alice@a.com")
    user_b = create_user("bob@b.com")
    
    company_a = create_company(user_a)
    company_b = create_company(user_b)
    
    project_a = create_project(company_a.id)
    project_b = create_project(company_b.id)
    
    # User A trying to access Company B's project should fail
    with pytest.raises(HTTPException) as exc:
        get_project(
            project_b.id,
            tenant=TenantContext(user=user_a, company_id=company_b.id),
            db=db,
        )
    assert exc.value.status_code == 403
```

## Monitoring & Auditing

All data access is logged to `ActivityLog` table with:
- `company_id` — Which company
- `user_id` — Which user
- `action` — What was done (list, create, update, delete)
- `details` — Any additional context

Query activity logs to detect suspicious access patterns:
```python
logs = db.query(ActivityLog).filter(
    ActivityLog.company_id == company_id,
    ActivityLog.created_at > datetime.now() - timedelta(hours=1),
).all()
```

---

**Last Updated:** 2026-04-15
**Status:** Implementation in Progress
