# GreenFlow 프로덕션 배포 전략

**작성일**: 2026-02-04
**상태**: 📋 계획 수립
**목표 배포일**: 2026-02-11 (1주일 후)

---

## 📊 배포 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    프로덕션 환경                          │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────┐
│         CDN / WAF            │     Load Balancer        │
│   (Cloudflare / AWS WAF)    │  (AWS ALB / GCP LB)      │
└──────────────┬───────────────┴──────────────┬───────────┘
               │                              │
        ┌──────▼──────┐            ┌──────────▼─────────┐
        │ Frontend     │            │  Backend           │
        │ (Vercel)     │            │  (ECS/Cloud Run)   │
        │              │            │                    │
        │ greenflow.   │            │ greenflow-api.     │
        │ dev          │            │ dev                │
        └──────┬───────┘            └──────────┬─────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
    ┌───▼────────┐    ┌──────▼──────┐    ┌────────▼──┐
    │ PostgreSQL │    │   Redis     │    │   S3      │
    │ (RDS)      │    │ (ElastiCache)   (Cloud      │
    │            │    │                 │  Storage) │
    │ Multi-AZ   │    │ Cluster Mode│    │           │
    │ Read Repls │    │ enabled     │    │ Backup    │
    └────────────┘    └─────────────┘    └───────────┘
```

---

## 🎯 배포 전략: Blue-Green + Canary

### Phase 1: Blue-Green 배포 (기본)

**Blue 환경** (현재 라이브)
- 프로덕션 v1.0
- 100% 트래픽 수신

**Green 환경** (새 버전)
- 프로덕션 v2.0 (빌드 준비)
- 0% 트래픽 (테스트용)

**전환 순서:**
```
1. Green 환경 배포 → 통과 테스트
2. Load Balancer Blue → Green 전환
3. Blue 환경 유지 (롤백 대비)
4. 30분 모니터링 후 Blue 제거
```

### Phase 2: Canary 배포 (점진적 롤아웃)

**1단계**: 5% 트래픽 Green으로 라우팅 (10분)
- 에러율 < 1%
- 응답 시간 < 500ms

**2단계**: 25% 트래픽 Green으로 라우팅 (15분)
- 에러율 < 1%
- 응답 시간 < 500ms

**3단계**: 50% 트래픽 Green으로 라우팅 (15분)
- 에러율 < 1%
- 응답 시간 < 500ms

**4단계**: 100% 트래픽 Green으로 라우팅 (완료)

**자동 롤백 조건:**
- 에러율 > 5%
- 응답 시간 > 1000ms
- CPU 사용률 > 80%
- 메모리 사용률 > 85%

---

## 📋 프로덕션 배포 체크리스트

### 배포 전 (1주일)

#### 1. 코드 리뷰 & 테스트
- [ ] 스테이징에서 48시간 안정성 테스트
- [ ] E2E 테스트 100% 통과
- [ ] 성능 테스트 완료 (Lighthouse > 80)
- [ ] 보안 점검 완료 (OWASP Top 10)
- [ ] 데이터 마이그레이션 테스트

```bash
# 테스트 실행
npm run test:integration
npm run test:e2e:deployment
npm run build:performance
npm run security:audit
```

#### 2. 데이터베이스 준비
- [ ] 프로덕션 RDS 인스턴스 생성
  - Instance: db.t3.small 이상
  - Storage: 500GB (초기)
  - Multi-AZ: 예 (고가용성)
  - Backup: 30일 보관
  - IAM 인증: 활성화

- [ ] 읽기 복제본 생성 (재해 복구)
- [ ] 데이터 백업 계획 수립

```bash
# RDS 스냅샷 생성
aws rds create-db-snapshot \
  --db-instance-identifier greenflow-prod \
  --db-snapshot-identifier greenflow-prod-2026-02-04
```

- [ ] 데이터베이스 마이그레이션 스크립트 검증
- [ ] 마이그레이션 예상 시간 계산

#### 3. Redis 설정
- [ ] ElastiCache 클러스터 생성
  - Node type: cache.t3.small 이상
  - Num cache nodes: 3 (고가용성)
  - Automatic failover: 예
  - Encryption at rest/transit: 활성화

- [ ] Redis 클러스터 성능 테스트

#### 4. 환경 변수 설정
- [ ] `.env.production` 파일 생성 (민감한 정보는 AWS Secrets Manager/GCP Secret Manager 사용)
- [ ] 모든 환경 변수 검증
- [ ] 암호화 키 생성 (JWT, 데이터베이스 암호)

```bash
# .env.production 생성 (템플릿)
cat > .env.production << 'EOF'
NODE_ENV=production
API_PORT=3000
DATABASE_HOST=greenflow-prod-db.c9akciq32.us-east-1.rds.amazonaws.com
DATABASE_NAME=glec_prod
# ... 기타 설정
EOF
```

#### 5. 모니터링 & 알림 설정
- [ ] Sentry 프로덕션 프로젝트 생성
- [ ] Google Analytics 4 설정 (방문자 추적)
- [ ] CloudWatch 대시보드 생성
- [ ] Slack/PagerDuty 알림 설정

```bash
# CloudWatch 대시보드 생성
aws cloudwatch put-dashboard \
  --dashboard-name GreenFlow-Production \
  --dashboard-body file://dashboard-config.json
```

#### 6. CDN & 보안 설정
- [ ] Cloudflare 또는 AWS CloudFront 설정
  - HTTPS 강제
  - DDoS 보호
  - 지역 제한 (필요시)

- [ ] WAF (Web Application Firewall) 설정
  - SQL Injection 방지
  - XSS 방지
  - Rate limiting

- [ ] Security Headers 설정
```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

---

### 배포 당일 (4-6시간)

#### 1. 배포 전 최종 확인 (1시간)

체크리스트:
```
□ 모든 팀원 대기 (Slack 채널 활성화)
□ 배포 롤백 담당자 지정
□ 모니터링 대시보드 열기
□ 데이터베이스 백업 확인
□ 스테이징 환경 최종 테스트
□ 배포 계획 전체 팀 검토
```

#### 2. Blue-Green 배포 실행 (2-3시간)

**Step 1: Green 환경 배포 (1시간)**

```bash
# 1. ECR/Artifact Registry에 프로덕션 이미지 푸시
docker tag glec-api:latest AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/glec-api:prod-v2.0
docker push AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/glec-api:prod-v2.0

docker tag greenflow-frontend:latest AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:prod-v2.0
docker push AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/greenflow-frontend:prod-v2.0

# 2. Green 환경 배포
aws ecs create-service \
  --cluster greenflow-production-green \
  --service-name greenflow-api \
  --task-definition greenflow-api:prod-v2.0 \
  --desired-count 3

# 3. 헬스 체크 확인
for i in {1..30}; do
  STATUS=$(aws ecs describe-services \
    --cluster greenflow-production-green \
    --services greenflow-api \
    --query 'services[0].runningCount')
  echo "Running instances: $STATUS (attempt $i/30)"
  [ "$STATUS" = "3" ] && break
  sleep 10
done
```

**Step 2: Green 환경 테스트 (30분)**

```bash
# 1. 헬스 체크
curl https://green-api.greenflow.dev/api/v2/health

# 2. E2E 테스트
BASE_URL=https://green.greenflow.dev npm run test:e2e:deployment

# 3. 성능 테스트
apache2-benchmark -n 100 -c 10 https://green-api.greenflow.dev/api/v2/health

# 4. 에러 모니터링
curl https://green-api.greenflow.dev/api/v2/status
```

**Step 3: Load Balancer 전환 (30분)**

```bash
# 1. 현재 가중치 확인
aws elbv2 describe-target-groups \
  --load-balancer-arn arn:aws:elasticloadbalancing:...

# 2. Blue → Green 가중치 변경
# Blue: 100% → 0%
# Green: 0% → 100%

aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:...:targetgroup/greenflow-blue/... \
  --attributes Key=stickiness.lb_cookie.enabled,Value=false

# 3. Traffic Shift (점진적)
# 첫 번째: 90% Blue, 10% Green (5분)
# 두 번째: 50% Blue, 50% Green (10분)
# 세 번째: 0% Blue, 100% Green (완료)
```

**Step 4: 모니터링 (30분)**

```bash
# 1. 에러율 확인
watch -n 5 'curl -s https://greenflow.dev/api/v2/health | jq .error_rate'

# 2. 응답 시간 확인
watch -n 5 'curl -w "@curl-format.txt" -o /dev/null -s https://greenflow.dev/api/v2/health'

# 3. 데이터베이스 성능
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=greenflow-prod \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-11T01:00:00Z \
  --period 300 \
  --statistics Average
```

#### 3. Canary 배포 (선택사항, 더 안전함)

만약 Blue-Green 후 추가 안정성을 원하면:

```bash
# 1. 5% 트래픽을 Green으로 (10분)
aws elbv2 modify-listener \
  --load-balancer-arn ... \
  --default-actions Type=forward,ForwardConfig='{
    TargetGroups: [
      {TargetGroupArn: ...:greenflow-blue, Weight: 95},
      {TargetGroupArn: ...:greenflow-green, Weight: 5}
    ]
  }'

# 2. 메트릭 모니터링
for i in {1..10}; do
  ERROR_RATE=$(aws cloudwatch get-metric-statistics \
    --metric-name ErrorRate --statistics Average | jq '.Datapoints[0].Average')
  echo "Error Rate: ${ERROR_RATE}% (minute $i)"
  sleep 60
done

# 3. 25% 트래픽 전환 (15분)
# 4. 50% 트래픽 전환 (15분)
# 5. 100% 트래픽 전환 (완료)
```

#### 4. 배포 완료 & 확인 (1시간)

```bash
# 1. 프로덕션 환경 최종 확인
curl -I https://greenflow.dev
curl -I https://greenflow.dev/api/v2/health

# 2. SSL 인증서 확인
openssl s_client -connect greenflow.dev:443 -brief

# 3. 성능 메트릭 확인
lighthouse https://greenflow.dev

# 4. 모니터링 대시보드 확인
# Sentry, CloudWatch, Google Analytics 확인

# 5. 배포 공지
# 슬랙/이메일로 배포 완료 알림

# 6. Blue 환경 유지 (최소 24시간)
# 롤백 필요시 빠르게 대응 가능
```

---

## 🚨 롤백 절차 (긴급)

**롤백이 필요한 경우:**
- 에러율 5% 이상
- 응답 시간 > 1000ms (지속)
- 데이터베이스 연결 실패
- 주요 기능 오작동

**롤백 실행 (5분 이내):**

```bash
# 1. Load Balancer를 Blue로 즉시 전환
aws elbv2 modify-listener \
  --load-balancer-arn ... \
  --default-actions Type=forward,TargetGroupArn=greenflow-blue

# 2. Green 환경 중지
aws ecs update-service \
  --cluster greenflow-production-green \
  --service greenflow-api \
  --desired-count 0

# 3. 상태 확인
curl https://greenflow.dev/api/v2/health

# 4. 팀 알림
# 슬랙에 롤백 공지
```

**사후 분석:**
- [ ] 에러 로그 분석 (Sentry)
- [ ] 원인 파악 및 문서화
- [ ] 수정 계획 수립
- [ ] 24시간 후 재배포

---

## 📊 배포 후 모니터링 (1주일)

### 일별 모니터링

**Day 1: 배포 당일**
- 30분마다 상태 확인
- 에러율, 응답시간 모니터링
- 사용자 피드백 수집

**Day 2-3: 안정성 확인**
- 매 시간 메트릭 확인
- 데이터베이스 성능 모니터링
- 자동화된 테스트 재실행

**Day 4-7: 정상 운영**
- 일일 1회 상태 확인
- 주간 성능 보고서 작성
- Blue 환경 제거 (72시간 후)

### 모니터링 메트릭

```
┌──────────────────────────────────────┐
│      프로덕션 모니터링 메트릭          │
├──────────────────────────────────────┤
│ • 에러율: < 1% (목표)                 │
│ • 응답시간: < 500ms (P95)             │
│ • CPU 사용률: < 70%                   │
│ • 메모리 사용률: < 75%                │
│ • 데이터베이스 쿼리: < 100ms (평균)   │
│ • 동시 사용자: 수용 범위 내            │
│ • 가용성: 99.9% (4시간 이상)          │
└──────────────────────────────────────┘
```

---

## 🔐 프로덕션 보안 점검

- [ ] WAF 규칙 활성화 확인
- [ ] HTTPS 강제 설정 확인
- [ ] 데이터베이스 암호화 활성화
- [ ] 백업 정책 적용 확인
- [ ] 접근 제어 (IAM) 설정 확인
- [ ] 로그 저장 정책 확인

---

## 📞 배포 담당 연락처

| 역할 | 이름 | 연락처 | 시간대 |
|------|------|-------|-------|
| 배포 리더 | - | - | 24시간 |
| 백엔드 담당 | - | - | 24시간 |
| 프론트엔드 담당 | - | - | 24시간 |
| DB 담당 | - | - | 24시간 |
| 모니터링 담당 | - | - | 24시간 |

---

## 🎉 배포 후 (완료)

- [ ] 팀 회고 (배포 후 24시간)
- [ ] 배포 문서 업데이트
- [ ] 다음 배포 개선 사항 기록
- [ ] 사용자 피드백 수집

---

**예상 배포일**: 2026-02-11
**배포 소요 시간**: 4-6시간
**롤백 시간**: < 5분
**다운타임**: 0분 (무중단 배포)

GreenFlow 프로덕션 배포를 성공적으로 진행하겠습니다! 🚀
