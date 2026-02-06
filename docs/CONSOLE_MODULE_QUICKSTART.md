# Console Module Implementation Quick Start

**Implementation Time**: 2-3 hours
**Prerequisites**: NestJS backend running, PostgreSQL 17, Redis 7.x
**Reference**: See [CONSOLE_MODULE_ARCHITECTURE.md](./CONSOLE_MODULE_ARCHITECTURE.md) for full details

---

## Quick Implementation Steps

### Step 1: Create Module Structure (10 min)

```bash
cd /Users/kevin/openclaw-workspace/projects/glec-api-backend

# Create directory structure
mkdir -p src/modules/console/{controllers,services,entities,dtos,repositories,__tests__}

# Create files
touch src/modules/console/console.module.ts
touch src/modules/console/controllers/console-metrics.controller.ts
touch src/modules/console/controllers/console-stream.controller.ts
touch src/modules/console/services/console-metrics.service.ts
touch src/modules/console/services/console-cache.service.ts
touch src/modules/console/services/console-stream.service.ts
touch src/modules/console/entities/api-request-log.entity.ts
touch src/modules/console/dtos/metrics-summary.dto.ts
touch src/modules/console/dtos/endpoint-metrics.dto.ts
touch src/modules/console/dtos/quota-info.dto.ts
touch src/modules/console/dtos/billing-metrics.dto.ts
```

### Step 2: Database Migration (15 min)

```bash
# Generate migration
npm run migration:generate -- src/database/migrations/AddConsoleMetricsTables

# Apply migration
npm run migration:run
```

**Manual SQL** (if migration tool unavailable):

```sql
-- Run in PostgreSQL
CREATE TABLE api_request_logs (
    id BIGSERIAL,
    api_key_id UUID NOT NULL,
    user_id INT REFERENCES users(user_id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code SMALLINT NOT NULL,
    response_time_ms INT NOT NULL,
    request_size_bytes INT,
    response_size_bytes INT,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current month + next month
CREATE TABLE api_request_logs_2026_02 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE api_request_logs_2026_03 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Indexes
CREATE INDEX idx_api_logs_api_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC);
```

### Step 3: Copy Implementation Files (30 min)

**All implementation code is in [CONSOLE_MODULE_ARCHITECTURE.md](./CONSOLE_MODULE_ARCHITECTURE.md) - Phase 1-4.**

Copy the following from the architecture document:

1. **Entity**: `api-request-log.entity.ts` (Phase 1.1)
2. **Services**: `console-metrics.service.ts`, `console-cache.service.ts`, `console-stream.service.ts` (Phase 2)
3. **Controllers**: `console-metrics.controller.ts`, `console-stream.controller.ts` (Phase 3)
4. **Module**: `console.module.ts` (Phase 4.1)
5. **Middleware**: `request-logger.middleware.ts` (Phase 5.1)

### Step 4: Register Module (5 min)

Edit `src/app.module.ts`:

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

### Step 5: Add Request Logging Middleware (10 min)

Edit `src/app.module.ts`:

```typescript
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestLoggerMiddleware } from './modules/console/middleware/request-logger.middleware';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Log all requests
  }
}
```

### Step 6: Build & Test (20 min)

```bash
# Build
npm run build

# Start dev server
npm run dev

# Test endpoints (in another terminal)
# Get a JWT token first, then:

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v2/console/metrics/summary?period=DAY

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v2/console/metrics/endpoints

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v2/console/metrics/quota

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v2/console/metrics/billing

# Test SSE stream
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/v2/console/metrics/stream
```

### Step 7: Frontend Integration (15 min)

Update frontend to use real backend:

```bash
cd /Users/kevin/openclaw-workspace/projects/green-logistics-landing

# Edit src/console/services/apiClient.ts
# Change line 7:
# FROM: const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v2';
# TO:   const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

# Rebuild
npm run build

# Redeploy to LocalStack
cd /tmp
aws --endpoint-url=http://localhost:4566 s3 sync ./dist-console s3://greenflow-console/ --delete
```

### Step 8: Cleanup (5 min)

```bash
# Stop mock API server (if running)
kill $(cat /tmp/mock-api-server.pid) 2>/dev/null

# Remove mock server files
rm /Users/kevin/openclaw-workspace/projects/green-logistics-landing/mock-api-server.mjs
rm /tmp/mock-api-server.pid
```

---

## Verification Checklist

- [ ] Backend build succeeds without errors
- [ ] All 5 console endpoints return 200 OK (not 404)
- [ ] SSE stream delivers updates
- [ ] Request logs are written to `api_request_logs` table
- [ ] Redis cache is working (check cache keys with `redis-cli KEYS console:*`)
- [ ] Frontend console dashboard loads without errors
- [ ] Metrics display real data (not mock data)
- [ ] No console errors in browser DevTools

---

## Troubleshooting

### Issue: "Cannot GET /api/v2/console/metrics/summary"

**Solution**: Module not registered. Check `app.module.ts` imports.

### Issue: "401 Unauthorized"

**Solution**: JWT token missing or expired. Get a new token from `/auth/login`.

### Issue: "TypeError: Cannot read property 'id' of undefined"

**Solution**: JWT guard not extracting user. Check `JwtAuthGuard` configuration.

### Issue: "QueryFailedError: relation api_request_logs does not exist"

**Solution**: Migration not run. Execute `npm run migration:run`.

### Issue: Frontend still shows "Connection Error"

**Solution**:
1. Check backend is running: `curl http://localhost:3000/api/v2/health`
2. Check frontend `apiClient.ts` points to port 3000 (not 3001)
3. Rebuild frontend: `npm run build`
4. Redeploy to S3

### Issue: SSE stream not working

**Solution**: Check CORS headers allow `text/event-stream`. Add to `main.ts`:

```typescript
app.enableCors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Content-Type'],
});
```

---

## Performance Optimization

### After Implementation

1. **Monitor query performance**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM api_request_logs
   WHERE user_id = 1 AND created_at > NOW() - INTERVAL '1 day';
   ```

2. **Check cache hit rate**:
   ```bash
   redis-cli INFO stats | grep keyspace_hits
   ```

3. **Verify partition pruning**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM api_request_logs
   WHERE created_at BETWEEN '2026-02-01' AND '2026-02-28';
   ```

4. **Add monthly partition (cron job)**:
   ```sql
   CREATE TABLE api_request_logs_2026_04 PARTITION OF api_request_logs
       FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
   ```

---

## Next Steps

1. ✅ Implement Console Module (2-3 hours)
2. 📋 Write unit tests for services
3. 📋 Add integration tests for endpoints
4. 📋 Set up Prometheus metrics
5. 📋 Add rate limiting (60 req/min per user)
6. 📋 Implement quota auto-reset (monthly cron job)
7. 📋 Add billing cost calculation logic
8. 📋 Create partition management script (auto-create future partitions)
9. 📋 Document API in OpenAPI spec
10. 📋 Add to production deployment pipeline

---

**Document Created**: 2026-02-05
**Estimated Total Time**: 2-3 hours
**Prerequisites**: Backend running, PostgreSQL 17, Redis 7.x
**Support**: See [CONSOLE_MODULE_ARCHITECTURE.md](./CONSOLE_MODULE_ARCHITECTURE.md) for detailed implementation
