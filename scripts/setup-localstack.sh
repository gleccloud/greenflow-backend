#!/bin/bash

# GreenFlow LocalStack Setup Script
# Automates LocalStack installation and initialization for development

set -e

echo "=================================================="
echo "   GreenFlow LocalStack Setup"
echo "=================================================="

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker is not installed. Please install Docker Desktop or Docker Engine.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}✗ Docker Compose is not installed. Please install Docker Compose.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker Compose found${NC}"

# Check Docker is running
if ! docker ps &> /dev/null; then
  echo -e "${RED}✗ Docker is not running. Please start Docker Desktop or Docker Engine.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker daemon is running${NC}"

# Create necessary directories
echo -e "\n${YELLOW}[2/5] Creating directories...${NC}"

mkdir -p scripts/localstack-init
mkdir -p projects/glec-api-backend/src/config
echo -e "${GREEN}✓ Directories created${NC}"

# Create docker-compose.yml if it doesn't exist
echo -e "\n${YELLOW}[3/5] Setting up Docker Compose configuration...${NC}"

if [ ! -f docker-compose.yml ]; then
  cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    container_name: greenflow-localstack
    ports:
      - "4566:4566"
      - "4571:4571"
      - "5432:5432"
      - "6379:6379"
    environment:
      - SERVICES=rds,elasticache,sqs,sns,lambda,s3,cloudformation,cloudwatch
      - DEBUG=1
      - LAMBDA_EXECUTOR=docker
      - DOCKER_HOST=unix:///var/run/docker.sock
      - AWS_DEFAULT_REGION=us-east-1
      - AWS_REGION=us-east-1
      - DEFAULT_REGION=us-east-1
      - DATA_DIR=/tmp/localstack/data
      - EAGER_SERVICE_LOADING=1
      - PROVIDER_OVERRIDE_RDS=rds-v2
      - LOCALSTACK_LOG_LEVEL=info
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock"
      - "localstack-data:/tmp/localstack"
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
EOF
  echo -e "${GREEN}✓ Docker Compose configuration created${NC}"
else
  echo -e "${YELLOW}! Docker Compose configuration already exists${NC}"
fi

# Create initialization script
echo -e "\n${YELLOW}[4/5] Setting up initialization scripts...${NC}"

if [ ! -f scripts/localstack-init/01-init-db.sh ]; then
  cat > scripts/localstack-init/01-init-db.sh << 'EOF'
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
  --region us-east-1 || true

# ElastiCache Redis setup
echo "Creating ElastiCache Redis cluster..."
awslocal elasticache create-cache-cluster \
  --cache-cluster-id greenflow-redis \
  --cache-node-type cache.t2.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --port 6379 \
  --region us-east-1 || true

# SQS Queue for bid evaluation
echo "Creating SQS queues..."
awslocal sqs create-queue \
  --queue-name greenflow-bid-evaluation.fifo \
  --attributes FifoQueue=true,ContentBasedDeduplication=true \
  --region us-east-1 || true

awslocal sqs create-queue \
  --queue-name greenflow-notifications \
  --region us-east-1 || true

# SNS Topics for notifications
echo "Creating SNS topics..."
awslocal sns create-topic \
  --name greenflow-shipper-notifications \
  --region us-east-1 || true

awslocal sns create-topic \
  --name greenflow-carrier-notifications \
  --region us-east-1 || true

# S3 bucket for documents
echo "Creating S3 bucket..."
awslocal s3 mb s3://greenflow-documents \
  --region us-east-1 || true

echo "=== LocalStack Initialization Complete ==="
echo "✅ RDS: greenflow-db (localhost:5432)"
echo "✅ Redis: greenflow-redis (localhost:6379)"
echo "✅ SQS: greenflow-bid-evaluation.fifo"
echo "✅ SNS: greenflow-shipper-notifications, greenflow-carrier-notifications"
echo "✅ S3: greenflow-documents"
EOF
  chmod +x scripts/localstack-init/01-init-db.sh
  echo -e "${GREEN}✓ Initialization scripts created${NC}"
else
  echo -e "${YELLOW}! Initialization scripts already exist${NC}"
fi

# Start LocalStack
echo -e "\n${YELLOW}[5/5] Starting LocalStack...${NC}"

docker-compose up -d

# Wait for LocalStack to be healthy
echo -e "\n${YELLOW}Waiting for LocalStack to be ready...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:4566/_localstack/health | grep -q '"services"'; then
    echo -e "${GREEN}✓ LocalStack is ready${NC}"
    break
  fi
  echo "  Attempt $i/30..."
  sleep 1
done

# Verify services
echo -e "\n${YELLOW}Verifying services...${NC}"
docker-compose ps

echo -e "\n${GREEN}=================================================="
echo "   Setup Complete! ✓"
echo "==================================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update your .env.development file with LocalStack credentials"
echo "2. Run: npm install (if not already done)"
echo "3. Run: npm run db:migrate:dev (to set up database schema)"
echo "4. Run: npm run start:dev (to start the backend)"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  docker-compose logs -f localstack"
echo ""
echo -e "${YELLOW}Stop services:${NC}"
echo "  docker-compose stop"
echo ""
echo -e "${YELLOW}Reset everything:${NC}"
echo "  docker-compose down -v && ./scripts/setup-localstack.sh"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  See LOCALSTACK_INTEGRATION.md for detailed information"
