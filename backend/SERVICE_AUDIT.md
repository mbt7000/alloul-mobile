# Service Audit & Enhancement Plan

## PROMPT 3: Fix & Enhance 6 Core Services

### 1. AUTH Service ✅
**Status:** Core authentication service
**Current Issues:**
- ✅ Token creation works
- ✅ Password hashing is secure (bcrypt 12 rounds)
- ⚠️ Missing refresh token mechanism
- ⚠️ No logout/token blacklist

**Enhancements:**
- Add token refresh endpoint
- Add token revocation (logout)
- Add rate limiting on login attempts
- Add password reset flow

### 2. COMPANIES Service ⚠️
**Status:** Company management & multi-tenancy core
**Current Issues:**
- ⚠️ No multi-tenant context in most endpoints (pre-PROMPT 2)
- ⚠️ Missing invitation validation
- ⚠️ No subscription enforcement on all operations
- ✅ Has activity logging

**Enhancements:**
- Add CurrentTenant context to all endpoints
- Validate company membership before operations
- Add subscription checks for team size
- Add rate limiting per company

### 3. PROJECTS Service ⚠️
**Status:** Project & team management
**Current Issues:**
- ⚠️ No multi-tenant filtering
- ⚠️ Missing permission checks
- ⚠️ No audit logging for project changes
- ✅ Has basic CRUD operations

**Enhancements:**
- Add CurrentTenant dependency
- Add role-based access control (Owner/Admin/Member)
- Add audit logging for all changes
- Add archival instead of deletion

### 4. TASKS Service ⚠️
**Status:** Task management & workflow
**Current Issues:**
- ⚠️ No multi-tenant filtering
- ⚠️ Missing task state validation
- ⚠️ No dependency tracking
- ⚠️ Missing user assignment validation

**Enhancements:**
- Add CurrentTenant dependency
- Add state machine validation (draft → in_progress → done)
- Add task dependencies
- Add effort estimation and tracking

### 5. CHANNELS Service ⚠️
**Status:** Team communication infrastructure
**Current Issues:**
- ⚠️ No multi-tenant filtering
- ⚠️ Missing message access control
- ⚠️ No read receipts/typing indicators
- ⚠️ Missing channel privacy levels

**Enhancements:**
- Add CurrentTenant dependency
- Add access control (public/private/direct)
- Add message reactions and threading
- Add read receipts

### 6. HANDOVER Service ⚠️
**Status:** Knowledge transfer & documentation
**Current Issues:**
- ⚠️ No multi-tenant filtering
- ⚠️ Missing versioning
- ⚠️ No approval workflow
- ⚠️ Missing search functionality

**Enhancements:**
- Add CurrentTenant dependency
- Add versioning/history
- Add approval workflow
- Add full-text search
- Add tagging system

---

## Implementation Priority

1. **Phase 1:** Add multi-tenant context (CurrentTenant) to all services
2. **Phase 2:** Add role-based access control
3. **Phase 3:** Add audit logging
4. **Phase 4:** Add advanced features (versioning, state machines, etc.)

## Testing Strategy

Each service needs:
- Unit tests for business logic
- Integration tests with CurrentTenant
- Cross-company isolation tests
- Permission/access control tests

---

**Last Updated:** 2026-04-15
**Next Step:** Implement Phase 1 (Multi-Tenant Context)
