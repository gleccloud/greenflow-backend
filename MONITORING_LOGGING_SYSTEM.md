# 모니터링 및 로깅 시스템 (Monitoring & Logging System)

## Executive Summary

GLEC API 백엔드를 위한 완전한 관찰 가능성(Observability) 시스템:

### 세 가지 기둥 (Three Pillars of Observability)
1. **Logging**: 구조화된 로그 (Pino JSON)
2. **Metrics**: 성능 메트릭 (Prometheus)
3. **Tracing**: 분산 추적 (OpenTelemetry)

### 목표
- **가용성**: 시스템 가동 시간 99.9% 이상
- **응답성**: P95 <500ms, P99 <1000ms
- **신뢰성**: 에러율 <0.1%
- **추적성**: 모든 요청 추적 가능 (Request ID)

---

## 1. 로깅 시스템 (Logging)

### 1.1 Pino 설정

**선택 이유**: Winston 대비 5배 빠른 성능, 최소 오버헤드

```typescript
// src/common/logger/logger.config.ts
import pino from 'pino';
import pinoHttp from 'pino-http';

/**
 * Pino logger configuration
 */
const pinoConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        // Console transport (development)
        target: 'pino-pretty',
        level: 'debug',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{levelLabel} - {msg}',
        },
      },
      {
        // File transport (production)
        target: 'pino/file',
        level: 'info',
        options: {
          destination: './logs/application.log',
          mkdir: true,
        },
      },
      {
        // ELK transport (production)
        target: 'pino-elasticsearch',
        level: 'warn', // Only send warnings and errors
        options: {
          node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
          index: `glec-logs-${new Date().toISOString().split('T')[0]}`,
          auth: {
            username: process.env.ELASTICSEARCH_USER,
            password: process.env.ELASTICSEARCH_PASSWORD,
          },
          flushInterval: 5000, // Batch every 5 seconds
          flushBytes: 1000, // Or every 1000 bytes
        },
      },
    ],
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => ({
      id: req.id || req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        user_agent: req.headers['user-agent'],
        api_key: req.headers['x-api-key']
          ? `***${req.headers['x-api-key'].slice(-8)}`
          : undefined,
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders?.(),
    }),
  },
};

/**
 * Create logger instance
 */
export const logger = pino(pinoConfig);

/**
 * Pino HTTP middleware for NestJS
 */
export const pinoHttpMiddleware = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || uuid.v4(),
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${req.url} completed in ${responseTime}ms`,
  customErrorMessage: (req, res, error) =>
    `${req.method} ${req.url} failed with status ${res.statusCode}`,
});
```

### 1.2 구조화된 로깅

```typescript
// src/common/logger/logger.service.ts
import { Injectable } from '@nestjs/common';
import { logger } from './logger.config';

@Injectable()
export class LoggerService {
  /**
   * Log API request
   */
  logRequest(
    requestId: string,
    method: string,
    endpoint: string,
    userId?: string,
    metadata?: any,
  ): void {
    logger.info(
      {
        request_id: requestId,
        method,
        endpoint,
        user_id: userId,
        metadata,
        timestamp: new Date().toISOString(),
      },
      'API Request',
    );
  }

  /**
   * Log API response
   */
  logResponse(
    requestId: string,
    statusCode: number,
    duration: number,
    userId?: string,
    metadata?: any,
  ): void {
    logger.info(
      {
        request_id: requestId,
        status_code: statusCode,
        duration_ms: duration,
        user_id: userId,
        metadata,
        timestamp: new Date().toISOString(),
      },
      'API Response',
    );
  }

  /**
   * Log API error
   */
  logError(
    requestId: string,
    error: Error,
    context: string,
    userId?: string,
    metadata?: any,
  ): void {
    logger.error(
      {
        request_id: requestId,
        error_message: error.message,
        error_stack: error.stack,
        context,
        user_id: userId,
        metadata,
        timestamp: new Date().toISOString(),
      },
      'API Error',
    );
  }

  /**
   * Log business event
   */
  logEvent(
    eventType: string,
    eventData: any,
    requestId?: string,
    userId?: string,
  ): void {
    logger.info(
      {
        request_id: requestId,
        event_type: eventType,
        event_data: eventData,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
      `Event: ${eventType}`,
    );
  }

  /**
   * Log database query
   */
  logQuery(
    query: string,
    params: any[],
    duration: number,
    rowsAffected?: number,
  ): void {
    if (duration > 1000) {
      // Slow query warning
      logger.warn(
        {
          query,
          params,
          duration_ms: duration,
          rows_affected: rowsAffected,
          timestamp: new Date().toISOString(),
        },
        'Slow Query Detected',
      );
    }
  }

  /**
   * Log Redis operation
   */
  logRedisOperation(
    operation: string,
    key: string,
    duration: number,
    status: 'success' | 'error',
  ): void {
    logger.debug(
      {
        operation,
        key,
        duration_ms: duration,
        status,
        timestamp: new Date().toISOString(),
      },
      'Redis Operation',
    );
  }

  /**
   * Log background job
   */
  logBackgroundJob(
    jobName: string,
    jobId: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
    error?: any,
  ): void {
    const level = status === 'failed' ? 'error' : 'info';
    logger[level](
      {
        job_name: jobName,
        job_id: jobId,
        status,
        duration_ms: duration,
        error: error?.message,
        error_stack: error?.stack,
        timestamp: new Date().toISOString(),
      },
      `Background Job: ${jobName}`,
    );
  }

  /**
   * Log external API call
   */
  logExternalAPICall(
    apiName: string,
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
  ): void {
    if (statusCode >= 400) {
      logger.warn(
        {
          api_name: apiName,
          method,
          endpoint,
          status_code: statusCode,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
        `External API Error: ${apiName}`,
      );
    } else {
      logger.debug(
        {
          api_name: apiName,
          method,
          endpoint,
          status_code: statusCode,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
        `External API Call: ${apiName}`,
      );
    }
  }
}
```

### 1.3 HTTP Request Logging Middleware

```typescript
// src/common/middleware/request-logging.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Generate request ID if not present
    const requestId = req.headers['x-request-id'] || uuid();
    req.id = requestId;

    // 2. Record start time
    const startTime = Date.now();

    // 3. Intercept response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;

      // 4. Log response
      this.loggerService.logResponse(
        requestId,
        res.statusCode,
        duration,
        req.user?.sub, // JWT subject (user ID)
        {
          method: req.method,
          endpoint: req.originalUrl,
          query: req.query,
        },
      );

      // 5. Attach request ID to response headers
      res.setHeader('X-Request-ID', requestId);

      // Call original send
      return originalSend.call(this, data);
    };

    // 6. Log request
    this.loggerService.logRequest(
      requestId,
      req.method,
      req.originalUrl,
      req.user?.sub,
      {
        query: req.query,
        api_key: req.headers['x-api-key']
          ? `***${req.headers['x-api-key'].slice(-8)}`
          : undefined,
      },
    );

    next();
  }
}
```

---

## 2. 메트릭 시스템 (Metrics - Prometheus)

### 2.1 Prometheus 설정

```typescript
// src/common/metrics/prometheus.config.ts
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';

/**
 * Clear default metrics to avoid duplicates
 */
register.clear();

// ========================================
// HTTP Metrics
// ========================================

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['method', 'route', 'error_code'],
});

// ========================================
// Database Metrics
// ========================================

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total database queries',
  labelNames: ['query_type', 'table', 'status'],
});

export const dbConnections = new Gauge({
  name: 'db_connections_active',
  help: 'Active database connections',
  labelNames: ['pool'],
});

export const dbSlowQueries = new Counter({
  name: 'db_slow_queries_total',
  help: 'Total slow queries (>1 second)',
  labelNames: ['query_type', 'table'],
});

// ========================================
// Redis Metrics
// ========================================

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Redis operation duration in seconds',
  labelNames: ['operation', 'key_pattern'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
});

export const redisOperationTotal = new Counter({
  name: 'redis_operations_total',
  help: 'Total Redis operations',
  labelNames: ['operation', 'key_pattern', 'status'],
});

export const redisCacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total Redis cache hits',
  labelNames: ['cache_type'],
});

export const redisCacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total Redis cache misses',
  labelNames: ['cache_type'],
});

export const redisMemoryBytes = new Gauge({
  name: 'redis_memory_bytes',
  help: 'Redis memory usage in bytes',
});

// ========================================
// Job Queue Metrics
// ========================================

export const jobQueueSize = new Gauge({
  name: 'job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name', 'status'],
});

export const jobDuration = new Histogram({
  name: 'job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue_name', 'job_name'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

export const jobTotal = new Counter({
  name: 'jobs_total',
  help: 'Total jobs processed',
  labelNames: ['queue_name', 'job_name', 'status'],
});

export const jobRetries = new Counter({
  name: 'job_retries_total',
  help: 'Total job retries',
  labelNames: ['queue_name', 'job_name'],
});

// ========================================
// Business Metrics
// ========================================

export const bidEvaluationDuration = new Histogram({
  name: 'bid_evaluation_duration_seconds',
  help: 'Bid evaluation duration in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

export const bidEvaluationTotal = new Counter({
  name: 'bid_evaluations_total',
  help: 'Total bid evaluations',
  labelNames: ['shipper_id'],
});

export const proposalsSubmitted = new Counter({
  name: 'proposals_submitted_total',
  help: 'Total proposals submitted',
  labelNames: ['carrier_id'],
});

export const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['shipper_id', 'carrier_id'],
});

export const fleetEIUpdates = new Counter({
  name: 'fleet_ei_updates_total',
  help: 'Total fleet EI updates',
  labelNames: ['fleet_id'],
});

// ========================================
// Real-time Metrics
// ========================================

export const activeConnections = new Gauge({
  name: 'realtime_active_connections',
  help: 'Number of active realtime connections',
  labelNames: ['connection_type'], // 'sse', 'websocket'
});

export const messagesPublished = new Counter({
  name: 'realtime_messages_published_total',
  help: 'Total messages published',
  labelNames: ['channel'],
});

export const messageLatency = new Histogram({
  name: 'realtime_message_latency_seconds',
  help: 'Message latency from publish to receive',
  labelNames: ['channel'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
});

// ========================================
// System Metrics
// ========================================

export const eventLoopLag = new Histogram({
  name: 'nodejs_eventloop_lag_seconds',
  help: 'Node.js event loop lag in seconds',
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
});

export const memoryUsageBytes = new Gauge({
  name: 'nodejs_memory_usage_bytes',
  help: 'Node.js memory usage in bytes',
  labelNames: ['type'], // 'rss', 'heapUsed', 'heapTotal', 'external'
});

export const gcDuration = new Histogram({
  name: 'nodejs_gc_duration_seconds',
  help: 'Garbage collection duration in seconds',
  labelNames: ['gc_type'],
});
```

### 2.2 메트릭 수집 (Middleware & Service)

```typescript
// src/common/metrics/metrics.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpErrorsTotal,
} from './prometheus.config';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Intercept response
    const originalSend = res.send;
    res.send = function (data: any): Response {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds

      // Record metrics
      const route = req.route?.path || req.path || 'unknown';

      // Histogram
      httpRequestDuration
        .labels(req.method, route, res.statusCode.toString())
        .observe(duration);

      // Counter
      httpRequestTotal
        .labels(req.method, route, res.statusCode.toString())
        .inc();

      if (res.statusCode >= 400) {
        httpErrorsTotal
          .labels(req.method, route, res.statusCode.toString())
          .inc();
      }

      return originalSend.call(this, data);
    };

    next();
  }
}

// src/common/metrics/database.metrics.ts
import {
  dbQueryDuration,
  dbQueryTotal,
  dbSlowQueries,
} from './prometheus.config';

export function recordDatabaseQuery(
  queryType: string,
  tableName: string,
  duration: number,
  success: boolean,
): void {
  const durationSeconds = duration / 1000;

  // Record histogram
  dbQueryDuration
    .labels(queryType, tableName)
    .observe(durationSeconds);

  // Record counter
  dbQueryTotal
    .labels(queryType, tableName, success ? 'success' : 'error')
    .inc();

  // Record slow queries
  if (durationSeconds > 1) {
    dbSlowQueries.labels(queryType, tableName).inc();
  }
}

// src/common/metrics/redis.metrics.ts
import {
  redisOperationDuration,
  redisOperationTotal,
  redisCacheHits,
  redisCacheMisses,
} from './prometheus.config';

export function recordRedisOperation(
  operation: string,
  keyPattern: string,
  duration: number,
  success: boolean,
): void {
  const durationSeconds = duration / 1000;

  redisOperationDuration
    .labels(operation, keyPattern)
    .observe(durationSeconds);

  redisOperationTotal
    .labels(operation, keyPattern, success ? 'success' : 'error')
    .inc();
}

export function recordCacheHit(cacheType: string): void {
  redisCacheHits.labels(cacheType).inc();
}

export function recordCacheMiss(cacheType: string): void {
  redisCacheMisses.labels(cacheType).inc();
}
```

### 2.3 Prometheus 엔드포인트

```typescript
// src/common/metrics/metrics.controller.ts
import { Controller, Get } from '@nestjs/common';
import { register } from 'prom-client';

@Controller('metrics')
export class MetricsController {
  @Get()
  metrics(): string {
    return register.metrics();
  }
}
```

---

## 3. 헬스 체크 (Health Checks)

### 3.1 헬스 체크 엔드포인트

```typescript
// src/common/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async health(): Promise<any> {
    return await this.healthService.getHealthStatus();
  }

  @Get('/deep')
  async deepHealth(): Promise<any> {
    return await this.healthService.getDeepHealthStatus();
  }
}

// src/common/health/health.service.ts
@Injectable()
export class HealthService {
  constructor(
    private db: DatabaseService,
    private redis: RedisService,
    private loggerService: LoggerService,
  ) {}

  async getHealthStatus(): Promise<any> {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {} as any,
    };

    // 1. Database check
    try {
      await this.db.query('SELECT 1');
      status.checks.database = { status: 'up' };
    } catch (error) {
      status.checks.database = { status: 'down', error: error.message };
      status.status = 'degraded';
    }

    // 2. Redis check
    try {
      await this.redis.ping();
      status.checks.redis = { status: 'up' };
    } catch (error) {
      status.checks.redis = { status: 'down', error: error.message };
      status.status = 'degraded';
    }

    // 3. Memory check
    const memUsage = process.memoryUsage();
    const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    status.checks.memory = {
      status: heapPercentage > 90 ? 'warning' : 'ok',
      heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: heapPercentage.toFixed(2),
    };

    if (heapPercentage > 95) {
      status.status = 'degraded';
    }

    return status;
  }

  async getDeepHealthStatus(): Promise<any> {
    const deepStatus = await this.getHealthStatus();

    // 4. Queue check
    try {
      const queueStats = await this.getQueueHealth();
      deepStatus.checks.queues = queueStats;
    } catch (error) {
      deepStatus.checks.queues = { status: 'error', error: error.message };
    }

    // 5. API latency check
    try {
      const startTime = Date.now();
      await this.db.query('SELECT 1');
      const dbLatency = Date.now() - startTime;

      deepStatus.checks.latency = {
        database_ms: dbLatency,
        status: dbLatency > 100 ? 'slow' : 'ok',
      };

      if (dbLatency > 500) {
        deepStatus.status = 'degraded';
      }
    } catch (error) {
      deepStatus.checks.latency = { status: 'error', error: error.message };
    }

    return deepStatus;
  }

  private async getQueueHealth(): Promise<any> {
    // Check job queue status
    const queueStats = await this.queueService.getAllQueuesStats();

    const failing = queueStats.filter((q) => q.jobCounts.failed > 0);

    return {
      status: failing.length === 0 ? 'ok' : 'warning',
      total_queues: queueStats.length,
      failing_queues: failing,
    };
  }
}
```

---

## 4. 분산 추적 (Distributed Tracing - OpenTelemetry)

### 4.1 OpenTelemetry 설정

```typescript
// src/common/tracing/tracing.config.ts
import { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export function initializeTracing(): void {
  const tracerProvider = new BasicTracerProvider();

  // Export to Jaeger (distributed tracing backend)
  const jaegerExporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14250',
    serviceName: 'glec-api',
  });

  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(jaegerExporter));

  // Console exporter for development
  if (process.env.NODE_ENV === 'development') {
    tracerProvider.addSpanProcessor(
      new SimpleSpanProcessor(new ConsoleSpanExporter()),
    );
  }

  // Register automatic instrumentations
  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      // Express
      // HTTP client
      // Database (PostgreSQL)
      // Redis
      // gRPC
    ],
  });
}
```

### 4.2 수동 Span 생성

```typescript
// src/common/tracing/tracing.decorator.ts
import { createContextKey } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('glec-api');

export function Trace(spanName: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<any> {
      const span = tracer.startSpan(spanName);

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: 0 }); // OK
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: 2 }); // ERROR
        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

// Usage:
export class BidEvaluationService {
  @Trace('evaluate-bids')
  async evaluateBids(request: any): Promise<any> {
    // Implementation
  }
}
```

---

## 5. 알림 및 대시보드

### 5.1 Grafana 대시보드

**주요 메트릭**:
1. **Request Rate**: Requests per second
2. **Response Time**: P50, P95, P99 latency
3. **Error Rate**: % of failing requests
4. **Database Performance**: Query latency, slow queries
5. **Cache Hit Rate**: Redis cache effectiveness
6. **Job Queue**: Queue depth, processing rate
7. **System Resources**: CPU, Memory, Event loop lag

### 5.2 알림 규칙 (Alert Rules)

```yaml
# prometheus-rules.yaml
groups:
  - name: glec_api_alerts
    rules:
      # HTTP Error Rate
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_errors_total[5m])) /
           sum(rate(http_requests_total[5m]))) > 0.01
        for: 5m
        annotations:
          summary: 'Error rate is above 1%'
          severity: 'warning'

      # Slow Requests
      - alert: SlowResponses
        expr: |
          histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        annotations:
          summary: 'P95 response time > 500ms'
          severity: 'warning'

      # Database Connection Pool Exhaustion
      - alert: DBConnectionPoolNearCapacity
        expr: |
          db_connections_active / 20 > 0.8
        for: 5m
        annotations:
          summary: 'Database connections > 80% capacity'
          severity: 'warning'

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          nodejs_memory_usage_bytes{type="heapUsed"} /
          nodejs_memory_usage_bytes{type="heapTotal"} > 0.9
        for: 5m
        annotations:
          summary: 'Heap memory usage > 90%'
          severity: 'critical'

      # Queue Backlog
      - alert: LargeJobQueueBacklog
        expr: |
          job_queue_size{status="waiting"} > 10000
        for: 10m
        annotations:
          summary: 'Job queue has > 10K pending jobs'
          severity: 'warning'

      # Slow Database Queries
      - alert: SlowDatabaseQueries
        expr: |
          rate(db_slow_queries_total[5m]) > 10
        for: 5m
        annotations:
          summary: '> 10 slow queries per second'
          severity: 'warning'
```

---

## 6. 로그 수집 및 분석 (ELK Stack)

### 6.1 ELK 설정

```yaml
# docker-compose.yml (development)
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - '5601:5601'
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

### 6.2 Kibana 쿼리 예제

```
# Find all errors in last hour
level:"error" AND timestamp:[now-1h TO now]

# Find slow API requests
http_request_duration_seconds > 1000 AND timestamp:[now-1h TO now]

# Find failed job retries
job_status:"failed" AND event_type:"job:retry"

# Find specific user's requests
user_id:"USR-12345"

# Find all EI update events
event_type:"ei:update" AND timestamp:[now-24h TO now]
```

---

## 7. 로그 보존 정책

| 로그 타입 | 보존 기간 | 저장소 |
|----------|---------|--------|
| API 로그 (INFO) | 30일 | ELK + S3 |
| API 로그 (ERROR) | 90일 | ELK + S3 |
| 감사 로그 | 1년 | PostgreSQL + S3 |
| 메트릭 데이터 | 1년 | Prometheus (자동 롤아웃) |
| 추적 데이터 | 7일 | Jaeger |

---

## Summary

**모니터링 및 로깅 스택**:

```
Application Logs
  ↓
Pino (structured JSON logging)
  ↓
├─ Console (development)
├─ File (production)
└─ Elasticsearch (centralized logging)
    ↓
    Kibana (visualization & analysis)

Metrics
  ↓
Prometheus (time-series database)
  ↓
Grafana (dashboards & alerts)

Distributed Traces
  ↓
OpenTelemetry
  ↓
Jaeger (trace analysis)
```

**주요 모니터링 메트릭**:
- HTTP: Request count, latency (P50/P95/P99), error rate
- Database: Query duration, slow queries, connection pool
- Redis: Operation duration, cache hit rate, memory
- Jobs: Queue size, processing rate, retry count
- Business: Bid evaluations, proposals, orders, EI updates
- System: Memory, CPU, event loop lag

**온콜 기준**:
- 에러율 > 1% for 5분 → Warning
- P95 응답시간 > 500ms → Warning
- P99 응답시간 > 1초 → Critical
- 힙 메모리 > 90% → Critical
- DB 연결 > 80% → Warning
