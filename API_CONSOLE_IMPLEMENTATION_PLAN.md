# 🛠️ GreenFlow API Console 구현 계획

**시작일**: 2026-02-05
**목표 완료**: 2026-03-05 (4주)
**우선순위**: Critical

---

## 📌 Phase 1: 기초 인프라 (1주)

### 1.1 디렉토리 구조 설정

```bash
projects/green-logistics-landing/src/
├── console/                      # NEW - API Console 관련
│   ├── pages/                    # Console 페이지
│   │   ├── Dashboard.tsx
│   │   ├── APIKeys.tsx
│   │   ├── Documentation.tsx
│   │   ├── Logs.tsx
│   │   ├── Webhooks.tsx
│   │   ├── Integrations.tsx
│   │   ├── Billing.tsx
│   │   └── Settings.tsx
│   │
│   ├── components/               # Console 컴포넌트
│   │   ├── ConsoleLayout.tsx     # 좌측 네비게이션 + 헤더
│   │   ├── DashboardWidgets.tsx  # 위젯 모음
│   │   ├── APIKeyManager.tsx
│   │   ├── LogViewer.tsx
│   │   ├── WebhookForm.tsx
│   │   ├── CodeSamples.tsx
│   │   ├── SwaggerUI.tsx
│   │   └── Charts/
│   │       ├── RequestTrendChart.tsx
│   │       ├── UsageChart.tsx
│   │       └── ErrorChart.tsx
│   │
│   ├── services/                 # Console 서비스
│   │   ├── apiKeyService.ts     # API 키 CRUD
│   │   ├── logsService.ts        # 로그 조회 & 스트리밍
│   │   ├── webhookService.ts     # 웹훅 관리
│   │   ├── billingService.ts     # 청구 정보
│   │   └── usageService.ts       # 사용량 조회
│   │
│   ├── hooks/                    # Console Hooks
│   │   ├── useAPIKeys.ts
│   │   ├── useLogs.ts
│   │   ├── useUsageMetrics.ts
│   │   └── useWebhooks.ts
│   │
│   ├── types/                    # Console 타입
│   │   ├── apiKey.ts
│   │   ├── logs.ts
│   │   ├── webhook.ts
│   │   ├── billing.ts
│   │   └── metrics.ts
│   │
│   └── context/
│       └── ConsoleContext.tsx    # Console 전역 상태

├── (기존)
│   ├── pages/
│   ├── components/
│   └── ...
```

### 1.2 라우팅 설정 (App.tsx 수정)

```typescript
// NEW Routes
<Route path="/console" element={<ProtectedRoute><ConsoleLayout /></ProtectedRoute>}>
  <Route index element={<Dashboard />} />
  <Route path="api-keys" element={<APIKeys />} />
  <Route path="documentation" element={<Documentation />} />
  <Route path="logs" element={<Logs />} />
  <Route path="webhooks" element={<Webhooks />} />
  <Route path="integrations" element={<Integrations />} />
  <Route path="billing" element={<Billing />} />
  <Route path="settings" element={<Settings />} />
</Route>
```

### 1.3 ConsoleLayout 컴포넌트

```typescript
// src/console/components/ConsoleLayout.tsx
export function ConsoleLayout() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* 좌측 사이드바 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900">API Console</h2>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {CONSOLE_NAV_ITEMS.map(item => (
            <NavLink key={item.path} to={item.path}>
              {item.icon} {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          {/* 사용자 프로필 */}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 검색, 필터 */}
          </div>
          <div className="flex items-center gap-4">
            {/* 알림, 프로필 */}
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

### 1.4 타입 정의

```typescript
// src/console/types/apiKey.ts
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;         // "pk_live_abc..."
  createdAt: Date;
  lastUsedAt?: Date;
  expiresAt?: Date;
  status: 'active' | 'revoked' | 'expired';
  scopes: APIScope[];
  rateLimit: number;         // requests per hour
  ipWhitelist?: string[];
  metadata?: Record<string, any>;
}

export type APIScope =
  | 'bid.read'
  | 'bid.write'
  | 'bid.delete'
  | 'fleet.read'
  | 'fleet.write'
  | 'proposal.read'
  | 'proposal.write'
  | 'order.read'
  | 'order.write'
  | 'webhooks.read'
  | 'webhooks.write'
  | 'logs.read';

export interface UsageMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  bandwidthUsage: {
    inbound: number;
    outbound: number;
  };
  topEndpoints: EndpointUsage[];
  topErrors: ErrorUsage[];
  requestsByHour: number[];
  errorsByHour: number[];
}
```

---

## 📌 Phase 2: 대시보드 & 메인 기능 (1주)

### 2.1 Dashboard 페이지

```typescript
// src/console/pages/Dashboard.tsx
export function Dashboard() {
  const { metrics, isLoading } = useUsageMetrics();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard</h1>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Total Requests"
          value="12,450"
          change="+5.2%"
          trend="up"
        />
        <MetricCard
          label="Success Rate"
          value="99.2%"
          change="+0.8%"
          trend="up"
        />
        <MetricCard
          label="Avg Response"
          value="145ms"
          change="-12ms"
          trend="up"
        />
        <MetricCard
          label="Error Count"
          value="28"
          change="-2"
          trend="up"
        />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card title="Request Trends (7 days)">
          <RequestTrendChart data={metrics.requestsByHour} />
        </Card>
        <Card title="Error Rate">
          <ErrorChart data={metrics.errorsByHour} />
        </Card>
      </div>

      {/* 테이블 */}
      <Card title="Top Endpoints">
        <EndpointTable endpoints={metrics.topEndpoints} />
      </Card>
    </div>
  );
}
```

### 2.2 API Keys 페이지

```typescript
// src/console/pages/APIKeys.tsx
export function APIKeys() {
  const { apiKeys, createKey, revokeKey, isLoading } = useAPIKeys();
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">API Keys</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
        >
          + New API Key
        </button>
      </div>

      {showCreateForm && (
        <APIKeyCreateForm
          onCreate={(key) => {
            createKey(key);
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* API Keys 테이블 */}
      <div className="bg-white rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 font-semibold">Name</th>
              <th className="text-left px-6 py-3 font-semibold">Key</th>
              <th className="text-left px-6 py-3 font-semibold">Created</th>
              <th className="text-left px-6 py-3 font-semibold">Last Used</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(key => (
              <APIKeyRow
                key={key.id}
                apiKey={key}
                onRevoke={() => revokeKey(key.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 2.3 Logs 페이지

```typescript
// src/console/pages/Logs.tsx
export function Logs() {
  const { logs, filters, setFilters, isStreaming } = useLogs();
  const [selectedLog, setSelectedLog] = useState<APILog | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">API Logs</h1>

      {/* 필터 */}
      <LogFilters filters={filters} onChange={setFilters} />

      {/* 실시간 스트림 토글 */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={isStreaming}
          onChange={(e) => {/* toggle streaming */}}
        />
        <label>Live Stream</label>
      </div>

      {/* 로그 리스트 */}
      <div className="space-y-2">
        {logs.map(log => (
          <LogRow
            key={log.id}
            log={log}
            onClick={() => setSelectedLog(log)}
            isSelected={selectedLog?.id === log.id}
          />
        ))}
      </div>

      {/* 상세 정보 패널 */}
      {selectedLog && (
        <LogDetailPanel
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
```

### 2.4 Custom Hooks

```typescript
// src/console/hooks/useAPIKeys.ts
export function useAPIKeys() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKey = async (data: CreateKeyInput) => {
    setIsLoading(true);
    try {
      const response = await apiKeyService.create(data);
      setApiKeys([...apiKeys, response]);
      showToast('API Key created', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Failed to create API Key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      await apiKeyService.revoke(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      showToast('API Key revoked', 'success');
    } catch (err) {
      showToast('Failed to revoke API Key', 'error');
    }
  };

  useEffect(() => {
    const fetchKeys = async () => {
      setIsLoading(true);
      try {
        const response = await apiKeyService.list();
        setApiKeys(response);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeys();
  }, []);

  return { apiKeys, createKey, revokeKey, isLoading, error };
}

// src/console/hooks/useLogs.ts
export function useLogs() {
  const [logs, setLogs] = useState<APILog[]>([]);
  const [filters, setFilters] = useState<LogFilter>({ limit: 100 });
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (isStreaming) {
      // EventSource를 통한 실시간 스트리밍
      eventSourceRef.current = new EventSource(
        `/api/v2/console/logs/stream?${qs.stringify(filters)}`
      );

      eventSourceRef.current.onmessage = (event) => {
        const newLog = JSON.parse(event.data);
        setLogs(prev => [newLog, ...prev].slice(0, 100));
      };
    } else {
      eventSourceRef.current?.close();
    }

    return () => eventSourceRef.current?.close();
  }, [isStreaming, filters]);

  return { logs, filters, setFilters, isStreaming, setIsStreaming };
}
```

---

## 📌 Phase 3: 문서 & 개발자 경험 (1주)

### 3.1 Documentation 페이지 (Swagger 통합)

```typescript
// src/console/pages/Documentation.tsx
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export function Documentation() {
  const [activeTab, setActiveTab] = useState<'api' | 'guides' | 'samples'>('api');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Documentation</h1>

      {/* 탭 네비게이션 */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        {['api', 'guides', 'samples'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 px-4 font-medium ${
              activeTab === tab
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600'
            }`}
          >
            {tab === 'api' ? 'API Reference'}
            {tab === 'guides' ? 'Guides'}
            {tab === 'samples' ? 'Code Samples'}
          </button>
        ))}
      </div>

      {/* API Reference (Swagger) */}
      {activeTab === 'api' && (
        <SwaggerUI url="/api/v2/openapi.json" />
      )}

      {/* Guides */}
      {activeTab === 'guides' && (
        <GuidesSection />
      )}

      {/* Code Samples */}
      {activeTab === 'samples' && (
        <CodeSamplesSection />
      )}
    </div>
  );
}

// 코드 샘플 컴포넌트
function CodeSamplesSection() {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const samples: Record<string, Record<string, string>> = {
    javascript: {
      'Get Bids': `
const response = await fetch('https://api.greenflow.io/api/v2/bids', {
  method: 'GET',
  headers: {
    'X-API-Key': 'pk_live_...',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log(data);
      `,
      'Create Bid': `
const response = await fetch('https://api.greenflow.io/api/v2/bids', {
  method: 'POST',
  headers: {
    'X-API-Key': 'pk_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    origin: 'Seoul',
    destination: 'Busan',
    cargoWeight: 10,
    budget: 500000
  })
});
const bid = await response.json();
      `
    },
    python: {
      'Get Bids': `
import requests

response = requests.get(
    'https://api.greenflow.io/api/v2/bids',
    headers={'X-API-Key': 'pk_live_...'}
)
data = response.json()
print(data)
      `,
      // ...
    },
    go: {
      // ...
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {Object.keys(samples).map(lang => (
          <button
            key={lang}
            onClick={() => setSelectedLanguage(lang)}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedLanguage === lang
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-900'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {Object.entries(samples[selectedLanguage] || {}).map(([title, code]) => (
          <CodeBlock
            key={title}
            title={title}
            code={code}
            language={selectedLanguage}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3.2 Webhooks 페이지

```typescript
// src/console/pages/Webhooks.tsx
export function Webhooks() {
  const { webhooks, createWebhook, deleteWebhook } = useWebhooks();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg"
        >
          + New Webhook
        </button>
      </div>

      {showForm && (
        <WebhookForm
          onSubmit={(data) => {
            createWebhook(data);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Webhooks 목록 */}
      <div className="space-y-4">
        {webhooks.map(webhook => (
          <WebhookCard
            key={webhook.id}
            webhook={webhook}
            onDelete={() => deleteWebhook(webhook.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Webhook 폼
function WebhookForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    retryPolicy: {
      maxAttempts: 5,
      timeout: 10000
    }
  });

  const AVAILABLE_EVENTS = [
    'bid.created',
    'bid.updated',
    'bid.closed',
    'proposal.created',
    'proposal.accepted',
    'order.created',
    'order.completed'
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Create New Webhook</h3>

      <div className="space-y-4">
        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Webhook URL</label>
          <input
            type="url"
            placeholder="https://example.com/webhooks"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-4 py-2"
          />
        </div>

        {/* Events Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Events</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_EVENTS.map(event => (
              <label key={event} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.events.includes(event)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        events: [...formData.events, event]
                      });
                    } else {
                      setFormData({
                        ...formData,
                        events: formData.events.filter(ev => ev !== event)
                      });
                    }
                  }}
                />
                <span className="text-sm">{event}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Retry Policy */}
        <div>
          <label className="block text-sm font-medium mb-2">Retry Policy</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600">Max Attempts</label>
              <input
                type="number"
                value={formData.retryPolicy.maxAttempts}
                onChange={(e) => setFormData({
                  ...formData,
                  retryPolicy: {
                    ...formData.retryPolicy,
                    maxAttempts: parseInt(e.target.value)
                  }
                })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Timeout (ms)</label>
              <input
                type="number"
                value={formData.retryPolicy.timeout}
                onChange={(e) => setFormData({
                  ...formData,
                  retryPolicy: {
                    ...formData.retryPolicy,
                    timeout: parseInt(e.target.value)
                  }
                })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => onSubmit(formData)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex-1"
          >
            Create Webhook
          </button>
          <button
            onClick={onCancel}
            className="border border-slate-300 px-4 py-2 rounded-lg flex-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 📌 Phase 4: 고급 기능 & 최적화 (1주)

### 4.1 Billing 페이지

```typescript
// src/console/pages/Billing.tsx
export function Billing() {
  const { billingInfo, invoices, usageData } = useBilling();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Billing</h1>

      {/* 현재 요금제 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-3xl font-bold text-emerald-600">Professional</p>
            <p className="text-slate-600">$99/month</p>
          </div>
          <button className="border border-slate-300 px-4 py-2 rounded-lg">
            Change Plan
          </button>
        </div>
      </div>

      {/* 사용량 기반 요금 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
        <div className="grid grid-cols-3 gap-4">
          <UsageItem
            label="API Requests"
            usage={usageData.requests}
            limit={1000000}
            price={0.0001}
          />
          <UsageItem
            label="Webhook Calls"
            usage={usageData.webhooks}
            limit={100000}
            price={0.001}
          />
          <UsageItem
            label="Storage"
            usage={usageData.storage}
            limit={100}
            price={10}
          />
        </div>
      </div>

      {/* 청구서 이력 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Invoices</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Amount</th>
              <th className="text-left py-2">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id} className="border-b">
                <td className="py-2">{invoice.date}</td>
                <td className="py-2">${invoice.amount}</td>
                <td className="py-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td>
                  <a href={`#`} className="text-emerald-600 hover:underline">
                    Download PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 4.2 Settings 페이지

```typescript
// src/console/pages/Settings.tsx
export function Settings() {
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'team'>('account');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

      {/* 탭 */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        {(['account', 'security', 'team'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-4 font-medium ${
              activeTab === tab
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-600'
            }`}
          >
            {tab === 'account' && 'Account'}
            {tab === 'security' && 'Security'}
            {tab === 'team' && 'Team'}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <AccountSettingsSection />
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <SecuritySettingsSection />
      )}

      {/* Team Settings */}
      {activeTab === 'team' && (
        <TeamSettingsSection />
      )}
    </div>
  );
}

// 보안 설정
function SecuritySettingsSection() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  return (
    <div className="space-y-8">
      {/* 2FA */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-slate-600">
              {twoFAEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={`px-4 py-2 rounded-lg font-medium ${
              twoFAEnabled
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {twoFAEnabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* 활성 세션 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <div>
                <p className="font-medium">{session.browser}</p>
                <p className="text-sm text-slate-600">
                  {session.device} • {session.location}
                </p>
              </div>
              <button
                onClick={() => {/* terminate session */}}
                className="text-red-600 text-sm hover:underline"
              >
                Terminate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 배포 및 검증 체크리스트

### 개발 완료 체크리스트
- [ ] 모든 페이지 컴포넌트 구현
- [ ] API 서비스 통합
- [ ] Swagger/OpenAPI 문서 생성
- [ ] 단위 테스트 작성 (80%+ 커버리지)
- [ ] E2E 테스트 (Playwright)

### 보안 검증
- [ ] XSS 취약점 검사
- [ ] CSRF 토큰 적용
- [ ] API Key 보안 (never log full keys)
- [ ] 민감한 데이터 마스킹
- [ ] Rate Limiting 적용

### 성능 최적화
- [ ] 번들 크기 최적화
- [ ] 이미지 최적화 (WebP)
- [ ] 캐싱 전략 수립
- [ ] 로드 시간 <3초
- [ ] Lighthouse 점수 >90

### 사용자 경험
- [ ] 모바일 반응형 디자인
- [ ] 접근성 (WCAG 2.1 AA)
- [ ] 다국어 지원 (영어, 한국어)
- [ ] 오프라인 모드
- [ ] 다크 모드 지원

---

## 📊 성공 지표

| 지표 | 목표 |
|------|------|
| API 가용성 | 99.9% |
| 응답시간 | <200ms (p95) |
| 에러율 | <0.5% |
| 개발자 만족도 | 4.5/5.0 ⭐ |
| 온보딩 시간 | <10분 |
| API 채택률 | 60%+ |

---

**상용화급 세계적 수준의 API 콘솔 구축을 시작합니다!** 🚀
