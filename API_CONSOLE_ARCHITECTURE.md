# 🚀 GreenFlow API Console - 상용화급 아키텍처 설계

**작성일**: 2026-02-04
**버전**: 1.0 (아키텍처 설계)
**상태**: 🔄 구현 대기

---

## 📋 목표

**현재**: 랜딩 사이트 + 기본 대시보드
**목표**: 세계적 수준의 API 콘솔 플랫폼

### 핵심 가치 제안
- ✅ 차주 및 물류사의 탄소 배출 데이터 **API 기반 관리**
- ✅ **ISO-14083 표준** 준수 데이터 제공
- ✅ 입찰/제안 프로세스 **완전 자동화**
- ✅ 실시간 모니터링 및 분석
- ✅ 개발자 친화적 REST/GraphQL API

---

## 🏗️ 아키텍처 구성

### 1. 사용자 페르소나 및 플랫폼 역할

```
┌─────────────────────────────────────────────────────────┐
│                    GreenFlow Platform                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  화주 (Shipper)              물류사 (Carrier)           │
│  ├─ 입찰 생성 & 관리         ├─ 입찰 응찰              │
│  ├─ Fleet 비교 검색         ├─ 주문 관리              │
│  ├─ 탄소 보고서             ├─ 수익 분석              │
│  └─ API 기반 통합           └─ API 기반 자동화        │
│                                                          │
│  차주 (Owner)                 관리자 (Admin)            │
│  ├─ 운행 데이터 기록        ├─ 사용자 관리            │
│  ├─ 탄소점수 모니터링       ├─ 감사 로그              │
│  ├─ 그린라벨 추적           ├─ 시스템 설정            │
│  └─ 개발자 API 사용         └─ 분석 대시보드          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2. 플랫폼 구성 (3가지 영역)

#### A. 공개 랜딩 사이트 (현재)
```
/
├── /shipper
├── /carrier
├── /owner
├── /login
└── /register
```
**목적**: 제품 소개 및 사용자 유입

#### B. API 콘솔 (신규 개발)
```
/console
├── /dashboard
│   ├── /overview (핵심 메트릭)
│   ├── /usage (API 사용량)
│   └── /analytics (분석)
├── /api-keys (API 키 관리)
│   ├── /list (생성/삭제)
│   ├── /scopes (권한 설정)
│   └── /logs (활동 로그)
├── /documentation
│   ├── /reference (API 문서)
│   ├── /guides (가이드)
│   ├── /samples (코드 샘플)
│   └── /webhooks (Webhook 관리)
├── /integrations
│   ├── /connected (연결된 앱)
│   ├── /marketplace (앱 마켓플레이스)
│   └── /webhooks (Webhook 설정)
├── /billing
│   ├── /usage (사용량)
│   ├── /plans (요금제)
│   └── /invoices (청구서)
└── /settings
    ├── /account (계정 설정)
    ├── /security (보안)
    └── /team (팀 관리)
```

#### C. 비즈니스 대시보드 (개선)
```
/dashboard
├── /shipper (화주)
├── /carrier (물류사)
├── /owner (차주)
└── /admin (관리자)
```

---

## 🔑 핵심 기능

### 1. API 콘솔 기능

#### A. API Key 관리
```typescript
// 데이터 모델
interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;      // pk_live_abc...
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'revoked' | 'expired';
  scopes: string[];       // ['bid.read', 'bid.write', 'fleet.read']
  rateLimit: number;      // 1000 req/hour
  ipWhitelist?: string[]; // ['1.2.3.4', '5.6.7.8']
}

// 기능
- ✅ 생성 (자동 생성 & 복사)
- ✅ 권한 설정 (Scopes)
- ✅ Rate Limit 설정
- ✅ IP 화이트리스트
- ✅ 만료일 설정
- ✅ 활동 로그 (마지막 사용 시간, 위치)
- ✅ 일괄 관리 (Export/Import)
```

#### B. API 사용량 모니터링
```typescript
interface UsageMetrics {
  totalRequests: number;
  successRate: number;        // 95.2%
  avgResponseTime: number;    // 145ms
  errorRate: number;          // 2.1%
  topEndpoints: Endpoint[];
  topErrorCodes: ErrorCode[];
  bandwidthUsage: {
    total: number;            // GB
    inbound: number;
    outbound: number;
  };
  requestsByHour: number[];
  errorsByHour: number[];
}

// 시각화
- ✅ 실시간 대시보드 (차트)
- ✅ 시간별/일별/월별 분석
- ✅ 엔드포인트별 통계
- ✅ 에러율 추적
- ✅ 성능 경향 분석
```

#### C. 요청 로그 및 디버깅
```typescript
interface APILog {
  id: string;
  timestamp: Date;
  method: string;           // GET, POST, etc
  path: string;             // /api/v2/bids
  status: number;           // 200, 400, 500
  responseTime: number;     // ms
  requestSize: number;      // bytes
  responseSize: number;     // bytes
  ipAddress: string;
  userAgent: string;
  errorMessage?: string;
  requestBody?: string;     // 민감한 데이터 마스킹
  responseBody?: string;
}

// 기능
- ✅ 실시간 로그 스트리밍
- ✅ 고급 필터링 (방법, 상태, 시간)
- ✅ 요청/응답 재현 (Replay)
- ✅ 성능 분석
- ✅ 에러 추적 (Stack Trace)
- ✅ 보안 감사 로그
```

#### D. Webhook 관리
```typescript
interface Webhook {
  id: string;
  url: string;
  events: string[];        // ['bid.created', 'bid.updated']
  isActive: boolean;
  secret: string;          // HMAC 서명용
  retryPolicy: {
    maxAttempts: number;   // 5
    backoffMultiplier: number; // 2
    timeout: number;       // ms
  };
  headers: Record<string, string>;
  testStatus?: {
    lastTestedAt: Date;
    success: boolean;
  };
}

// 기능
- ✅ 이벤트 선택
- ✅ URL 유효성 검사
- ✅ 테스트 전송
- ✅ 재시도 정책 설정
- ✅ 배달 상태 추적
- ✅ 실패 분석
```

### 2. API 문서 & 테스팅

#### A. OpenAPI/Swagger 통합
```yaml
openapi: 3.0.0
info:
  title: GreenFlow API
  version: v2.0.0
  description: Carbon-aware logistics platform API

paths:
  /bids:
    get:
      summary: List bids
      parameters:
        - name: status
          in: query
          schema: { type: string }
        - name: page
          in: query
          schema: { type: integer }
      responses:
        200:
          description: Success
          content:
            application/json:
              schema: { $ref: '#/components/schemas/BidList' }

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    Bid:
      type: object
      properties:
        id: { type: string }
        status: { type: string, enum: [OPEN, CLOSED, AWARDED] }
        origin: { type: string }
        destination: { type: string }
        carbonIntensity: { type: number }
```

#### B. 인터랙티브 API 테스터
```
┌─────────────────────────────────────┐
│     Try It Out - 실시간 테스트      │
├─────────────────────────────────────┤
│ Method: [GET] ▼                      │
│ URL: https://api.greenflow.io/api/v2/bids │
│                                      │
│ Headers:                             │
│ X-API-Key: [pk_live_...]             │
│ Content-Type: application/json       │
│                                      │
│ Query Parameters:                    │
│ status: [OPEN] ▼                     │
│ page: [1]                            │
│                                      │
│ [Send Request] [Clear]               │
│                                      │
│ Response:                            │
│ Status: 200 OK                       │
│ Time: 145ms                          │
│ {                                    │
│   "data": [{...}],                   │
│   "meta": {"page": 1, "total": 45}   │
│ }                                    │
└─────────────────────────────────────┘
```

#### C. 코드 샘플
```typescript
// 클릭 시 자동 복사
// JavaScript / Node.js
const axios = require('axios');

const response = await axios.get(
  'https://api.greenflow.io/api/v2/bids',
  {
    headers: {
      'X-API-Key': 'pk_live_...',
      'Content-Type': 'application/json'
    },
    params: { status: 'OPEN', page: 1 }
  }
);

// Python
import requests

response = requests.get(
  'https://api.greenflow.io/api/v2/bids',
  headers={'X-API-Key': 'pk_live_...'},
  params={'status': 'OPEN', 'page': 1}
)

// Go
client := &http.Client{}
req, _ := http.NewRequest("GET", "https://...", nil)
req.Header.Add("X-API-Key", "pk_live_...")
resp, _ := client.Do(req)

// Java
OkHttpClient client = new OkHttpClient();
Request request = new Request.Builder()
  .url("https://api.greenflow.io/api/v2/bids")
  .addHeader("X-API-Key", "pk_live_...")
  .build();
Response response = client.newCall(request).execute();
```

### 3. 엔터프라이즈 기능

#### A. 역할 기반 접근 제어 (RBAC)
```typescript
enum Role {
  ADMIN = 'admin',                    // 모든 권한
  DEVELOPER = 'developer',            // API 개발
  BILLING_MANAGER = 'billing_manager', // 청구 관리
  VIEWER = 'viewer'                   // 읽기 전용
}

interface Permission {
  resource: string;      // 'api_keys', 'billing', 'logs'
  action: string;        // 'create', 'read', 'update', 'delete'
  scope?: string;        // 제한 범위 (조직 내)
}
```

#### B. 팀 관리
```typescript
interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  roles: Role[];
  projects: Project[];
  billing: BillingInfo;
}

// 기능
- ✅ 멤버 초대 (이메일)
- ✅ 역할 할당
- ✅ 권한 관리
- ✅ 감사 로그
- ✅ SSO 지원 (SAML 2.0, OIDC)
```

#### C. 보안 강화
```typescript
// OAuth 2.0 + OIDC
- ✅ Google OAuth
- ✅ GitHub OAuth
- ✅ Microsoft Azure AD
- ✅ Custom SAML 2.0 IdP

// 추가 보안
- ✅ 2FA/MFA (TOTP, SMS)
- ✅ IP 화이트리스트
- ✅ 세션 관리
- ✅ 비밀번호 정책 (강도, 만료)
- ✅ API Key 만료 정책
```

---

## 📱 UI/UX 설계

### 1. 핵심 페이지 목록

```
API Console (/console)
├── Dashboard
│   ├── Overview (핵심 메트릭 위젯)
│   ├── API 사용량 차트 (실시간)
│   ├── 최근 에러
│   └── 빠른 링크
│
├── API Keys (/console/api-keys)
│   ├── 키 목록 (테이블)
│   ├── 키 상세정보 (모달)
│   │   ├─ Scopes 관리
│   │   ├─ Rate Limit 설정
│   │   ├─ IP 화이트리스트
│   │   └─ 활동 로그
│   └── 새 키 생성 폼
│
├── Documentation (/console/docs)
│   ├── API Reference (자동 생성 Swagger)
│   ├── Getting Started 가이드
│   ├── SDK 문서
│   ├── 코드 샘플 (5개 언어)
│   └── FAQ
│
├── Logs (/console/logs)
│   ├── 실시간 로그 스트림
│   ├── 필터/검색
│   ├── 상세 요청/응답 뷰
│   └── 내보내기 (CSV/JSON)
│
├── Webhooks (/console/webhooks)
│   ├── 웹훅 목록
│   ├── 웹훅 생성 폼
│   ├── 이벤트 선택
│   ├── 재시도 정책 설정
│   └── 배달 히스토리
│
├── Integrations (/console/integrations)
│   ├── 연결된 앱 목록
│   ├── 앱 마켓플레이스
│   ├── 인증 상태
│   └── 데이터 동기화 설정
│
├── Billing (/console/billing)
│   ├── 요금제 선택
│   ├── 사용량 기반 요금
│   ├── 청구서 이력
│   └── 결제 정보
│
└── Settings (/console/settings)
    ├── 계정 정보
    ├── 팀 관리
    ├── 보안 설정
    ├── 알림 설정
    └── 데이터 내보내기
```

### 2. 대시보드 레이아웃

```
┌────────────────────────────────────────────────┐
│ GreenFlow API Console                    🔔 👤 │
├────────────────────────────────────────────────┤
│ ◀ Navigation    │ Dashboard                   │
│ • Overview      │                             │
│ • API Keys      │  ┌─────────────┬─────────┐  │
│ • Docs          │  │ Requests    │ Success │  │
│ • Logs          │  │ 12,450      │ 99.2%   │  │
│ • Webhooks      │  └─────────────┴─────────┘  │
│ • Integrations  │                             │
│ • Billing       │  ┌─────────────┬─────────┐  │
│ • Settings      │  │ Avg Response│ Errors  │  │
│                 │  │ 145ms       │ 28      │  │
│                 │  └─────────────┴─────────┘  │
│                 │                             │
│                 │  Request Trends (7 days)    │
│                 │  [Chart]                    │
│                 │                             │
│                 │  Recent Errors              │
│                 │  [Error List]               │
│                 │                             │
└────────────────────────────────────────────────┘
```

### 3. 색상 및 스타일

- **메인 색상**: Emerald-600 (API 안정성/신뢰)
- **상태 색상**:
  - 성공: Green-500
  - 경고: Amber-500
  - 에러: Red-500
  - 정보: Blue-500
- **폰트**: System font (Inter/Roboto)
- **간격**: 8px 그리드 시스템

---

## 🔌 기술 스택 (신규)

### Frontend (React/TypeScript)
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-router-dom": "^7.13.0",
    "tailwindcss": "^3.4.17",
    "recharts": "^3.7.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.22.0",
    "swagger-ui-react": "^5.0.0",
    "monaco-editor": "^0.44.0",
    "zustand": "^4.4.0",
    "react-query": "^3.39.0",
    "date-fns": "^2.30.0",
    "lodash-es": "^4.17.21"
  }
}
```

### Backend (NestJS)
```json
{
  "dependencies": {
    "@nestjs/core": "^10.0.0",
    "@nestjs/common": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/graphql": "^12.0.0",
    "axios": "^1.6.0",
    "prisma": "^5.0.0",
    "redis": "^4.6.0",
    "bull": "^4.11.0",
    "class-validator": "^0.14.0"
  }
}
```

### DevOps & Infra
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (K8s)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **API Gateway**: Kong / AWS API Gateway

---

## 📊 마이그레이션 로드맵

### Phase 1: API Console 기초 (2주)
```
Week 1:
  - API Console 레이아웃 구현
  - API Key 관리 기능
  - 기본 대시보드 위젯

Week 2:
  - 사용량 모니터링 차트
  - API 로그 페이지
  - 보안 기능 (2FA)
```

### Phase 2: 문서 & 개발자 경험 (2주)
```
Week 3:
  - Swagger/OpenAPI 통합
  - 인터랙티브 API 테스터
  - 코드 샘플 생성

Week 4:
  - Getting Started 가이드
  - SDK 문서
  - FAQ 작성
```

### Phase 3: 고급 기능 (3주)
```
Week 5:
  - Webhook 관리
  - 팀 관리 & RBAC
  - Integrations 마켓플레이스

Week 6-7:
  - Billing 시스템
  - 감사 로그
  - 성능 최적화
```

### Phase 4: 운영 & 모니터링 (2주)
```
Week 8:
  - Monitoring 대시보드
  - 알러팅 시스템
  - 백업 & 복구

Week 9:
  - 부하 테스트
  - 보안 감사
  - 프로덕션 배포
```

---

## 🎯 성공 지표

### 개발자 만족도
- API 문서 종합성 (90%+)
- 온보딩 시간 감소 (1시간 → 10분)
- SDK 다양성 (5개 언어)

### 플랫폼 신뢰도
- API 가용성: 99.9%
- 평균 응답시간: <200ms
- 에러율: <0.5%

### 비즈니스 지표
- 개발자 등록: 월 1000명
- API 호출: 월 1000만 건
- 고객 유지율: 95%

---

## 📝 다음 단계

1. ✅ **아키텍처 설계** (완료)
2. 🔄 **로드맵 상세 작성** (이번 스프린트)
3. 🔄 **초기 구현** (2주)
4. 🔄 **베타 테스트** (1주)
5. 🔄 **프로덕션 배포** (1주)

---

**상용화급 세계적 수준의 API 콘솔로의 여정이 시작됩니다! 🚀**
