# 🚀 API Console Quick Start Guide

**상태**: Phase 1 ✅ 완료
**다음**: Phase 2 준비 완료

---

## 🎯 빠른 시작

### 1️⃣ 개발 서버 시작

```bash
cd projects/green-logistics-landing
npm run dev
```

그리고 브라우저에서 열기:
```
http://localhost:5173/console
```

### 2️⃣ 콘솔 페이지 접근

| 페이지 | URL | 기능 |
|--------|-----|------|
| Dashboard | `/console` | 메트릭 & 활동 |
| API Keys | `/console/api-keys` | 키 관리 |
| Logs | `/console/logs` | 요청 로그 |
| Documentation | `/console/documentation` | API 문서 |
| Webhooks | `/console/webhooks` | 웹훅 관리 |
| Integrations | `/console/integrations` | 외부 서비스 |
| Billing | `/console/billing` | 청구 정보 |
| Settings | `/console/settings` | 설정 |

### 3️⃣ 빌드 & 배포

```bash
# 빌드
npm run build

# 결과
# ✓ dist/index-BMHzqDFc.js (237.35 kB gzipped)
# ✓ dist/index-BqGCSfxP.css (6.44 kB gzipped)
```

---

## 📂 파일 구조 한눈에

```
src/console/
├── types/              # ← TypeScript 타입 (40+ 정의)
│   ├── apiKey.ts       # API 키 타입
│   ├── logs.ts         # 로그 타입
│   └── webhook.ts      # 웹훅 타입
│
├── services/           # ← 비즈니스 로직
│   ├── apiClient.ts    # HTTP 클라이언트
│   ├── apiKeyService.ts  # API 키 CRUD
│   └── logsService.ts  # 로그 조회 & SSE
│
├── hooks/              # ← State Management
│   ├── useAPIKeys.ts   # 키 상태 관리
│   └── useLogs.ts      # 로그 상태 관리
│
├── context/            # ← 전역 상태
│   └── ConsoleContext.tsx  # User, Settings, Notifications
│
├── components/         # ← UI 컴포넌트
│   └── ConsoleLayout.tsx   # 메인 레이아웃
│
└── pages/              # ← 페이지 (8개)
    ├── Dashboard.tsx
    ├── APIKeys.tsx
    ├── Logs.tsx
    └── ... (5개 더)
```

---

## 💡 주요 코드 스니펫

### Hook 사용하기

```typescript
// API Keys 페이지
import { useAPIKeys } from '@/console/hooks';

export function APIKeysPage() {
  const { keys, createKey, revokeKey, deleteKey } = useAPIKeys();

  return (
    <div>
      {keys.map(key => (
        <div key={key.id}>
          {key.name} - {key.status}
          <button onClick={() => deleteKey(key.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Service 사용하기

```typescript
// API 키 생성
const response = await apiKeyService.createAPIKey({
  name: "Production API",
  scopes: ['bids.read', 'proposals.write'],
});

console.log(response.key); // 한 번만 표시됨
```

### 알림 표시하기

```typescript
// Context에서 알림 사용
import { useConsole } from '@/console/context';

function MyComponent() {
  const { showNotification } = useConsole();

  const handleSuccess = () => {
    showNotification('success', 'API key created!');
  };

  return <button onClick={handleSuccess}>Create</button>;
}
```

### 실시간 로그 스트리밍

```typescript
// SSE를 통한 실시간 로그 구독
const { logs, toggleRealTimeStream } = useLogs();

useEffect(() => {
  const unsubscribe = toggleRealTimeStream(true);
  return () => unsubscribe();
}, []);

// logs가 실시간으로 업데이트됨
```

---

## 🔧 API 계약 (필요한 백엔드 엔드포인트)

### Phase 1 구현 후 필요한 엔드포인트

**API Keys**:
```
GET    /api/v2/console/api-keys
POST   /api/v2/console/api-keys
PUT    /api/v2/console/api-keys/:id
DELETE /api/v2/console/api-keys/:id
POST   /api/v2/console/api-keys/:id/revoke
POST   /api/v2/console/api-keys/:id/rotate
```

**Logs**:
```
GET    /api/v2/console/logs
GET    /api/v2/console/logs/:id
GET    /api/v2/console/logs/stats
GET    /api/v2/console/logs/search
GET    /api/v2/console/logs/export
GET    /api/v2/console/logs/stream  (Server-Sent Events)
```

---

## 🎨 디자인 언어

### 색상
```
Primary:   emerald-600  (#059669)
Success:   emerald-600
Error:     red-600
Warning:   orange-600
Info:      blue-600
```

### 컴포넌트
```
<button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
  Action
</button>

<div className="rounded-xl shadow-sm border border-slate-200 p-6">
  Card content
</div>
```

---

## 📚 주요 타입

### API Key
```typescript
interface APIKey {
  id: string;
  name: string;
  keyPrefix: string; // "glec_prod_..."
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scopes: APIScope[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}
```

### Log Entry
```typescript
interface APILog {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  statusCode: number;
  duration: number; // ms
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}
```

### Console Context
```typescript
interface ConsoleContextType {
  user: ConsoleUser | null;
  settings: ConsoleSettings;
  isLoading: boolean;
  notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null;
  showNotification(type, message): void;
}
```

---

## ✨ 기능 체크리스트

### ✅ Phase 1 (완료)
- [x] Type system
- [x] Service layer
- [x] Custom hooks
- [x] Global state
- [x] UI layout
- [x] 8개 페이지 스캐폰드
- [x] Routing

### ⏳ Phase 2 (다음)
- [ ] Dashboard 실제 데이터
- [ ] API Keys CRUD
- [ ] Logs SSE 스트리밍
- [ ] 필터링 & 검색
- [ ] Charts (Recharts)

### 🚀 Phase 3 (이후)
- [ ] Swagger UI
- [ ] Code samples
- [ ] Webhooks
- [ ] Integrations

### 🎯 Phase 4 (최종)
- [ ] Billing
- [ ] Settings
- [ ] 배포 검증

---

## 🔗 API 클라이언트 설정

### 환경 변수

```env
# .env (자동으로 읽음)
VITE_API_BASE_URL=http://localhost:3000/api/v2
```

### 토큰 관리

```typescript
// localStorage에서 자동으로 읽음
localStorage.setItem('auth_token', 'your-token-here');

// API 클라이언트가 자동으로 주입함
// Authorization: Bearer {token}
```

---

## 🧪 테스트 & 개발

### Build 확인
```bash
npm run build
# ✓ TypeScript 컴파일
# ✓ Vite 빌드
# ✓ 0 에러
```

### Dev Server 확인
```bash
npm run dev
# ✓ http://localhost:5173 접근 가능
```

### Linting
```bash
npm run lint
```

---

## 🐛 Debug 팁

### 상태 확인
```typescript
// useConsole를 통해 전역 상태 확인
const { user, isLoading, notification } = useConsole();
console.log('Current user:', user);
console.log('Loading:', isLoading);
```

### API 호출 로깅
```typescript
// apiClient.ts에 로그 추가
console.log(`API Request: ${endpoint}`, { method, params });
```

### SSE 디버깅
```typescript
// logsService.ts에서 이벤트 확인
eventSource.onmessage = (event) => {
  console.log('Log received:', event.data);
};
```

---

## 📖 문서 참고

- **[API_CONSOLE_ARCHITECTURE.md](./API_CONSOLE_ARCHITECTURE.md)** - 전체 설계
- **[API_CONSOLE_PHASE1_IMPLEMENTATION.md](./API_CONSOLE_PHASE1_IMPLEMENTATION.md)** - Phase 1 상세
- **[CONSOLE_STRUCTURE_DIAGRAM.md](./CONSOLE_STRUCTURE_DIAGRAM.md)** - 구조도
- **[API_CONSOLE_IMPLEMENTATION_PLAN.md](./API_CONSOLE_IMPLEMENTATION_PLAN.md)** - 구현 계획

---

## 🎓 학습 경로

1. **구조 이해** → CONSOLE_STRUCTURE_DIAGRAM.md 읽기
2. **타입 이해** → src/console/types/ 파일 읽기
3. **서비스 이해** → src/console/services/ 파일 읽기
4. **Hook 이해** → src/console/hooks/ 파일 읽기
5. **페이지 수정** → src/console/pages/ 파일 수정

---

## 🚀 Phase 2 준비하기

### 1. API 엔드포인트 확인
백엔드에서 다음 엔드포인트가 준비되었는지 확인:
- [ ] `/api/v2/console/api-keys`
- [ ] `/api/v2/console/logs`
- [ ] `/api/v2/console/logs/stream` (SSE)

### 2. Recharts 추가
```bash
npm install recharts
```

### 3. Dashboard 수정
Dashboard.tsx에서 mock 데이터를 API 호출로 변경

### 4. 테스트
모든 페이지에서 API 호출 테스트

---

## 💬 FAQ

**Q: 훅은 어디서 사용하나요?**
A: Pages 컴포넌트에서 `const { data, actions } = useAPIKeys()` 형태로 사용

**Q: API 토큰은 어디에 저장하나요?**
A: localStorage에 'auth_token' 키로 자동 저장/로드

**Q: 실시간 로그는 어떻게 작동하나요?**
A: SSE를 통해 백엔드에서 푸시 → 자동으로 화면 업데이트

**Q: 모의 데이터는 어디에 있나요?**
A: 각 페이지의 `const mockData = [...]` 또는 `const [state] = useState([...])`

**Q: 다음은 뭔가요?**
A: Phase 2에서 API 연결 및 실제 기능 구현

---

## 🎉 완료!

**Phase 1 구현 완료** → **API Console 기초 완성** → **Phase 2 준비 완료**

이제 Phase 2에서 실제 기능을 구현할 수 있습니다! 🚀

---

**마지막 업데이트**: 2026-02-04
