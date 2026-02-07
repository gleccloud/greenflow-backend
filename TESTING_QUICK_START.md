# GreenFlow Testing Quick Start Guide
## 2026-02-06 | Quick Reference for Manual & Automated Testing

---

## 🎯 Testing Options Overview

### Option 1: Automated Testing (Recommended)
**Best for**: Validating entire deployment at once
**Time**: 10-15 seconds
**Coverage**: 22 comprehensive E2E tests

### Option 2: Manual Testing
**Best for**: Exploratory testing, debugging specific components
**Time**: Variable (5-30 minutes)
**Coverage**: Custom

### Option 3: Interactive Testing
**Best for**: UI testing, visual inspection
**Time**: Manual
**Coverage**: Custom

---

## ✅ Quick Verification (5 minutes)

### Step 1: Verify Services Are Running

```bash
# Check all services
docker-compose -f docker-compose.localstack.yml ps

# Expected output: 9 services, all "Up" and showing ports
```

### Step 2: Test Backend API

```bash
# Test health endpoint
curl http://localhost:3000/api/v2/health

# Expected response: { "status": "ok", "version": "v2", "timestamp": "..." }
```

### Step 3: Test Frontend

```bash
# Test landing page
curl http://localhost:5173/

# Expected: HTML response with status 200
```

### Step 4: Test LocalStack S3

```bash
# List S3 buckets
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal s3 ls

# Expected: List of 4 greenflow-* buckets
```

### Step 5: Test Database

```bash
# Test PostgreSQL
docker-compose -f docker-compose.localstack.yml exec -T postgres pg_isready -U greenflow_user

# Expected: "accepting connections"

# Test Redis
docker-compose -f docker-compose.localstack.yml exec -T redis redis-cli ping

# Expected: "PONG"
```

**Total Time**: ~3 minutes ✅

---

## 🚀 Run Full E2E Test Suite (10 seconds)

### Command
```bash
npm run test:localstack
```

### Output
```
22 passed (10.2s)
```

### What Gets Tested
✅ Backend API health & authentication
✅ Frontend page loads & routing
✅ LocalStack AWS resources (S3, DynamoDB, SQS, SNS)
✅ Database connectivity (PostgreSQL, Redis)
✅ Service health checks
✅ Frontend-backend integration
✅ Performance benchmarks

### View Results
```bash
# HTML report
npm run test:e2e:report

# Or view JSON results
cat test-results/results.json | jq .
```

---

## 🎨 Interactive Testing

### Option A: Playwright UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

**Features**:
- Visual test picker
- Step-by-step execution
- Screenshot inspection
- Trace viewer

### Option B: Headed Mode (Browser Window)
```bash
npm run test:e2e:headed
```

**Features**:
- See actual browser window
- Watch test execution
- Pause execution
- Inspect elements

### Option C: Debug Mode
```bash
npx playwright test --debug
```

**Features**:
- Step through each test
- Inspect network requests
- Console logs
- Performance metrics

---

## 🌐 Manual Browser Testing

### URLs to Test

#### Frontend Routes
```
http://localhost:5173/                # Gate page (persona selection)
http://localhost:5173/shipper         # Shipper landing page
http://localhost:5173/carrier         # Carrier landing page
http://localhost:5173/owner           # Fleet owner landing page
```

### What to Check
- [ ] Page loads without errors
- [ ] Navigation links work
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Images load correctly
- [ ] No console errors (press F12)

#### Backend API Testing
```
http://localhost:3000/api/v2/health                    # Health check
http://localhost:3000/api/v2/console/metrics/quota     # Console API (requires X-API-Key header)
```

#### Management Tools
```
http://localhost:5050         # pgAdmin (PostgreSQL UI)
http://localhost:8081         # Redis Commander
http://localhost:8080         # LocalStack UI
http://localhost:3001         # Grafana (monitoring)
http://localhost:9090         # Prometheus (metrics)
```

---

## 🔌 API Testing with curl

### Test Console API Authentication

```bash
# Without API key (should return 401)
curl -v http://localhost:3000/api/v2/console/metrics/quota

# Expected: 401 Unauthorized
```

### Test with Demo API Key

```bash
# With demo key
curl -H "X-API-Key: demo_key_1234567890123456789012345678901234567890" \
  http://localhost:3000/api/v2/console/metrics/quota

# Expected: 200 OK or 500 (if database not configured)
```

### Test Rate Limiting

```bash
# Rapid requests (should throttle after 100 requests)
for i in {1..110}; do
  curl http://localhost:3000/api/v2/health
done

# After 100 requests: 429 Too Many Requests
```

---

## 🗄️ Database Testing

### PostgreSQL Testing

```bash
# Connect to database
docker-compose -f docker-compose.localstack.yml exec -T postgres \
  psql -U greenflow_user -d greenflow_staging

# At psql prompt:
\dt              # List tables
SELECT COUNT(*) FROM users;  # Count users
\q              # Exit
```

### Redis Testing

```bash
# Connect to Redis
docker-compose -f docker-compose.localstack.yml exec -T redis redis-cli

# At redis prompt:
PING            # Test connection
KEYS *          # List all keys
FLUSHDB         # Clear database
EXIT            # Exit
```

---

## ☁️ LocalStack AWS Testing

### List S3 Buckets
```bash
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal s3 ls
```

**Expected**:
```
2026-02-06 00:55:01 greenflow-backups
2026-02-06 00:55:01 greenflow-dev
2026-02-06 00:55:02 greenflow-logs
2026-02-06 00:55:02 greenflow-uploads
```

### List DynamoDB Tables
```bash
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal dynamodb list-tables | jq '.TableNames'
```

**Expected**:
```json
[
  "greenflow-audit-logs",
  "greenflow-user-preferences"
]
```

### List SQS Queues
```bash
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal sqs list-queues | jq '.QueueUrls | length'
```

**Expected**: `5` (queues: notifications, order-processing, email-sending, analytics, dlq)

### Upload File to S3
```bash
# Create test file
echo "Hello LocalStack!" > test.txt

# Upload to S3
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 cp /dev/stdin s3://greenflow-dev/test.txt << 'EOF'
Hello LocalStack!
EOF

# Verify upload
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 ls s3://greenflow-dev/

# Download file
docker-compose -f docker-compose.localstack.yml exec -T localstack \
  awslocal s3 cp s3://greenflow-dev/test.txt -
```

---

## 🐛 Debugging Common Issues

### Issue: "Services not running"
```bash
# Restart all services
docker-compose -f docker-compose.localstack.yml restart

# Or full reset
docker-compose -f docker-compose.localstack.yml down
docker-compose -f docker-compose.localstack.yml up -d
```

### Issue: "Backend API not responding"
```bash
# Check logs
docker-compose -f docker-compose.localstack.yml logs backend

# Restart backend
docker-compose -f docker-compose.localstack.yml restart backend
```

### Issue: "Port already in use"
```bash
# Kill process using the port (e.g., 3000)
lsof -i :3000
kill -9 <PID>

# Restart
docker-compose -f docker-compose.localstack.yml restart
```

### Issue: "Tests failing"
```bash
# Run with verbose output
npm run test:localstack -- --verbose

# Check test logs
cat test-results/results.json | jq '.[0].error'
```

---

## 📊 Monitoring & Observation

### View Real-Time Logs

```bash
# All services
docker-compose -f docker-compose.localstack.yml logs -f

# Specific service
docker-compose -f docker-compose.localstack.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.localstack.yml logs --tail 100
```

### Check Resource Usage

```bash
# Docker stats
docker stats

# Shows: CPU, memory, network, block I/O for each container
```

### Performance Monitoring

1. **Prometheus** (http://localhost:9090)
   - Query metrics
   - View time-series data

2. **Grafana** (http://localhost:3001)
   - Login: admin/admin
   - Add Prometheus data source
   - Create custom dashboards

3. **Redis Commander** (http://localhost:8081)
   - Visual cache inspection
   - Key-value browser

---

## ✨ Test Scenarios

### Scenario 1: Full User Flow (5 min)
```bash
# 1. Visit frontend
open http://localhost:5173

# 2. Click through pages
# - Gate page (home)
# - /shipper
# - /carrier
# - /owner

# 3. Open browser console (F12)
# Check for any errors

# 4. Test backend API
curl http://localhost:3000/api/v2/health

# Result: ✅ All pages load, no console errors, API responds
```

### Scenario 2: API Integration Test (3 min)
```bash
# 1. Test authentication
curl http://localhost:3000/api/v2/console/metrics/quota

# Expected: 401 (missing API key)

# 2. Test with valid key
curl -H "X-API-Key: demo_key_1234567890123456789012345678901234567890" \
  http://localhost:3000/api/v2/console/metrics/quota

# Expected: 200 or 500 (depends on database state)

# 3. Test rate limiting
for i in {1..110}; do curl http://localhost:3000/api/v2/health; done

# Expected: First 100 succeed, then 429 responses
```

### Scenario 3: LocalStack AWS Testing (5 min)
```bash
# 1. List resources
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal s3 ls
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal dynamodb list-tables
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal sqs list-queues

# 2. Test S3 operations
echo "test data" | docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal s3 cp - s3://greenflow-dev/test-file.txt
docker-compose -f docker-compose.localstack.yml exec -T localstack awslocal s3 cp s3://greenflow-dev/test-file.txt -

# Result: ✅ All resources present, S3 operations working
```

---

## 📋 Checklist for Validation

- [ ] All 9 Docker services running
- [ ] Backend API responding at http://localhost:3000/api/v2/health
- [ ] Frontend loading at http://localhost:5173
- [ ] All 4 persona routes accessible
- [ ] PostgreSQL accepting connections on 5432
- [ ] Redis responding to PING on 6379
- [ ] S3 buckets visible in LocalStack
- [ ] DynamoDB tables present
- [ ] SQS queues created
- [ ] 22 Playwright tests passing
- [ ] No errors in service logs
- [ ] Performance metrics within targets

---

## 🎯 Next Steps

### If Testing Locally ✅
Great! The system is ready. You can now:
1. Run `npm run test:e2e` anytime to validate
2. Continue with Phase 5 (Dashboard implementation)
3. Deploy to staging when ready

### If Issues Found 🔧
1. Check logs: `docker-compose -f docker-compose.localstack.yml logs -f`
2. Verify services: `docker-compose -f docker-compose.localstack.yml ps`
3. Review troubleshooting section above
4. Restart if needed: `docker-compose -f docker-compose.localstack.yml restart`

### If Ready for Staging 🚀
See **COMPLETE_DEPLOYMENT_STATUS_2026-02-06.md** for next phase guidelines

---

**Report Generated**: 2026-02-06
**Status**: ✅ PRODUCTION-READY FOR TESTING
**All 22 Tests**: ✅ PASSING

Happy testing! 🎉
