# CLAUDE.md

**Last Updated**: 2026-02-07
**Status**: Full-Stack Platform — Backend + Frontend Console + SDK Deployed

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This workspace contains **GLEC 녹색물류 플랫폼** - a production-grade green logistics bidding platform combining frontend and backend systems.

**Core Identity**: This is a **logistics bidding platform, NOT a calculator**. The goal is to:

- Transparently compare and disclose **Fleet-level carbon intensity (gCO₂e/t·km)**
- Enable **EI-weighted procurement decisions** alongside price & leadtime
- Support **Korean 3-tier freight structure** (화주 → 주선업자 → 운송사/차주)
- Integrate with existing platforms (LogiSpot, TMAP Freight, CJ)

## Repository Structure

```
openclaw-workspace/
├── projects/
│   ├── green-logistics-landing/      # Frontend: React 19 + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── pages/                # Route pages (Gate, Shipper, Carrier, Owner)
│   │   │   ├── console/              # Developer Console (8 pages)
│   │   │   │   ├── pages/            # Dashboard, APIKeys, Docs, Logs, Webhooks, etc.
│   │   │   │   ├── components/docs/  # ApiReferenceTab, QuickStartTab, CodeExamplesTab
│   │   │   │   ├── hooks/            # useAPIKeys, useWebhooks
│   │   │   │   ├── services/         # apiClient, metricsService, webhookService, logsService
│   │   │   │   └── types/            # webhook.ts, apiKey.ts
│   │   │   ├── App.tsx               # Route configuration
│   │   │   └── main.tsx              # Entry point
│   │   ├── tests/e2e-nano/           # Playwright E2E (13 spec files, 300+ tests)
│   │   └── playwright.config.ts      # Playwright configuration
│   ├── glec-api-backend/             # Backend: NestJS 10 + Fastify + TypeORM
│   │   └── src/modules/              # 10 modules (auth, fleet, bid, order, etc.)
│   └── glec-sdk-typescript/          # TypeScript SDK: @glec/sdk
│       └── src/
│           ├── clients/              # 8 clients (fleet, bid, order, integrity, etc.)
│           ├── types/                # Full type definitions
│           └── utils/http.ts         # HTTP client with retry/timeout
│
├── docs/ & specs/
│   ├── spec.md                       # Nano-level dev plan (Phase 0-2)
│   ├── DATABASE_SCHEMA.sql           # PostgreSQL 17 schema (1100+ lines)
│   ├── openapi.yaml                  # Complete OpenAPI 3.0 spec
│   └── ...                           # Architecture docs (see below)
```

---

## Current Development Status (2026-02-07)

### ✅ Backend — 10 Modules, 112 TypeScript Files

| Module | Status | Key Features |
|--------|--------|-------------|
| auth | ✅ | API Key authentication, Guard, RBAC |
| fleet | ✅ | Fleet EI query, Transport Products, EI calculation engine |
| bid | ✅ | Bid CRUD, Proposal CRUD, multi-factor evaluation, real-time |
| order | ✅ | Order CRUD, status tracking, auto-creation on award |
| integrity | ✅ | Hash chain, Ed25519 signing, anomaly detection, Export, Batch |
| notifications | ✅ | Webhook CRUD, HMAC signing, retry |
| realtime | ✅ | SSE streaming, polling, all channels |
| jobs | ✅ | Expired bid, webhook retry, EI refresh processors |
| console | ✅ | API usage tracking, metrics |
| audit | ✅ | Audit log recording/query, entity change tracking |

### ✅ Frontend Developer Console — 8 Pages, Live API Integration

| Page | Status | Key Features |
|------|--------|-------------|
| Dashboard | ✅ | 6 metric cards, Recharts charts, period selector, quota bar |
| API Keys | ✅ | Create/edit/delete, 11 scopes, prefix display |
| Documentation | ✅ | 3 tabs: Quick Start, API Reference (Swagger), Code Examples (5 recipes) |
| Logs | ✅ | Search, filters (status/date/key), export, live streaming, detail panel |
| Webhooks | ✅ | 21 events in 6 categories, create/edit/delete, delivery history |
| SDK & Integrations | ✅ | SDK install, 4 client cards, active integrations |
| Billing | ✅ | Period, cost breakdown, usage percentage |
| Settings | ✅ | API connection, security, notifications, display, danger zone |

### ✅ TypeScript SDK — @glec/sdk, 8 Client Modules

- `GlecClient` entry point with fleet/bids/orders/integrity/ei/realtime/webhook/audit clients
- Auto-retry, timeout, error handling built-in
- npm-publishable structure

### ✅ E2E Testing

- **Backend**: 76/76 bash E2E + 51/51 SDK integration tests
- **Frontend Console**: 305/307 Playwright tests (13 spec files)
- **Persona Verification**: 26/26 (shipper/broker/carrier developer integration)
- **LocalStack**: Docker 7-container deployment verified

---

## 🐳 LocalStack Integration (NEW - 2026-02-04)

### Purpose

LocalStack enables **local AWS service emulation** for development and testing. No more AWS charges for development environments!

### Quick Start

```bash
# One-command setup
./scripts/setup-localstack.sh

# Services started automatically:
# - PostgreSQL RDS (localhost:5432)
# - Redis/ElastiCache (localhost:6379)
# - SQS, SNS, Lambda, S3, CloudFormation
```

### Key Benefits for GreenFlow

✅ **Free local development** - No AWS charges
✅ **Fast iteration** - Services start in seconds
✅ **Integration testing** - Full RDS + Redis + SQS testing
✅ **CI/CD ready** - GitHub Actions integration included
✅ **Offline development** - Works without AWS connectivity

### Important Limitations

⚠️ **Development ONLY** - Not for production
⚠️ **Licensing change March 2026** - Account requirement coming
⚠️ **Data loss on restart** - Unless volume persistence enabled

### Setup Instructions

See **[LOCALSTACK_INTEGRATION.md](./LOCALSTACK_INTEGRATION.md)** for:
- Complete installation guide
- NestJS backend configuration
- Integration test examples
- CI/CD pipeline setup
- Troubleshooting

### Environment Variables

```env
# .env.development
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
LOCALSTACK_ENABLED=true
```

### Commands

```bash
# Start LocalStack
docker-compose up -d

# View logs
docker-compose logs -f localstack

# Stop
docker-compose stop

# Reset everything
docker-compose down -v
```

---

## Frontend Development

### Tech Stack (Frontend)

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS + custom design system
- **Testing**: Playwright (E2E)
- **Linting**: ESLint with TypeScript

### Frontend Commands

All commands from `projects/green-logistics-landing/`:

```bash
# Development (NOTE: Vite 7 requires Node 20.19+)
npm run build                          # Type-check & Vite build
npx serve -s dist -p 5173             # Serve production build
npx tsc --noEmit                       # TypeScript check only

# E2E Tests (requires serve running on :5173 + backend on :3000)
npx playwright test                    # Run all 300+ tests
npx playwright test tests/e2e-nano/99-persona-verification.spec.ts  # Persona verification
```

### Frontend Routes

- `/` - Gate page (persona selection)
- `/shipper` - Shipper landing
- `/carrier` - Carrier landing
- `/owner` - Fleet owner landing
- `/console` - Developer Console Dashboard
- `/console/api-keys` - API Key management
- `/console/documentation` - Documentation (3 tabs)
- `/console/logs` - API Logs
- `/console/webhooks` - Webhook management
- `/console/integrations` - SDK & Integrations
- `/console/billing` - Billing
- `/console/settings` - Settings

---

## Backend Development

### Tech Stack (Backend)

- **API**: NestJS 10.x + Fastify (45-50K RPS)
- **Database**: PostgreSQL 17 + Redis 7.x
- **Async**: BullMQ (100K+ jobs/sec)
- **Real-time**: SSE + Redis Pub/Sub (<100ms)
- **Monitoring**: Pino + Prometheus + ELK
- **Deploy**: Docker + Kubernetes + LocalStack (dev)

### Backend Commands

```bash
cd projects/glec-api-backend
npm install && npm run build && npm run start:dev

# Health & Metrics
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

### SDK Commands

```bash
cd projects/glec-sdk-typescript
npm install && npm run build
# Outputs to dist/ — publishable via npm publish
```

---

## 📚 CRITICAL: Read These Files Before Development

### For Frontend Developers

1. **CLAUDE.md** (this file)
2. **PROJECT_SPEC.md** - Feature requirements
3. **TODO.md** - Frontend roadmap
4. **projects/green-logistics-landing/README.md**

### For Backend Developers (Phase 0+)

1. **spec.md** ⭐ START HERE - Complete development plan
2. **DATABASE_SCHEMA.sql** - PostgreSQL schema
3. **openapi.yaml** - API specification
4. **BACKEND_TECH_STACK_2026.md** - Technology selection rationale
5. **한국_화물운송_시장_...보고서.md** - Market context
6. **docs/CONSOLE_MODULE_ARCHITECTURE.md** 🆕 - Console API implementation guide

### For Operations/DevOps

1. **MONITORING_LOGGING_SYSTEM.md** - Full observability setup
2. **REALTIME_ARCHITECTURE.md** - Real-time system design
3. **ASYNC_JOB_ORCHESTRATION.md** - Job queue configuration

---

## Development Phases

### Phase 0 - Initialize Backend ✅

- NestJS + Fastify project setup
- Docker Compose local development (7 containers)
- LocalStack AWS emulation

### Phase 1 - API Core ✅

- 10 backend modules (auth, fleet, bid, order, integrity, notifications, realtime, jobs, console, audit)
- 85+ API endpoints
- E2E 76/76 + SDK 51/51 tests passing

### Phase 2 - Developer Console + SDK ✅

- Developer Console 8 pages with live backend API integration
- TypeScript SDK (@glec/sdk) with 8 client modules
- Playwright E2E 305+ tests
- 3-persona integration verification (26/26 pass)

---

## Key Architectural Decisions (2026)

### Why NestJS + Fastify?

- **Performance**: 45-50K RPS vs 15-20K (Express)
- **Enterprise**: Built-in DI, modules, interceptors
- **TypeScript**: Native support with decorators
- **Ecosystem**: Rich middleware/guard ecosystem

### Why PostgreSQL 17?

- **Performance**: 2-3x faster VACUUM in v17
- **Features**: JSON support, full-text search, JSONB
- **Reliability**: ACID guarantees, R replicas

### Why Redis Pub/Sub + SSE?

- **Simplicity**: Single Redis instance for cache + messaging
- **Performance**: <1ms message latency
- **HTTP/2**: Native support, no special proxy config
- **Fallback**: HTTP polling for browser compatibility

### Why BullMQ?

- **Reliability**: Guaranteed job processing (not like Pub/Sub)
- **Features**: Retries, delays, priority, recurring
- **Languages**: Node.js, Python, Elixir, PHP
- **Alternative**: Kafka if event sourcing needed

---

## 🔒 Security & Compliance

- **API Auth**: X-API-Key header + hash verification
- **Database**: Row-Level Security (RLS) policies
- **Encryption**: HTTPS/TLS in transit, encrypted at rest
- **Audit**: All changes logged with user & timestamp
- **Standards**: ISO-14083 compliance for carbon data

---

---

## 📊 Performance Targets (SLOs)

| Metric              | Target      | Method                         |
| ------------------- | ----------- | ------------------------------ |
| Availability        | 99.9%       | Multi-instance + health checks |
| P95 Response        | <300ms      | Redis caching                  |
| P99 Response        | <1000ms     | Query optimization             |
| EI Query            | <100ms      | Cache + indexing               |
| Bid Evaluation      | <1 second   | Parallel EI fetch              |
| Error Rate          | <0.1%       | Comprehensive error handling   |
| Cache Hit Rate      | >80%        | Smart TTL strategy             |

---

## 🚀 Getting Started (Frontend)

```bash
cd projects/green-logistics-landing
npm install
npm run dev

# Visit http://localhost:5173
```

## 🚀 Getting Started (Backend - Phase 0)

```bash
# Will be created in Phase 0
# See spec.md "Phase 0" section for detailed steps
```

---

## 📞 Important Context Files

- `CLAUDE.md` (this file) - Developer guidance
- `spec.md` - Complete backend development spec
- `DATABASE_SCHEMA.sql` - Production-ready DB schema
- `openapi.yaml` - Complete API specification
- `BACKEND_TECH_STACK_2026.md` - Technology rationale
- `PROJECT_SPEC.md` - Feature requirements
- `TODO.md` - Tasks & roadmap (Korean)
- `AGENTS.md` - Agent system documentation
- `docs/CONSOLE_MODULE_ARCHITECTURE.md` 🆕 - Console API implementation guide

---

## 🔄 Git Workflow & Automation

### Automatic Git Push Configuration

When working with Claude Code, commits are automatically pushed using the GitHub token stored in `.byterover-token.txt`:

**Setup** (if needed):
```bash
# Configure git remote
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git

# Token is automatically used for authentication
# Token file: .byterover-token.txt
```

**Workflow**:
1. Write code (using Edit/Write tools)
2. Use `git commit` (with proper conventional commit messages)
3. Auto-push happens via git post-commit hook
4. All commits follow pattern: "Phase X.Y: Description"

**Commit Message Format**:
```
Phase 1.2: Bid Evaluation Controller & API Endpoints

- Bullet points explaining changes
- Impact on system
- Related SLOs/performance metrics

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Handling Remote Setup

If `.git/config` doesn't have `remote.origin` configured:
1. Add remote: `git remote add origin <github-url>`
2. Token from `.byterover-token.txt` auto-injects for HTTPS URLs
3. Commits auto-push to origin/main (or current branch)

---

## ⚠️ Important Notes

1. **Do NOT hardcode** - All config via environment variables
2. **Production-grade only** - No toy implementations
3. **ISO-14083 compliance** - Carbon data must be graded (Grade 1-3)
4. **Memory management** - spec.md is the source of truth
5. **Korean market context** - 3-tier logistics structure required
6. **No artificial simplification** - Complex requirements are intentional
7. **Always commit & push** - Each phase completion includes automated git push

---

**Last Updated**: 2026-02-07 by Claude Code
**Backend Status**: ✅ COMPLETE (10 modules, 112 files, 85+ endpoints)
**Frontend Status**: ✅ COMPLETE (8 console pages, live API integration)
**SDK Status**: ✅ COMPLETE (@glec/sdk, 8 client modules)
**E2E Testing**: ✅ 305+ Playwright + 76 bash E2E + 51 SDK + 26 persona verification
**LocalStack Deployment**: ✅ VERIFIED (7 containers)
