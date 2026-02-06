# GreenFlow LocalStack 기반 완전 로컬 배포 가이드

**작성일**: 2026-02-04
**상태**: ✅ **완전 로컬 배포 환경 준비 완료**
**특징**: AWS 계정 없이 로컬에서 완전한 배포 환경 테스트 가능

---

## 🎯 LocalStack이란?

LocalStack은 AWS 서비스를 로컬에서 에뮬레이션하는 오픈소스 도구입니다.

### 지원 서비스 (20+)

```
✅ S3          - 객체 저장소
✅ SQS         - 메시지 큐
✅ SNS         - 발행-구독 메시징
✅ DynamoDB    - NoSQL 데이터베이스
✅ Lambda      - 서버리스 함수
✅ RDS         - 관계형 데이터베이스
✅ ElastiCache - 캐시
✅ CloudWatch  - 모니터링
✅ Secrets Manager - 시크릿 관리
✅ IAM         - 신원 및 접근 관리
✅ KMS         - 암호화 키 관리
✅ 그 외 다수...
```

### 장점

- ✅ **완전 오프라인**: 인터넷 연결 불필요
- ✅ **개발 환경**: AWS 무료 계정 불필요
- ✅ **빠른 테스트**: Docker로 즉시 시작
- ✅ **비용 절감**: AWS 비용 없음
- ✅ **CI/CD 통합**: 자동화된 테스트 가능

---

## 🚀 빠른 시작 (5분)

### 1단계: LocalStack 배포 실행

```bash
bash scripts/localstack-deploy.sh
```

**예상 시간**: 2-3분

**결과**:
```
✅ LocalStack 시작
✅ PostgreSQL 시작
✅ Redis 시작
✅ 백엔드 API 시작
✅ 프론트엔드 시작
✅ 모니터링 스택 시작
```

### 2단계: 서비스 접속

```bash
# 프론트엔드 (Vite)
open http://localhost:5173

# 백엔드 API
curl http://localhost:3000/api/v2/health

# LocalStack Web UI
open http://localhost:8080

# pgAdmin (데이터베이스 관리)
open http://localhost:5050

# Grafana (모니터링)
open http://localhost:3001
```

### 3단계: 배포 테스트

```bash
# E2E 테스트
cd projects/green-logistics-landing
npm run test:e2e:deployment

# 백엔드 테스트
cd projects/glec-api-backend
npm test
```

---

## 📊 구성 요소

### 1. LocalStack (AWS 에뮬레이션)

```
서비스                포트        용도
────────────────────────────────────────
LocalStack Endpoint   4566        모든 AWS 서비스
LocalStack UI         8080        서비스 관리 및 모니터링
```

**활성화된 서비스**:
- S3: 객체 저장소
- SQS: 메시지 큐
- SNS: 이벤트 알림
- DynamoDB: 문서 데이터베이스
- Secrets Manager: 시크릿 관리
- CloudWatch: 로깅 및 모니터링
- KMS: 암호화

### 2. 데이터베이스

```
서비스            포트     호스트명    사용자         비밀번호
─────────────────────────────────────────────────────────
PostgreSQL       5432    postgres    greenflow_user  greenflow_password
pgAdmin          5050    -           admin@greenflow -
Redis            6379    redis       (인증 없음)     -
```

### 3. 백엔드 (NestJS)

```
API Endpoint:        http://localhost:3000
Health Check:        http://localhost:3000/api/v2/health
GraphQL Playground:  http://localhost:3000/graphql
Swagger Docs:        http://localhost:3000/api-docs
```

### 4. 프론트엔드 (React + Vite)

```
개발 서버:    http://localhost:5173
API Base:    http://localhost:3000/api/v2
```

### 5. 모니터링

```
서비스            포트    URL
────────────────────────────────────────
Prometheus       9090    http://localhost:9090
Grafana          3001    http://localhost:3001 (admin/admin)
Redis UI         8081    http://localhost:8081
```

---

## 🎮 LocalStack 사용 예제

### 1. S3 버킷과 상호작용

```bash
# 버킷 목록 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 ls

# 파일 업로드
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 cp /tmp/test.txt s3://greenflow-dev/test.txt

# 파일 다운로드
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 cp s3://greenflow-dev/test.txt /tmp/test-download.txt
```

### 2. DynamoDB 테이블과 상호작용

```bash
# 테이블 목록 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal dynamodb list-tables

# 항목 추가
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal dynamodb put-item \
    --table-name greenflow-user-preferences \
    --item '{
      "user_id": {"S": "user123"},
      "preferences": {"S": "{}"}
    }'

# 항목 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal dynamodb get-item \
    --table-name greenflow-user-preferences \
    --key '{"user_id": {"S": "user123"}}'
```

### 3. SQS 메시지 큐와 상호작용

```bash
# 큐 목록 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sqs list-queues

# 메시지 전송
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sqs send-message \
    --queue-url http://localhost:4566/000000000000/greenflow-notifications \
    --message-body '{"event": "order_created", "orderId": "12345"}'

# 메시지 수신
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sqs receive-message \
    --queue-url http://localhost:4566/000000000000/greenflow-notifications
```

### 4. 시크릿 관리

```bash
# 시크릿 목록 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal secretsmanager list-secrets

# 시크릿 조회
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal secretsmanager get-secret-value \
    --secret-id greenflow/db/password

# 시크릿 업데이트
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal secretsmanager update-secret \
    --secret-id greenflow/db/password \
    --secret-string "new-password"
```

---

## 🧪 테스트 및 검증

### 1. 헬스 체크

```bash
# API 헬스 체크
curl http://localhost:3000/api/v2/health

# 예상 응답
{
  "status": "ok",
  "timestamp": "2026-02-04T12:00:00Z",
  "database": "connected",
  "redis": "connected",
  "localstack": "connected"
}
```

### 2. E2E 테스트

```bash
# 프론트엔드 E2E 테스트
cd projects/green-logistics-landing
npm run test:e2e

# 백엔드 통합 테스트
cd projects/glec-api-backend
npm run test:integration
```

### 3. 부하 테스트

```bash
# Apache Bench로 부하 테스트
ab -n 1000 -c 10 http://localhost:3000/api/v2/health

# Wrk로 더 자세한 부하 테스트
wrk -t12 -c400 -d30s http://localhost:3000/api/v2/health
```

---

## 📋 배포 후 관리

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.localstack.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.localstack.yml logs -f backend
docker-compose -f docker-compose.localstack.yml logs -f localstack
docker-compose -f docker-compose.localstack.yml logs -f postgres
```

### 서비스 관리

```bash
# 서비스 재시작
docker-compose -f docker-compose.localstack.yml restart backend

# 특정 서비스 중지
docker-compose -f docker-compose.localstack.yml stop localstack

# 모든 서비스 중지
docker-compose -f docker-compose.localstack.yml down

# 데이터와 함께 삭제
docker-compose -f docker-compose.localstack.yml down -v
```

### 환경 변수 확인

```bash
# 현재 설정 확인
docker-compose -f docker-compose.localstack.yml config

# 특정 서비스 환경 변수 확인
docker-compose -f docker-compose.localstack.yml config --services
```

---

## 🔧 고급 사용법

### 1. 커스텀 Lambda 함수 배포

```bash
# Lambda 함수 생성
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal lambda create-function \
    --function-name greenflow-processor \
    --runtime nodejs18.x \
    --role arn:aws:iam::000000000000:role/greenflow-task-role \
    --handler index.handler \
    --zip-file fileb:///tmp/function.zip

# Lambda 함수 호출
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal lambda invoke \
    --function-name greenflow-processor \
    /tmp/response.json
```

### 2. SNS 주제 구독

```bash
# SNS 주제 생성
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sns create-topic --name greenflow-events

# SQS 큐로 구독
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:000000000000:greenflow-events \
    --protocol sqs \
    --notification-endpoint arn:aws:sqs:us-east-1:000000000000:greenflow-notifications

# 메시지 발행
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sns publish \
    --topic-arn arn:aws:sns:us-east-1:000000000000:greenflow-events \
    --message '{"event": "order_created", "orderId": "12345"}'
```

### 3. 데이터 지속성 설정

LocalStack 데이터는 `localstack-data` 볼륨에 저장됩니다.

```bash
# 데이터 백업
docker cp greenflow-localstack:/tmp/localstack/data ./backup/localstack-data

# 데이터 복원
docker cp ./backup/localstack-data greenflow-localstack:/tmp/localstack/data
docker-compose -f docker-compose.localstack.yml restart localstack
```

---

## 🐛 문제 해결

### 문제 1: LocalStack 준비 지연

```bash
# 로그 확인
docker-compose -f docker-compose.localstack.yml logs localstack

# LocalStack 상태 확인
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal kinesis list-streams
```

### 문제 2: 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :4566
lsof -i :5432
lsof -i :3000

# 기존 컨테이너 정리
docker-compose -f docker-compose.localstack.yml down -v
docker system prune -a
```

### 문제 3: 데이터베이스 연결 실패

```bash
# PostgreSQL 연결 확인
docker-compose -f docker-compose.localstack.yml exec postgres \
  psql -U greenflow_user -d greenflow_staging -c "SELECT 1;"

# 데이터베이스 재초기화
docker-compose -f docker-compose.localstack.yml down -v
docker-compose -f docker-compose.localstack.yml up -d postgres
```

### 문제 4: Redis 연결 실패

```bash
# Redis 연결 확인
docker-compose -f docker-compose.localstack.yml exec redis \
  redis-cli ping

# Redis 데이터 초기화
docker-compose -f docker-compose.localstack.yml exec redis \
  redis-cli FLUSHALL
```

---

## 📊 성능 팁

### 1. 리소스 최적화

```yaml
# docker-compose.localstack.yml에서 리소스 제한 설정
services:
  localstack:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### 2. 네트워크 최적화

```bash
# 직접 연결 사용 (호스트 네트워크)
docker-compose -f docker-compose.localstack.yml up -d \
  --network host
```

### 3. 스토리지 최적화

```bash
# 불필요한 데이터 정리
docker volume prune
docker system prune --volumes

# 로그 크기 제한
docker-compose -f docker-compose.localstack.yml config \
  --services | xargs -I {} docker logs --tail 100 {}
```

---

## 🚀 다음 단계

### AWS로 스테이징 배포로 이동

LocalStack에서 테스트 완료 후:

```bash
# AWS 스테이징 배포 스크립트 실행
bash scripts/aws-infrastructure-setup.sh
bash scripts/staging-deploy.sh
```

### CI/CD 통합

```yaml
# GitHub Actions 예제
name: LocalStack Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run LocalStack deployment
        run: bash scripts/localstack-deploy.sh
      - name: Run tests
        run: npm run test:e2e
```

---

## 📚 참고 자료

- [LocalStack GitHub](https://github.com/localstack/localstack)
- [LocalStack 공식 문서](https://docs.localstack.cloud/)
- [AWS CLI 명령어 참고](https://docs.aws.amazon.com/cli/)

---

## ✨ 요약

**LocalStack 기반 완전 로컬 배포의 장점**:

✅ **개발 효율성**: AWS 계정 없이 로컬에서 완전히 테스트
✅ **비용 절감**: 무료 오픈소스 도구
✅ **빠른 반복**: Docker로 즉시 시작/중지
✅ **자동화**: CI/CD에 쉽게 통합
✅ **완벽한 테스트**: AWS와 동일한 환경에서 테스트

---

**상태**: ✅ **LocalStack 완전 로컬 배포 환경 준비 완료**

**다음**: AWS 스테이징 배포 또는 프로덕션 배포로 이동

```bash
# 로컬 배포 시작
bash scripts/localstack-deploy.sh

# AWS 배포로 이동
bash scripts/aws-infrastructure-setup.sh
bash scripts/staging-deploy.sh
```

GreenFlow를 LocalStack으로 완전 로컬에서 테스트하세요! 🚀
