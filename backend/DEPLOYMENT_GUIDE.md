# Deployment & QA Guide

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing: `pytest backend/tests/`
- [ ] Type checking: `mypy backend/services/`
- [ ] Linting: `flake8 backend/` and `black --check backend/`
- [ ] No security vulnerabilities: `bandit -r backend/`
- [ ] Code coverage > 80%: `pytest --cov=services --cov-report=term-show-missing`
- [ ] All docstrings present
- [ ] No debug print statements
- [ ] No hardcoded secrets or credentials

### Documentation

- [ ] API_DOCUMENTATION.md is up-to-date
- [ ] SERVICES_GUIDE.md reflects current architecture
- [ ] README.md has setup instructions
- [ ] CHANGELOG.md updated with version info
- [ ] Environment variables documented
- [ ] Database schema documented

### Security

- [ ] All API keys use environment variables
- [ ] Encryption key management plan in place
- [ ] CORS policy configured correctly
- [ ] Rate limiting configured
- [ ] Authentication/authorization tested
- [ ] SQL injection protections verified (SQLAlchemy ORM)
- [ ] XSS protections in place
- [ ] CSRF protections configured
- [ ] Input validation on all endpoints
- [ ] Sensitive data not logged
- [ ] TLS/HTTPS enforced

### Dependencies

- [ ] All dependencies pinned to specific versions
- [ ] Security vulnerabilities checked: `safety check`
- [ ] Dependency licenses reviewed
- [ ] No circular dependencies
- [ ] Transitive dependencies reviewed

### Database

- [ ] All migrations created: `alembic revision --autogenerate -m "migration name"`
- [ ] Migrations tested locally: `alembic upgrade head`
- [ ] Rollback migrations tested: `alembic downgrade -1`
- [ ] Backup strategy in place
- [ ] Database indices optimized
- [ ] Query performance verified

### Configuration

- [ ] Environment variables defined
- [ ] Secrets manager configured
- [ ] Feature flags defined
- [ ] Logging levels configured
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring setup
- [ ] Backup and recovery procedures documented

---

## QA Testing Checklist

### Unit Tests

```bash
# Run all tests
pytest backend/tests/ -v

# Run specific test file
pytest backend/tests/test_services.py -v

# Run with coverage
pytest backend/tests/ --cov=services --cov-report=html

# Run specific test
pytest backend/tests/test_services.py::TestPlatformRegistry::test_registry_singleton -v
```

**Tests to verify:**
- [ ] Platform Registry singleton works
- [ ] Platform registration and retrieval
- [ ] Service Orchestrator task execution
- [ ] Task dependency resolution
- [ ] Execution context data sharing
- [ ] AI Service provider fallback
- [ ] Settings service CRUD operations
- [ ] Credential encryption/decryption
- [ ] API endpoint security

### Integration Tests

```bash
# Test API endpoints
pytest backend/tests/test_api_endpoints.py -v

# Test service interactions
pytest backend/tests/test_services.py::TestIntegrationFlow -v
```

**Tests to verify:**
- [ ] `/settings/integrations` endpoint works
- [ ] Platform configuration saves correctly
- [ ] Credentials are encrypted in database
- [ ] Credentials are decrypted on retrieval
- [ ] Connection testing works
- [ ] Deactivation works without deletion
- [ ] Multi-service orchestration works
- [ ] Error handling and fallbacks

### End-to-End Tests

1. **User Registration & Login**
   - [ ] User can register
   - [ ] User can log in
   - [ ] JWT token is valid
   - [ ] Token expires correctly

2. **Integration Configuration**
   - [ ] User can see available platforms
   - [ ] User can configure API keys
   - [ ] Keys are encrypted and masked in responses
   - [ ] Test connection works
   - [ ] Deactivation works

3. **AI Service Integration**
   - [ ] Chat endpoint works
   - [ ] Response is from configured provider
   - [ ] Private mode uses secure provider
   - [ ] Streaming works
   - [ ] Token counting works

4. **Company Context**
   - [ ] Company data enriches prompts
   - [ ] Departments are included
   - [ ] Team members are shown
   - [ ] Integrations status is accurate

### Performance Testing

```bash
# Load test with locust
locust -f backend/tests/locustfile.py --host=http://localhost:8000

# Profile application
python -m cProfile -o stats.prof main.py

# Analyze profiling results
python -c "import pstats; p = pstats.Stats('stats.prof'); p.sort_stats('cumulative').print_stats(20)"
```

**Performance targets:**
- [ ] `/agent/chat` response time < 2s
- [ ] `/settings/integrations` response time < 500ms
- [ ] Database queries < 100ms
- [ ] Memory usage stable over time
- [ ] No memory leaks detected
- [ ] Concurrent users: 100+ without degradation

### Security Testing

**OWASP Top 10 Verification:**

1. **SQL Injection**
   - [ ] Test with `' OR '1'='1`
   - [ ] Verify SQLAlchemy ORM parameterization

2. **Authentication/Authorization**
   - [ ] Test with invalid tokens
   - [ ] Test with expired tokens
   - [ ] Test without tokens
   - [ ] Verify permission checks work

3. **Sensitive Data Exposure**
   - [ ] API keys are masked in responses
   - [ ] Passwords are hashed
   - [ ] Sensitive data not in logs
   - [ ] HTTPS enforced

4. **XML External Entity (XXE)**
   - [ ] No XML parsing in user input
   - [ ] If XML needed, disable external entities

5. **Broken Access Control**
   - [ ] User A cannot access User B's data
   - [ ] Company A cannot access Company B's data
   - [ ] Regular user cannot access admin endpoints

6. **Security Misconfiguration**
   - [ ] Debug mode disabled
   - [ ] Default credentials changed
   - [ ] Unnecessary services disabled
   - [ ] Error messages don't leak system info

7. **Cross-Site Scripting (XSS)**
   - [ ] Input is validated
   - [ ] Output is escaped
   - [ ] No `innerHTML` with user data (frontend)

8. **Insecure Deserialization**
   - [ ] No pickle of untrusted data
   - [ ] JSON validation applied

9. **Using Components with Known Vulnerabilities**
   - [ ] `safety check` passes
   - [ ] No outdated dependencies

10. **Insufficient Logging & Monitoring**
    - [ ] Important events logged
    - [ ] Monitoring dashboards setup
    - [ ] Alerts configured

---

## Staging Deployment

### Setup Staging Environment

```bash
# Clone environment
git clone --branch staging https://github.com/your-org/alloul-mobile.git

# Install dependencies
cd alloul-mobile/backend
pip install -r requirements.txt

# Setup environment
cp .env.example .env.staging
# Update .env.staging with staging values

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Deployment Steps

1. **Build Stage**
   ```bash
   docker build -t alloul-backend:staging .
   docker tag alloul-backend:staging gcr.io/project/alloul-backend:staging
   ```

2. **Push to Registry**
   ```bash
   docker push gcr.io/project/alloul-backend:staging
   ```

3. **Deploy to Staging**
   ```bash
   kubectl apply -f k8s/staging/deployment.yaml
   kubectl rollout status deployment/alloul-backend -n staging
   ```

4. **Run Smoke Tests**
   ```bash
   pytest backend/tests/test_smoke.py -v --environment=staging
   ```

5. **Verify Endpoints**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://staging-api.alloul.io/settings/integrations
   ```

---

## Production Deployment

### Pre-Production Verification

- [ ] Staging tests passed
- [ ] Performance tests acceptable
- [ ] Security audit passed
- [ ] Team approval obtained
- [ ] Rollback plan documented
- [ ] Support team briefed
- [ ] Monitoring alerts configured

### Production Deployment

```bash
# Tag release
git tag -a v1.0.0 -m "Release 1.0.0 — Initial launch"
git push origin v1.0.0

# Build production image
docker build -f Dockerfile.prod -t alloul-backend:1.0.0 .
docker tag alloul-backend:1.0.0 gcr.io/project/alloul-backend:1.0.0

# Push to registry
docker push gcr.io/project/alloul-backend:1.0.0

# Update production deployment
kubectl set image deployment/alloul-backend \
  backend=gcr.io/project/alloul-backend:1.0.0 \
  -n production

# Monitor rollout
kubectl rollout status deployment/alloul-backend -n production
kubectl logs -f deployment/alloul-backend -n production
```

### Post-Deployment

1. **Smoke Tests**
   ```bash
   # Run basic health checks
   curl https://api.alloul.io/openapi.json
   curl https://api.alloul.io/health
   ```

2. **Monitor Metrics**
   - [ ] Error rate normal
   - [ ] Response times normal
   - [ ] Memory usage normal
   - [ ] Database connections healthy
   - [ ] No unusual logs

3. **User Testing**
   - [ ] Core workflows tested
   - [ ] Integrations working
   - [ ] Chat endpoint responsive
   - [ ] Settings panel loads

4. **Documentation**
   - [ ] Update status page
   - [ ] Send deployment notes to team
   - [ ] Update API changelog

---

## Rollback Procedures

### Quick Rollback (last 5 minutes)

```bash
# Immediate rollback to previous version
kubectl rollout undo deployment/alloul-backend -n production

# Check status
kubectl rollout status deployment/alloul-backend -n production
```

### Full Rollback

```bash
# If quick rollback fails
git revert HEAD  # Creates new commit reverting changes
git push origin main

# Rebuild and deploy previous version
docker build -t alloul-backend:previous .
kubectl set image deployment/alloul-backend \
  backend=gcr.io/project/alloul-backend:previous \
  -n production
```

### Database Rollback

```bash
# Downgrade to previous migration
alembic downgrade -1

# Verify data integrity
alembic current
```

---

## Monitoring & Observability

### Key Metrics to Monitor

```python
# Application Metrics
- Response times (p50, p95, p99)
- Error rates (500s, 400s, etc)
- Request volume
- Active connections

# Service Metrics
- Platform availability (OpenAI, Stripe, etc)
- Integration success rates
- Task execution times
- Service errors

# Database Metrics
- Query execution time
- Connection pool utilization
- Slow query log
- Replication lag

# Infrastructure Metrics
- CPU usage
- Memory usage
- Disk usage
- Network I/O
```

### Logging

```python
# Use structured logging
import logging
import json

logger = logging.getLogger(__name__)

# Log important events
logger.info(
    "User logged in",
    extra={
        "user_id": 123,
        "company_id": 456,
        "timestamp": datetime.utcnow().isoformat()
    }
)

# Log errors with context
logger.error(
    "Payment processing failed",
    exc_info=True,
    extra={
        "customer_id": 789,
        "amount": 1000,
        "error_code": "INSUFFICIENT_FUNDS"
    }
)
```

### Alerting

**High Priority Alerts:**
- [ ] Error rate > 5%
- [ ] Response time p95 > 5s
- [ ] Service unavailable
- [ ] Database connection failed
- [ ] Out of memory
- [ ] Disk space < 10%

**Medium Priority Alerts:**
- [ ] Slow queries detected
- [ ] Integration failure rate > 1%
- [ ] Queue backlog growing
- [ ] Cache miss rate > 50%

**Low Priority Alerts:**
- [ ] Deprecation warnings
- [ ] Unused resources
- [ ] Configuration drift

---

## Disaster Recovery

### Backup Strategy

```bash
# Daily database backups
0 2 * * * backup_db.sh

# Weekly full backups
0 3 * * 0 full_backup.sh

# Monthly to cold storage
0 4 1 * * archive_to_glacier.sh
```

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Procedure |
|----------|-----------|-----------|
| Single Pod Failure | 1-2 min | Kubernetes auto-restart |
| Node Failure | 5-10 min | Kubernetes pod migration |
| Database Failure | 15-30 min | Failover to replica |
| Regional Outage | 1-2 hours | Failover to backup region |
| Complete Loss | 4-8 hours | Restore from backups |

---

## Version Management

### Semantic Versioning

```
v[MAJOR].[MINOR].[PATCH]

v1.0.0 — Initial release
v1.1.0 — New features (backward compatible)
v1.1.1 — Bug fixes
v2.0.0 — Breaking changes
```

### Release Process

1. **Development** → Create feature branches
2. **Testing** → Merge to staging, run tests
3. **Release Candidate** → Tag as `v1.0.0-rc1`
4. **Staging Validation** → Final testing
5. **Production Release** → Tag as `v1.0.0`, merge to main
6. **Post-Release** → Monitor, patch if needed

---

## Maintenance Windows

### Planned Maintenance

```
Time: 2:00 AM - 3:00 AM UTC (low traffic)
Frequency: Monthly (2nd Tuesday)
Duration: 1 hour
Notification: 1 week in advance
```

### During Maintenance

- [ ] Put API in read-only mode
- [ ] Show maintenance banner to users
- [ ] Redirect traffic if needed
- [ ] Run database optimization
- [ ] Apply security patches
- [ ] Update dependencies
- [ ] Run backups

### Post-Maintenance

- [ ] Verify all services healthy
- [ ] Run smoke tests
- [ ] Check metrics
- [ ] Notify team of completion
- [ ] Document changes

---

## Runbooks

### Issue: High Error Rate

```
1. Check recent deployments — was something deployed?
   git log --oneline -n 10

2. Check error logs
   kubectl logs -f deployment/alloul-backend -n production

3. Check metrics
   - Error rate trend
   - Specific endpoints affected?
   - Specific services failing?

4. If recent deployment caused issue:
   kubectl rollout undo deployment/alloul-backend -n production

5. If not deployment:
   - Check external service status (OpenAI, Stripe, etc)
   - Check database connection
   - Check logs for specific errors
```

### Issue: Slow Response Times

```
1. Check database performance
   EXPLAIN ANALYZE SELECT ...;  # Identify slow queries

2. Check API metrics
   - Which endpoints are slow?
   - Is it consistent or intermittent?

3. Check infrastructure
   - CPU usage high?
   - Memory usage high?
   - Network saturation?

4. Scale if needed
   kubectl scale deployment/alloul-backend --replicas=5
```

### Issue: Integration Failure

```
1. Check integration status
   GET /settings/integrations/{platform_id}

2. Test connection
   POST /settings/integrations/{platform_id}/test

3. Verify credentials
   - Check credentials are set
   - Test with credentials directly
   - Verify API key format

4. Check service status
   - Is OpenAI/Stripe/etc API down?
   - Check their status pages
```

---

## Team Responsibilities

### Release Manager
- [ ] Coordinates release schedule
- [ ] Ensures all checks pass
- [ ] Approves deployment
- [ ] Monitors post-deployment

### DevOps Engineer
- [ ] Manages infrastructure
- [ ] Coordinates deployment
- [ ] Monitors metrics
- [ ] Manages backups/DR

### QA Engineer
- [ ] Runs test suite
- [ ] Performs security testing
- [ ] Validates in staging
- [ ] Creates runbooks

### Developer
- [ ] Writes tests
- [ ] Ensures code quality
- [ ] Documents changes
- [ ] Reviews PRs

---

## Communication

### Pre-Deployment
- Slack: #deployments channel
- Email: Engineering team
- Status: "We're deploying..."

### During Deployment
- Monitor: Real-time updates
- Slack: Running commentary
- Rollback: "Issues detected, rolling back"

### Post-Deployment
- Slack: "Deployment complete"
- Status: Update status page
- Documentation: Update changelog
- Retrospective: Brief team on what went well/wrong

---

## Continuous Improvement

### Metrics to Track

- [ ] Deployment frequency
- [ ] Lead time (commit → production)
- [ ] Mean time to recovery (MTTR)
- [ ] Change failure rate
- [ ] Time spent on incidents vs. features

### Regular Reviews

- **Weekly**: Check deployment metrics
- **Monthly**: Review incidents and lessons learned
- **Quarterly**: Disaster recovery drill

---

## Appendix: Docker & Kubernetes

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alloul-backend
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alloul-backend
  template:
    metadata:
      labels:
        app: alloul-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/project/alloul-backend:1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: alloul-secrets
              key: database-url
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## Success Criteria

✅ Deployment is successful when:
- [ ] All endpoints responding normally
- [ ] Error rate < 0.1%
- [ ] Response times in expected range
- [ ] All integrations functional
- [ ] No memory leaks detected
- [ ] Monitoring data flowing correctly
- [ ] Team has visibility into deployment
- [ ] Rollback plan tested and ready
