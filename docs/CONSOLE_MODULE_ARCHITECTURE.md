# Console Module Architecture & Implementation Plan

**Last Updated**: 2026-02-05
**Status**: Design Complete - Ready for Implementation
**Owner**: Backend Team
**Estimated Time**: 2-3 hours

---

## 1. Executive Summary

### Problem Statement
The API Console frontend (`http://greenflow-console.s3-website.us-east-1.localhost.localstack.cloud:4566`) requires real-time metrics and usage data from the backend API, but the backend currently lacks console-specific endpoints.

**Current State**:
- ✅ Backend API running at `http://localhost:3000/api/v2`
- ✅ Health endpoint working (`/api/v2/health`)
- ❌ Console metrics endpoints missing (`/api/v2/console/metrics/*` → 404)
- ⚠️ Frontend using temporary Mock API server (port 3001)

**Desired State**:
- ✅ Backend provides real console metrics from database/Redis
- ✅ Frontend connects to real backend (port 3000)
- ✅ Real-time updates via Server-Sent Events (SSE)
- ✅ Proper caching and performance optimization

### Solution Overview
Add a new **Console Module** to the backend following the existing modular architecture pattern. This module will provide:
1. API usage metrics (requests, errors, response times)
2. Endpoint usage statistics
3. API key quota tracking
4. Billing metrics
5. Real-time metrics streaming via SSE

---

## 2. Architecture Design

### 2.1 Module Structure (Modular Monolith Pattern)

```
src/modules/console/
├── console.module.ts                 # Module definition with TypeORM entities
├── controllers/
│   ├── console-metrics.controller.ts # HTTP endpoints for metrics
│   └── console-stream.controller.ts  # SSE streaming endpoint
├── services/
│   ├── console-metrics.service.ts    # Core business logic
│   ├── console-cache.service.ts      # Redis caching layer
│   └── console-stream.service.ts     # SSE event management
├── entities/
│   ├── api-request-log.entity.ts     # Request logs (PostgreSQL)
│   └── api-key-quota.entity.ts       # Quota tracking
├── dtos/
│   ├── metrics-summary.dto.ts        # Response DTOs
│   ├── endpoint-metrics.dto.ts
│   ├── quota-info.dto.ts
│   └── billing-metrics.dto.ts
├── repositories/
│   └── api-request-log.repository.ts # Custom query methods
└── __tests__/
    ├── console-metrics.service.spec.ts
    └── console-stream.spec.ts
```

### 2.2 Database Schema

**New Table: `api_request_logs`** (with time-series partitioning)

```sql
CREATE TABLE api_request_logs (
    id BIGSERIAL,
    api_key_id UUID NOT NULL,
    user_id INT REFERENCES users(user_id),
    method VARCHAR(10) NOT NULL,           -- GET, POST, PUT, DELETE
    endpoint VARCHAR(255) NOT NULL,         -- e.g., /api/v2/bids/evaluate
    status_code SMALLINT NOT NULL,          -- 200, 400, 500, etc.
    response_time_ms INT NOT NULL,          -- Latency in milliseconds
    request_size_bytes INT,                 -- Request body size
    response_size_bytes INT,                -- Response body size
    ip_address INET,                        -- Client IP
    user_agent TEXT,                        -- Client user agent
    error_message TEXT,                     -- Error details if status >= 400
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)            -- Composite key for partitioning
) PARTITION BY RANGE (created_at);

-- Partition by month for time-series data
CREATE TABLE api_request_logs_2026_02 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE api_request_logs_2026_03 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Indexes for fast queries
CREATE INDEX idx_api_logs_api_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC);
```

**Update Existing: `api_keys` table**

```sql
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS quota_limit INT DEFAULT 100000;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS quota_used INT DEFAULT 0;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
```

### 2.3 API Endpoints Specification

#### Endpoint 1: Metrics Summary
```http
GET /api/v2/console/metrics/summary?period=DAY
Authorization: Bearer {jwt_token}
```

**Response** (`MetricsSummaryDto`):
```json
{
  "totalRequests": 12847,
  "successRate": 98.5,
  "averageResponseTime": 245,
  "totalErrorCount": 193,
  "period": "DAY",
  "periodStart": "2026-02-05T00:00:00Z",
  "periodEnd": "2026-02-05T23:59:59Z"
}
```

**Implementation**:
- Query `api_request_logs` with time range filter
- Cache result in Redis for 5 minutes
- Key pattern: `console:metrics:summary:{user_id}:{period}:{date}`

#### Endpoint 2: Endpoint Usage Statistics
```http
GET /api/v2/console/metrics/endpoints?limit=10
Authorization: Bearer {jwt_token}
```

**Response** (`EndpointMetricsDto[]`):
```json
[
  {
    "method": "POST",
    "endpoint": "/api/v2/bids/evaluate",
    "requestCount": 3421,
    "averageResponseTime": 234,
    "errorRate": 1.2
  },
  {
    "method": "GET",
    "endpoint": "/api/v2/fleets",
    "requestCount": 2156,
    "averageResponseTime": 87,
    "errorRate": 0.3
  }
]
```

**Implementation**:
- Aggregate query: `GROUP BY method, endpoint`
- Order by `requestCount DESC`
- Cache for 10 minutes

#### Endpoint 3: API Key Quota
```http
GET /api/v2/console/metrics/quota
Authorization: Bearer {jwt_token}
```

**Response** (`QuotaInfoDto`):
```json
{
  "used": 12847,
  "limit": 100000,
  "remaining": 87153,
  "resetDate": "2026-03-05T00:00:00Z",
  "usagePercentage": 12.8
}
```

**Implementation**:
- Query `api_keys` table
- No caching (real-time data)

#### Endpoint 4: Billing Metrics
```http
GET /api/v2/console/metrics/billing?period=MONTH
Authorization: Bearer {jwt_token}
```

**Response** (`BillingMetricsDto`):
```json
{
  "currentPeriod": {
    "totalCost": 234.50,
    "totalRequests": 12847,
    "costPerRequest": 0.0183
  },
  "breakdown": [
    { "date": "2026-02-01", "requests": 1200, "cost": 21.96 },
    { "date": "2026-02-02", "requests": 1350, "cost": 24.71 }
  ]
}
```

**Implementation**:
- Daily aggregation from `api_request_logs`
- Pricing: $0.02 per 1000 requests (configurable)
- Cache for 1 hour

#### Endpoint 5: Real-time Metrics Stream (SSE)
```http
GET /api/v2/console/metrics/stream
Authorization: Bearer {jwt_token}
Accept: text/event-stream
```

**SSE Event Stream**:
```
event: metrics-update
data: {"totalRequests":12849,"successRate":98.5,"averageResponseTime":243,"totalErrorCount":193}

event: metrics-update
data: {"totalRequests":12851,"successRate":98.6,"averageResponseTime":241,"totalErrorCount":193}
```

**Implementation**:
- Redis Pub/Sub subscription to `console:metrics:stream:{user_id}`
- Send updates every 5 seconds or on significant change
- Auto-disconnect after 60 minutes (reconnect from client)

---

## 3. Implementation Steps

### Phase 1: Database & Entities (30 min)

**Step 1.1**: Create TypeORM Entity
```bash
# File: src/modules/console/entities/api-request-log.entity.ts
```

```typescript
import { Entity, Column, PrimaryColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('api_request_logs')
@Index(['apiKeyId', 'createdAt'])
@Index(['endpoint', 'createdAt'])
export class ApiRequestLog {
  @PrimaryColumn('bigint')
  id: number;

  @Column('uuid')
  apiKeyId: string;

  @Column('int', { nullable: true })
  userId: number;

  @Column('varchar', { length: 10 })
  method: string;

  @Column('varchar', { length: 255 })
  endpoint: string;

  @Column('smallint')
  statusCode: number;

  @Column('int')
  responseTimeMs: number;

  @Column('int', { nullable: true })
  requestSizeBytes: number;

  @Column('int', { nullable: true })
  responseSizeBytes: number;

  @Column('inet', { nullable: true })
  ipAddress: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
```

**Step 1.2**: Create Migration
```bash
npm run migration:generate -- src/database/migrations/AddConsoleMetricsTables
npm run migration:run
```

### Phase 2: Service Layer (45 min)

**Step 2.1**: `console-metrics.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ApiRequestLog } from '../entities/api-request-log.entity';
import { ConsoleCacheService } from './console-cache.service';

@Injectable()
export class ConsoleMetricsService {
  constructor(
    @InjectRepository(ApiRequestLog)
    private readonly logRepo: Repository<ApiRequestLog>,
    private readonly cacheService: ConsoleCacheService,
  ) {}

  async getMetricsSummary(userId: number, period: 'DAY' | 'WEEK' | 'MONTH') {
    const cacheKey = `console:metrics:summary:${userId}:${period}:${new Date().toISOString().split('T')[0]}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const { start, end } = this.getDateRange(period);

    const [totalRequests, successCount, avgResponseTime, errorCount] = await Promise.all([
      this.logRepo.count({ where: { userId, createdAt: Between(start, end) } }),
      this.logRepo.count({ where: { userId, statusCode: Between(200, 299), createdAt: Between(start, end) } }),
      this.logRepo.createQueryBuilder('log')
        .select('AVG(log.responseTimeMs)', 'avg')
        .where('log.userId = :userId', { userId })
        .andWhere('log.createdAt BETWEEN :start AND :end', { start, end })
        .getRawOne(),
      this.logRepo.count({ where: { userId, statusCode: Between(400, 599), createdAt: Between(start, end) } }),
    ]);

    const result = {
      totalRequests,
      successRate: totalRequests > 0 ? (successCount / totalRequests) * 100 : 0,
      averageResponseTime: Math.round(avgResponseTime.avg || 0),
      totalErrorCount: errorCount,
      period,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
    };

    await this.cacheService.set(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  async getEndpointMetrics(userId: number, limit = 10) {
    const cacheKey = `console:endpoints:${userId}:${limit}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const result = await this.logRepo
      .createQueryBuilder('log')
      .select('log.method', 'method')
      .addSelect('log.endpoint', 'endpoint')
      .addSelect('COUNT(*)', 'requestCount')
      .addSelect('AVG(log.responseTimeMs)', 'averageResponseTime')
      .addSelect('SUM(CASE WHEN log.statusCode >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)', 'errorRate')
      .where('log.userId = :userId', { userId })
      .andWhere('log.createdAt > NOW() - INTERVAL \'30 days\'')
      .groupBy('log.method, log.endpoint')
      .orderBy('requestCount', 'DESC')
      .limit(limit)
      .getRawMany();

    await this.cacheService.set(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  private getDateRange(period: string) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'DAY':
        start.setDate(end.getDate() - 1);
        break;
      case 'WEEK':
        start.setDate(end.getDate() - 7);
        break;
      case 'MONTH':
        start.setMonth(end.getMonth() - 1);
        break;
    }

    return { start, end };
  }
}
```

**Step 2.2**: `console-cache.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class ConsoleCacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
```

**Step 2.3**: `console-stream.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class ConsoleStreamService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  subscribeToMetrics(userId: number): Observable<any> {
    const subject = new Subject();
    const subscriber = this.redis.duplicate();

    subscriber.subscribe(`console:metrics:stream:${userId}`);
    subscriber.on('message', (channel, message) => {
      subject.next(JSON.parse(message));
    });

    return subject.asObservable();
  }

  async publishMetricsUpdate(userId: number, metrics: any): Promise<void> {
    await this.redis.publish(
      `console:metrics:stream:${userId}`,
      JSON.stringify(metrics)
    );
  }
}
```

### Phase 3: Controllers (30 min)

**Step 3.1**: `console-metrics.controller.ts`
```typescript
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsoleMetricsService } from '../services/console-metrics.service';

@Controller('api/v2/console/metrics')
@UseGuards(JwtAuthGuard)
export class ConsoleMetricsController {
  constructor(private readonly metricsService: ConsoleMetricsService) {}

  @Get('summary')
  async getSummary(@Req() req, @Query('period') period = 'DAY') {
    return this.metricsService.getMetricsSummary(req.user.id, period);
  }

  @Get('endpoints')
  async getEndpoints(@Req() req, @Query('limit') limit = 10) {
    return this.metricsService.getEndpointMetrics(req.user.id, limit);
  }

  @Get('quota')
  async getQuota(@Req() req) {
    // TODO: Implement quota logic
    return { used: 0, limit: 100000, remaining: 100000 };
  }

  @Get('billing')
  async getBilling(@Req() req, @Query('period') period = 'MONTH') {
    // TODO: Implement billing logic
    return { currentPeriod: { totalCost: 0, totalRequests: 0 } };
  }
}
```

**Step 3.2**: `console-stream.controller.ts`
```typescript
import { Controller, Sse, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsoleStreamService } from '../services/console-stream.service';
import { Observable, interval, map, switchMap } from 'rxjs';

@Controller('api/v2/console/metrics')
@UseGuards(JwtAuthGuard)
export class ConsoleStreamController {
  constructor(
    private readonly streamService: ConsoleStreamService,
    private readonly metricsService: ConsoleMetricsService,
  ) {}

  @Sse('stream')
  streamMetrics(@Req() req): Observable<MessageEvent> {
    // Combine Redis Pub/Sub with periodic polling
    return interval(5000).pipe(
      switchMap(() => this.metricsService.getMetricsSummary(req.user.id, 'DAY')),
      map((data) => ({ data })),
    );
  }
}
```

### Phase 4: Module Registration (15 min)

**Step 4.1**: `console.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiRequestLog } from './entities/api-request-log.entity';
import { ConsoleMetricsController } from './controllers/console-metrics.controller';
import { ConsoleStreamController } from './controllers/console-stream.controller';
import { ConsoleMetricsService } from './services/console-metrics.service';
import { ConsoleCacheService } from './services/console-cache.service';
import { ConsoleStreamService } from './services/console-stream.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiRequestLog])],
  controllers: [ConsoleMetricsController, ConsoleStreamController],
  providers: [ConsoleMetricsService, ConsoleCacheService, ConsoleStreamService],
  exports: [ConsoleMetricsService],
})
export class ConsoleModule {}
```

**Step 4.2**: Update `app.module.ts`
```typescript
import { ConsoleModule } from './modules/console/console.module';

@Module({
  imports: [
    // ... existing modules
    ConsoleModule,
  ],
})
export class AppModule {}
```

### Phase 5: Middleware for Request Logging (30 min)

**Step 5.1**: `request-logger.middleware.ts`
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiRequestLog } from '../modules/console/entities/api-request-log.entity';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(ApiRequestLog)
    private readonly logRepo: Repository<ApiRequestLog>,
  ) {}

  use(req: any, res: any, next: () => void) {
    const startTime = Date.now();

    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;

      await this.logRepo.insert({
        apiKeyId: req.headers['x-api-key'] || 'unknown',
        userId: req.user?.id,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        errorMessage: res.statusCode >= 400 ? res.statusMessage : null,
      });
    });

    next();
  }
}
```

**Step 5.2**: Register middleware in `app.module.ts`
```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Log all requests
  }
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests
```bash
npm run test:unit src/modules/console/services/console-metrics.service.spec.ts
```

### 4.2 Integration Tests
```bash
npm run test:integration src/modules/console/__tests__/console-api.integration.spec.ts
```

### 4.3 Manual Testing
```bash
# 1. Start backend
npm run dev

# 2. Test endpoints
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/v2/console/metrics/summary?period=DAY
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/v2/console/metrics/endpoints
curl -H "Authorization: Bearer {token}" http://localhost:3000/api/v2/console/metrics/quota

# 3. Test SSE stream
curl -H "Authorization: Bearer {token}" -H "Accept: text/event-stream" http://localhost:3000/api/v2/console/metrics/stream
```

---

## 5. Frontend Integration

### 5.1 Update apiClient.ts
```typescript
// Change from port 3001 (mock) to 3000 (real backend)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';
```

### 5.2 Rebuild and Redeploy
```bash
cd projects/green-logistics-landing
npm run build

# Deploy to LocalStack S3
aws --endpoint-url=http://localhost:4566 s3 sync /tmp/dist-console s3://greenflow-console/
```

---

## 6. Performance Optimization

### 6.1 Caching Strategy
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Metrics Summary | 5 min | Near real-time acceptable |
| Endpoint Metrics | 10 min | Changes slowly |
| Quota Info | 0 (no cache) | Must be real-time |
| Billing Metrics | 1 hour | Daily aggregation |

### 6.2 Database Optimization
- **Partitioning**: Monthly partitions for `api_request_logs`
- **Indexes**: Composite indexes on (user_id, created_at), (endpoint, created_at)
- **Retention**: Auto-delete logs older than 90 days (scheduled job)

### 6.3 Query Optimization
- Use `EXPLAIN ANALYZE` for all queries
- Target: All queries < 100ms at 95th percentile
- Use Redis for aggregated metrics (pre-compute daily rollups)

---

## 7. Security Considerations

1. **Authentication**: JWT required for all endpoints
2. **Authorization**: Users can only see their own metrics (row-level filtering)
3. **Rate Limiting**: 60 requests/minute per user for metrics endpoints
4. **Data Isolation**: Ensure `userId` filter in all queries
5. **PII Protection**: Hash IP addresses, truncate user agents

---

## 8. Monitoring & Alerts

### Metrics to Track
- Console API response time (target: < 200ms p95)
- Cache hit rate (target: > 80%)
- SSE connection count (alert if > 1000 concurrent)
- Database query time (alert if > 500ms)

### Prometheus Metrics
```typescript
// Add to metrics.service.ts
this.prometheusService.incrementCounter('console_metrics_requests_total', { endpoint: 'summary' });
this.prometheusService.observeHistogram('console_metrics_response_time', responseTime);
```

---

## 9. Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to dev environment
- Test with seed data
- Validate SSE connections

### Phase 2: Beta Users (Week 2)
- Enable for 10% of users
- Monitor performance metrics
- Gather feedback

### Phase 3: Full Rollout (Week 3)
- Enable for all users
- Deprecate mock API server
- Update documentation

---

## 10. Success Criteria

✅ All console endpoints return 200 OK
✅ SSE stream delivers updates every 5 seconds
✅ 95th percentile response time < 200ms
✅ Cache hit rate > 80%
✅ Zero console-related errors in production
✅ Frontend successfully connects to real backend
✅ Mock API server removed from deployment

---

## 11. Next Steps

1. ✅ **Review this design document** (Team review)
2. 📋 **Update CLAUDE.md** with Console Module info
3. 📋 **Update PROJECT_SPEC.md** with new endpoints
4. 📋 **Create implementation ticket** in Jira/GitHub Issues
5. 📋 **Implement Phase 1** (Database & Entities)
6. 📋 **Implement Phase 2-3** (Services & Controllers)
7. 📋 **Write tests** (Unit + Integration)
8. 📋 **Deploy to dev** and validate
9. 📋 **Update frontend** to use real backend
10. 📋 **Remove mock API server**

---

**Document Owner**: Backend Team
**Reviewers**: Tech Lead, DevOps
**Approval Required**: Yes
**Estimated Development Time**: 2-3 hours
**Estimated Testing Time**: 1 hour
**Total Timeline**: 1-2 days
