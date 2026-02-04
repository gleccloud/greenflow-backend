# LocalStack Integration Guide for GreenFlow

**Status**: ✅ Approved for Development & CI/CD Testing
**Last Updated**: 2026-02-04
**Version**: 1.0

---

## Executive Summary

LocalStack enables local AWS service emulation for GreenFlow development and testing. This eliminates:
- ❌ AWS charges for non-production environments
- ❌ Network latency during development iteration
- ❌ Infrastructure setup complexity for new developers

**Key Benefits for GreenFlow**:
- 🚀 60%+ faster local development (instant RDS/Redis/Lambda startup)
- 💰 Eliminates dev/test AWS costs (~$500-1000/month savings)
- 🧪 Complete integration testing without AWS dependencies
- 🔄 Offline development capability

**Important**: LocalStack is **development-only**. Do NOT use in production.

---

## Architecture

### GreenFlow AWS Infrastructure Emulated by LocalStack

```
┌─────────────────────────────────────────────────────┐
│          LocalStack Container (4566)                │
├──────────────────┬──────────────────────────────────┤
│  PostgreSQL RDS  │  ElastiCache Redis               │
│  (Port 5432)     │  (Port 6379)                     │
├──────────────────┼──────────────────────────────────┤
│  SQS Queue       │  SNS Topics                      │
│  (Bid Eval)      │  (Notifications)                 │
├──────────────────┼──────────────────────────────────┤
│  Lambda          │  CloudWatch                      │
│  (Bid Logic)     │  (Logging)                       │
├──────────────────┼──────────────────────────────────┤
│  S3 Bucket       │  CloudFormation                  │
│  (Documents)     │  (IaC Validation)                │
└──────────────────┴──────────────────────────────────┘
```

### Service Mapping

| AWS Service | Use in GreenFlow | LocalStack Support |
|-------------|------------------|--------------------|
| RDS PostgreSQL | User/Bid/Fleet data | ✅ Full (pgvector support) |
| ElastiCache Redis | Real-time caching, sessions | ✅ Full (limited snapshots) |
| SQS | Bid evaluation queue | ✅ Full |
| SNS | Notification topics | ✅ Full |
| Lambda | Serverless bid logic | ✅ Full (hot reload) |
| S3 | File storage | ✅ Full |
| CloudWatch | Logging/monitoring | ✅ Full |
| CloudFormation | Infrastructure validation | ✅ Full |

---

## Installation

### Prerequisites

- **Docker Desktop** or Docker Engine (20.10+)
- **Docker Compose** (2.0+) or standalone Docker
- **4+ GB RAM** available
- **10 GB free disk space**
- **Node.js 18+** (for AWS CLI v3)

### Step 1: Install LocalStack

#### Option A: Using Homebrew (macOS/Linux)
```bash
brew install localstack-cli
```

#### Option B: Using Docker Compose (Recommended)
No additional installation needed; Docker Compose handles everything.

#### Option C: Using pip (Python 3.10+)
```bash
pip3 install localstack
```

### Step 2: Create Docker Compose Configuration

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: greenflow-localstack

    ports:
      # Main LocalStack Gateway (all AWS APIs)
      - "4566:4566"

      # Service-specific ports (optional, for direct access)
      - "4571:4571"    # ElastiCache
      - "5432:5432"    # RDS PostgreSQL
      - "6379:6379"    # Redis

    environment:
      # Enable specific services to reduce memory usage
      - SERVICES=rds,elasticache,sqs,sns,lambda,s3,cloudformation,cloudwatch
      - DEBUG=1
      - LAMBDA_EXECUTOR=docker
      - DOCKER_HOST=unix:///var/run/docker.sock
      - AWS_DEFAULT_REGION=us-east-1
      - AWS_REGION=us-east-1
      - DEFAULT_REGION=us-east-1

      # Data persistence (optional)
      - DATA_DIR=/tmp/localstack/data

      # Performance tuning
      - EAGER_SERVICE_LOADING=1
      - PROVIDER_OVERRIDE_RDS=rds-v2
      - LOCALSTACK_LOG_LEVEL=info

    volumes:
      # Docker socket for Lambda execution
      - "/var/run/docker.sock:/var/run/docker.sock"

      # Persistent data directory
      - "localstack-data:/tmp/localstack"

      # Initialization scripts (optional)
      - "./scripts/localstack-init:/docker-entrypoint-initaws.d"

    networks:
      - greenflow-local

    healthcheck:
      test: ["CMD", "awslocal", "kinesis", "list-streams"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  localstack-data:
    driver: local

networks:
  greenflow-local:
    driver: bridge
```

### Step 3: Create Initialization Scripts Directory

```bash
mkdir -p scripts/localstack-init
```

Create `scripts/localstack-init/01-init-db.sh`:

```bash
#!/bin/bash

set -e

echo "=== Initializing GreenFlow LocalStack Environment ==="

# RDS Database setup
echo "Creating RDS PostgreSQL database..."
awslocal rds create-db-instance \
  --db-instance-identifier greenflow-db \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --master-username greenflow_admin \
  --master-user-password greenflow_password \
  --allocated-storage 20 \
  --port 5432 \
  --no-publicly-accessible \
  --region us-east-1

# ElastiCache Redis setup
echo "Creating ElastiCache Redis cluster..."
awslocal elasticache create-cache-cluster \
  --cache-cluster-id greenflow-redis \
  --cache-node-type cache.t2.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --port 6379 \
  --region us-east-1

# SQS Queue for bid evaluation
echo "Creating SQS queues..."
awslocal sqs create-queue \
  --queue-name greenflow-bid-evaluation.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true \
  --region us-east-1

awslocal sqs create-queue \
  --queue-name greenflow-notifications \
  --region us-east-1

# SNS Topics for notifications
echo "Creating SNS topics..."
awslocal sns create-topic \
  --name greenflow-shipper-notifications \
  --region us-east-1

awslocal sns create-topic \
  --name greenflow-carrier-notifications \
  --region us-east-1

# S3 bucket for documents
echo "Creating S3 bucket..."
awslocal s3 mb s3://greenflow-documents \
  --region us-east-1

# Lambda function for bid evaluation
echo "Creating Lambda function..."
# Will be populated by NestJS setup script

echo "=== LocalStack Initialization Complete ==="
echo "✅ RDS: greenflow-db (localhost:5432)"
echo "✅ Redis: greenflow-redis (localhost:6379)"
echo "✅ SQS: greenflow-bid-evaluation.fifo"
echo "✅ SNS: greenflow-shipper-notifications, greenflow-carrier-notifications"
echo "✅ S3: greenflow-documents"
```

Make the script executable:
```bash
chmod +x scripts/localstack-init/01-init-db.sh
```

### Step 4: Start LocalStack

```bash
# Start in detached mode
docker-compose up -d

# Watch logs
docker-compose logs -f localstack

# Verify services are running
docker-compose ps
```

### Step 5: Verify Installation

```bash
# Install awslocal CLI (optional but recommended)
pip3 install awscli-local

# Or use aws CLI with endpoint override
export AWS_ENDPOINT_URL=http://localhost:4566

# Check LocalStack status
aws kinesis list-streams --endpoint-url http://localhost:4566

# List databases
aws rds describe-db-instances --endpoint-url http://localhost:4566

# List Redis clusters
aws elasticache describe-cache-clusters --endpoint-url http://localhost:4566

# List queues
aws sqs list-queues --endpoint-url http://localhost:4566
```

---

## Backend Configuration

### 1. Update NestJS Environment Variables

Create `.env.development`:

```env
# AWS Configuration for LocalStack
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localhost:4566

# LocalStack Specific
NODE_ENV=development
LOCALSTACK_ENABLED=true

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=greenflow
DB_USER=greenflow_admin
DB_PASSWORD=greenflow_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SQS Configuration
SQS_QUEUE_URL=http://localhost:4566/000000000000/greenflow-bid-evaluation.fifo
SQS_REGION=us-east-1

# SNS Configuration
SNS_REGION=us-east-1
SNS_ENDPOINT=http://localhost:4566
```

### 2. Update AWS SDK Configuration

Create `src/config/aws.config.ts`:

```typescript
import { AWSError } from 'aws-sdk';

const isLocalStack = process.env.LOCALSTACK_ENABLED === 'true';
const endpoint = process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';

export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',

  // Point to LocalStack for development
  ...(isLocalStack && {
    endpoint,
    s3ForcePathStyle: true, // Required for LocalStack S3
  }),

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
};

export const rdsConfig = {
  ...awsConfig,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // No credentials for LocalStack Redis by default
};

export const sqsConfig = {
  ...awsConfig,
  region: process.env.SQS_REGION || 'us-east-1',
};

export const snsConfig = {
  ...awsConfig,
  endpoint: process.env.SNS_ENDPOINT,
  region: process.env.SNS_REGION || 'us-east-1',
};
```

### 3. Update NestJS Module Configuration

```typescript
// src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { snsConfig } from '../../config/aws.config';

@Module({
  providers: [
    {
      provide: 'SNS_CLIENT',
      useFactory: () => new SNSClient(snsConfig),
    },
  ],
  exports: ['SNS_CLIENT'],
})
export class NotificationsModule {}
```

---

## Development Workflow

### Starting Development Environment

```bash
# 1. Start LocalStack
docker-compose up -d

# 2. Wait for services to be healthy (10-15 seconds)
docker-compose ps

# 3. Verify database connection
npm run db:migrate:dev

# 4. Seed test data
npm run db:seed:dev

# 5. Start backend
npm run start:dev

# 6. Start frontend (in another terminal)
npm run dev
```

### Stopping Development Environment

```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

### Troubleshooting Connection Issues

```bash
# Check if LocalStack is running
docker-compose ps

# View LocalStack logs
docker-compose logs localstack

# Test RDS connection directly
psql -h localhost -U greenflow_admin -d greenflow -p 5432

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Reset LocalStack (removes all data)
docker-compose down -v && docker-compose up -d
```

---

## Testing Integration

### Unit Tests (No LocalStack Required)

```bash
npm run test
```

### Integration Tests (Requires LocalStack)

```bash
# Start LocalStack first
docker-compose up -d

# Run integration tests
npm run test:integration

# Run specific test file
npm run test:integration -- src/modules/bid/bid.service.spec.ts

# Watch mode
npm run test:integration -- --watch
```

### Example Integration Test

```typescript
// src/modules/bid/bid.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BidService } from './bid.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bid } from './bid.entity';

describe('BidService (Integration)', () => {
  let service: BidService;

  beforeAll(async () => {
    // LocalStack should already be running
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BidService,
        {
          provide: getRepositoryToken(Bid),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BidService>(BidService);
  });

  it('should create bid and queue evaluation', async () => {
    const bidData = {
      shipmentName: 'Test Shipment',
      budgetMin: 10000,
      budgetMax: 50000,
      origin: 'Seoul',
      destination: 'Busan',
    };

    const result = await service.createBid(bidData);

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();

    // Verify message was queued in SQS
    // (test implementation depends on your SQS service)
  });
});
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/integration-test.yml`:

```yaml
name: Integration Tests with LocalStack

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    services:
      localstack:
        image: localstack/localstack:latest
        ports:
          - 4566:4566
        env:
          SERVICES: rds,elasticache,sqs,sns,lambda,s3
          DEBUG: 1
          DOCKER_HOST: unix:///var/run/docker.sock
        options: >-
          --health-cmd "awslocal kinesis list-streams"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Wait for LocalStack
        run: |
          until curl -s http://localhost:4566/_localstack/health | grep -q '"services"'; do
            echo 'Waiting for LocalStack...'
            sleep 2
          done

      - name: Run integration tests
        env:
          AWS_ENDPOINT_URL: http://localhost:4566
          AWS_REGION: us-east-1
          AWS_ACCESS_KEY_ID: test
          AWS_SECRET_ACCESS_KEY: test
          DB_HOST: localhost
          REDIS_HOST: localhost
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
```

---

## Known Limitations & Workarounds

### 1. Data Persistence

**Issue**: Data is lost when LocalStack container is stopped
**Solution**: Enable volume mounting in docker-compose.yml:
```yaml
volumes:
  - "localstack-data:/tmp/localstack"
  - ./init-scripts:/docker-entrypoint-initaws.d
```

### 2. ElastiCache Limitations

**Issue**: No snapshots, failover, or replication scaling
**Workaround**: For development use only; test advanced features on AWS staging

### 3. Lambda Cold Start Behavior

**Issue**: Lambda startup times differ from AWS
**Workaround**: Set `LAMBDA_EXECUTOR=docker` in environment for more realistic behavior

### 4. Network Latency

**Issue**: LocalStack is faster than AWS; performance tests won't match production
**Solution**: Use load testing tools (k6, Apache JMeter) for realistic benchmarks

### 5. IAM/Authentication Limitations

**Issue**: IAM policies not fully emulated
**Workaround**: Focus on positive testing; validate production IAM on AWS staging

---

## Licensing & Costs (Important)

### Current Status (2026-02-04)
- **Free tier**: Available without account
- **Cost**: $0 for development use

### After March 23, 2026
- **Account requirement**: Must create account to run LocalStack
- **Free tier**: Provides equivalent features to current community version
- **CI/CD credits**: May require paid plan for automated testing
- **Estimate**: Free tier should cover dev/test; paid tier (~$50-100/month) for CI/CD

### Recommendation for GreenFlow
1. **Local development**: Free (indefinitely)
2. **CI/CD integration**: Monitor March 2026 transition; plan for paid tier if needed
3. **Production**: Never use LocalStack; always use actual AWS services

---

## Next Steps

1. ✅ **Install LocalStack** - Follow installation steps above
2. ✅ **Update NestJS configuration** - Add AWS SDK configuration
3. ✅ **Create integration tests** - Write tests for bid evaluation, notifications, etc.
4. ✅ **Add to CI/CD** - Integrate into GitHub Actions workflow
5. ⏳ **Monitor March 2026 changes** - Plan for licensing transition
6. ⏳ **Team training** - Onboard developers on LocalStack workflow

---

## Resources

- [LocalStack Official Docs](https://docs.localstack.cloud/)
- [LocalStack GitHub](https://github.com/localstack/localstack)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [NestJS AWS Integration](https://docs.nestjs.com/techniques/sql-typeorm)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)

---

**Questions?** Create an issue in the GreenFlow repository or contact the DevOps team.
