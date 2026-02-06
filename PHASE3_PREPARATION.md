# 🚀 Phase 3 준비 계획

**작성일**: 2026-02-05
**상태**: Phase 3 시작 준비
**목표**: 백엔드 API 연결 및 Hook 활성화

---

## 📋 Phase 3 주요 작업

### 1. 백엔드 API 엔드포인트 구현 (14개)

#### API Keys 관련 (4개)
```
1. GET /api/v2/console/api-keys
   - 모든 API 키 조회
   - 페이지네이션 지원
   - Mock: mockAPIKeys 반환

2. POST /api/v2/console/api-keys
   - 새 API 키 생성
   - 요청: { name, scopes[], expiresAt }
   - 응답: 생성된 APIKey 객체

3. GET /api/v2/console/api-keys/:id
   - 특정 API 키 조회
   - Mock: mockAPIKeys[id]

4. DELETE /api/v2/console/api-keys/:id
   - API 키 삭제/무효화
   - 응답: { success: true }
```

#### Logs 관련 (4개)
```
5. GET /api/v2/console/logs
   - 모든 로그 조회
   - 필터링: status, method, endpoint, dateRange
   - 페이지네이션: limit, offset
   - Mock: mockAPILogs 필터링

6. GET /api/v2/console/logs/stream (SSE)
   - 실시간 로그 스트리밍
   - event: "log"
   - data: { id, timestamp, ... }

7. GET /api/v2/console/logs/export
   - CSV/JSON 형식으로 로그 내보내기
   - 쿼리: format=csv|json, dateRange

8. GET /api/v2/console/logs/stats
   - 로그 통계 조회
   - 응답: { totalRequests, errorCount, avgTime }
```

#### Metrics 관련 (3개)
```
9. GET /api/v2/console/metrics/summary
   - 메트릭 요약 (일일/주간/월간)
   - 응답: mockMetricsSummary
   - 쿼리: period=DAY|WEEK|MONTH

10. GET /api/v2/console/metrics/endpoints
    - 엔드포인트별 메트릭
    - 응답: mockEndpointMetrics[]
    - 쿼리: startDate, endDate

11. GET /api/v2/console/metrics/stream (SSE)
    - 실시간 메트릭 업데이트
    - 30초마다 신규 데이터
    - event: "metric_update"
```

#### 기타 (3개)
```
12. GET /api/v2/console/user
    - 현재 사용자 정보
    - 응답: { id, name, email, role }

13. GET /api/v2/console/webhooks
    - 웹훅 목록 조회
    - Mock: []

14. GET /api/v2/console/settings
    - 사용자 설정 조회
    - Mock: 기본 설정값
```

---

### 2. Hook 활성화 (3개)

#### useAPIKeys Hook
```typescript
// src/console/hooks/useAPIKeys.ts 활성화

export function useAPIKeys() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 2: Mock 데이터
  // useEffect(() => {
  //   setKeys(mockAPIKeys);
  // }, []);

  // Phase 3: 실제 API 호출
  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/console/api-keys');
        setKeys(response.data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
  }, []);

  return { keys, loading, error };
}
```

**구현 체크리스트**:
- [ ] Mock 데이터 주석처리
- [ ] API 호출 로직 작성
- [ ] 에러 처리 추가
- [ ] 로딩 상태 관리
- [ ] 캐싱 로직 추가

#### useLogs Hook
```typescript
// src/console/hooks/useLogs.ts 활성화

export function useLogs(filter?: LogFilter) {
  const [logs, setLogs] = useState<APILog[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Phase 3: SSE 스트리밍 활성화
  const subscribeToStream = () => {
    const eventSource = new EventSource('/api/v2/console/logs/stream');

    eventSource.addEventListener('log', (e) => {
      const newLog: APILog = JSON.parse(e.data);
      setLogs(prev => [newLog, ...prev.slice(0, -1)]);
    });

    setStreaming(true);
    return eventSource;
  };

  return { logs, loading, streaming, subscribeToStream };
}
```

**구현 체크리스트**:
- [ ] 로그 필터링 로직
- [ ] 페이지네이션
- [ ] SSE 구독
- [ ] 자동 갱신 설정
- [ ] 연결 해제 처리

#### useMetrics Hook (NEW)
```typescript
// src/console/hooks/useMetrics.ts 생성

export function useMetrics(period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY') {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // 메트릭 요약 조회
        const summaryRes = await apiClient.get(
          `/console/metrics/summary?period=${period}`
        );
        setMetrics(summaryRes.data);

        // 엔드포인트 메트릭 조회
        const endpointsRes = await apiClient.get('/console/metrics/endpoints');
        setEndpoints(endpointsRes.data);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [period]);

  return { metrics, endpoints, loading };
}
```

**구현 체크리스트**:
- [ ] 메트릭 조회 로직
- [ ] 기간별 필터링
- [ ] 엔드포인트 메트릭
- [ ] 실시간 업데이트
- [ ] 차트 데이터 포매팅

---

### 3. Mock 데이터 → API 전환 전략

#### 단계별 전환
```
Phase 3 Week 1:
  ├── API 엔드포인트 완성
  └── Mock 데이터 백업 (Phase 4 비교용)

Phase 3 Week 2:
  ├── useAPIKeys 활성화 (Dashboard만 먼저)
  ├── useLogs 활성화
  └── 부분 테스트 (일부 Mock + 일부 API)

Phase 3 Week 3:
  ├── 모든 Hook 활성화
  ├── 전체 통합 테스트
  └── 성능 최적화

Phase 4:
  ├── Mock 데이터 제거
  └── 실제 배포 준비
```

#### 하이브리드 방식 (권장)
```typescript
// Phase 3 중간: Mock 데이터 + 실제 API 혼합

export function useAPIKeys(useMock = false) {
  const [keys, setKeys] = useState<APIKey[]>([]);

  useEffect(() => {
    if (useMock) {
      // Phase 2: Mock 데이터 사용
      setKeys(mockAPIKeys);
    } else {
      // Phase 3: 실제 API 호출
      apiClient.get('/console/api-keys')
        .then(res => setKeys(res.data))
        .catch(err => console.error(err));
    }
  }, [useMock]);

  return { keys };
}

// 사용
// <Dashboard useMockData={false} /> // API 사용
// <Dashboard useMockData={true} />  // Mock 사용
```

---

### 4. 에러 처리 & 재시도 로직

#### API 클라이언트 개선
```typescript
// src/console/services/apiClient.ts

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v2',
  timeout: 10000,
});

// 재시도 인터셉터
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 0;
    }

    config.retry += 1;

    // 3회 재시도
    if (config.retry <= 3 && error.response?.status >= 500) {
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * config.retry) // 지수 백오프
      );
      return apiClient(config);
    }

    throw error;
  }
);
```

**체크리스트**:
- [ ] 5xx 에러 시 재시도
- [ ] 지수 백오프 구현
- [ ] 최대 재시도 횟수 제한
- [ ] 사용자 친화적 에러 메시지
- [ ] 에러 로깅

---

### 5. 실시간 스트리밍 (SSE) 구현

#### SSE 이벤트 정의
```
// 로그 스트리밍
event: log
data: {
  "id": "log_xxx",
  "timestamp": "2026-02-05T10:00:00Z",
  "method": "GET",
  "endpoint": "/api/v2/bids",
  "status": "SUCCESS",
  "statusCode": 200,
  "duration": 142
}

// 메트릭 업데이트
event: metric_update
data: {
  "totalRequests": 12500,
  "successRate": 99.8,
  "averageResponseTime": 140
}
```

#### React Hook for SSE
```typescript
export function useSSE(url: string, options?: SSEOptions) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const newData = JSON.parse(e.data);
        setData(newData);
      } catch (err) {
        setError(err as Error);
      }
    };

    eventSource.onerror = () => {
      setError(new Error('SSE connection failed'));
      eventSource.close();
    };

    return () => eventSource.close();
  }, [url]);

  return { data, error };
}
```

**체크리스트**:
- [ ] EventSource 구현
- [ ] 이벤트 파싱
- [ ] 자동 재연결
- [ ] 메모리 누수 방지
- [ ] 성능 최적화 (구독 해제)

---

### 6. E2E 테스트 업데이트 (Phase 4용)

#### 새 테스트 파일
```
tests/e2e_console_api.spec.mjs

테스트 대상:
1. API 연결 테스트
2. 실시간 업데이트
3. 에러 처리
4. 성능 벤치마크
5. 동시성 테스트
```

**예시**:
```javascript
// tests/e2e_console_api.spec.mjs

test('should fetch API keys from backend', async ({ page }) => {
  await page.goto(`${BASE_URL}/console/api-keys`);

  // API 호출 대기
  await page.waitForResponse(response =>
    response.url().includes('/console/api-keys') &&
    response.status() === 200
  );

  // 실제 데이터 표시 확인
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});
```

---

## 📊 마이그레이션 체크리스트

### 백엔드 준비
```
- [ ] 14개 API 엔드포인트 구현
- [ ] 데이터베이스 마이그레이션
- [ ] 토큰 인증 시스템
- [ ] CORS 설정
- [ ] 에러 처리 표준화
- [ ] 로깅 시스템
- [ ] 성능 모니터링
```

### 프론트엔드 준비
```
- [ ] Hook 활성화 준비
- [ ] 에러 처리 UI
- [ ] 로딩 상태 UI
- [ ] SSE 연결 UI
- [ ] 오프라인 모드
- [ ] 캐싱 전략
```

### 테스트 준비
```
- [ ] E2E 테스트 업데이트
- [ ] API 응답 모킹 (Mock Server)
- [ ] 성능 테스트
- [ ] 보안 테스트
- [ ] 부하 테스트
```

### 배포 준비
```
- [ ] 환경 변수 설정
- [ ] 빌드 최적화
- [ ] 번들 분석
- [ ] 성능 프로파일링
- [ ] 릴리스 노트
```

---

## 🎯 타임라인

### Week 1 (Phase 3 시작)
```
Mon: API 엔드포인트 설계 완료
Tue-Wed: 14개 엔드포인트 구현
Thu: 토큰 & 인증 시스템
Fri: 통합 테스트 & 버그 수정
```

### Week 2
```
Mon: useAPIKeys Hook 활성화
Tue: useLogs Hook 활성화
Wed: useMetrics Hook 추가
Thu: SSE 스트리밍 구현
Fri: 부분 통합 테스트
```

### Week 3
```
Mon-Tue: 전체 통합 및 테스트
Wed-Thu: 성능 최적화
Fri: 최종 검증
```

### Week 4 (Phase 4 준비)
```
Mon-Tue: Mock 제거 계획
Wed-Thu: 마이그레이션 실행
Fri: 최종 E2E 테스트
```

---

## 🔐 보안 고려사항

```
1. API 토큰 관리
   ├── Bearer 토큰 자동 주입
   ├── 토큰 갱신 로직
   └── 토큰 만료 처리

2. CORS 설정
   ├── 허용 출처 제한
   ├── 자격증명 포함
   └── 프리플라이트 요청

3. 데이터 검증
   ├── 요청 검증
   ├── 응답 검증
   └── 타입 안전성

4. 에러 처리
   ├── 민감 정보 노출 방지
   ├── 안전한 에러 메시지
   └── 로깅 & 모니터링
```

---

## 📈 성능 목표

```
API Response Time:
  - 목표: 200ms 이하
  - 현재 (Mock): 0ms
  - P95: 500ms 이하

UI Responsiveness:
  - 페이지 로드: 2초 이하
  - 네비게이션: 500ms 이하
  - 스트리밍 업데이트: 100ms 이내

Bundle Size:
  - 목표: 변화 없음 (Hook 활성화만)
  - 추가 라이브러리: axios, eventsource

Memory Usage:
  - 목표: 메모리 누수 없음
  - 스트리밍: 안정적 메모리 사용
```

---

## 📝 문서 업데이트 예정

```
- API_CONSOLE_ARCHITECTURE.md (API 섹션 추가)
- HOOK_INTEGRATION_GUIDE.md (NEW)
- API_ENDPOINTS.md (NEW)
- SSE_STREAMING_GUIDE.md (NEW)
- MIGRATION_GUIDE.md (NEW)
- TROUBLESHOOTING.md (NEW)
```

---

## 🚀 다음 마일스톤

### Phase 4: Mock 제거 & 배포
```
1. Mock 데이터 완전 제거
2. 실제 API만 사용
3. 최종 E2E 테스트
4. 성능 최적화
5. 프로덕션 배포
```

---

**작성자**: Claude Code
**상태**: Phase 3 준비 완료
**마지막 업데이트**: 2026-02-05
**다음 단계**: Backend API 엔드포인트 구현
