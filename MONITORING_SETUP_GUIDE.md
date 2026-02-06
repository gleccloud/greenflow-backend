# GreenFlow 모니터링 설정 가이드

**작성일**: 2026-02-04
**상태**: 📊 모니터링 설정 준비
**목표**: 프로덕션 환경 실시간 모니터링

---

## 🎯 모니터링 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│              GreenFlow 모니터링 스택                      │
└─────────────────────────────────────────────────────────┘

┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ 백엔드 API  │  │ 프론트엔드   │  │ 데이터베이스 │
│   메트릭    │  │   분석       │  │   성능       │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ├─────────────────┼─────────────────┤
       │                 │                 │
   ┌───▼────────────┐ ┌──▼──────────┐ ┌──▼──────────┐
   │ Prometheus     │ │ Sentry      │ │ CloudWatch  │
   │ (메트릭)       │ │ (에러 추적) │ │ (AWS 메트릭)│
   └───┬────────────┘ └──┬──────────┘ └──┬──────────┘
       │                 │                 │
       ├─────────────────┼─────────────────┤
       │                 │                 │
   ┌───▼──────────────────────────────────┐
   │  Grafana                              │
   │  (통합 대시보드)                      │
   └────────────────────────────────────┘
         │
    ┌────▼──────┐
    │ Slack     │
    │ PagerDuty │
    │ 이메일    │
    └───────────┘
```

---

## 1️⃣ Prometheus 설정

### 설치 (Docker 또는 쿠버네티스)

**Docker Compose:**
```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  command:
    - "--config.file=/etc/prometheus/prometheus.yml"
    - "--storage.tsdb.path=/prometheus"
    - "--storage.tsdb.retention.time=30d"
```

### Prometheus 설정 (prometheus.yml)

```yaml
global:
  scrape_interval: 15s          # 메트릭 수집 간격
  evaluation_interval: 15s      # 알림 평가 간격
  external_labels:
    monitor: 'greenflow-production'
    environment: 'production'

# 알림 규칙
rule_files:
  - '/etc/prometheus/rules/*.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']  # AlertManager

# 스크랩 설정
scrape_configs:
  # 백엔드 API
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/api/v2/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s

  # 프로메테우스 자체
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # PostgreSQL (postgresql_exporter)
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis (redis_exporter)
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node Exporter (시스템 메트릭)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Prometheus 알림 규칙 (rules.yml)

```yaml
groups:
  - name: greenflow_alerts
    interval: 30s
    rules:
      # 에러율 높음
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m])) by (job) /
           sum(rate(http_requests_total[5m])) by (job)) > 0.05
        for: 5m
        labels:
          severity: critical
          service: backend
        annotations:
          summary: "높은 에러율 감지 ({{ $value | humanizePercentage }})"
          description: "{{ $labels.job }}에서 에러율이 5% 이상입니다"

      # 응답 시간 느림
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
          service: backend
        annotations:
          summary: "높은 응답 시간 ({{ $value | printf \"%.2f\" }}s)"
          description: "{{ $labels.job }}의 P95 응답 시간이 500ms 이상입니다"

      # CPU 사용률 높음
      - alert: HighCPUUsage
        expr: node_cpu_seconds_total > 0.8
        for: 5m
        labels:
          severity: warning
          type: infrastructure
        annotations:
          summary: "높은 CPU 사용률 ({{ $value | humanizePercentage }})"

      # 메모리 사용률 높음
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85
        for: 5m
        labels:
          severity: warning
          type: infrastructure
        annotations:
          summary: "높은 메모리 사용률 ({{ $value | humanizePercentage }})"

      # 데이터베이스 연결 수 높음
      - alert: HighDatabaseConnections
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
          service: database
        annotations:
          summary: "높은 데이터베이스 연결 수 ({{ $value }})"

      # Redis 메모리 부족
      - alert: RedisMemporyHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 5m
        labels:
          severity: warning
          service: cache
        annotations:
          summary: "Redis 메모리 사용률 높음 ({{ $value | humanizePercentage }})"
```

---

## 2️⃣ Grafana 설정

### Grafana 설치

```yaml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3000:3000"
  environment:
    GF_SECURITY_ADMIN_USER: admin
    GF_SECURITY_ADMIN_PASSWORD: admin
    GF_INSTALL_PLUGINS: grafana-piechart-panel
  volumes:
    - grafana-data:/var/lib/grafana
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
```

### Grafana 대시보드 설정

#### 1단계: Prometheus 데이터 소스 추가

```json
{
  "name": "Prometheus",
  "type": "prometheus",
  "url": "http://prometheus:9090",
  "access": "browser",
  "isDefault": true,
  "jsonData": {
    "timeInterval": "15s"
  }
}
```

#### 2단계: 대시보드 생성

**대시보드 1: API 성능**

```
Panel 1: 요청 처리량
PromQL: sum(rate(http_requests_total[5m])) by (method)

Panel 2: 에러율
PromQL: sum(rate(http_requests_total{status=~"5.."}[5m])) /
        sum(rate(http_requests_total[5m]))

Panel 3: 응답 시간 (P95)
PromQL: histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

Panel 4: 활성 연결
PromQL: sum(http_request_duration_seconds_count) by (endpoint)
```

**대시보드 2: 인프라 모니터링**

```
Panel 1: CPU 사용률
PromQL: 100 - (avg by (instance)
        (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

Panel 2: 메모리 사용률
PromQL: (1 - (node_memory_MemAvailable_bytes /
        node_memory_MemTotal_bytes)) * 100

Panel 3: 디스크 사용률
PromQL: (node_filesystem_size_bytes - node_filesystem_avail_bytes) /
        node_filesystem_size_bytes * 100

Panel 4: 네트워크 I/O
PromQL: rate(node_network_receive_bytes_total[5m])
```

**대시보드 3: 데이터베이스 성능**

```
Panel 1: 쿼리 시간 (P95)
PromQL: histogram_quantile(0.95, pg_stat_statements_query_time_bucket)

Panel 2: DB 연결 수
PromQL: pg_stat_activity_count

Panel 3: TPS (트랜잭션/초)
PromQL: rate(pg_stat_database_xact_commit[5m])

Panel 4: 캐시 히트율
PromQL: 100 * pg_stat_database_heap_blks_hit /
        (pg_stat_database_heap_blks_hit + pg_stat_database_heap_blks_read)
```

---

## 3️⃣ Sentry 설정 (에러 추적)

### Sentry 프로젝트 생성

```bash
# Sentry에 가입 및 프로젝트 생성
# https://sentry.io/signup/

# 프로젝트 생성 후 DSN 획득
DSN=https://your-key@sentry.io/project-id
```

### 백엔드 통합 (NestJS)

```bash
npm install @sentry/node @sentry/tracing
```

**main.ts 수정:**
```typescript
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

async function bootstrap() {
  // Sentry 초기화
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Express.Tracing(),
    ],
  });

  const app = await NestFactory.create(AppModule);

  // Sentry 미들웨어
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());

  await app.listen(3000);
}

bootstrap();
```

### 프론트엔드 통합 (React)

```bash
npm install @sentry/react @sentry/tracing
```

**main.tsx 수정:**
```typescript
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const App = Sentry.withProfiler(() => (
  // 앱 내용
));
```

---

## 4️⃣ Google Analytics 4 설정

### GA4 속성 생성

```bash
# Google Analytics에서 새 속성 생성
# 속성 > 데이터 스트림 > 웹
# Measurement ID 획득: G-XXXXXXXXXX
```

### 프론트엔드 통합

```bash
npm install @react-google-analytics/core
```

**App.tsx 수정:**
```typescript
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Google Analytics 스크립트 로드
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // gtag 설정
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', import.meta.env.VITE_GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
  }, []);

  return (
    // 앱 내용
  );
}
```

### 중요 이벤트 추적

```typescript
// 로그인 이벤트
window.gtag('event', 'login', {
  method: 'email',
});

// 구매 이벤트
window.gtag('event', 'purchase', {
  value: 99.99,
  currency: 'USD',
  items: [
    {
      item_id: '123',
      item_name: 'Premium Plan',
    },
  ],
});

// 에러 이벤트
window.gtag('event', 'exception', {
  description: 'Error: API call failed',
});
```

---

## 5️⃣ CloudWatch 설정 (AWS)

### CloudWatch 로그 그룹 생성

```bash
# 백엔드 로그 그룹
aws logs create-log-group --log-group-name /ecs/greenflow-api

# 프로덕션 로그 스트림
aws logs create-log-stream \
  --log-group-name /ecs/greenflow-api \
  --log-stream-name prod
```

### CloudWatch 대시보드 생성

```bash
aws cloudwatch put-dashboard \
  --dashboard-name GreenFlow-Production \
  --dashboard-body file://dashboard-body.json
```

**dashboard-body.json:**
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "app/greenflow"],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "app/greenflow"],
          ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "greenflow-prod"],
          ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "greenflow-prod"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "프로덕션 메트릭"
      }
    }
  ]
}
```

---

## 6️⃣ 알림 규칙 설정

### Slack 알림

```yaml
# AlertManager 설정 (alertmanager.yml)
global:
  resolve_timeout: 5m

route:
  receiver: 'slack'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#greenflow-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
```

### PagerDuty 알림

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR-PAGERDUTY-SERVICE-KEY'
        description: '{{ .GroupLabels.alertname }}'
        severity: '{{ if eq .Status "firing" }}critical{{ else }}resolve{{ end }}'
```

### 이메일 알림

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@greenflow.dev'
        from: 'prometheus@greenflow.dev'
        smarthost: 'smtp.sendgrid.net:587'
        auth_username: 'apikey'
        auth_password: 'SG.YOUR-SENDGRID-KEY'
        html: |
          <h2>{{ .GroupLabels.alertname }}</h2>
          {{ range .Alerts }}
          <p>{{ .Annotations.description }}</p>
          {{ end }}
```

---

## 📊 모니터링 대시보드 접근

| 서비스 | URL | 인증 |
|--------|-----|------|
| **Prometheus** | http://localhost:9090 | 없음 |
| **Grafana** | http://localhost:3000 | admin/admin |
| **Sentry** | https://sentry.io | 자신의 계정 |
| **Google Analytics** | https://analytics.google.com | Google 계정 |
| **CloudWatch** | AWS Console | IAM 인증 |

---

## 🔔 모니터링 체크리스트

배포 전 확인:

- [ ] Prometheus 서비스 실행 확인
- [ ] Grafana 대시보드 생성 완료
- [ ] Sentry DSN 설정 완료
- [ ] Google Analytics 추적 활성화
- [ ] CloudWatch 로그 그룹 생성 완료
- [ ] 알림 규칙 모두 활성화
- [ ] Slack/Email 알림 테스트

배포 후 확인:

- [ ] Prometheus가 메트릭 수집 중
- [ ] Grafana 대시보드에 데이터 표시
- [ ] Sentry에서 에러 기록 시작
- [ ] Google Analytics에서 사용자 추적
- [ ] CloudWatch 로그에 데이터 저장
- [ ] 알림이 정상 작동

---

## 📈 모니터링 지표 목표

| 지표 | 목표 | 경고 | 심각 |
|------|------|------|------|
| 에러율 | < 1% | > 2% | > 5% |
| 응답 시간 (P95) | < 300ms | > 500ms | > 1000ms |
| CPU 사용률 | < 50% | > 70% | > 90% |
| 메모리 사용률 | < 60% | > 75% | > 85% |
| 디스크 사용률 | < 70% | > 80% | > 90% |
| DB 연결 수 | < 50 | > 70 | > 100 |
| 캐시 히트율 | > 80% | < 70% | < 50% |

---

**모니터링 설정 완료**: 2026-02-04
**상태**: 📊 준비 완료
**다음**: 프로덕션 배포 시 모니터링 활성화

GreenFlow의 안정적인 운영을 위해 완벽한 모니터링 체계를 구축했습니다! 📊
