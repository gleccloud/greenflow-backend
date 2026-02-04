# Learning & Pattern Library
**GreenFlow Development Knowledge Base**
Last Updated: 2026-02-04

---

## Table of Contents
1. [Performance Patterns](#performance-patterns)
2. [Architecture Patterns](#architecture-patterns)
3. [Data Model Patterns](#data-model-patterns)
4. [Common Gotchas](#common-gotchas)
5. [Code Generation Templates](#code-generation-templates)
6. [Testing Patterns](#testing-patterns)
7. [Deployment Lessons](#deployment-lessons)

---

## Performance Patterns

### Pattern: Cache-Aside for Read-Heavy Operations
**When to Use**: EI queries, fleet metrics, carrier history lookups
**Implementation**:
```
1. Try to read from Redis cache (key: `fleet:ei:{fleetId}`)
2. If MISS: Query database
3. Write result to Redis with TTL (1 hour for EI data)
4. Return result
```

**Gotcha**: Don't cache without TTL or face stale data bugs. Fleet EI should expire after 1 hour because new GPS/fuel telemetry comes in hourly.

**Metrics to Monitor**: Cache hit rate should be >85% for EI queries. If <80%, increase TTL or check data freshness.

---

### Pattern: Write-Through Caching for Real-time Data
**When to Use**: Bid status updates, proposal rankings, order state changes
**Implementation**:
```
1. Write to database first (ensures ACID consistency)
2. Invalidate cache (DEL `bid:{bidId}`)
3. Optionally write new value to cache with shorter TTL (5-10 min)
4. Publish Redis Pub/Sub event for real-time clients
```

**Rationale**: Database is source of truth. Cache is convenience layer. Never write to cache without database.

**Gotcha**: Race condition if you write cache then database (failure = orphaned cache). Always DB first.

---

### Pattern: Batch Operations for High Concurrency
**When to Use**: Multiple carrier bids arriving simultaneously, EI updates for fleet
**Implementation**:
```
-- Good: Batch 100 inserts in single transaction
INSERT INTO proposals (...) VALUES (...), (...), ... ON CONFLICT DO UPDATE;
REFRESH MATERIALIZED VIEW fleet_performance;

-- Bad: Loop 100 times, single insert per round trip
for each proposal:
  INSERT INTO proposals
```

**Benefit**: 100x faster than looping. PostgreSQL pipelined inserts = network efficiency.

**Metrics**: Measure transactions/second. Good benchmark: 5K-10K simple transactions/sec per database core.

---

### Pattern: Asynchronous Job Processing for Long Tasks
**When to Use**: Dispatch optimization (AI), email notifications, analytics aggregation
**Job Queue**: BullMQ with priority levels

**Template**:
```typescript
// High priority (EI updates, dispatch optimization)
queue.add('dispatch-optimize', {orderId, fleets}, {priority: 1, delay: 0})

// Medium priority (proposal ranking)
queue.add('ranking-update', {bidId}, {priority: 2})

// Low priority (audit logs)
queue.add('audit-log', {action, user}, {priority: 5})

// Processor with retry logic
processor.on('process', async (job) => {
  try {
    await optimizeDispatch(job.data);
    job.progress(100);
    return {success: true};
  } catch (err) {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 attempts)
    throw err;
  }
})
```

---

## Architecture Patterns

### Pattern: Repository Pattern for Database Access
**Structure**:
```
services/
├── fleet.service.ts         // Business logic
├── repositories/
│   ├── fleet.repository.ts  // DB queries
│   └── ei.repository.ts     // EI-specific queries
└── controllers/
    └── fleet.controller.ts  // HTTP endpoints
```

**Benefit**: Decouples business logic from database implementation. Easy to mock for testing.

**Example**:
```typescript
// Repository
class FleetRepository {
  async findEIById(fleetId): Promise<EI> {
    return db.query('SELECT * FROM fleet_ei WHERE fleet_id = $1', [fleetId]);
  }
}

// Service (uses repository)
class FleetService {
  async getFleetMetrics(fleetId) {
    const ei = await this.fleetRepo.findEIById(fleetId);
    const history = await this.fleetRepo.getEIHistory(fleetId);
    return {ei, trend: this.calculateTrend(history)};
  }
}
```

---

### Pattern: Event-Driven Architecture for Real-time Updates
**Channels**:
- `channel:ei:updates` - Fleet EI changed
- `channel:bid:{bidId}:updates` - Bid status changed
- `channel:proposal:ranking:{bidId}` - Proposal ranking updated
- `channel:order:status:{orderId}` - Order state changed

**Pattern**:
```typescript
// Producer (when EI updates)
await redis.publish('channel:ei:updates', JSON.stringify({
  fleetId, newEI, grade, timestamp
}));

// Consumer (frontend listening via SSE)
@Sse('realtime/ei-updates')
async subscribeToEIUpdates(@Query('fleetIds') ids: string[]) {
  return this.sseService.subscribe('channel:ei:updates', (msg) => {
    return {data: JSON.parse(msg)};
  });
}
```

**Benefit**: Loose coupling. EI update service doesn't know about SSE. Frontend doesn't query database.

---

### Pattern: Multi-tenant Data Isolation with RLS
**PostgreSQL Row-Level Security**:
```sql
-- Only shipper sees their own bids
CREATE POLICY shipper_sees_own_bids ON bids
USING (shipper_id = current_user_id());

-- Carriers see public fleet info + data they've accepted
CREATE POLICY carrier_fleet_visibility ON fleet_ei
USING (is_public OR fleet_id IN (
  SELECT fleet_id FROM accepted_proposals WHERE carrier_id = current_user_id()
));
```

**Benefit**: Security at database layer (defense in depth). Application bugs can't leak data.

**Testing**: Verify RLS policies in tests before deployment.

---

## Data Model Patterns

### Pattern: JSONB for Flexible Metadata
**When to Use**: Evaluation policies (weights), proposal metadata, vehicle specs
**Schema**:
```sql
bids (
  id UUID PRIMARY KEY,
  shipper_id UUID,
  evaluation_policy JSONB, -- {alpha: 0.5, beta: 0.3, gamma: 0.2}
  metadata JSONB,          -- {source: 'api', priority: 'high', ...}
  created_at TIMESTAMP
)

-- Query example
SELECT * FROM bids WHERE evaluation_policy->>'gamma' = '0.2';
```

**Benefit**: Flexibility for shipper-specific configs without schema migration.

**Gotcha**: Don't over-use JSONB. Only for truly flexible, rarely-queried data. Regular columns for frequent filters.

---

### Pattern: Enum Types for Status Fields
**Schema**:
```sql
CREATE TYPE bid_status AS ENUM ('OPEN', 'AWARDED', 'CANCELLED', 'EXPIRED');
CREATE TYPE proposal_status AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE ei_grade AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3');

bids (
  status bid_status DEFAULT 'OPEN'
);
```

**Benefit**: Type safety. Database enforces only valid values. Faster than strings.

**Gotcha**: Adding new enum values requires ALTER TYPE. Plan for versioning.

---

### Pattern: Audit Logging with Triggers
**Implementation**:
```sql
-- Immutable audit table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,                -- 'bid', 'proposal', 'fleet'
  entity_id UUID,
  action TEXT,                      -- 'CREATE', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (changed_at);

-- Trigger on bid updates
CREATE TRIGGER bid_audit_trigger AFTER INSERT OR UPDATE OR DELETE ON bids
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Benefit**: Compliance, debugging, accountability. Immutable record of all changes.

**Retention**: Keep 2 years per GDPR/compliance requirements. Drop monthly partitions older than 2 years.

---

## Common Gotchas

### Gotcha 1: N+1 Query Problem
**Symptom**: Loading 100 bids is slow (makes 100+ database queries)

**Bad**:
```typescript
const bids = await bidRepo.findAll();  // 1 query
for (let bid of bids) {
  bid.proposals = await proposalRepo.findByBidId(bid.id);  // 100 queries!
}
```

**Good**:
```typescript
const bids = await bidRepo.findAllWithProposals();  // 1 query with JOIN
// Or batch load
const allProposals = await proposalRepo.findByBidIds(bids.map(b => b.id));
const proposalMap = groupBy(allProposals, 'bidId');
bids.forEach(b => b.proposals = proposalMap[b.id]);
```

**Prevention**: Use Query Builder with `.leftJoinAndSelect()` or batch load.

---

### Gotcha 2: Cache Invalidation Timing
**Symptom**: Fleet EI updates but old value cached for 1 hour

**Root Cause**: Wrote cache without considering data change frequency

**Solution**:
```typescript
// When EI updates from telematics
await eiService.updateFleetEI(fleetId, newEI);

// Option 1: Invalidate immediately
await redis.del(`fleet:ei:${fleetId}`);  // Next query loads fresh

// Option 2: Set shorter TTL for actively changing data
await redis.setex(`fleet:ei:${fleetId}`, 60, newEI);  // 1 minute

// Option 3: Use cache tags
await redis.zadd('fleet:ei:tags', Date.now(), fleetId);  // Tag for invalidation
```

**Rule**: EI data changes hourly → 1 hour TTL. Bid data changes constantly → 5 minute TTL.

---

### Gotcha 3: Race Condition in Bid Award
**Symptom**: Two carriers both awarded same shipment

**Root Cause**:
```
Time 0: Carrier A proposes (score 85)
Time 1: Carrier B proposes (score 92)
Time 2: Award API called with Carrier A (wasn't locked!)
Time 3: Award API called with Carrier B (also awarded!)
```

**Solution**: Database constraint
```sql
ALTER TABLE bids ADD CONSTRAINT only_one_awarded
CHECK (
  (status != 'AWARDED') OR
  (1 = (SELECT COUNT(*) FROM proposals WHERE bid_id = bids.id AND status = 'ACCEPTED'))
);
```

**Better**: Lock in transaction
```typescript
async awardBid(bidId, winnerProposalId) {
  return db.transaction(async (tx) => {
    const bid = await tx.query('SELECT * FROM bids WHERE id = $1 FOR UPDATE', [bidId]);

    if (bid.status !== 'OPEN') throw new Error('Already awarded');

    await tx.query('UPDATE bids SET status = $1 WHERE id = $2', ['AWARDED', bidId]);
    await tx.query('UPDATE proposals SET status = $1 WHERE id = $2', ['ACCEPTED', winnerProposalId]);

    // Publish event
    await redis.publish('channel:bid:award', JSON.stringify({bidId, proposalId: winnerProposalId}));
  });
}
```

---

### Gotcha 4: Missing Indexes on Foreign Keys
**Symptom**: Proposal lookup slow (queries 1M rows)

**Problem**: No index on `bid_id` in proposals table

**Solution**:
```sql
CREATE INDEX idx_proposals_bid_id ON proposals(bid_id);
CREATE INDEX idx_proposals_carrier_id ON proposals(carrier_id);
CREATE INDEX idx_bids_shipper_id ON bids(shipper_id);
CREATE INDEX idx_ei_history_fleet_id_date ON ei_history(fleet_id, recorded_at DESC);
```

**Rule**: Add index on every foreign key and filter column before production.

---

### Gotcha 5: Timeout in Long-Running Operations
**Symptom**: Dispatch optimization times out after 30s, partially completes

**Solution**: Use BullMQ for long jobs
```typescript
// Route handler: queue immediately, return confirmation
POST /dispatch/optimize (sync)
  → queue job
  → return {jobId, status: 'queued'}

// Separate job processor: can run 30+ minutes
processor.handle('dispatch-optimize', async (job) => {
  for (let i = 0; i < optimizations.length; i++) {
    await optimizeRoute(optimizations[i]);
    job.progress((i / optimizations.length) * 100);
  }
})

// Frontend polls for result
GET /dispatch/optimize/{jobId}/status
  → {status: 'completed', result: {...}}
```

---

## Code Generation Templates

### Template: NestJS Controller from OpenAPI
**Source**: openapi.yaml endpoint definition
**Target**: controller.ts

**Example**:
```yaml
# openapi.yaml
GET /v2/fleet/ei/{fleetId}:
  parameters:
    - name: fleetId
      in: path
      required: true
      schema: {type: string, format: uuid}
  responses:
    200:
      content:
        application/json:
          schema: {$ref: '#/components/schemas/FleetEIResponse'}
    404:
      $ref: '#/components/responses/NotFound'
```

**Generated Controller**:
```typescript
@Controller('v2/fleet')
export class FleetController {
  constructor(private fleetService: FleetService) {}

  @Get('ei/:fleetId')
  async getFleetEI(
    @Param('fleetId', ParseUUIDPipe) fleetId: string
  ): Promise<FleetEIResponse> {
    const fleet = await this.fleetService.getFleetEI(fleetId);
    if (!fleet) throw new NotFoundException(`Fleet ${fleetId} not found`);
    return fleet;
  }
}
```

---

### Template: TypeORM Entity from SQL Schema
**Source**: DATABASE_SCHEMA.sql table definition
**Target**: entities/*.entity.ts

**Example**:
```sql
-- DATABASE_SCHEMA.sql
CREATE TABLE fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  ei_current NUMERIC(10,2),
  ei_grade ei_grade,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Generated Entity**:
```typescript
@Entity('fleets')
export class Fleet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  companyId: string;

  @ManyToOne(() => Company, (c) => c.fleets)
  @JoinColumn({name: 'company_id'})
  company: Company;

  @Column('varchar', {length: 255})
  name: string;

  @Column('numeric', {precision: 10, scale: 2, nullable: true})
  eiCurrent: number;

  @Column('enum', {enum: EIGrade, nullable: true})
  eiGrade: EIGrade;

  @Column('timestamp', {default: () => 'NOW()'})
  updatedAt: Date;
}
```

---

### Template: API Request/Response Validation
**Source**: OpenAPI schema definitions
**Target**: DTO + validation

**Example**:
```typescript
// DTO from OpenAPI schema
export class BidEvaluationRequest {
  @IsUUID() orderId: string;
  @IsUUID('all', {each: true}) bidIds: string[];

  @ValidateNested()
  @Type(() => EvaluationPolicy)
  evaluationPolicy: EvaluationPolicy;  // {alpha, beta, gamma}
}

export class EvaluationPolicy {
  @IsNumber() @Min(0) @Max(1) alpha: number;    // Price weight
  @IsNumber() @Min(0) @Max(1) beta: number;     // Time weight
  @IsNumber() @Min(0) @Max(1) gamma: number;    // EI weight

  @ValidateIf((obj) => true)
  @Custom((val) => {
    const sum = val.alpha + val.beta + val.gamma;
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error('Weights must sum to 1.0');
    }
  })
  validate() {} // Validates sum = 1.0
}
```

---

## Testing Patterns

### Pattern: Integration Tests with Docker Compose
**Setup**: Tests run against real PostgreSQL + Redis in containers

```bash
# docker-compose.test.yml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: greenflow_test
      POSTGRES_PASSWORD: test

  redis:
    image: redis:7-alpine

# package.json
"test:integration": "docker-compose -f docker-compose.test.yml up -d && npm run jest:integration && docker-compose -f docker-compose.test.yml down"
```

**Benefits**: Tests match production environment exactly. Catches real bugs (concurrency, foreign keys).

---

### Pattern: E2E Test for Bid Evaluation Flow
```typescript
describe('Bid Evaluation Flow', () => {
  it('should score proposals correctly with shipper weights', async () => {
    // 1. Create shipper, order, carriers
    const shipper = await db.create(User, {role: 'SHIPPER'});
    const order = await db.create(Order, {shipperId: shipper.id});

    // 2. Carriers submit proposals
    const carrier1 = await db.create(Fleet, {ei: 150});  // Better EI
    const carrier2 = await db.create(Fleet, {ei: 200});

    await db.create(Proposal, {
      bidId: order.id,
      carrierId: carrier1.id,
      price: 10000,  // Higher price
      leadtime: 24
    });

    await db.create(Proposal, {
      bidId: order.id,
      carrierId: carrier2.id,
      price: 8000,   // Lower price
      leadtime: 48   // Longer leadtime
    });

    // 3. Evaluate with green shipper weights (gamma=0.6)
    const result = await bidService.evaluateBid(order.id, {
      alpha: 0.2,  // Price weight (low)
      beta: 0.2,   // Time weight (low)
      gamma: 0.6   // EI weight (high for green shipper)
    });

    // 4. Verify carrier1 (better EI) ranks higher
    expect(result.ranked[0].carrierId).toBe(carrier1.id);  // EI advantage overcomes price
  });
});
```

---

### Pattern: Mock External APIs in Tests
```typescript
// services/ei-provider.service.ts - wraps external EI API
class EIProviderService {
  async fetchFleetEI(fleetId: string): Promise<EI> {
    // Real implementation calls external service
    return fetch(`https://api.tmap.com/fleet/${fleetId}`);
  }
}

// Test: Mock the external service
describe('EI Updates', () => {
  it('should update fleet EI from external provider', async () => {
    const mockEIProvider = {
      fetchFleetEI: jest.fn().mockResolvedValue({
        fleetId: 'fleet-1',
        ei: 120,
        grade: 'GRADE_1'
      })
    };

    const service = new EIUpdateService(mockEIProvider);
    await service.updateFleetFromExternal('fleet-1');

    expect(mockEIProvider.fetchFleetEI).toHaveBeenCalledWith('fleet-1');
    // Verify DB was updated
    const fleet = await db.query('SELECT ei FROM fleets WHERE id = $1', ['fleet-1']);
    expect(fleet.ei).toBe(120);
  });
});
```

---

## Deployment Lessons

### Lesson 1: Database Migrations in CI/CD
**Problem**: Schema mismatch between environments

**Solution**: Liquibase/Flyway for versioned migrations
```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  run: |
    npm run db:migrate -- --target latest
    npm run db:seed  # Seed test data
```

**Rule**: Never apply schema changes manually. Always through migration scripts in git.

---

### Lesson 2: Blue-Green Deployment for Zero Downtime
**Process**:
```
1. Deploy new backend to "green" environment (parallel to "blue" production)
2. Run smoke tests on green
3. Switch load balancer to green
4. Keep blue running for 1 hour (rollback ready)
5. Monitor metrics on green for 1 hour
6. Tear down blue
```

**Benefit**: Instant rollback if bugs found. Users see zero downtime.

---

### Lesson 3: Feature Flags for Safe Rollout
**Implementation**:
```typescript
if (featureFlags.isEnabled('dispatch-optimization-v2', userId)) {
  // Use new dispatch algorithm
  result = await dispatchV2.optimize(order);
} else {
  // Fallback to v1
  result = await dispatchV1.optimize(order);
}
```

**Usage**:
- Roll out to 1% of users first
- Monitor error rate
- Expand to 10%, 50%, 100%
- Disable if bugs found (instant, no redeploy)

---

### Lesson 4: Monitoring Before Deployment
**Checklist**:
- ✅ All SLOs defined in Prometheus (latency, error rate, cache hit ratio)
- ✅ Grafana dashboards for real-time monitoring
- ✅ Alert rules configured (error rate >1%, P95 >500ms)
- ✅ Runbook created for each alert
- ✅ On-call rotation assigned

**Rule**: Deploy monitoring simultaneously with code. Never deploy without observability.

---

## Template: Weekly Sync Notes
```
=== GreenFlow Development - Week of YYYY-MM-DD ===

COMPLETED:
- ✅ Feature A (merged PR #123)
- ✅ Bug B fixed (related to cache invalidation)

IN PROGRESS:
- 🔄 Feature C (targeting Phase 1.2)
- 🔄 Performance optimization (EI query latency)

BLOCKERS:
- ⚠️ API key provisioning from TMAP (waiting on partner)

NEXT WEEK:
- [ ] Complete Feature C
- [ ] Deploy to staging for UAT
- [ ] Korean market feedback integration

METRICS:
- Error rate: 0.08% (SLO: <1%) ✅
- P95 latency: 240ms (SLO: <300ms) ✅
- Cache hit ratio: 89% (Target: >85%) ✅
- Test coverage: 82% (Target: >80%) ✅
```

---

## Quick Reference: Command Cheatsheet

```bash
# Development
npm run dev                    # Start dev server with hot reload
npm run build                  # Build for production
npm run type-check             # TypeScript validation

# Database
npm run db:migrate            # Run pending migrations
npm run db:seed               # Load test data
npm run db:drop               # Reset database (dev only!)

# Testing
npm run test                  # Unit tests
npm run test:integration      # Integration tests (with Docker)
npm run test:e2e              # End-to-end tests
npm run test:coverage         # Generate coverage report

# Deployment
npm run build && npm run preview  # Test production build locally
docker build -t greenflow:latest . # Build Docker image
docker-compose up -d               # Start full stack locally

# Monitoring
curl http://localhost:3000/health/deep  # Deep health check
open http://localhost:3001/metrics      # Prometheus metrics

# Debugging
DEBUG=* npm run dev           # Enable all debug logs
npm run db:reset:seed         # Full reset for testing
```

---

## Last Updated
2026-02-04
Next Review: 2026-02-18 (after Phase 0)
Maintainer: GreenFlow development team
