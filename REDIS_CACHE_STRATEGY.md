# Redis 7.x Caching Strategy for GLEC Green Logistics API

## Overview

This document defines the production-grade Redis caching strategy for GLEC's green logistics bidding API. The strategy optimizes for:
- **High-frequency EI queries** (Fleet carbon intensity lookups)
- **Real-time bid evaluation** (Score calculations)
- **Rate limiting** (API throttling)
- **Session management** (User authentication tokens)
- **Pub/Sub messaging** (Real-time notifications)

---

## 1. Redis Architecture

### 1.1 Instance Configuration

```yaml
# Production Redis 7.x Configuration
redis:
  version: "7.2"
  mode: "cluster"  # Use Redis Cluster for horizontal scaling

  # Memory Management
  maxmemory: "8gb"
  maxmemory-policy: "allkeys-lru"  # Evict least recently used keys

  # Persistence
  save: "900 1 300 10 60 10000"  # RDB snapshots
  appendonly: "yes"                # AOF for durability
  appendfsync: "everysec"          # Balance between performance and safety

  # Connection Pool
  connection_pool_size: 50
  connection_timeout: 5000  # ms

  # Cluster Configuration
  cluster:
    enabled: true
    replicas: 2  # 2 replicas per master
    nodes:
      - redis-master-1:6379
      - redis-master-2:6379
      - redis-master-3:6379
```

### 1.2 Key Naming Convention

**Pattern**: `{namespace}:{entity}:{id}:{field}`

```
# Examples:
fleet:ei:FLT-A01                        → Fleet EI data
fleet:ei:FLT-A01:history:30d            → 30-day EI history
bid:details:BID-20260204-001            → Bid details
bid:proposals:BID-20260204-001:ranked   → Ranked proposals (sorted set)
proposal:score:PROP-12345               → Proposal score
user:session:USER-67890                 → User session token
ratelimit:api:192.168.1.100             → Rate limit counter
cache:search:results:hash123            → Search result cache
```

**Benefits**:
- Clear hierarchy and organization
- Easy pattern matching for invalidation
- Supports Redis Cluster hash tagging: `{namespace}` ensures related keys are in same slot

---

## 2. Caching Patterns

### 2.1 Cache-Aside (Lazy Loading) - Primary Pattern

**Used for**: Fleet EI data, bid details, proposal details

**Flow**:
```typescript
async function getFleetEI(fleetId: string): Promise<FleetEI> {
  const cacheKey = `fleet:ei:${fleetId}`;

  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    await redis.expire(cacheKey, 3600); // Reset TTL on hit
    return JSON.parse(cached);
  }

  // 2. Cache miss: fetch from database
  const fleetEI = await db.query(`
    SELECT fleet_id, carbon_intensity, ei_grade, ei_confidence, updated_at
    FROM fleets WHERE fleet_id = $1
  `, [fleetId]);

  if (!fleetEI) {
    throw new Error('Fleet not found');
  }

  // 3. Store in cache with TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(fleetEI));

  return fleetEI;
}
```

**TTL Strategy**:
- Fleet EI data: **1 hour** (3600s) - Updates daily but needs reasonable freshness
- Bid details: **5 minutes** (300s) - Active bidding requires freshness
- Proposal details: **10 minutes** (600s) - Less frequently updated

### 2.2 Write-Through Caching

**Used for**: Real-time EI updates, bid status changes

**Flow**:
```typescript
async function updateFleetEI(fleetId: string, newEI: number): Promise<void> {
  const cacheKey = `fleet:ei:${fleetId}`;

  // 1. Update database (primary source of truth)
  await db.query(`
    UPDATE fleets
    SET carbon_intensity = $1, ei_last_updated_at = NOW(), updated_at = NOW()
    WHERE fleet_id = $2
  `, [newEI, fleetId]);

  // 2. Immediately update cache
  const updatedData = await db.query(`SELECT * FROM fleets WHERE fleet_id = $1`, [fleetId]);
  await redis.setex(cacheKey, 3600, JSON.stringify(updatedData));

  // 3. Invalidate related caches
  await invalidateRelatedCaches(fleetId);

  // 4. Publish real-time update event
  await redis.publish(`fleet:ei:updates`, JSON.stringify({
    fleet_id: fleetId,
    new_ei: newEI,
    timestamp: new Date().toISOString()
  }));
}
```

### 2.3 Read-Through Caching

**Used for**: Complex aggregations (fleet performance summaries)

**Flow**:
```typescript
async function getFleetPerformance30d(fleetId: string): Promise<FleetPerformance> {
  const cacheKey = `fleet:performance:30d:${fleetId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss: compute expensive aggregation
  const performance = await db.query(`
    SELECT
      f.fleet_id,
      AVG(eh.ei_value) as avg_ei_30d,
      STDDEV(eh.ei_value) as ei_volatility,
      COUNT(DISTINCT o.order_id) as completed_orders,
      SUM(o.final_price) as total_revenue
    FROM fleets f
    LEFT JOIN ei_history eh ON f.fleet_id = eh.fleet_id
      AND eh.measured_at >= NOW() - INTERVAL '30 days'
    LEFT JOIN orders o ON f.fleet_id = o.fleet_id
      AND o.status = 'DELIVERED'
      AND o.completed_at >= NOW() - INTERVAL '30 days'
    WHERE f.fleet_id = $1
    GROUP BY f.fleet_id
  `, [fleetId]);

  // Store with longer TTL (expensive query)
  await redis.setex(cacheKey, 7200, JSON.stringify(performance)); // 2 hours

  return performance;
}
```

---

## 3. Data Structure Design

### 3.1 Strings (Simple Key-Value)

**Use Cases**: Individual entity caching, counters, flags

```typescript
// Fleet EI snapshot
SET fleet:ei:FLT-A01 '{"fleet_id":"FLT-A01","ei_value":85.2,"ei_grade":"GRADE_1"}' EX 3600

// Bid details
SET bid:details:BID-001 '{"bid_id":"BID-001","shipper_id":"...","status":"OPEN"}' EX 300

// Rate limit counter
INCR ratelimit:api:USER-123:2026-02-04-14
EXPIRE ratelimit:api:USER-123:2026-02-04-14 3600
```

### 3.2 Hashes (Structured Objects)

**Use Cases**: Multi-field entities where individual fields are accessed

```typescript
// Fleet details with multiple fields
HSET fleet:details:FLT-A01
  fleet_name "Green Fleet Alpha"
  vehicle_count 12
  carbon_intensity 85.2
  ei_grade "GRADE_1"
  updated_at "2026-02-04T14:30:00Z"

// Get single field
HGET fleet:details:FLT-A01 carbon_intensity  // → "85.2"

// Get all fields
HGETALL fleet:details:FLT-A01
```

### 3.3 Sorted Sets (Rankings & Time-Series)

**Use Cases**: Ranked proposals, leaderboards, time-series indexes

```typescript
// Ranked proposals for a bid (sorted by score DESC)
ZADD bid:proposals:BID-001:ranked
  92.45 "PROP-001"
  88.32 "PROP-002"
  85.10 "PROP-003"

// Get top 10 proposals
ZREVRANGE bid:proposals:BID-001:ranked 0 9 WITHSCORES

// Get rank of specific proposal
ZREVRANK bid:proposals:BID-001:ranked "PROP-002"  // → 1 (0-indexed)

// Fleet EI leaderboard (lowest EI = best)
ZADD fleet:leaderboard:ei:all
  65.3 "FLT-ECO-01"
  72.1 "FLT-GRN-05"
  85.2 "FLT-A01"

// Get top 20 most efficient fleets
ZRANGE fleet:leaderboard:ei:all 0 19 WITHSCORES
```

### 3.4 Lists (Queues & Recent Activity)

**Use Cases**: Job queues (with BullMQ), recent bid activity

```typescript
// Recent bids for a shipper (FIFO queue)
LPUSH user:recent_bids:USER-123 "BID-001"
LPUSH user:recent_bids:USER-123 "BID-002"
LTRIM user:recent_bids:USER-123 0 99  // Keep only last 100

// Get 10 most recent bids
LRANGE user:recent_bids:USER-123 0 9
```

### 3.5 Sets (Unique Collections)

**Use Cases**: Active bids, online users, tag filtering

```typescript
// Active bids
SADD bids:active "BID-001" "BID-002" "BID-003"
SISMEMBER bids:active "BID-001"  // → 1 (true)

// Fleets by fuel type (tag filtering)
SADD fleet:tag:fuel:ELECTRIC "FLT-ECO-01" "FLT-ECO-02"
SADD fleet:tag:fuel:DIESEL "FLT-A01" "FLT-B02"

// Intersection: Electric fleets that are also Grade 1
SADD fleet:tag:grade:GRADE_1 "FLT-ECO-01" "FLT-A01"
SINTER fleet:tag:fuel:ELECTRIC fleet:tag:grade:GRADE_1  // → {"FLT-ECO-01"}
```

### 3.6 Streams (Event Log & Real-time Updates)

**Use Cases**: Audit trail, real-time EI updates, event sourcing

```typescript
// EI update event stream
XADD stream:ei:updates *
  fleet_id "FLT-A01"
  old_ei 87.5
  new_ei 85.2
  timestamp "2026-02-04T14:30:00Z"

// Consumer group for processing EI updates
XGROUP CREATE stream:ei:updates ei-processor $ MKSTREAM
XREADGROUP GROUP ei-processor consumer-1 COUNT 10 STREAMS stream:ei:updates >

// Trim old events (retain last 10,000)
XTRIM stream:ei:updates MAXLEN ~ 10000
```

---

## 4. TTL Strategy

### 4.1 TTL Guidelines

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Fleet EI snapshot | 1 hour (3600s) | Daily updates, but needs reasonable freshness for bidding |
| Fleet EI 30d summary | 2 hours (7200s) | Expensive aggregation, slower changing data |
| Bid details (OPEN) | 5 minutes (300s) | Active bidding requires fresh data |
| Bid details (CLOSED) | 1 hour (3600s) | Less critical after closure |
| Proposal details | 10 minutes (600s) | Moderate update frequency |
| Proposal rankings | 5 minutes (300s) | Recalculated on new proposals |
| User session token | 24 hours (86400s) | Standard session duration |
| API rate limit counter | 1 hour (3600s) | Rolling window for rate limiting |
| Search results | 15 minutes (900s) | Balance between freshness and performance |

### 4.2 Adaptive TTL

For high-traffic keys, implement adaptive TTL based on access patterns:

```typescript
async function getWithAdaptiveTTL(key: string, baseTTL: number): Promise<any> {
  const cached = await redis.get(key);

  if (cached) {
    // Track access frequency
    const accessCount = await redis.incr(`${key}:access_count`);
    await redis.expire(`${key}:access_count`, baseTTL);

    // Extend TTL for frequently accessed keys
    if (accessCount > 100) {
      await redis.expire(key, baseTTL * 2); // Double TTL
    } else {
      await redis.expire(key, baseTTL); // Reset to base TTL
    }

    return JSON.parse(cached);
  }

  return null;
}
```

---

## 5. Cache Invalidation Strategies

### 5.1 Time-Based Invalidation (Primary)

All cached data has explicit TTL. Stale data is automatically evicted.

### 5.2 Event-Based Invalidation (Secondary)

When critical data changes, proactively invalidate related caches:

```typescript
async function invalidateRelatedCaches(fleetId: string): Promise<void> {
  const pipeline = redis.pipeline();

  // Invalidate fleet-specific caches
  pipeline.del(`fleet:ei:${fleetId}`);
  pipeline.del(`fleet:details:${fleetId}`);
  pipeline.del(`fleet:performance:30d:${fleetId}`);

  // Remove from leaderboards (will be recalculated on next access)
  pipeline.zrem('fleet:leaderboard:ei:all', fleetId);

  // Invalidate proposals that reference this fleet
  const proposalKeys = await redis.keys(`proposal:*:fleet:${fleetId}`);
  proposalKeys.forEach(key => pipeline.del(key));

  await pipeline.exec();
}
```

### 5.3 Pattern-Based Invalidation

For bulk invalidation (use sparingly due to performance):

```typescript
async function invalidateBidRelatedCaches(bidId: string): Promise<void> {
  // WARNING: KEYS command is O(N) - use only in low-traffic or async jobs
  const keys = await redis.keys(`bid:*:${bidId}*`);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Better approach**: Use Redis Sets to track cache keys:

```typescript
// When creating cache
await redis.set(`bid:details:${bidId}`, data);
await redis.sadd(`bid:cache_keys:${bidId}`, `bid:details:${bidId}`);

// When invalidating
const keysToDelete = await redis.smembers(`bid:cache_keys:${bidId}`);
if (keysToDelete.length > 0) {
  await redis.del(...keysToDelete);
  await redis.del(`bid:cache_keys:${bidId}`);
}
```

---

## 6. Rate Limiting with Redis

### 6.1 Sliding Window Rate Limiter

**Algorithm**: Track request timestamps in a sorted set, count within time window

```typescript
async function checkRateLimit(
  userId: string,
  limitPerMinute: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `ratelimit:user:${userId}`;
  const now = Date.now();
  const windowStart = now - 60000; // 60 seconds ago

  const pipeline = redis.pipeline();

  // Remove old entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count requests in current window
  pipeline.zcard(key);

  // Add current request
  pipeline.zadd(key, now, `${now}-${Math.random()}`);

  // Set expiry
  pipeline.expire(key, 60);

  const results = await pipeline.exec();
  const currentCount = results[1][1] as number;

  const allowed = currentCount < limitPerMinute;
  const remaining = Math.max(0, limitPerMinute - currentCount - 1);
  const resetAt = new Date(now + 60000);

  if (!allowed) {
    // Remove the request we just added
    await redis.zpopmax(key);
  }

  return { allowed, remaining, resetAt };
}
```

### 6.2 Token Bucket Rate Limiter

**Algorithm**: Fixed-rate token generation with burst capacity

```typescript
async function checkTokenBucket(
  userId: string,
  capacity: number = 100,
  refillRate: number = 10  // tokens per second
): Promise<boolean> {
  const key = `ratelimit:bucket:${userId}`;
  const now = Date.now() / 1000; // seconds

  const bucket = await redis.hgetall(key);

  let tokens = parseFloat(bucket.tokens || capacity.toString());
  let lastRefill = parseFloat(bucket.last_refill || now.toString());

  // Refill tokens based on elapsed time
  const elapsed = now - lastRefill;
  tokens = Math.min(capacity, tokens + elapsed * refillRate);

  if (tokens >= 1) {
    // Consume 1 token
    tokens -= 1;

    await redis.hset(key, {
      tokens: tokens.toString(),
      last_refill: now.toString()
    });
    await redis.expire(key, 3600);

    return true; // Allowed
  }

  return false; // Rate limited
}
```

---

## 7. Session Management

### 7.1 JWT Token Storage

```typescript
// Store JWT refresh token with user session data
async function createSession(userId: string, refreshToken: string): Promise<void> {
  const sessionKey = `session:user:${userId}`;

  await redis.hset(sessionKey, {
    refresh_token: refreshToken,
    created_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0...'
  });

  await redis.expire(sessionKey, 86400); // 24 hours
}

// Validate and update session
async function validateSession(userId: string): Promise<boolean> {
  const sessionKey = `session:user:${userId}`;
  const exists = await redis.exists(sessionKey);

  if (exists) {
    // Update last activity
    await redis.hset(sessionKey, 'last_activity', new Date().toISOString());
    await redis.expire(sessionKey, 86400); // Reset TTL
    return true;
  }

  return false;
}

// Logout: delete session
async function deleteSession(userId: string): Promise<void> {
  await redis.del(`session:user:${userId}`);
}
```

---

## 8. Pub/Sub for Real-Time Updates

### 8.1 EI Update Notifications

**Publisher** (when fleet EI is updated):
```typescript
await redis.publish('channel:ei:updates', JSON.stringify({
  fleet_id: 'FLT-A01',
  old_ei: 87.5,
  new_ei: 85.2,
  timestamp: new Date().toISOString()
}));
```

**Subscriber** (WebSocket server):
```typescript
const subscriber = redis.duplicate();

await subscriber.subscribe('channel:ei:updates', (message) => {
  const update = JSON.parse(message);

  // Broadcast to connected WebSocket clients watching this fleet
  websocketServer.to(`fleet:${update.fleet_id}`).emit('ei_updated', update);
});
```

### 8.2 Bid Status Change Notifications

```typescript
// Publisher
await redis.publish('channel:bid:status', JSON.stringify({
  bid_id: 'BID-001',
  old_status: 'OPEN',
  new_status: 'CLOSED',
  timestamp: new Date().toISOString()
}));

// Subscriber
await subscriber.subscribe('channel:bid:status', (message) => {
  const update = JSON.parse(message);

  // Notify all users subscribed to this bid
  websocketServer.to(`bid:${update.bid_id}`).emit('bid_status_changed', update);
});
```

---

## 9. Performance Optimization

### 9.1 Pipeline for Batch Operations

**Bad** (multiple round-trips):
```typescript
await redis.set('key1', 'value1');
await redis.set('key2', 'value2');
await redis.set('key3', 'value3');
```

**Good** (single round-trip):
```typescript
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.set('key3', 'value3');
await pipeline.exec();
```

### 9.2 Connection Pooling

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,

  // Connection pool
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Keep-alive
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Performance
  lazyConnect: false,
  keepAlive: 30000
});
```

### 9.3 Multi-Level Caching

**Layer 1**: In-memory cache (Node.js Map/LRU Cache)
**Layer 2**: Redis cache
**Layer 3**: PostgreSQL database

```typescript
import LRU from 'lru-cache';

const memoryCache = new LRU<string, any>({
  max: 500, // Maximum 500 items
  ttl: 60000, // 1 minute TTL
  updateAgeOnGet: true
});

async function getFleetEIMultiLevel(fleetId: string): Promise<FleetEI> {
  const cacheKey = `fleet:ei:${fleetId}`;

  // Layer 1: Memory cache (sub-millisecond)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // Layer 2: Redis cache (1-2ms)
  const redisData = await redis.get(cacheKey);
  if (redisData) {
    const parsed = JSON.parse(redisData);
    memoryCache.set(cacheKey, parsed);
    return parsed;
  }

  // Layer 3: Database (10-50ms)
  const dbData = await db.query('SELECT * FROM fleets WHERE fleet_id = $1', [fleetId]);

  if (dbData) {
    // Populate both caches
    await redis.setex(cacheKey, 3600, JSON.stringify(dbData));
    memoryCache.set(cacheKey, dbData);
    return dbData;
  }

  throw new Error('Fleet not found');
}
```

---

## 10. Monitoring & Metrics

### 10.1 Key Metrics to Track

```typescript
// Cache hit rate
const cacheHits = await redis.get('metrics:cache:hits') || 0;
const cacheMisses = await redis.get('metrics:cache:misses') || 0;
const hitRate = cacheHits / (cacheHits + cacheMisses);

// Memory usage
const memoryInfo = await redis.info('memory');

// Key count by pattern
const fleetKeyCount = await redis.eval(`
  return #redis.call('keys', 'fleet:*')
`, 0);

// Slow log analysis
const slowLog = await redis.slowlog('get', 10);
```

### 10.2 Health Checks

```typescript
async function redisHealthCheck(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    const latency = await redis.ping();

    return pong === 'PONG' && latency < 100; // <100ms latency is healthy
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
```

---

## 11. Failure Handling

### 11.1 Graceful Degradation

```typescript
async function getFleetEIWithFallback(fleetId: string): Promise<FleetEI> {
  try {
    // Try Redis first
    return await getFleetEI(fleetId);
  } catch (redisError) {
    console.error('Redis error, falling back to database:', redisError);

    // Fallback to database directly
    return await db.query('SELECT * FROM fleets WHERE fleet_id = $1', [fleetId]);
  }
}
```

### 11.2 Circuit Breaker Pattern

```typescript
import CircuitBreaker from 'opossum';

const redisCircuitBreaker = new CircuitBreaker(redis.get.bind(redis), {
  timeout: 3000,        // 3s timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000   // Try again after 30s
});

redisCircuitBreaker.fallback(() => {
  console.log('Circuit breaker open, skipping Redis');
  return null; // Skip cache, go directly to database
});

async function getCachedData(key: string): Promise<any> {
  try {
    return await redisCircuitBreaker.fire(key);
  } catch {
    return null; // Fallback to database
  }
}
```

---

## 12. Security Best Practices

### 12.1 Redis ACL (Access Control Lists)

```bash
# Create read-only user for monitoring
ACL SETUSER monitor_user on >password123 ~* +@read +@dangerous

# Create write user for application
ACL SETUSER app_user on >appPassword456 ~* +@all -@dangerous

# Disable default user
ACL SETUSER default off
```

### 12.2 Encryption

```typescript
// Use TLS for Redis connections in production
const redis = new Redis({
  host: 'redis.example.com',
  port: 6380,
  tls: {
    ca: fs.readFileSync('/path/to/ca-cert.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem')
  }
});
```

---

## Summary

This Redis caching strategy provides:

1. **High Performance**: Sub-millisecond response times for cached queries
2. **Scalability**: Redis Cluster for horizontal scaling
3. **Reliability**: Multiple caching layers with fallback mechanisms
4. **Real-Time**: Pub/Sub for instant notifications
5. **Security**: ACL, TLS encryption, rate limiting
6. **Observability**: Comprehensive monitoring and health checks

**Key Takeaways**:
- Use **Cache-Aside** for most read-heavy operations
- Implement **adaptive TTL** for frequently accessed data
- Use **Sorted Sets** for rankings (bid proposals, fleet leaderboards)
- Use **Streams** for event logs and audit trails
- Always implement **graceful degradation** with database fallback
- Monitor **cache hit rates** and adjust TTL/invalidation strategies accordingly

**Next Steps**: Integrate this strategy with NestJS Cache Manager and BullMQ job queue for complete backend infrastructure.
