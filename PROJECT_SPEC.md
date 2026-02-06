# GLEC DTG Green Logistics Platform Specification (V3)

**Last Updated**: 2026-02-05

## ⚠️ CRITICAL IDENTITY: LOGISTICS BIDDING PLATFORM (NOT A CALCULATOR)
The goal is to match shippers with eco-friendly fleets via Bidding & Reverse Proposals.

## 1. Feature Requirements

### Core Features
1.  **Carbon Monitoring**: Calculate emissions using GLEC Framework (`Fuel x Factor`).
2.  **Reverse Proposal**: Shippers select specific fleets from a bid and send a counter-offer.

### New: API Console (2026-02-05)
3. **Console Metrics & Usage Tracking**: Developer-facing API console for monitoring API usage, performance, quota, and billing.
   - Real-time metrics dashboard via SSE
   - API key quota management
   - Usage analytics and billing
   - **Frontend Status**: ✅ Complete (deployed to LocalStack S3)
   - **Backend Status**: 📋 Implementation pending
   - **Reference**: See [docs/CONSOLE_MODULE_ARCHITECTURE.md](docs/CONSOLE_MODULE_ARCHITECTURE.md)

#### Console API Endpoints (New - Implementation Pending)

```http
# Metrics Summary
GET /api/v2/console/metrics/summary?period=DAY
Authorization: Bearer {jwt_token}
Response: { totalRequests, successRate, averageResponseTime, totalErrorCount }

# Endpoint Usage Statistics
GET /api/v2/console/metrics/endpoints?limit=10
Authorization: Bearer {jwt_token}
Response: [{ method, endpoint, requestCount, averageResponseTime, errorRate }]

# API Key Quota
GET /api/v2/console/metrics/quota
Authorization: Bearer {jwt_token}
Response: { used, limit, remaining, resetDate, usagePercentage }

# Billing Metrics
GET /api/v2/console/metrics/billing?period=MONTH
Authorization: Bearer {jwt_token}
Response: { currentPeriod: { totalCost, totalRequests, costPerRequest } }

# Real-time Metrics Stream (SSE)
GET /api/v2/console/metrics/stream
Authorization: Bearer {jwt_token}
Accept: text/event-stream
Response: SSE stream with metrics updates every 5 seconds
```

## 2. REQUIRED DATABASE SCHEMA (Simply implement this)
Please copy/adapt this exact schema structure for `init.sql`.

```sql
-- Users (Shippers & Logistics Companies)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('SHIPPER', 'LOGISTICS'))
);

-- Fleets (Owned by Logistics Companies)
CREATE TABLE fleets (
    fleet_id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(user_id),
    vehicle_type VARCHAR(50),
    carbon_intensity DECIMAL(10, 2) NOT NULL COMMENT 'g CO2e/tkm (GLEC Standard)',
    description TEXT
);

-- Bids (Created by Shippers)
CREATE TABLE bids (
    bid_id SERIAL PRIMARY KEY,
    shipper_id INT REFERENCES users(user_id),
    origin VARCHAR(100),
    destination VARCHAR(100),
    cargo_weight_tons DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'OPEN'
);

-- Proposals (Submitted by Logistics Companies)
CREATE TABLE proposals (
    proposal_id SERIAL PRIMARY KEY,
    bid_id INT REFERENCES bids(bid_id),
    logistics_company_id INT REFERENCES users(user_id),
    proposed_price DECIMAL(15, 2),
    total_emissions_est DECIMAL(10, 2)
);

-- Reverse Proposals (Shipper selects specific fleets)
CREATE TABLE reverse_proposals (
    rev_prop_id SERIAL PRIMARY KEY,
    original_proposal_id INT REFERENCES proposals(proposal_id),
    shipper_id INT REFERENCES users(user_id),
    selected_fleet_id INT REFERENCES fleets(fleet_id),
    target_price DECIMAL(15, 2),
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API Request Logs (Console Module - NEW)
CREATE TABLE api_request_logs (
    id BIGSERIAL,
    api_key_id UUID NOT NULL,
    user_id INT REFERENCES users(user_id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    status_code SMALLINT NOT NULL,
    response_time_ms INT NOT NULL,
    request_size_bytes INT,
    response_size_bytes INT,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Indexes for Console Module
CREATE INDEX idx_api_logs_api_key ON api_request_logs(api_key_id, created_at DESC);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
CREATE INDEX idx_api_logs_status ON api_request_logs(status_code, created_at DESC);
CREATE INDEX idx_api_logs_user ON api_request_logs(user_id, created_at DESC);
```
