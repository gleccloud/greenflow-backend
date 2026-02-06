#!/bin/bash

###############################################################################
# GreenFlow Route53 DNS 및 SSL 인증서 설정 스크립트
# 용도: Route53, ACM SSL, CloudFront 배포 자동 설정
###############################################################################

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# 설정 값
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
PROJECT_NAME="greenflow"
DOMAIN_NAME="${DOMAIN_NAME:-greenflow.dev}"
SUBDOMAIN_STAGING="staging"
SUBDOMAIN_API="staging-api"

# Route53 호스팅 영역 ID (기존 ID 사용)
HOSTED_ZONE_ID="${HOSTED_ZONE_ID:-}"

###############################################################################
# 1단계: 선행 조건 검증
###############################################################################

log_info "=== Route53 DNS 및 SSL 설정 시작 ==="
log_info "1단계: 선행 조건 검증...\n"

if ! command -v aws &> /dev/null; then
  log_error "AWS CLI가 설치되지 않았습니다"
  exit 1
fi

log_success "AWS CLI 설치됨"

# AWS 자격증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
  log_error "AWS 자격증명이 유효하지 않습니다"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
log_success "AWS 계정 확인됨 (Account ID: $ACCOUNT_ID)"

###############################################################################
# 2단계: Route53 호스팅 영역 확인 또는 생성
###############################################################################

log_info "\n2단계: Route53 호스팅 영역 확인...\n"

if [ -z "$HOSTED_ZONE_ID" ]; then
  # 호스팅 영역 조회
  HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --dns-name "$DOMAIN_NAME" \
    --query 'HostedZones[0].Id' \
    --output text 2>/dev/null | sed 's|/hostedzone/||' || echo "not-found")

  if [ "$HOSTED_ZONE_ID" = "not-found" ] || [ -z "$HOSTED_ZONE_ID" ]; then
    log_warning "호스팅 영역이 없습니다. 수동으로 생성하십시오"
    log_info "AWS Route53 콘솔에서 다음 도메인에 대한 호스팅 영역을 생성하세요: $DOMAIN_NAME"
    exit 1
  fi
fi

log_success "Route53 호스팅 영역 확인됨 (ID: $HOSTED_ZONE_ID)"

###############################################################################
# 3단계: ACM SSL 인증서 요청
###############################################################################

log_info "\n3단계: ACM SSL 인증서 요청...\n"

# us-east-1에서만 CloudFront 인증서 발급 가능
if [ "$AWS_REGION" != "us-east-1" ]; then
  log_warning "CloudFront용 SSL 인증서는 us-east-1에서만 발급 가능합니다"
  ACM_REGION="us-east-1"
else
  ACM_REGION="$AWS_REGION"
fi

# 기존 인증서 확인
CERT_ARN=$(aws acm list-certificates \
  --region "$ACM_REGION" \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME' || SubjectAlternativeNameList[0]=='*.$DOMAIN_NAME'].CertificateArn" \
  --output text 2>/dev/null | head -1 || echo "")

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" = "None" ]; then
  log_info "SSL 인증서 요청 중..."

  # 와일드카드 인증서 요청
  REQUEST_RESPONSE=$(aws acm request-certificate \
    --domain-name "$DOMAIN_NAME" \
    --subject-alternative-names "*.$DOMAIN_NAME" \
    --validation-method DNS \
    --region "$ACM_REGION" \
    --tags Key=Environment,Value=$ENVIRONMENT Key=Project,Value=$PROJECT_NAME)

  CERT_ARN=$(echo $REQUEST_RESPONSE | grep -o 'arn:aws:acm:[^"]*')

  log_success "SSL 인증서 요청 완료 (ARN: $CERT_ARN)"
  log_warning "DNS 검증을 위해 Route53에서 CNAME 레코드를 확인하고 추가하세요"
  log_warning "인증서 발급까지 약 5-10분 소요될 수 있습니다"
else
  log_warning "SSL 인증서 이미 존재 (ARN: $CERT_ARN)"
fi

###############################################################################
# 4단계: Route53 DNS 레코드 생성
###############################################################################

log_info "\n4단계: Route53 DNS 레코드 생성...\n"

# Vercel 프로젝트 도메인 (예시)
VERCEL_DOMAIN="greenflow-landing-staging.vercel.app"

# ECS Load Balancer 도메인 (예시)
ALB_DOMAIN="greenflow-staging-alb-1234567890.us-east-1.elb.amazonaws.com"

log_info "프론트엔드 DNS 레코드 생성: $SUBDOMAIN_STAGING.$DOMAIN_NAME → $VERCEL_DOMAIN"

# 프론트엔드 CNAME 레코드
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$SUBDOMAIN_STAGING.$DOMAIN_NAME'",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "'$VERCEL_DOMAIN'"
            }
          ]
        }
      }
    ]
  }' \
  --region "$AWS_REGION"

log_success "프론트엔드 DNS 레코드 생성 완료"

log_info "백엔드 DNS 레코드 생성: $SUBDOMAIN_API.$DOMAIN_NAME → $ALB_DOMAIN"

# 백엔드 CNAME 레코드
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$SUBDOMAIN_API.$DOMAIN_NAME'",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "'$ALB_DOMAIN'"
            }
          ]
        }
      }
    ]
  }' \
  --region "$AWS_REGION"

log_success "백엔드 DNS 레코드 생성 완료"

###############################################################################
# 5단계: CloudFront 배포 생성
###############################################################################

log_info "\n5단계: CloudFront 배포 생성...\n"

log_info "CloudFront 배포 설정 생성 중..."

# CloudFront 배포용 설정 파일 생성
cat > /tmp/cloudfront-distribution.json << 'CLOUDFRONT_EOF'
{
  "CallerReference": "greenflow-staging-TIMESTAMP",
  "Comment": "GreenFlow Staging CDN Distribution",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "greenflow-staging-origin",
        "DomainName": "greenflow-landing-staging.vercel.app",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSslProtocols": {
            "Quantity": 3,
            "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]
          },
          "OriginReadTimeout": 30,
          "OriginKeepaliveTimeout": 5
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "AllowedMethods": {
      "Quantity": 7,
      "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "TargetOriginId": "greenflow-staging-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "all"
      },
      "Headers": {
        "Quantity": 1,
        "Items": ["*"]
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 0,
    "MaxTTL": 31536000
  },
  "CacheBehaviors": {
    "Quantity": 1,
    "Items": [
      {
        "PathPattern": "/api/*",
        "AllowedMethods": {
          "Quantity": 7,
          "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "TargetOriginId": "greenflow-staging-origin",
        "ViewerProtocolPolicy": "https-only",
        "TrustedSigners": {
          "Enabled": false,
          "Quantity": 0
        },
        "ForwardedValues": {
          "QueryString": true,
          "Cookies": {
            "Forward": "all"
          }
        },
        "MinTTL": 0,
        "DefaultTTL": 0,
        "MaxTTL": 0
      }
    ]
  },
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "CERT_ARN_PLACEHOLDER",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "Aliases": {
    "Quantity": 2,
    "Items": ["staging.greenflow.dev", "staging-api.greenflow.dev"]
  }
}
CLOUDFRONT_EOF

log_warning "CloudFront 배포는 수동으로 생성하거나 AWS CLI를 사용하여 생성할 수 있습니다"
log_info "임시 설정 파일: /tmp/cloudfront-distribution.json"

###############################################################################
# 최종 요약
###############################################################################

log_success "\n✨ Route53 DNS 및 SSL 설정 완료!\n"

cat << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 설정된 리소스 요약:

【Route53 DNS】
  호스팅 영역 ID: $HOSTED_ZONE_ID

  프론트엔드:
    $SUBDOMAIN_STAGING.$DOMAIN_NAME → $VERCEL_DOMAIN

  백엔드:
    $SUBDOMAIN_API.$DOMAIN_NAME → $ALB_DOMAIN

【ACM SSL 인증서】
  인증서 ARN: $CERT_ARN
  도메인: $DOMAIN_NAME
  와일드카드: *.$DOMAIN_NAME
  상태: 요청됨 (DNS 검증 필요)

【CloudFront 배포】
  상태: 수동 생성 필요
  설정 파일: /tmp/cloudfront-distribution.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 다음 단계:

1️⃣  ACM SSL 인증서 DNS 검증
    AWS ACM 콘솔에서 CNAME 레코드 확인
    → Route53에 자동으로 CNAME 추가

2️⃣  Route53 DNS 레코드 확인
    $ aws route53 list-resource-record-sets \
      --hosted-zone-id $HOSTED_ZONE_ID \
      --region $AWS_REGION

3️⃣  CloudFront 배포 생성 (선택사항)
    AWS CloudFront 콘솔 또는 AWS CLI 사용

4️⃣  Vercel 도메인 연결
    Vercel 프로젝트 → Settings → Domains
    → staging.greenflow.dev 추가

5️⃣  ECS Load Balancer 생성
    (배포 체크리스트 참조)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  주의사항:

  • DNS 변경 반영까지 최대 24-48시간 소요
  • SSL 인증서 검증까지 약 5-10분 소요
  • CloudFront는 선택사항 (필요시 생성)
  • ECS Load Balancer 도메인 확인 후 DNS 업데이트

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

log_success "Route53 DNS 및 SSL 설정 완료!\n"
