# CLAUDE.md

**Last Updated**: 2026-02-04
**Status**: Production-Ready Architecture Design Complete

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
│   │   │   ├── components/           # Shared components
│   │   │   ├── App.tsx               # Route configuration
│   │   │   └── main.tsx              # Entry point
│   │   └── tests/                    # E2E tests (Playwright)
│   └── [glec-api-backend]/           # Backend (TBD - Phase 0, under spec.md)
│
├── docs/ & specs/
│   ├── spec.md                       # ✅ [NEW] Nano-level dev plan (Phase 0-2)
│   ├── DATABASE_SCHEMA.sql           # ✅ [NEW] PostgreSQL 17 schema (733 lines)
│   ├── REDIS_CACHE_STRATEGY.md       # ✅ [NEW] Caching patterns & Redis config
│   ├── openapi.yaml                  # ✅ [NEW] Complete OpenAPI 3.0 spec
│   ├── REALTIME_ARCHITECTURE.md      # ✅ [NEW] SSE + Redis Pub/Sub design
│   ├── ASYNC_JOB_ORCHESTRATION.md    # ✅ [NEW] BullMQ job queue design
│   ├── MONITORING_LOGGING_SYSTEM.md  # ✅ [NEW] Pino + Prometheus + ELK setup
│   ├── BACKEND_TECH_STACK_2026.md    # ✅ 2026 backend technology comparison
│   ├── 한국_화물운송_시장_...보고서.md # ✅ Korean freight market research
│   ├── PROJECT_SPEC.md               # Basic feature requirements
│   └── TODO.md                       # Project roadmap (Korean)
```

---

## 🎯 Current Development Status (2026-02-04)

### ✅ COMPLETED: Full Backend Architecture Design

**All backend design documents are production-ready**:
1. **spec.md** - Complete nano-level development plan (1,500+ lines)
   - Phase 0 (2 weeks): Project initialization & CI/CD
   - Phase 1 (8 weeks): API v2 Core (EI, Bid Evaluation, Real-time)
   - Phase 2 (12 weeks): Advanced features & Commercial launch

2. **Database Schema** - PostgreSQL 17 production schema
   - 40+ tables with partitioning, RLS, audit trails
   - Ready for immediate use

3. **API Specification** - OpenAPI 3.0 (1,000+ lines)
   - All endpoints fully specified
   - Request/response examples included

4. **Infrastructure Design** - Complete system architecture
   - Real-time data processing
   - Async job orchestration
   - Monitoring & logging

### 📋 Frontend Status (Ongoing)

- ✅ React 19 + TypeScript + Vite
- ✅ Persona-based routing (Shipper/Carrier/Owner)
- ✅ E2E smoke tests (Playwright)
- 🔄 Dashboard integration (with backend APIs)

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
# Development
npm run dev          # Run dev server (port 5173)
npm run build        # Type-check & build
npm run preview      # Preview production build
npm run lint         # ESLint check

# E2E Tests
npm run test:e2e     # Run Playwright tests
node tests/e2e_smoke.mjs  # Run smoke tests manually
```

### Frontend Routes

- `/` - Gate page (persona selection)
- `/shipper` - Shipper landing
- `/carrier` - Carrier landing
- `/owner` - Fleet owner landing

---

## Backend Development (NEW - Phase 0 Starting Soon)

### Tech Stack (Backend - 2026)

- **API**: NestJS 10.x + Fastify (45-50K RPS)
- **Database**: PostgreSQL 17 + Redis 7.x
- **Async**: BullMQ (100K+ jobs/sec)
- **Real-time**: SSE + Redis Pub/Sub (<100ms)
- **Monitoring**: Pino + Prometheus + ELK
- **Deploy**: Docker + Kubernetes

### Backend Commands (Phase 0)

```bash
# Setup (to be created in Phase 0)
npm install
npm run build
npm run migrate
npm run seed
npm run dev

# Testing
npm run test:unit
npm run test:integration

# Metrics & Health
curl http://localhost:3000/health
curl http://localhost:3000/metrics
```

### Core Backend Features

1. **Fleet EI API** (`GET /v2/fleet/ei/{fleetId}`)
   - Real-time carbon intensity data
   - ISO-14083 grading (Grade 1-3)
   - 30-day trend analysis

2. **Bid Evaluation Engine** (`POST /v2/order/bid-evaluation`)
   - Multi-factor scoring: Price + Leadtime + EI
   - Configurable weights
   - Real-time ranking

3. **Real-time Updates** (`GET /v2/realtime/ei-updates`)
   - SSE-based streaming
   - Redis Pub/Sub channels
   - <100ms message latency

4. **Async Job Processing**
   - BullMQ with 9 job types
   - Priority-based execution
   - Guaranteed delivery with retries

### Backend Project Structure (Phase 0)

```
glec-api-backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # API keys & authentication
│   │   ├── fleet/         # Fleet & EI management
│   │   ├── bid/           # Bid evaluation
│   │   ├── order/         # Order management
│   │   ├── dispatch/      # Dispatch optimization
│   │   ├── realtime/      # Real-time processing
│   │   ├── jobs/          # Background jobs
│   │   └── admin/         # Admin features
│   ├── common/
│   │   ├── middleware/    # HTTP middleware
│   │   ├── logger/        # Pino logger
│   │   ├── metrics/       # Prometheus metrics
│   │   └── health/        # Health checks
│   ├── database/
│   │   └── migrations/    # DB migrations
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docker/
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

### For Operations/DevOps

1. **MONITORING_LOGGING_SYSTEM.md** - Full observability setup
2. **REALTIME_ARCHITECTURE.md** - Real-time system design
3. **ASYNC_JOB_ORCHESTRATION.md** - Job queue configuration

---

## 🏗️ Development Phases

### Phase 0 (2 weeks) - Initialize Backend

- ✅ Design Complete (2026-02-04)
- 📋 Git setup, NestJS init, CI/CD pipeline
- 📋 Database initialization
- 📋 Docker Compose for local development
- **Starting**: 2026-02-11 (approx)

### Phase 1 (8 weeks) - API Core

- Fleet EI data management
- Bid evaluation engine
- Real-time updates (SSE + Redis)
- Background job processing

### Phase 2 (12 weeks) - Advanced Features

- Dispatch optimization AI
- Developer portal
- Enhanced monitoring
- Commercial launch

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

**Last Updated**: 2026-02-04 by Claude Code
**Architecture Design Status**: ✅ COMPLETE & APPROVED FOR DEVELOPMENT
**Frontend Status**: 🔄 IN PROGRESS
**Backend Status**: 📋 PHASE 0 READY (awaiting initiation)
**Next Review**: 2026-02-18 (post Phase 0)
