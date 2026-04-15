# CHANGELOG

All notable changes to the ALLOUL&Q backend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-04-15

### Initial Release

#### Added

**Core Architecture**
- **Platform Registry**: Centralized management of all external integrations (AI, communication, CRM, payments, calendar)
- **Service Orchestrator**: Workflow engine with topological task sorting and dependency resolution
- **AI Service Abstraction**: Unified interface for multiple AI providers with automatic fallback chains
  - Private mode: Ollama → Claude → DeepSeek
  - Public mode: Claude → DeepSeek → Ollama
- **Settings Service**: Integration configuration and management system
- **Credential Encryption**: Fernet-based symmetric encryption for API keys at rest

**API Endpoints**
- `/settings/integrations` — List and manage platform integrations
- `/settings/integrations/{platform_id}` — Save/update credentials
- `/settings/integrations/{platform_id}/test` — Test platform connection
- `/settings/integrations/{platform_id}/deactivate` — Disable integration
- `/agent/chat` — Chat with AI agent (with company context)
- `/agent/dispatch-task` — Analyze task and dispatch to services

**Supported Platforms**
- **AI**: OpenAI (GPT), DeepSeek, Claude (Anthropic), Ollama (local), Hugging Face
- **Communication**: Slack, Gmail, Daily.co, Stream Chat
- **CRM**: Salesforce, HubSpot
- **Calendar**: Google Calendar
- **Payments**: Stripe

**Security Features**
- Encrypted credential storage (Fernet encryption)
- Credential masking in API responses
- Per-company platform configuration
- Role-based access control (company member validation)
- Input validation (Pydantic schemas)
- SQL injection prevention (SQLAlchemy ORM)

**Testing**
- Comprehensive integration test suite with pytest
- Tests for Platform Registry, Service Orchestrator, AI Service
- Tests for Settings Service and credential encryption
- Tests for service integration workflows

**Documentation**
- [SERVICES_GUIDE.md](./SERVICES_GUIDE.md) — Architecture and service usage patterns
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — Complete API reference
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) — QA, deployment, and operational procedures
- [README.md](./README.md) — Quick start and overview

**Database**
- `api_credentials` table for encrypted credential storage
- Support for PostgreSQL (production) and SQLite (development)
- Alembic migrations for schema management

**Infrastructure**
- Docker and Kubernetes support
- Sentry integration for error tracking
- Structured logging (JSON format)
- Health check endpoints (`/health`, `/ready`)

---

## [Planned]

### [2.0.0] — Scheduled for Q3 2026

- Real-time collaboration features (WebSockets)
- Advanced analytics and reporting
- Machine learning integration
- Custom workflow builder UI
- Multi-language support
- Mobile push notifications
- Integration with additional platforms

### [1.1.0] — Scheduled for Q2 2026

- OpenID Connect (OIDC) provider support
- Advanced caching layer (Redis)
- Rate limiting and quota management
- Webhook support for platform events
- Custom field mappings for integrations
- Bulk operations API
- GraphQL endpoint (optional)

---

## Version History Notes

### Versioning Strategy

- **MAJOR** — Breaking API changes, major architectural changes
- **MINOR** — New features, new platforms, backward compatible
- **PATCH** — Bug fixes, security patches, documentation

### Supported Python Versions

- Python 3.9+
- Tested on Python 3.9, 3.10, 3.11, 3.12

### Database Support

- **Production**: PostgreSQL 12+
- **Development**: SQLite 3.24+

---

## Security Updates

### Known Vulnerabilities

None reported at this time.

### Security Patches Applied

- **2026-04-15**: Initial release with encrypted credential storage

---

## Migration Guide

### From Previous Versions

This is the initial public release. No migration needed.

For future upgrades, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) → Production Deployment → Pre-Production Verification for upgrade procedures.

---

## Contributors

- ALLOUL&Q Development Team

---

## Support

- **Documentation**: [README.md](./README.md), [SERVICES_GUIDE.md](./SERVICES_GUIDE.md), [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues**: GitHub Issues
- **Security**: security@alloul.io (private reports only)

---

## License

Proprietary — All rights reserved
