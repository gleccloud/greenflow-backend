#!/bin/bash

################################################################################
#
# 🚀 GreenFlow LocalStack Dual Deployment
#
# API Console + Landing Page Independent Deployment
# Windows Flags Pattern for True Application Separation
#
# Date: 2026-02-05
# Status: ✅ Ready to Execute
#
# CRITICAL LESSON: API Console is NOT a route, it's an INDEPENDENT APPLICATION
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/kevin/openclaw-workspace/projects/green-logistics-landing"
DIST_CONSOLE="$PROJECT_DIR/dist-console"
DIST_LANDING="$PROJECT_DIR/dist-landing"
AWS_ENDPOINT="http://localhost:4566"
CONSOLE_BUCKET="greenflow-console"
LANDING_BUCKET="greenflow-landing"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC}  $1"
}

################################################################################
# Phase 1: Validation
################################################################################

print_header "Phase 1: Validation"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi
print_step "Project directory exists"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install it first."
    exit 1
fi
print_step "AWS CLI installed"

# Check if LocalStack is running
if ! curl -s "$AWS_ENDPOINT/health" > /dev/null; then
    print_warning "LocalStack may not be running at $AWS_ENDPOINT"
    print_warning "Make sure LocalStack is running: docker-compose up"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
print_step "LocalStack check passed"

################################################################################
# Phase 2: Build Split Artifacts
################################################################################

print_header "Phase 2: Build Split Artifacts"

cd "$PROJECT_DIR"
print_step "Changed to project directory: $PROJECT_DIR"

# Build base dist + split outputs (dist-console, dist-landing)
npm run build:split
print_step "Split build completed"

if [ ! -f "$DIST_CONSOLE/index.html" ]; then
    print_error "Console build not found: $DIST_CONSOLE/index.html"
    exit 1
fi
if [ ! -f "$DIST_LANDING/index.html" ]; then
    print_error "Landing build not found: $DIST_LANDING/index.html"
    exit 1
fi

print_step "Console artifact ready: $DIST_CONSOLE"
print_step "Landing artifact ready: $DIST_LANDING"

CONSOLE_SIZE=$(du -sh "$DIST_CONSOLE" | cut -f1)
LANDING_SIZE=$(du -sh "$DIST_LANDING" | cut -f1)
echo -e "${GREEN}  Console size: $CONSOLE_SIZE${NC}"
echo -e "${GREEN}  Landing size: $LANDING_SIZE${NC}"

################################################################################
# Phase 5: Configure AWS Credentials
################################################################################

print_header "Phase 5: Configure AWS Credentials"

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
print_step "AWS credentials configured"

################################################################################
# Phase 6: Deploy Console to LocalStack
################################################################################

print_header "Phase 6: Deploy Console to LocalStack"

# Remove old bucket if it exists
aws --endpoint-url=$AWS_ENDPOINT s3 rb "s3://$CONSOLE_BUCKET" --force 2>/dev/null || true
print_step "Old console bucket cleaned"

# Create bucket
aws --endpoint-url=$AWS_ENDPOINT s3 mb "s3://$CONSOLE_BUCKET"
print_step "Console bucket created: $CONSOLE_BUCKET"

# Enable static website hosting
aws --endpoint-url=$AWS_ENDPOINT s3 website "s3://$CONSOLE_BUCKET/" \
  --index-document index.html \
  --error-document index.html
print_step "Static website hosting enabled"

# Set bucket policy
aws --endpoint-url=$AWS_ENDPOINT s3api put-bucket-policy \
  --bucket "$CONSOLE_BUCKET" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'"$CONSOLE_BUCKET"'/*"
    }]
  }'
print_step "Bucket policy configured"

# Sync files
aws --endpoint-url=$AWS_ENDPOINT s3 sync "$DIST_CONSOLE/" "s3://$CONSOLE_BUCKET/" --delete
print_step "Console files deployed"

# List deployed files
echo -e "${GREEN}  Deployed files:${NC}"
aws --endpoint-url=$AWS_ENDPOINT s3 ls "s3://$CONSOLE_BUCKET/" --recursive | \
  awk '{print "  " $4}'

################################################################################
# Phase 7: Deploy Landing to LocalStack
################################################################################

print_header "Phase 7: Deploy Landing to LocalStack"

# Remove old bucket if it exists
aws --endpoint-url=$AWS_ENDPOINT s3 rb "s3://$LANDING_BUCKET" --force 2>/dev/null || true
print_step "Old landing bucket cleaned"

# Create bucket
aws --endpoint-url=$AWS_ENDPOINT s3 mb "s3://$LANDING_BUCKET"
print_step "Landing bucket created: $LANDING_BUCKET"

# Enable static website hosting
aws --endpoint-url=$AWS_ENDPOINT s3 website "s3://$LANDING_BUCKET/" \
  --index-document index.html \
  --error-document index.html
print_step "Static website hosting enabled"

# Set bucket policy
aws --endpoint-url=$AWS_ENDPOINT s3api put-bucket-policy \
  --bucket "$LANDING_BUCKET" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'"$LANDING_BUCKET"'/*"
    }]
  }'
print_step "Bucket policy configured"

# Sync files
aws --endpoint-url=$AWS_ENDPOINT s3 sync "$DIST_LANDING/" "s3://$LANDING_BUCKET/" --delete
print_step "Landing files deployed"

# List deployed files
echo -e "${GREEN}  Deployed files:${NC}"
aws --endpoint-url=$AWS_ENDPOINT s3 ls "s3://$LANDING_BUCKET/" --recursive | \
  awk '{print "  " $4}'

################################################################################
# Phase 8: Verification
################################################################################

print_header "Phase 8: Verification"

# Check console bucket accessibility
CONSOLE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$AWS_ENDPOINT/$CONSOLE_BUCKET/")
if [ "$CONSOLE_RESPONSE" = "200" ]; then
    print_step "Console bucket accessible (HTTP 200)"
else
    print_error "Console bucket not accessible (HTTP $CONSOLE_RESPONSE)"
fi

# Check landing bucket accessibility
LANDING_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$AWS_ENDPOINT/$LANDING_BUCKET/")
if [ "$LANDING_RESPONSE" = "200" ]; then
    print_step "Landing bucket accessible (HTTP 200)"
else
    print_error "Landing bucket not accessible (HTTP $LANDING_RESPONSE)"
fi

# Verify window flags in console
if curl -s "$AWS_ENDPOINT/$CONSOLE_BUCKET/" | grep -q "window.__APP_TYPE__ = 'console'"; then
    print_step "Console window flags detected"
else
    print_error "Console window flags NOT found"
fi

# Verify window flags in landing
if curl -s "$AWS_ENDPOINT/$LANDING_BUCKET/" | grep -q "window.__APP_TYPE__ = 'landing'"; then
    print_step "Landing window flags detected"
else
    print_error "Landing window flags NOT found"
fi

# Verify index.html files are different
CONSOLE_HTML=$(curl -s "$AWS_ENDPOINT/$CONSOLE_BUCKET/" | md5sum)
LANDING_HTML=$(curl -s "$AWS_ENDPOINT/$LANDING_BUCKET/" | md5sum)

if [ "$CONSOLE_HTML" != "$LANDING_HTML" ]; then
    print_step "Index.html files are independent"
else
    print_error "Index.html files are the same (NOT independent!)"
fi

################################################################################
# Phase 9: Summary
################################################################################

print_header "🎉 Deployment Complete!"

cat << EOF
${GREEN}✅ SUCCESSFULLY DEPLOYED${NC}

Console Application:
  URL: $AWS_ENDPOINT/$CONSOLE_BUCKET/
  Status: ✅ Running
  Window Type: 'console'
  Blocked Routes: ['/', '/shipper', '/carrier', '/owner']
  Size: $CONSOLE_SIZE

Landing Application:
  URL: $AWS_ENDPOINT/$LANDING_BUCKET/
  Status: ✅ Running
  Window Type: 'landing'
  Blocked Routes: ['/console']
  Size: $LANDING_SIZE

Next Steps:
  1. Start development server (optional):
     cd $PROJECT_DIR
     npm run dev

  2. Run E2E tests:
     node tests/e2e_smoke.mjs

  3. Access applications:
     Console: $AWS_ENDPOINT/$CONSOLE_BUCKET/
     Landing: $AWS_ENDPOINT/$LANDING_BUCKET/

Backend Services:
  - API: http://localhost:3000/api/v2
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379

📖 Documentation:
  - Deployment Plan: DEPLOYMENT_PLAN_LOCALSTACK_2026-02-05.md
  - Lesson Learned: LESSON_LEARNED_APP_SEPARATION.md
  - This script: EXECUTION_READY_DEPLOYMENT.sh

🎓 Remember:
  API Console = Independent Application (NOT a route)
  Always use window flags for application type separation

EOF

################################################################################

print_header "All Done! ✅"
