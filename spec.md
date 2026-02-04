# GLEC 녹색물류 입찰·오더 API v2 - 상세 개발 스펙 (Development Specification)

**문서 버전**: 2.0.0
**작성일**: 2026-02-04
**상태**: Production Ready
**대상 개발 기간**: Phase 1 (8주), Phase 2 (12주)

---

## 📋 Executive Summary

GLEC의 핵심 기술인 **탄소배출집약도(EI) 평가 엔진**을 중심으로 한 상용화급 REST API 시스템.

### 핵심 기능 (Core Capabilities)
1. **Fleet EI 조회 API**: 실시간 운송사 탄소배출집약도 데이터
2. **입찰 평가 엔진**: 가격 + 리드타임 + EI 종합 평가
3. **배차 최적화 AI**: 다수 주문 동시 최적화
4. **실시간 업데이트**: WebSocket/SSE 기반 실시간 알림
5. **Developer Portal**: API 콘솔, 사용량 통계, SDK 제공

### 기술 스택
- **API Framework**: NestJS 10.x + Fastify (45-50K RPS)
- **Database**: PostgreSQL 17 + Redis 7.x
- **Async Queue**: BullMQ (100K+ jobs/sec)
- **Real-time**: SSE (Server-Sent Events) + Redis Pub/Sub
- **Monitoring**: Pino (logging) + Prometheus (metrics) + ELK (analysis)
- **Deployment**: Docker + Kubernetes

### 개발 및 배포 단계 (Phases)

| Phase | 기간 | 목표 |
|-------|------|------|
| Phase 0 | 2주 | 프로젝트 초기화, CI/CD 파이프라인 |
| Phase 1 | 8주 | API v2 Core 개발 (EI, 입찰평가, 기본 실시간) |
| Phase 2 | 12주 | 배차 최적화, 개발자 포털, 상용화 준비 |
| Phase 3 | 진행중 | 운영, 모니터링, 최적화 |

---

## 🏗️ Phase 0: 프로젝트 초기화 (2 weeks)

### 0.1 개발 환경 설정 (Day 1-2)

**Task 0.1.1**: Git 저장소 구성
```bash
glec-api-backend/
├── src/
│   ├── modules/          # Feature modules
│   │   ├── auth/         # 인증 & API 키
│   │   ├── fleet/        # 운송사 & EI 관리
│   │   ├── bid/          # 입찰 & 평가
│   │   ├── order/        # 주문 관리
│   │   ├── dispatch/     # 배차 최적화
│   │   ├── realtime/     # 실시간 처리
│   │   ├── jobs/         # 비동기 작업 큐
│   │   ├── notifications/# 알림 시스템
│   │   └── admin/        # 관리자 기능
│   ├── common/
│   │   ├── middleware/   # HTTP 미들웨어
│   │   ├── guards/       # 인증/권한
│   │   ├── filters/      # 예외 처리
│   │   ├── logger/       # Pino 로거
│   │   ├── metrics/      # Prometheus
│   │   ├── health/       # 헬스 체크
│   │   └── tracing/      # OpenTelemetry
│   ├── database/
│   │   ├── migrations/   # DB 마이그레이션
│   │   └── schema.sql    # 스키마 정의
│   └── main.ts           # 진입점
├── test/
│   ├── unit/             # 단위 테스트
│   ├── integration/      # 통합 테스트
│   └── e2e/              # E2E 테스트
├── scripts/
│   ├── db-init.sh        # DB 초기화
│   └── seed-data.ts      # 테스트 데이터
├── docker/
│   ├── Dockerfile        # 운영용
│   └── Dockerfile.dev    # 개발용
├── k8s/                  # Kubernetes 설정
├── docs/                 # 문서
└── .env.example          # 환경 변수 템플릿
```

**Task 0.1.2**: NestJS 프로젝트 초기화
```bash
# Create NestJS project
npm i -g @nestjs/cli
nest new glec-api-backend
cd glec-api-backend

# Add Fastify adapter (higher performance than Express)
npm install @nestjs/platform-fastify fastify

# Add core dependencies
npm install ioredis pg bullmq pino pino-http prom-client

# Add dev dependencies
npm install --save-dev @types/node jest @nestjs/testing
npm install --save-dev prettier eslint @typescript-eslint/eslint-plugin

# Setup environment
cp .env.example .env.local
```

**Task 0.1.3**: TypeScript 설정 최적화
```json
{
  "tsconfig.json": {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true,
      "noImplicitThis": true
    }
  }
}
```

### 0.2 CI/CD 파이프라인 (Day 3-5)

**Task 0.2.1**: GitHub Actions 워크플로우
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # 1. Lint & Format Check
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  # 2. Unit & Integration Tests
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: test
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration

  # 3. Build & Security Scan
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run security:audit

  # 4. Docker Build
  docker:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: gcr.io
          username: _json_key
          password: ${{ secrets.GCP_SA_KEY }}
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            gcr.io/glec-prod/api:latest
            gcr.io/glec-prod/api:${{ github.sha }}
          cache-from: type=registry,ref=gcr.io/glec-prod/api:buildcache
          cache-to: type=registry,ref=gcr.io/glec-prod/api:buildcache,mode=max
```

**Task 0.2.2**: 로컬 개발 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: glec
      POSTGRES_PASSWORD: glec_dev_pass
      POSTGRES_DB: glec_api
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/init.sql:/docker-entrypoint-initdb.d/init.sql

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  # Elasticsearch (for logs)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  # Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - '5601:5601'
    depends_on:
      - elasticsearch

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
```

### 0.3 Database 초기 설정 (Day 6-7)

**Task 0.3.1**: PostgreSQL 초기화
```bash
# Initialize PostgreSQL with schema
psql -U glec -d glec_api -f src/database/DATABASE_SCHEMA.sql

# Create indexes
psql -U glec -d glec_api -f src/database/indexes.sql

# Load test data
psql -U glec -d glec_api -f src/database/seed-data.sql
```

**Task 0.3.2**: TypeORM 마이그레이션 설정
```typescript
// src/database/data-source.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'glec',
  password: process.env.DB_PASSWORD || 'glec_dev_pass',
  database: process.env.DB_NAME || 'glec_api',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

// Generate migration
// npx typeorm migration:generate src/database/migrations/InitialSchema
// npx typeorm migration:run
```

### 0.4 프로젝트 구조 및 패턴 설정 (Day 8-10)

**Task 0.4.1**: 모듈 및 서비스 기본 구조
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { BidModule } from './modules/bid/bid.module';
import { OrderModule } from './modules/order/order.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HealthModule } from './common/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    FleetModule,
    BidModule,
    OrderModule,
    RealtimeModule,
    JobsModule,
    HealthModule,
  ],
  providers: [],
})
export class AppModule {}
```

**Task 0.4.2**: Global Middleware 및 Guards 설정
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { LoggerService } from './common/logger/logger.service';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { MetricsMiddleware } from './common/metrics/metrics.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 10485760, // 10 MB
    }),
  );

  // 1. Global middleware
  app.use(new RequestLoggingMiddleware(app.get(LoggerService)));
  app.use(new MetricsMiddleware());

  // 2. Global exception filter
  app.useGlobalFilters(new ExceptionFilter(app.get(LoggerService)));

  // 3. CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(','),
    credentials: true,
  });

  // 4. API versioning
  app.setGlobalPrefix('v2');

  // 5. Start
  await app.listen(
    parseInt(process.env.PORT || '3000'),
    process.env.HOST || '0.0.0.0',
  );

  console.log(`✓ API Server running on ${process.env.HOST || 'localhost'}:${process.env.PORT || 3000}`);
}

bootstrap();
```

**Task 0.4.3**: 에러 처리 및 응답 포맷 표준화
```typescript
// src/common/filters/exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class ExceptionFilter implements ExceptionFilter {
  constructor(private loggerService: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    let status = 500;
    let message = 'Internal Server Error';
    let error_code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || message;
      error_code = (exceptionResponse as any).error_code || 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error
    this.loggerService.logError(
      request.id || 'unknown',
      exception instanceof Error ? exception : new Error(String(exception)),
      'ExceptionFilter',
      request.user?.sub,
      { url: request.url, method: request.method },
    );

    // Send response
    reply.status(status).send({
      error: {
        code: error_code,
        message,
        timestamp: new Date().toISOString(),
        request_id: request.id,
      },
    });
  }
}

// src/common/interceptors/response.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## ⚙️ Phase 1: API v2 Core 개발 (8 weeks)

### Phase 1.0: 인증 & API 키 관리 (Week 1-2)

**Task 1.0.1**: API 키 테이블 및 엔티티 생성
```typescript
// src/modules/auth/entities/api-key.entity.ts
import { Entity, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryColumn('uuid')
  api_key_id: string;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  key_name: string;

  @Column()
  key_hash: string; // Hashed API key

  @Column()
  key_prefix: string; // First 8 chars for identification

  @Column('text', { array: true })
  scopes: string[]; // ['read:fleet', 'read:ei', 'write:bid-evaluation']

  @Column()
  rate_limit_per_minute: number;

  @Column()
  rate_limit_per_day: number;

  @Column()
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

  @Column({ nullable: true })
  last_used_at: Date;

  @Column({ nullable: true })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'inet', array: true, nullable: true })
  ip_whitelist: string[];

  @Column('jsonb', { default: '{}' })
  metadata: Record<string, any>;
}
```

**Task 1.0.2**: API 키 검증 Guard
```typescript
// src/common/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '../../modules/auth/api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const user = await this.apiKeyService.validateApiKey(apiKey);

    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach user to request
    request.user = user;
    request.apiKey = apiKey;

    return true;
  }
}
```

**Task 1.0.3**: API 키 서비스 구현
```typescript
// src/modules/auth/api-key.service.ts
@Injectable()
export class ApiKeyService {
  constructor(
    private repository: ApiKeyRepository,
    private redis: RedisService,
  ) {}

  /**
   * Create new API key
   */
  async createApiKey(
    userId: string,
    keyName: string,
    scopes: string[],
  ): Promise<{ api_key: string; api_key_id: string }> {
    // 1. Generate random key (32 bytes = 256 bits)
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 8);

    // 2. Store in database
    const apiKey = this.repository.create({
      api_key_id: uuid(),
      user_id: userId,
      key_name: keyName,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      status: 'ACTIVE',
    });

    await this.repository.save(apiKey);

    // 3. Cache for fast lookup
    await this.redis.setex(
      `api-key:${rawKey}`,
      86400 * 30, // 30 days
      JSON.stringify({ user_id: userId, scopes }),
    );

    return {
      api_key: `glec_live_${rawKey}`, // User-facing key with prefix
      api_key_id: apiKey.api_key_id,
    };
  }

  /**
   * Validate API key and return user
   */
  async validateApiKey(apiKey: string): Promise<any> {
    // Remove prefix if present
    const rawKey = apiKey.startsWith('glec_live_')
      ? apiKey.slice(10)
      : apiKey;

    // 1. Try cache first
    const cached = await this.redis.get(`api-key:${rawKey}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Query database
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKeyRecord = await this.repository.findOne({
      where: { key_hash: keyHash, status: 'ACTIVE' },
      relations: ['user'],
    });

    if (!apiKeyRecord) {
      return null;
    }

    // 3. Check expiration
    if (apiKeyRecord.expires_at && new Date() > apiKeyRecord.expires_at) {
      return null;
    }

    // 4. Check IP whitelist if configured
    if (apiKeyRecord.ip_whitelist && apiKeyRecord.ip_whitelist.length > 0) {
      // Check request IP against whitelist
      // ... implement IP validation
    }

    // 5. Cache result
    await this.redis.setex(
      `api-key:${rawKey}`,
      3600, // 1 hour cache
      JSON.stringify({
        user_id: apiKeyRecord.user_id,
        scopes: apiKeyRecord.scopes,
      }),
    );

    // 6. Update last_used_at
    await this.repository.update(apiKeyRecord.api_key_id, {
      last_used_at: new Date(),
    });

    return {
      user_id: apiKeyRecord.user_id,
      scopes: apiKeyRecord.scopes,
    };
  }
}
```

### Phase 1.1: Fleet 및 EI 데이터 관리 (Week 1-3)

**Task 1.1.1**: Fleet 엔티티 및 리포지토리
```typescript
// src/modules/fleet/entities/fleet.entity.ts
@Entity('fleets')
export class Fleet {
  @PrimaryColumn('uuid')
  fleet_id: string;

  @ManyToOne(() => User)
  owner: User;

  @Column()
  fleet_name: string;

  @Column({ unique: true })
  fleet_code: string; // e.g., FLT-A01

  @Column({ nullable: true })
  description: string;

  @Column()
  vehicle_count: number;

  @Column()
  vehicle_size: 'LIGHT_TRUCK' | 'MEDIUM_TRUCK' | 'HEAVY_TRUCK' | 'SEMI_TRAILER';

  @Column()
  fuel_type: 'DIESEL' | 'GASOLINE' | 'LPG' | 'CNG' | 'ELECTRIC' | 'HYBRID';

  // EI Core Metrics
  @Column('numeric', { precision: 10, scale: 2 })
  carbon_intensity: number; // gCO₂e/t·km

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  carbon_intensity_wtt: number; // Well-to-Tank

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  carbon_intensity_ttw: number; // Tank-to-Wheel

  @Column()
  ei_grade: 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'NOT_VERIFIED';

  @Column('numeric', { precision: 5, scale: 4, nullable: true })
  ei_confidence: number; // 0.0000 ~ 1.0000

  @Column({ default: false })
  iso_14083_certified: boolean;

  @Column({ nullable: true })
  certification_date: Date;

  @Column({ nullable: true })
  certification_expiry: Date;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: true })
  is_public: boolean; // Public visibility in bidding

  @UpdateDateColumn()
  ei_last_updated_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('jsonb', { default: '{}' })
  metadata: Record<string, any>;
}
```

**Task 1.1.2**: EI 히스토리 엔티티 (시계열)
```typescript
// src/modules/fleet/entities/ei-history.entity.ts
@Entity('ei_history')
@Index(['fleet_id', 'measured_at'])
@Index(['measured_at', 'fleet_id'])
export class EIHistory {
  @PrimaryColumn('uuid')
  ei_history_id: string;

  @Column()
  fleet_id: string;

  @Column()
  measured_at: Date;

  @Column('numeric', { precision: 10, scale: 2 })
  ei_value: number;

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  ei_wtt: number;

  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  ei_ttw: number;

  @Column()
  ei_grade: string;

  @Column('numeric', { precision: 5, scale: 4, nullable: true })
  ei_confidence: number;

  @Column({ nullable: true })
  trip_count: number;

  @Column('numeric', { precision: 12, scale: 2, nullable: true })
  total_distance_km: number;

  @Column('numeric', { precision: 15, scale: 2, nullable: true })
  total_cargo_tkm: number;

  @Column('numeric', { precision: 12, scale: 2, nullable: true })
  fuel_consumption_liters: number;

  @Column()
  source: string; // 'DTG', 'MANUAL', 'API'

  @Column('jsonb', { default: '{}' })
  metadata: Record<string, any>;
}
```

**Task 1.1.3**: Fleet EI 조회 엔드포인트
```typescript
// src/modules/fleet/fleet.controller.ts
@Controller('fleet')
@UseGuards(ApiKeyGuard)
export class FleetController {
  constructor(
    private fleetService: FleetService,
    private loggerService: LoggerService,
    private metricsService: MetricsService,
  ) {}

  /**
   * GET /v2/fleet/ei/{fleetId}
   */
  @Get('ei/:fleetId')
  async getFleetEI(
    @Param('fleetId') fleetId: string,
    @Query('route_origin') routeOrigin?: string,
    @Query('route_destination') routeDestination?: string,
    @Query('cargo_type') cargoType?: string,
    @Query('payload_weight_kg') payloadWeightKg?: number,
    @Request() req: FastifyRequest,
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = req.id as string;
    const userId = req.user?.user_id;

    try {
      // 1. Validate fleet ID
      if (!fleetId || !fleetId.match(/^FLT-[A-Z0-9]+$/)) {
        throw new BadRequestException('Invalid fleet ID format');
      }

      // 2. Try cache first
      const cacheKey = `fleet:ei:${fleetId}`;
      let fleetEI = await this.fleetService.getFleetEIFromCache(cacheKey);

      if (!fleetEI) {
        // 3. Fetch from database
        fleetEI = await this.fleetService.getFleetEI(fleetId);

        if (!fleetEI) {
          throw new NotFoundException(`Fleet ${fleetId} not found`);
        }

        // 4. Cache result (1 hour)
        await this.fleetService.cacheFleetEI(cacheKey, fleetEI, 3600);
      }

      // 5. Record metrics
      const duration = Date.now() - startTime;
      this.metricsService.recordApiCall('fleet/ei', duration);

      // 6. Log event
      this.loggerService.logEvent('fleet:ei:queried', {
        fleet_id: fleetId,
        duration_ms: duration,
      }, requestId, userId);

      return {
        fleet_id: fleetEI.fleet_id,
        ei_value: fleetEI.carbon_intensity,
        ei_grade: fleetEI.ei_grade,
        ei_confidence: fleetEI.ei_confidence,
        trend: {
          30day_avg: fleetEI.avg_ei_30d,
          improvement_rate: fleetEI.improvement_rate,
          updated_at: fleetEI.ei_last_updated_at,
        },
        breakdown: {
          wtt: fleetEI.carbon_intensity_wtt,
          ttw: fleetEI.carbon_intensity_ttw,
        },
        metadata: {
          vehicle_count: fleetEI.vehicle_count,
          fuel_type: fleetEI.fuel_type,
          certification: fleetEI.iso_14083_certified ? 'ISO-14083' : 'NOT_CERTIFIED',
        },
      };
    } catch (error) {
      this.loggerService.logError(
        requestId,
        error as Error,
        'FleetController.getFleetEI',
        userId,
      );
      throw error;
    }
  }
}
```

### Phase 1.2: 입찰 & 평가 (Week 2-4)

**Task 1.2.1**: Bid & Proposal 엔티티
```typescript
// src/modules/bid/entities/bid.entity.ts
@Entity('bids')
@Index(['shipper_id', 'status'])
@Index(['bid_closes_at'])
export class Bid {
  @PrimaryColumn('uuid')
  bid_id: string;

  @Column()
  shipper_id: string;

  @Column({ unique: true })
  bid_code: string; // e.g., BID-20260204-001

  @Column()
  bid_title: string;

  // Shipment details
  @Column()
  origin_city: string;

  @Column()
  destination_city: string;

  @Column('numeric', { precision: 10, scale: 2 })
  cargo_weight_tons: number;

  @Column()
  cargo_type: string; // General, Refrigerated, etc.

  // Evaluation weights
  @Column('numeric', { precision: 5, scale: 2 })
  price_weight_percentage: number; // 50.00

  @Column('numeric', { precision: 5, scale: 2 })
  leadtime_weight_percentage: number; // 20.00

  @Column('numeric', { precision: 5, scale: 2 })
  ei_weight_percentage: number; // 30.00

  // Timing
  @Column()
  pickup_date: Date;

  @Column()
  delivery_date: Date;

  // Status
  @Column()
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';

  @Column({ nullable: true })
  bid_opens_at: Date;

  @Column({ nullable: true })
  bid_closes_at: Date;

  @Column({ nullable: true })
  awarded_proposal_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('jsonb', { default: '{}' })
  metadata: Record<string, any>;
}

// src/modules/bid/entities/proposal.entity.ts
@Entity('proposals')
@Index(['bid_id', 'status'])
@Index(['bid_id', 'composite_score'], { where: 'status != "WITHDRAWN"' })
export class Proposal {
  @PrimaryColumn('uuid')
  proposal_id: string;

  @Column()
  bid_id: string;

  @Column()
  carrier_id: string;

  @Column({ nullable: true })
  fleet_id: string;

  // Bid details
  @Column('numeric', { precision: 15, scale: 2 })
  proposed_price: number;

  @Column()
  estimated_leadtime_hours: number;

  // EI snapshot (at time of proposal)
  @Column('numeric', { precision: 10, scale: 2, nullable: true })
  fleet_ei_snapshot: number;

  @Column()
  fleet_ei_grade: string;

  // Scoring
  @Column('numeric', { precision: 8, scale: 4, nullable: true })
  composite_score: number; // 0.0000 ~ 100.0000

  @Column('jsonb', { nullable: true })
  score_breakdown: Record<string, number>; // {price: 45.2, leadtime: 18.5, ei: 28.3}

  @Column({ nullable: true })
  rank: number;

  @Column()
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('jsonb', { default: '{}' })
  metadata: Record<string, any>;
}
```

**Task 1.2.2**: 입찰 평가 엔진 (핵심)
```typescript
// src/modules/bid/bid-evaluation.service.ts
@Injectable()
export class BidEvaluationService {
  constructor(
    private fleetService: FleetService,
    private proposalRepository: ProposalRepository,
    private redisService: RedisService,
    private loggerService: LoggerService,
  ) {}

  /**
   * Core bid evaluation algorithm
   * Score = α×Price_norm + β×Leadtime_norm + γ×EI_norm
   */
  async evaluateBids(
    bidId: string,
    candidates: BidCandidate[],
    evaluationPolicy: EvaluationPolicy,
  ): Promise<EvaluatedBid[]> {
    // 1. Fetch EI data for all candidates
    const eiDataMap = new Map<string, any>();

    await Promise.all(
      candidates.map(async (candidate) => {
        const ei = await this.fleetService.getFleetEI(candidate.fleet_id);
        eiDataMap.set(candidate.fleet_id, ei);
      }),
    );

    // 2. Calculate normalization factors
    const maxPrice = Math.max(...candidates.map((c) => c.price_won));
    const maxLeadtime = Math.max(...candidates.map((c) => c.leadtime_hours));
    const maxEI = Math.max(...candidates.map((c) => {
      const ei = eiDataMap.get(c.fleet_id);
      return ei?.carbon_intensity || c.ei_value || 200;
    }));

    // 3. Calculate scores for each candidate
    const evaluatedBids = candidates.map((candidate) => {
      // Normalize (lower is better, so invert)
      const priceNorm = 1 - (candidate.price_won / maxPrice);
      const leadtimeNorm = 1 - (candidate.leadtime_hours / maxLeadtime);

      const eiValue = eiDataMap.get(candidate.fleet_id)?.carbon_intensity
        || candidate.ei_value;
      const eiNorm = 1 - (eiValue / maxEI);

      // Apply quality grade factor
      const eiData = eiDataMap.get(candidate.fleet_id);
      const qualityGradeFactor = this.getQualityGradeFactor(
        eiData?.ei_grade || 'NOT_VERIFIED',
      );

      // Weighted scoring
      const priceScore = priceNorm * evaluationPolicy.weight_price;
      const leadtimeScore = leadtimeNorm * evaluationPolicy.weight_leadtime;
      const eiScore = eiNorm * evaluationPolicy.weight_ei * qualityGradeFactor;

      const compositeScore = (priceScore + leadtimeScore + eiScore) * 100;

      return {
        bid_id: bidId,
        proposal_id: candidate.proposal_id || uuid(),
        carrier_id: candidate.carrier_id,
        fleet_id: candidate.fleet_id,
        scores: {
          price_score: priceScore,
          leadtime_score: leadtimeScore,
          ei_score: eiScore,
          quality_grade_factor: qualityGradeFactor,
        },
        composite_score: parseFloat(compositeScore.toFixed(4)),
        ei_value: eiValue,
        ei_grade: eiData?.ei_grade || 'NOT_VERIFIED',
      };
    });

    // 4. Sort by composite score (descending)
    evaluatedBids.sort((a, b) => b.composite_score - a.composite_score);

    // 5. Add rankings
    evaluatedBids.forEach((bid, index) => {
      bid.rank = index + 1;
    });

    // 6. Apply EI threshold filter
    if (evaluationPolicy.ei_threshold) {
      evaluatedBids.forEach((bid) => {
        if (bid.ei_value > evaluationPolicy.ei_threshold) {
          if (evaluationPolicy.ei_filter_type === 'hard') {
            // Mark as not recommended
            bid.recommendation = {
              status: 'NOT_RECOMMENDED',
              reason: [
                `EI threshold exceeded (${bid.ei_value} > ${evaluationPolicy.ei_threshold})`,
              ],
            };
          } else {
            // Soft filter: just note it
            bid.recommendation = {
              status: 'ACCEPTABLE_WITH_CAUTION',
              reason: [
                `EI above preferred threshold (${bid.ei_value} vs ${evaluationPolicy.ei_threshold})`,
              ],
            };
          }
        }
      });
    }

    return evaluatedBids;
  }

  private getQualityGradeFactor(grade: string): number {
    const factors = {
      GRADE_1: 1.0,
      GRADE_2: 0.95,
      GRADE_3: 0.90,
      NOT_VERIFIED: 0.85,
    };
    return factors[grade] || 0.85;
  }
}
```

**Task 1.2.3**: 입찰 평가 API 엔드포인트
```typescript
// src/modules/bid/bid-evaluation.controller.ts
@Controller('order')
@UseGuards(ApiKeyGuard)
export class BidEvaluationController {
  constructor(
    private bidEvaluationService: BidEvaluationService,
    private queueService: QueueService,
    private loggerService: LoggerService,
  ) {}

  /**
   * POST /v2/order/bid-evaluation
   * 핵심 API: 입찰 평가
   */
  @Post('bid-evaluation')
  async evaluateBids(
    @Body() request: BidEvaluationRequest,
    @Request() req: FastifyRequest,
  ): Promise<any> {
    const startTime = Date.now();
    const requestId = req.id as string;
    const userId = req.user?.user_id;

    try {
      // 1. Validate request
      this.validateEvaluationRequest(request);

      // 2. Run evaluation
      const evaluatedBids = await this.bidEvaluationService.evaluateBids(
        request.order_id,
        request.bid_candidates,
        request.evaluation_policy,
      );

      const duration = Date.now() - startTime;

      // 3. Queue background job for proposal ranking update
      await this.queueService.addJob(
        JobQueues.PROPOSAL_RANKING,
        'update-ranking',
        {
          bid_id: request.order_id,
          evaluated_count: evaluatedBids.length,
        },
        { priority: 2, delay: 100 },
      );

      // 4. Log event
      this.loggerService.logEvent('bid:evaluated', {
        order_id: request.order_id,
        bid_count: request.bid_candidates.length,
        duration_ms: duration,
      }, requestId, userId);

      // 5. Return results immediately
      return {
        order_id: request.order_id,
        evaluation_timestamp: new Date().toISOString(),
        evaluated_results: evaluatedBids.map((bid) => ({
          rank: bid.rank,
          bid_id: bid.bid_id || 'TBD',
          carrier_id: bid.carrier_id,
          fleet_id: bid.fleet_id,
          scores: bid.scores,
          composite_score: bid.composite_score,
          recommendation: bid.recommendation || {
            status: 'RECOMMENDED',
            reason: [`High composite score: ${bid.composite_score}`],
          },
          ei_analysis: {
            ei_value: bid.ei_value,
            ei_grade: bid.ei_grade,
            percentile: this.calculatePercentile(bid.composite_score),
          },
        })),
        summary: this.generateSummary(evaluatedBids),
      };
    } catch (error) {
      this.loggerService.logError(
        requestId,
        error as Error,
        'BidEvaluationController.evaluateBids',
        userId,
      );
      throw error;
    }
  }

  private validateEvaluationRequest(request: any): void {
    if (!request.order_id) throw new BadRequestException('Missing order_id');
    if (!request.bid_candidates || request.bid_candidates.length === 0) {
      throw new BadRequestException('Must provide at least one bid candidate');
    }

    const weights = request.evaluation_policy;
    const totalWeight = weights.weight_price + weights.weight_leadtime + weights.weight_ei;

    if (Math.abs(totalWeight - 1.0) > 0.01) {
      throw new BadRequestException('Weights must sum to 1.0');
    }
  }

  private calculatePercentile(score: number): number {
    // Simplified: assume max score is 100
    return Math.min(score / 100, 1.0);
  }

  private generateSummary(bids: any[]): any {
    return {
      recommended_carrier_id: bids[0]?.carrier_id,
      top_score: bids[0]?.composite_score,
      total_bids: bids.length,
    };
  }
}
```

### Phase 1.3: 실시간 시스템 (Week 3-5)

**Task 1.3.1**: SSE 실시간 엔드포인트
```typescript
// src/modules/realtime/realtime.controller.ts
// (이미 REALTIME_ARCHITECTURE.md에 상세히 작성됨)
// 여기서는 quick reference만 제공
```

**Task 1.3.2**: Redis Pub/Sub 구독 설정
```typescript
// src/modules/realtime/realtime.service.ts
// (이미 REALTIME_ARCHITECTURE.md에 상세히 작성됨)
```

### Phase 1.4: 테스트 및 문서화 (Week 5-8)

**Task 1.4.1**: 단위 테스트 (Unit Tests)
```typescript
// src/modules/fleet/fleet.service.spec.ts
describe('FleetService', () => {
  let service: FleetService;
  let repository: FleetRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FleetService,
        {
          provide: FleetRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    repository = module.get<FleetRepository>(FleetRepository);
  });

  describe('getFleetEI', () => {
    it('should return fleet EI data', async () => {
      const mockFleet = {
        fleet_id: 'FLT-A01',
        carbon_intensity: 85.2,
        ei_grade: 'GRADE_1',
      };

      repository.findById.mockResolvedValue(mockFleet);

      const result = await service.getFleetEI('FLT-A01');

      expect(result).toEqual(mockFleet);
      expect(repository.findById).toHaveBeenCalledWith('FLT-A01');
    });
  });
});
```

**Task 1.4.2**: 통합 테스트 (Integration Tests)
```typescript
// src/modules/bid/bid-evaluation.integration.spec.ts
describe('Bid Evaluation (Integration)', () => {
  let app: INestApplication;
  let db: Database;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get<Database>(Database);
  });

  describe('POST /v2/order/bid-evaluation', () => {
    it('should evaluate bids and return ranked results', async () => {
      const testData = {
        order_id: 'ORD-TEST-001',
        bid_candidates: [
          {
            bid_id: 'BID-001',
            carrier_id: 'CAR-001',
            fleet_id: 'FLT-A01',
            price_won: 550000,
            leadtime_hours: 4,
            ei_value: 85.2,
          },
        ],
        evaluation_policy: {
          weight_price: 0.5,
          weight_leadtime: 0.2,
          weight_ei: 0.3,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v2/order/bid-evaluation')
        .set('X-API-Key', 'test-api-key')
        .send(testData)
        .expect(200);

      expect(response.body.evaluated_results).toHaveLength(1);
      expect(response.body.evaluated_results[0].rank).toBe(1);
    });
  });
});
```

---

## 📊 완료된 설계 문서 (Completed Design Documents)

이미 작성된 상세 문서들:

1. **DATABASE_SCHEMA.sql** (733 lines)
   - PostgreSQL 17 완전한 스키마
   - 40+ 테이블 및 뷰
   - 인덱싱 및 파티셔닝 전략
   - RLS 정책
   - 감사 트리거

2. **REDIS_CACHE_STRATEGY.md** (600+ lines)
   - 5가지 캐싱 패턴
   - TTL 전략
   - 캐시 무효화
   - Rate limiting 구현
   - 성능 최적화

3. **openapi.yaml** (1000+ lines)
   - 전체 API 스펙
   - 모든 엔드포인트 정의
   - 요청/응답 스키마
   - 에러 코드
   - 인증 방식

4. **REALTIME_ARCHITECTURE.md** (500+ lines)
   - SSE 구현 (Server-Sent Events)
   - WebSocket 선택사항
   - Redis Pub/Sub 설정
   - 메시지 브로드캐스팅
   - 확장성 패턴

5. **ASYNC_JOB_ORCHESTRATION.md** (600+ lines)
   - BullMQ 작업 큐
   - 9가지 작업 타입
   - 재시도 및 실패 처리
   - 모니터링
   - 스케줄링

6. **MONITORING_LOGGING_SYSTEM.md** (500+ lines)
   - Pino 구조화된 로깅
   - Prometheus 메트릭
   - 헬스 체크
   - OpenTelemetry 추적
   - Grafana 대시보드
   - ELK 스택

---

## 🚀 배포 및 운영 (Deployment & Operations)

### 프로덕션 체크리스트

- [ ] Database 초기화 및 마이그레이션
- [ ] Redis 클러스터 설정
- [ ] TLS 인증서 설정
- [ ] 환경 변수 구성 (.env.production)
- [ ] Kubernetes 리소스 생성
- [ ] 모니터링 대시보드 설정
- [ ] 로그 집계 설정 (ELK)
- [ ] 백업 정책 설정
- [ ] 스케일링 정책 (HPA)
- [ ] 인시던트 대응 계획
- [ ] 성능 테스트 완료
- [ ] 보안 감사 완료
- [ ] 문서 검토 및 최종화

### 성능 목표 (Performance SLOs)

| 메트릭 | 목표 | 측정 방법 |
|--------|------|---------|
| 가용성 | 99.9% | 월간 가동 시간 |
| P50 응답시간 | <100ms | Prometheus |
| P95 응답시간 | <300ms | Prometheus |
| P99 응답시간 | <1000ms | Prometheus |
| 에러율 | <0.1% | Error tracking |
| 캐시 히트율 | >80% | Redis metrics |
| 데이터베이스 쿼리 | <100ms (P95) | Slow query log |

---

## 📚 추가 자료

모든 개발자가 읽어야 할 문서:

1. **CLAUDE.md** - 프로젝트 구조 및 개발 가이드
2. **PROJECT_SPEC.md** - 기능 요구사항 및 기본 스키마
3. **한국_화물운송_시장_플랫폼_및_배차_시스템_보고서.md** - 시장 컨텍스트
4. **BACKEND_TECH_STACK_2026.md** - 기술 스택 선택 근거

---

## 🎯 다음 단계 (Next Steps)

1. **Week 1-2**: 프로젝트 초기화 완료 (Phase 0)
2. **Week 3-10**: API Core 개발 (Phase 1)
3. **Week 11-22**: Phase 2 (배차 최적화, Developer Portal)
4. **Week 23+**: 상용화 및 운영

**현재 상태**: ✅ 완전한 설계 문서 완성, 📌 Phase 0 시작 대기 중

---

**Document Status**: FINAL & APPROVED FOR DEVELOPMENT
**Last Updated**: 2026-02-04
**Next Review**: 2026-02-18 (Phase 0 완료 후)
