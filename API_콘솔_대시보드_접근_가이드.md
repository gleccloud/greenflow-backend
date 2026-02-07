# API 콘솔 대시보드 접근 가이드

**작성일**: 2026-02-06
**환경**: LocalStack 배포 환경

---

## 🌐 API 콘솔 대시보드 주소

### 현재 배포 환경

현재 LocalStack 배포 환경에서는 **프론트엔드만 배포**되어 있으며, **API 콘솔 대시보드는 아직 구현되지 않았습니다**.

현재 사용 가능한 페이지:
```
http://localhost:5173/              (게이트 페이지)
http://localhost:5173/shipper       (화주 랜딩 페이지)
http://localhost:5173/carrier       (운송사 랜딩 페이지)
http://localhost:5173/owner         (차주 랜딩 페이지)
```

---

## 📋 API 콘솔 대시보드 구현 필요

### Phase 5에서 구현 예정

API 콘솔 대시보드는 **Phase 5: Dashboard Implementation**에서 구현될 예정입니다.

구현 예정 라우트:
```
# 콘솔 대시보드 (구현 예정)
http://localhost:5173/console                    # 콘솔 메인 대시보드
http://localhost:5173/console/dashboard          # 대시보드 메인
http://localhost:5173/console/api-keys           # API 키 관리
http://localhost:5173/console/metrics            # 메트릭 & 사용량
http://localhost:5173/console/logs               # API 로그
http://localhost:5173/console/billing            # 요금 & 청구
http://localhost:5173/console/documentation      # API 문서
http://localhost:5173/console/webhooks           # 웹훅 설정
http://localhost:5173/console/settings           # 설정

# 역할별 대시보드 (구현 예정)
http://localhost:5173/dashboard/shipper          # 화주 대시보드
http://localhost:5173/dashboard/carrier          # 운송사 대시보드
http://localhost:5173/dashboard/owner            # 차주 대시보드
```

---

## 🔧 현재 사용 가능한 관리 도구

### 1. LocalStack UI (AWS 리소스 관리)
```
URL: http://localhost:8080
인증: 불필요
기능:
  - S3 버킷 관리
  - DynamoDB 테이블 조회
  - SQS 큐 관리
  - SNS 토픽 관리
  - Lambda 함수 관리
```

### 2. pgAdmin (PostgreSQL 데이터베이스 관리)
```
URL: http://localhost:5050
로그인:
  - 이메일: admin@greenflow.local
  - 비밀번호: admin

데이터베이스 연결 정보:
  - 호스트: postgres
  - 포트: 5432
  - 사용자: greenflow_user
  - 비밀번호: greenflow_password
  - 데이터베이스: greenflow_staging
```

### 3. Redis Commander (Redis 캐시 관리)
```
URL: http://localhost:8081
인증: 불필요
기능:
  - 키-값 브라우징
  - 캐시 데이터 조회
  - TTL 관리
  - 키 삭제/수정
```

### 4. Grafana (모니터링 대시보드)
```
URL: http://localhost:3001
로그인:
  - 사용자: admin
  - 비밀번호: admin

기능:
  - 메트릭 시각화
  - 커스텀 대시보드
  - 알람 설정
```

### 5. Prometheus (메트릭 수집)
```
URL: http://localhost:9090
인증: 불필요
기능:
  - 메트릭 쿼리 (PromQL)
  - 타임시리즈 데이터
  - 알람 규칙
```

---

## 🚀 API 콘솔 대시보드 개발 방법

### 1. 환경 변수 기반 동적 URL

**프론트엔드 환경 변수 설정** (`projects/green-logistics-landing/.env`):

```bash
# API 엔드포인트
VITE_API_BASE_URL=http://localhost:3000/api/v2

# 콘솔 대시보드 경로 (하드코딩 없음)
VITE_CONSOLE_BASE_PATH=/console

# 인증 설정
VITE_AUTH_ENABLED=true

# 환경 식별
VITE_ENV=development
```

### 2. 동적 라우팅 구현

**라우터 설정 예시** (`src/App.tsx`):

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// 환경 변수에서 경로 가져오기 (하드코딩 없음)
const CONSOLE_BASE = import.meta.env.VITE_CONSOLE_BASE_PATH || '/console';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 랜딩 페이지 */}
        <Route path="/" element={<GatePage />} />
        <Route path="/shipper" element={<ShipperPage />} />
        <Route path="/carrier" element={<CarrierPage />} />
        <Route path="/owner" element={<OwnerPage />} />

        {/* 콘솔 대시보드 (동적 경로) */}
        <Route path={`${CONSOLE_BASE}/*`} element={<ConsoleLayout />}>
          <Route index element={<ConsoleDashboard />} />
          <Route path="dashboard" element={<ConsoleDashboard />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          <Route path="metrics" element={<MetricsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="documentation" element={<DocumentationPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 역할별 대시보드 (동적 경로) */}
        <Route path="/dashboard/:role" element={<RoleDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### 3. API 클라이언트 설정

**API 클라이언트 예시** (`src/services/api.ts`):

```typescript
// 환경 변수에서 API URL 가져오기 (하드코딩 없음)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v2';

class ApiClient {
  private baseURL: string;
  private apiKey: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'X-API-Key': this.apiKey }),
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // 콘솔 API 메서드들 (하드코딩 없음)
  async getMetrics() {
    return this.request('/console/metrics/quota');
  }

  async getApiKeys() {
    return this.request('/console/api-keys');
  }

  async getLogs(params: { limit?: number; offset?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/console/logs?${query}`);
  }

  async getBilling() {
    return this.request('/console/billing/usage');
  }
}

export const apiClient = new ApiClient();
```

### 4. 동적 네비게이션

**네비게이션 메뉴 예시** (`src/components/console/ConsoleNav.tsx`):

```typescript
import { Link, useLocation } from 'react-router-dom';

// 환경 변수에서 경로 가져오기
const CONSOLE_BASE = import.meta.env.VITE_CONSOLE_BASE_PATH || '/console';

const navItems = [
  { path: `${CONSOLE_BASE}/dashboard`, label: '대시보드', icon: 'dashboard' },
  { path: `${CONSOLE_BASE}/api-keys`, label: 'API 키', icon: 'key' },
  { path: `${CONSOLE_BASE}/metrics`, label: '메트릭', icon: 'chart' },
  { path: `${CONSOLE_BASE}/logs`, label: '로그', icon: 'list' },
  { path: `${CONSOLE_BASE}/billing`, label: '요금', icon: 'credit-card' },
  { path: `${CONSOLE_BASE}/documentation`, label: '문서', icon: 'book' },
  { path: `${CONSOLE_BASE}/webhooks`, label: '웹훅', icon: 'webhook' },
  { path: `${CONSOLE_BASE}/settings`, label: '설정', icon: 'settings' },
];

export function ConsoleNav() {
  const location = useLocation();

  return (
    <nav>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={location.pathname === item.path ? 'active' : ''}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

---

## 📝 환경별 설정

### Development (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:3000/api/v2
VITE_CONSOLE_BASE_PATH=/console
VITE_ENV=development
VITE_AUTH_ENABLED=false
```

### Staging (.env.staging)
```bash
VITE_API_BASE_URL=https://staging-api.greenflow.com/api/v2
VITE_CONSOLE_BASE_PATH=/console
VITE_ENV=staging
VITE_AUTH_ENABLED=true
```

### Production (.env.production)
```bash
VITE_API_BASE_URL=https://api.greenflow.com/api/v2
VITE_CONSOLE_BASE_PATH=/console
VITE_ENV=production
VITE_AUTH_ENABLED=true
```

---

## 🔐 인증 플로우

### 1. API 키 기반 인증

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';

export function useAuth() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에서 API 키 불러오기 (하드코딩 없음)
    const storedKey = localStorage.getItem('greenflow_api_key');
    if (storedKey) {
      apiClient.setApiKey(storedKey);
      setApiKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (key: string) => {
    localStorage.setItem('greenflow_api_key', key);
    apiClient.setApiKey(key);
    setApiKey(key);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('greenflow_api_key');
    apiClient.setApiKey('');
    setApiKey(null);
    setIsAuthenticated(false);
  };

  return { apiKey, isAuthenticated, login, logout };
}
```

---

## 🎯 다음 단계

### Phase 5 구현 시작

1. **콘솔 레이아웃 생성**
   ```bash
   # 파일 생성
   src/components/console/ConsoleLayout.tsx
   src/components/console/ConsoleNav.tsx
   src/components/console/ConsoleHeader.tsx
   ```

2. **콘솔 페이지 구현**
   ```bash
   # 페이지 생성
   src/pages/console/ConsoleDashboard.tsx
   src/pages/console/ApiKeysPage.tsx
   src/pages/console/MetricsPage.tsx
   src/pages/console/LogsPage.tsx
   src/pages/console/BillingPage.tsx
   ```

3. **API 서비스 연동**
   ```bash
   # 서비스 생성
   src/services/api.ts
   src/services/console-api.ts
   ```

4. **환경 변수 설정**
   ```bash
   # 환경 파일 생성
   .env.development
   .env.staging
   .env.production
   ```

5. **라우팅 설정**
   ```bash
   # 라우터 업데이트
   src/App.tsx
   ```

---

## 📚 참고 자료

### 기존 문서
- [CLAUDE.md](./CLAUDE.md) - Phase 5 대시보드 구현 계획
- [spec.md](./spec.md) - Console API 엔드포인트 명세
- [openapi.yaml](./openapi.yaml) - API 스펙

### 계획 문서
- Plan Mode의 "Phase 2: Dashboard Implementation Plan" 참조

---

## ✅ 요약

### 현재 상태
- ✅ 랜딩 페이지 구현 완료
- ❌ API 콘솔 대시보드 미구현
- ✅ Backend API 준비 완료

### 접근 가능한 URL (현재)
```
# 프론트엔드
http://localhost:5173/              # 게이트
http://localhost:5173/shipper       # 화주
http://localhost:5173/carrier       # 운송사
http://localhost:5173/owner         # 차주

# 백엔드 API
http://localhost:3000/api/v2/health                  # 헬스 체크
http://localhost:3000/api/v2/console/metrics/quota   # 콘솔 API (API 키 필요)

# 관리 도구
http://localhost:8080               # LocalStack UI
http://localhost:5050               # pgAdmin
http://localhost:8081               # Redis Commander
http://localhost:3001               # Grafana
http://localhost:9090               # Prometheus
```

### 구현 예정 URL (Phase 5)
```
# 콘솔 대시보드
http://localhost:5173/console/*
http://localhost:5173/dashboard/:role
```

**하드코딩 없는 구현**: 모든 URL과 경로는 환경 변수를 통해 동적으로 구성됩니다.

---

**작성일**: 2026-02-06
**상태**: Phase 5 구현 대기 중
**문서 버전**: 1.0
