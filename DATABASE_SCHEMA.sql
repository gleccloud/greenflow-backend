-- ============================================================================
-- GLEC Green Logistics Platform - Production Database Schema
-- PostgreSQL 17 Compatible
-- ISO-14083 기반 녹색물류 입찰 플랫폼
-- ============================================================================
--
-- ============================================================================
-- 용어 사전 (Glossary) - 모든 설계 문서의 정식 용어
-- ============================================================================
-- Bid (입찰 공고)     : 화주사가 생성하는 운송 입찰 공고. CRUD + 상태 머신 관리.
-- Proposal (투찰)     : 물류기업이 Bid에 응답하여 제출하는 가격/조건 제안.
-- Order (운송 주문)   : 낙찰(Award) 후 생성되는 실제 운송 건. Shipment 포함.
-- Shipment (배송 건)  : Order 내 개별 운송 건. 탄소배출 데이터의 최소 단위.
-- Fleet (차량군)      : 운송사가 보유한 차량 집합. EI 데이터 보유 단위.
-- EI (탄소배출집약도)  : Emission Intensity. gCO₂e/t·km 단위.
-- Score (평가 점수)   : 0.0000~1.0000 범위. 표시 시 ×100 = 백분율.
--   - score_breakdown  : {"price": 0.452, "leadtime": 0.185, "ei": 0.283}
-- Transport Mode      : TRUCK, SHIP, RAIL, AIR, MULTIMODAL (복합운송)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "btree_gist";      -- GiST indexing for advanced queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram matching for text search

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User roles in 3-tier logistics structure (화주 → 주선업자 → 운송사/차주)
CREATE TYPE user_role AS ENUM (
    'SHIPPER',              -- 화주사 (화물 발송인)
    'BROKER',               -- 주선업자/3PL (화물 중개인)
    'CARRIER',              -- 운송사 (화물 운송 기업)
    'FLEET_OWNER',          -- 차주 (개별 차량 소유주)
    'ADMIN',                -- 플랫폼 관리자
    'API_CONSUMER'          -- API 사용자 (외부 플랫폼)
);

-- Data quality grade per ISO-14083 standard
CREATE TYPE ei_grade AS ENUM (
    'GRADE_1',              -- Primary data (실측)
    'GRADE_2',              -- Secondary data (모델링)
    'GRADE_3',              -- Default/Industry average
    'NOT_VERIFIED'          -- 미검증 데이터
);

-- Vehicle fuel types
CREATE TYPE fuel_type AS ENUM (
    'DIESEL',
    'GASOLINE',
    'LPG',
    'CNG',
    'LNG',
    'ELECTRIC',
    'HYDROGEN',
    'HYBRID_DIESEL',
    'HYBRID_GASOLINE',
    'BIODIESEL'
);

-- Vehicle size categories (한국 화물차 분류)
CREATE TYPE vehicle_size AS ENUM (
    'LIGHT_TRUCK',          -- 1톤, 1.4톤
    'MEDIUM_TRUCK',         -- 2.5톤, 3.5톤, 5톤
    'HEAVY_TRUCK',          -- 8톤, 11톤, 15톤, 18톤
    'SEMI_TRAILER',         -- 25톤, 30톤
    'FULL_TRAILER'          -- 40톤
);

-- Bid status lifecycle
CREATE TYPE bid_status AS ENUM (
    'DRAFT',                -- 임시 저장
    'OPEN',                 -- 입찰 진행 중
    'CLOSED',               -- 입찰 마감
    'AWARDED',              -- 낙찰 완료
    'CANCELLED',            -- 취소
    'EXPIRED'               -- 기한 만료
);

-- Proposal status
CREATE TYPE proposal_status AS ENUM (
    'SUBMITTED',            -- 제출됨
    'UNDER_REVIEW',         -- 검토 중
    'ACCEPTED',             -- 수락됨
    'REJECTED',             -- 거부됨
    'WITHDRAWN',            -- 철회됨
    'COUNTER_OFFERED'       -- 역제안 수신
);

-- Order execution status
CREATE TYPE order_status AS ENUM (
    'PENDING',              -- 대기 중
    'CONFIRMED',            -- 확정됨
    'IN_TRANSIT',           -- 운송 중
    'DELIVERED',            -- 배송 완료
    'CANCELLED',            -- 취소
    'FAILED'                -- 실패
);

-- API key status
CREATE TYPE api_key_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'REVOKED',
    'EXPIRED'
);

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users (통합 사용자 테이블)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Information
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    business_registration_number VARCHAR(20) UNIQUE,  -- 사업자등록번호

    -- Role & Status
    role user_role NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Contact Information
    contact_name VARCHAR(100),
    phone_number VARCHAR(20),
    address TEXT,
    postal_code VARCHAR(10),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    preferences JSONB DEFAULT '{}',               -- UI preferences, notification settings
    metadata JSONB DEFAULT '{}'                   -- Additional custom fields
);

-- API Keys (외부 플랫폼 통합용)
CREATE TABLE api_keys (
    api_key_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Key Information
    key_name VARCHAR(100) NOT NULL,               -- User-friendly name
    key_hash VARCHAR(255) UNIQUE NOT NULL,        -- Hashed API key (never store plaintext)
    key_prefix VARCHAR(10) NOT NULL,              -- First 8 chars for identification

    -- Permissions & Limits
    scopes TEXT[] DEFAULT ARRAY['read:fleet', 'read:ei'],  -- OAuth-style scopes
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,

    -- Status
    status api_key_status DEFAULT 'ACTIVE',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    ip_whitelist INET[],                          -- IP restrictions
    metadata JSONB DEFAULT '{}'
);

-- Fleets (운송사 차량 편대)
CREATE TABLE fleets (
    fleet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Basic Information
    fleet_name VARCHAR(255) NOT NULL,
    fleet_code VARCHAR(50) UNIQUE NOT NULL,       -- Human-readable code (e.g., "FLT-A01")
    description TEXT,

    -- Vehicle Specifications
    vehicle_count INTEGER NOT NULL DEFAULT 1 CHECK (vehicle_count > 0),
    vehicle_size vehicle_size NOT NULL,
    vehicle_type VARCHAR(100),                    -- 냉동탑차, 윙바디, 카고, etc.
    avg_vehicle_age_years DECIMAL(4, 1),
    fuel_type fuel_type NOT NULL,

    -- Carbon Metrics (핵심 지표)
    carbon_intensity DECIMAL(10, 2) NOT NULL,     -- gCO₂e/t·km (GLEC Standard)
    carbon_intensity_wtt DECIMAL(10, 2),          -- Well-to-Tank component
    carbon_intensity_ttw DECIMAL(10, 2),          -- Tank-to-Wheel component
    ei_grade ei_grade DEFAULT 'NOT_VERIFIED',
    ei_confidence DECIMAL(5, 4) CHECK (ei_confidence >= 0 AND ei_confidence <= 1),  -- 신뢰도 (0.0000 ~ 1.0000)

    -- Certification
    iso_14083_certified BOOLEAN DEFAULT FALSE,
    certification_date DATE,
    certification_body VARCHAR(100),
    certification_expiry DATE,

    -- Operational Data
    avg_payload_utilization DECIMAL(5, 2),        -- 평균 적재율 (%)
    avg_empty_return_rate DECIMAL(5, 2),          -- 공차 복귀율 (%)
    total_distance_km_last_30d DECIMAL(12, 2),
    total_cargo_tkm_last_30d DECIMAL(15, 2),      -- Tonne-kilometers

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,               -- Public visibility in bidding

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ei_last_updated_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'                   -- Additional custom fields
);

-- EI History (탄소배출집약도 시계열 데이터)
-- NOTE: PostgreSQL 17에서 TimescaleDB deprecated, 일반 파티셔닝 사용
CREATE TABLE ei_history (
    ei_history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id UUID NOT NULL REFERENCES fleets(fleet_id) ON DELETE CASCADE,

    -- Timestamp
    measured_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Carbon Metrics
    ei_value DECIMAL(10, 2) NOT NULL,             -- gCO₂e/t·km
    ei_wtt DECIMAL(10, 2),
    ei_ttw DECIMAL(10, 2),
    ei_grade ei_grade NOT NULL,
    ei_confidence DECIMAL(5, 4),

    -- Context
    trip_count INTEGER,
    total_distance_km DECIMAL(12, 2),
    total_cargo_tkm DECIMAL(15, 2),
    fuel_consumption_liters DECIMAL(12, 2),

    -- Metadata
    source VARCHAR(50),                           -- 'DTG', 'MANUAL', 'API', etc.
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (measured_at);

-- Create partitions for EI history (example: monthly partitions)
CREATE TABLE ei_history_2026_01 PARTITION OF ei_history
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE ei_history_2026_02 PARTITION OF ei_history
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE ei_history_2026_03 PARTITION OF ei_history
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- Add more partitions as needed...

-- Bids (입찰 공고)
CREATE TABLE bids (
    bid_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipper_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Bid Information
    bid_code VARCHAR(50) UNIQUE NOT NULL,         -- Human-readable code (e.g., "BID-20260204-001")
    bid_title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Shipment Details
    origin_address TEXT NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    origin_postal_code VARCHAR(10),
    origin_coordinates POINT,                     -- PostGIS point (lat, lng)

    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    destination_postal_code VARCHAR(10),
    destination_coordinates POINT,

    -- Cargo Information
    cargo_type VARCHAR(100),                      -- 일반화물, 냉동, 냉장, 위험물 etc.
    cargo_weight_tons DECIMAL(10, 2) NOT NULL CHECK (cargo_weight_tons > 0),
    cargo_volume_cbm DECIMAL(10, 2),              -- Cubic meters
    cargo_description TEXT,

    -- Requirements
    required_vehicle_size vehicle_size,
    required_vehicle_type VARCHAR(100),
    special_requirements TEXT,

    -- Timing
    pickup_date DATE NOT NULL,
    pickup_time_start TIME,
    pickup_time_end TIME,
    delivery_date DATE NOT NULL,
    delivery_time_start TIME,
    delivery_time_end TIME,

    -- Bidding Parameters
    max_price DECIMAL(15, 2),                     -- 최대 예산
    ei_weight_percentage DECIMAL(5, 2) DEFAULT 30.00 CHECK (ei_weight_percentage >= 0 AND ei_weight_percentage <= 100),
    price_weight_percentage DECIMAL(5, 2) DEFAULT 50.00 CHECK (price_weight_percentage >= 0 AND price_weight_percentage <= 100),
    leadtime_weight_percentage DECIMAL(5, 2) DEFAULT 20.00 CHECK (leadtime_weight_percentage >= 0 AND leadtime_weight_percentage <= 100),
    CONSTRAINT chk_weight_sum CHECK (ei_weight_percentage + price_weight_percentage + leadtime_weight_percentage = 100.00),

    -- Status & Lifecycle
    status bid_status DEFAULT 'DRAFT',
    bid_opens_at TIMESTAMP WITH TIME ZONE,
    bid_closes_at TIMESTAMP WITH TIME ZONE,
    awarded_proposal_id UUID,                     -- FK to proposals (nullable before award)

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    awarded_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Proposals (입찰 참여 제안)
CREATE TABLE proposals (
    proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_id UUID NOT NULL REFERENCES bids(bid_id) ON DELETE CASCADE,
    carrier_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,  -- Carrier or Broker
    fleet_id UUID REFERENCES fleets(fleet_id) ON DELETE SET NULL,

    -- Proposal Details
    proposed_price DECIMAL(15, 2) NOT NULL CHECK (proposed_price > 0),
    estimated_leadtime_hours INTEGER NOT NULL CHECK (estimated_leadtime_hours > 0),

    -- Carbon Metrics (스냅샷)
    estimated_emissions_kg DECIMAL(10, 2),        -- Total kg CO₂e for this trip
    fleet_ei_snapshot DECIMAL(10, 2),             -- EI at proposal time (gCO₂e/t·km)
    fleet_ei_grade ei_grade,

    -- Scoring (API 계산 결과)
    score DECIMAL(8, 4) CHECK (score >= 0 AND score <= 1),  -- 0.0000 ~ 1.0000 (정규화된 점수)
    score_breakdown JSONB,                        -- {"price": 0.452, "leadtime": 0.185, "ei": 0.283}
    rank INTEGER,                                 -- Ranking among all proposals for this bid

    -- Status
    status proposal_status DEFAULT 'SUBMITTED',

    -- Additional Info
    carrier_notes TEXT,
    attachments JSONB DEFAULT '[]',               -- Array of file URLs/metadata

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Constraint: one proposal per carrier per bid
    UNIQUE (bid_id, carrier_id)
);

-- Reverse Proposals (역제안)
CREATE TABLE reverse_proposals (
    reverse_proposal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_proposal_id UUID NOT NULL REFERENCES proposals(proposal_id) ON DELETE CASCADE,
    shipper_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Counter-offer
    target_price DECIMAL(15, 2) NOT NULL CHECK (target_price > 0),
    target_leadtime_hours INTEGER,
    selected_fleet_id UUID REFERENCES fleets(fleet_id) ON DELETE SET NULL,  -- Specific fleet selection

    -- Notes
    shipper_notes TEXT,
    carrier_response TEXT,

    -- Status
    is_accepted BOOLEAN DEFAULT FALSE,
    is_rejected BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Orders (확정된 운송 주문)
CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_id UUID REFERENCES bids(bid_id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES proposals(proposal_id) ON DELETE SET NULL,
    reverse_proposal_id UUID REFERENCES reverse_proposals(reverse_proposal_id) ON DELETE SET NULL,

    -- Parties
    shipper_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    carrier_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    fleet_id UUID REFERENCES fleets(fleet_id) ON DELETE SET NULL,

    -- Order Code
    order_code VARCHAR(50) UNIQUE NOT NULL,       -- Human-readable code (e.g., "ORD-20260204-001")

    -- Finalized Details (copied from bid/proposal)
    final_price DECIMAL(15, 2) NOT NULL,
    final_leadtime_hours INTEGER NOT NULL,

    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    cargo_weight_tons DECIMAL(10, 2) NOT NULL,

    pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_datetime TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Execution Tracking
    status order_status DEFAULT 'PENDING',
    actual_pickup_datetime TIMESTAMP WITH TIME ZONE,
    actual_delivery_datetime TIMESTAMP WITH TIME ZONE,

    -- Actual Carbon Metrics (after completion)
    actual_emissions_kg DECIMAL(10, 2),
    actual_distance_km DECIMAL(10, 2),
    actual_fuel_consumption_liters DECIMAL(10, 2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    tracking_events JSONB DEFAULT '[]'            -- Array of tracking events
);

-- API Request Logs (API 사용 추적)
CREATE TABLE api_request_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Request Identification
    api_key_id UUID REFERENCES api_keys(api_key_id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    request_id VARCHAR(50) UNIQUE NOT NULL,       -- Unique request identifier for tracing

    -- Request Details
    method VARCHAR(10) NOT NULL,                  -- GET, POST, etc.
    endpoint VARCHAR(255) NOT NULL,
    query_params JSONB,
    request_body JSONB,

    -- Response Details
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    response_size_bytes INTEGER,

    -- Client Information
    ip_address INET,
    user_agent TEXT,

    -- Error Tracking
    error_code VARCHAR(50),
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (created_at);

-- Create partitions for API logs (example: monthly partitions)
CREATE TABLE api_request_logs_2026_01 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE api_request_logs_2026_02 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE api_request_logs_2026_03 PARTITION OF api_request_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- Add more partitions as needed...

-- Notifications (사용자 알림)
CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Notification Details
    type VARCHAR(50) NOT NULL,                    -- 'BID_AWARDED', 'PROPOSAL_RECEIVED', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    -- Related Entities
    related_entity_type VARCHAR(50),              -- 'bid', 'proposal', 'order', etc.
    related_entity_id UUID,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Audit Logs (감사 로그)
CREATE TABLE audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Actor
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    user_email VARCHAR(255),                      -- Snapshot for deleted users

    -- Action
    action VARCHAR(100) NOT NULL,                 -- 'CREATE', 'UPDATE', 'DELETE', etc.
    entity_type VARCHAR(50) NOT NULL,             -- 'bid', 'proposal', 'order', etc.
    entity_id UUID,

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'
) PARTITION BY RANGE (created_at);

-- Create partitions for audit logs (example: monthly partitions)
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE audit_logs_2026_03 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
-- Add more partitions as needed...

-- ============================================================================
-- INDEXES (Performance Optimization)
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_business_reg ON users(business_registration_number) WHERE business_registration_number IS NOT NULL;

-- API Keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- Fleets
CREATE INDEX idx_fleets_owner_id ON fleets(owner_id);
CREATE INDEX idx_fleets_fleet_code ON fleets(fleet_code);
CREATE INDEX idx_fleets_is_active ON fleets(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_fleets_vehicle_size ON fleets(vehicle_size);
CREATE INDEX idx_fleets_fuel_type ON fleets(fuel_type);
CREATE INDEX idx_fleets_carbon_intensity ON fleets(carbon_intensity);
CREATE INDEX idx_fleets_ei_grade ON fleets(ei_grade);
CREATE INDEX idx_fleets_updated_at ON fleets(updated_at);

-- EI History (Partitioned indexes created automatically per partition)
CREATE INDEX idx_ei_history_fleet_id ON ei_history(fleet_id);
CREATE INDEX idx_ei_history_measured_at ON ei_history(measured_at DESC);
CREATE INDEX idx_ei_history_ei_grade ON ei_history(ei_grade);

-- Bids
CREATE INDEX idx_bids_shipper_id ON bids(shipper_id);
CREATE INDEX idx_bids_bid_code ON bids(bid_code);
CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_pickup_date ON bids(pickup_date);
CREATE INDEX idx_bids_created_at ON bids(created_at DESC);
CREATE INDEX idx_bids_bid_closes_at ON bids(bid_closes_at) WHERE status = 'OPEN';
CREATE INDEX idx_bids_origin_city ON bids(origin_city);
CREATE INDEX idx_bids_destination_city ON bids(destination_city);

-- Proposals
CREATE INDEX idx_proposals_bid_id ON proposals(bid_id);
CREATE INDEX idx_proposals_carrier_id ON proposals(carrier_id);
CREATE INDEX idx_proposals_fleet_id ON proposals(fleet_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_score ON proposals(score DESC);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_bid_score ON proposals(bid_id, score DESC);  -- Composite for ranking

-- Reverse Proposals
CREATE INDEX idx_reverse_proposals_original_proposal_id ON reverse_proposals(original_proposal_id);
CREATE INDEX idx_reverse_proposals_shipper_id ON reverse_proposals(shipper_id);
CREATE INDEX idx_reverse_proposals_created_at ON reverse_proposals(created_at DESC);

-- Orders
CREATE INDEX idx_orders_shipper_id ON orders(shipper_id);
CREATE INDEX idx_orders_carrier_id ON orders(carrier_id);
CREATE INDEX idx_orders_fleet_id ON orders(fleet_id);
CREATE INDEX idx_orders_order_code ON orders(order_code);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_pickup_datetime ON orders(pickup_datetime);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- API Request Logs (Partitioned indexes)
CREATE INDEX idx_api_logs_api_key_id ON api_request_logs(api_key_id);
CREATE INDEX idx_api_logs_user_id ON api_request_logs(user_id);
CREATE INDEX idx_api_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX idx_api_logs_status_code ON api_request_logs(status_code);
CREATE INDEX idx_api_logs_created_at ON api_request_logs(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit Logs (Partitioned indexes)
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- VIEWS (Commonly Used Queries)
-- ============================================================================

-- Fleet Performance Summary (Last 30 days)
CREATE VIEW vw_fleet_performance AS
SELECT
    f.fleet_id,
    f.fleet_code,
    f.fleet_name,
    f.owner_id,
    u.company_name AS owner_company,
    f.vehicle_count,
    f.carbon_intensity AS current_ei,
    f.ei_grade,
    f.ei_confidence,
    AVG(eh.ei_value) AS avg_ei_30d,
    STDDEV(eh.ei_value) AS ei_volatility_30d,
    COUNT(DISTINCT o.order_id) AS completed_orders_30d,
    SUM(o.final_price) AS total_revenue_30d,
    AVG(o.actual_emissions_kg) AS avg_actual_emissions_30d,
    f.updated_at
FROM fleets f
LEFT JOIN users u ON f.owner_id = u.user_id
LEFT JOIN ei_history eh ON f.fleet_id = eh.fleet_id
    AND eh.measured_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
LEFT JOIN orders o ON f.fleet_id = o.fleet_id
    AND o.status = 'DELIVERED'
    AND o.completed_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
WHERE f.is_active = TRUE
GROUP BY f.fleet_id, f.fleet_code, f.fleet_name, f.owner_id, u.company_name,
    f.vehicle_count, f.carbon_intensity, f.ei_grade, f.ei_confidence, f.updated_at;

-- Active Bids Summary
CREATE VIEW vw_active_bids AS
SELECT
    b.bid_id,
    b.bid_code,
    b.bid_title,
    b.shipper_id,
    u.company_name AS shipper_company,
    b.origin_city,
    b.destination_city,
    b.cargo_weight_tons,
    b.pickup_date,
    b.delivery_date,
    b.status,
    b.bid_opens_at,
    b.bid_closes_at,
    COUNT(DISTINCT p.proposal_id) AS proposal_count,
    MIN(p.proposed_price) AS min_proposed_price,
    MAX(p.proposed_price) AS max_proposed_price,
    AVG(p.proposed_price) AS avg_proposed_price,
    AVG(p.fleet_ei_snapshot) AS avg_proposed_ei,
    b.created_at
FROM bids b
LEFT JOIN users u ON b.shipper_id = u.user_id
LEFT JOIN proposals p ON b.bid_id = p.bid_id AND p.status NOT IN ('WITHDRAWN', 'REJECTED')
WHERE b.status IN ('OPEN', 'CLOSED')
GROUP BY b.bid_id, b.bid_code, b.bid_title, b.shipper_id, u.company_name,
    b.origin_city, b.destination_city, b.cargo_weight_tons, b.pickup_date,
    b.delivery_date, b.status, b.bid_opens_at, b.bid_closes_at, b.created_at;

-- API Usage Summary (Last 7 days)
CREATE VIEW vw_api_usage_7d AS
SELECT
    ak.api_key_id,
    ak.key_name,
    u.user_id,
    u.company_name,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE arl.status_code >= 200 AND arl.status_code < 300) AS successful_requests,
    COUNT(*) FILTER (WHERE arl.status_code >= 400) AS failed_requests,
    AVG(arl.response_time_ms) AS avg_response_time_ms,
    MAX(arl.response_time_ms) AS max_response_time_ms,
    SUM(arl.response_size_bytes) AS total_bandwidth_bytes,
    MAX(arl.created_at) AS last_used_at
FROM api_keys ak
LEFT JOIN users u ON ak.user_id = u.user_id
LEFT JOIN api_request_logs arl ON ak.api_key_id = arl.api_key_id
    AND arl.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY ak.api_key_id, ak.key_name, u.user_id, u.company_name;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_fleets_updated_at
    BEFORE UPDATE ON fleets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bids_updated_at
    BEFORE UPDATE ON bids
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function: Create audit log on important table changes
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NULL),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.bid_id, NEW.proposal_id, NEW.order_id, OLD.bid_id, OLD.proposal_id, OLD.order_id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for critical tables
CREATE TRIGGER trigger_bids_audit
    AFTER INSERT OR UPDATE OR DELETE ON bids
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_proposals_audit
    AFTER INSERT OR UPDATE OR DELETE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER trigger_orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_audit_log();

-- Function: Calculate proposal score
CREATE OR REPLACE FUNCTION calculate_proposal_score(
    p_bid_id UUID,
    p_proposed_price DECIMAL,
    p_estimated_leadtime_hours INTEGER,
    p_fleet_ei DECIMAL
)
RETURNS TABLE(
    score DECIMAL(8, 4),
    score_breakdown JSONB
) AS $$
DECLARE
    v_bid RECORD;
    v_max_price DECIMAL;
    v_max_leadtime INTEGER;
    v_max_ei DECIMAL;

    v_price_norm DECIMAL;
    v_leadtime_norm DECIMAL;
    v_ei_norm DECIMAL;

    v_price_score DECIMAL;
    v_leadtime_score DECIMAL;
    v_ei_score DECIMAL;
    v_total_score DECIMAL;
BEGIN
    -- Get bid details
    SELECT * INTO v_bid FROM bids WHERE bid_id = p_bid_id;

    -- Get max values from all proposals for normalization
    SELECT
        MAX(proposed_price),
        MAX(estimated_leadtime_hours),
        MAX(fleet_ei_snapshot)
    INTO v_max_price, v_max_leadtime, v_max_ei
    FROM proposals
    WHERE bid_id = p_bid_id;

    -- Normalize (lower is better, so invert: 1 - normalized)
    v_price_norm := CASE WHEN v_max_price > 0 THEN 1 - (p_proposed_price / v_max_price) ELSE 0 END;
    v_leadtime_norm := CASE WHEN v_max_leadtime > 0 THEN 1 - (p_estimated_leadtime_hours::DECIMAL / v_max_leadtime) ELSE 0 END;
    v_ei_norm := CASE WHEN v_max_ei > 0 THEN 1 - (p_fleet_ei / v_max_ei) ELSE 0 END;

    -- Calculate weighted scores (weight_percentage / 100 → 0~1 decimal)
    v_price_score := v_price_norm * (v_bid.price_weight_percentage / 100.0);
    v_leadtime_score := v_leadtime_norm * (v_bid.leadtime_weight_percentage / 100.0);
    v_ei_score := v_ei_norm * (v_bid.ei_weight_percentage / 100.0);

    -- Total score (0.0000 ~ 1.0000)
    v_total_score := v_price_score + v_leadtime_score + v_ei_score;

    RETURN QUERY SELECT
        v_total_score,
        jsonb_build_object(
            'price', v_price_score,
            'leadtime', v_leadtime_score,
            'ei', v_ei_score
        );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NEW ENUM TYPES (Phase 1 추가)
-- ============================================================================

-- 운송 수단 유형 (다중 모달 지원)
CREATE TYPE transport_mode AS ENUM (
    'TRUCK',                -- 도로 운송 (트럭)
    'SHIP',                 -- 해운 (컨테이너선, 벌크선 등)
    'RAIL',                 -- 철도 운송
    'AIR',                  -- 항공 운송
    'INLAND_WATERWAY',      -- 내륙 수운
    'MULTIMODAL'            -- 복합 운송
);

-- 배송 건(Shipment) 상태
CREATE TYPE shipment_status AS ENUM (
    'CREATED',              -- 생성됨
    'PICKED_UP',            -- 픽업 완료
    'IN_TRANSIT',           -- 운송 중
    'AT_HUB',               -- 허브 도착 (복합운송 환적)
    'OUT_FOR_DELIVERY',     -- 배송 출발
    'DELIVERED',            -- 배송 완료
    'FAILED',               -- 배송 실패
    'RETURNED'              -- 반송
);

-- Webhook 이벤트 유형
CREATE TYPE webhook_event_type AS ENUM (
    'bid.created',
    'bid.updated',
    'bid.awarded',
    'bid.cancelled',
    'proposal.submitted',
    'proposal.accepted',
    'proposal.rejected',
    'order.created',
    'order.status_changed',
    'shipment.status_changed',
    'shipment.carbon_recorded',
    'carbon.report_ready',
    'fleet.ei_updated'
);

-- 운송 상품 등급
CREATE TYPE product_tier AS ENUM (
    'PREMIUM_GREEN',        -- 프리미엄 저탄소 (Grade 1 Fleet만)
    'STANDARD_GREEN',       -- 표준 녹색 (Grade 1-2 Fleet)
    'ECONOMY',              -- 일반 운송 (모든 Grade)
    'CUSTOM'                -- 커스텀 구성
);

-- ============================================================================
-- NEW TABLES (Phase 1 추가 — 사용자 요구사항 GAP 해소)
-- ============================================================================

-- -----------------------------------------------
-- Shipments: 개별 배송 건 (Order 내 실제 운송 단위)
-- 탄소배출 데이터의 최소 측정 단위
-- -----------------------------------------------
CREATE TABLE shipments (
    shipment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES fleets(fleet_id),
    driver_id UUID REFERENCES users(user_id),

    -- Route
    origin_address TEXT NOT NULL,
    origin_lat DECIMAL(9, 6),
    origin_lng DECIMAL(9, 6),
    destination_address TEXT NOT NULL,
    destination_lat DECIMAL(9, 6),
    destination_lng DECIMAL(9, 6),
    actual_distance_km DECIMAL(10, 2),

    -- Cargo
    cargo_weight_kg DECIMAL(10, 2) NOT NULL CHECK (cargo_weight_kg > 0),
    cargo_volume_cbm DECIMAL(10, 2),

    -- Transport Mode
    transport_mode transport_mode NOT NULL DEFAULT 'TRUCK',
    vehicle_id VARCHAR(50),              -- 차량번호
    vessel_imo VARCHAR(20),              -- 선박 IMO 번호 (해운)
    flight_number VARCHAR(20),           -- 항공편 번호

    -- Status & Timing
    status shipment_status DEFAULT 'CREATED',
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_fleet ON shipments(fleet_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_mode ON shipments(transport_mode);

-- -----------------------------------------------
-- Carbon Records: 운송 건별 탄소배출 기록
-- 데이터 무결성 보장 (서명 + 해시체인)
-- -----------------------------------------------
CREATE TABLE carbon_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Relations
    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    fleet_id UUID NOT NULL REFERENCES fleets(fleet_id),
    carrier_id UUID NOT NULL REFERENCES users(user_id),

    -- Emission Data (GLEC Framework v3.0)
    total_emissions_kg DECIMAL(12, 4) NOT NULL CHECK (total_emissions_kg >= 0),  -- 총 CO₂e (kg)
    emissions_wtw DECIMAL(12, 4),        -- Well-to-Wheel 전체
    emissions_wtt DECIMAL(12, 4),        -- Well-to-Tank (연료 생산)
    emissions_ttw DECIMAL(12, 4),        -- Tank-to-Wheel (연료 소비)

    -- EI at recording time
    ei_value DECIMAL(10, 4) NOT NULL,    -- gCO₂e/t·km
    ei_grade ei_grade NOT NULL,
    transport_mode transport_mode NOT NULL,

    -- Input data for calculation
    distance_km DECIMAL(10, 2) NOT NULL CHECK (distance_km > 0),
    cargo_weight_tonnes DECIMAL(10, 4) NOT NULL CHECK (cargo_weight_tonnes > 0),
    fuel_consumed_liters DECIMAL(10, 2),
    fuel_type fuel_type,
    load_factor DECIMAL(5, 4) CHECK (load_factor >= 0 AND load_factor <= 1),
    empty_running_factor DECIMAL(5, 4) CHECK (empty_running_factor >= 0 AND empty_running_factor <= 1),

    -- Data Integrity
    data_signature TEXT,                 -- 디지털 서명 (Ed25519 또는 ECDSA)
    signature_algorithm VARCHAR(50),     -- 서명 알고리즘 명칭
    data_hash VARCHAR(128) NOT NULL,     -- SHA-256 해시 (원본 데이터)
    prev_record_hash VARCHAR(128),       -- 이전 레코드 해시 (해시 체인)
    hash_chain_valid BOOLEAN DEFAULT TRUE,

    -- Provenance
    data_source VARCHAR(100) NOT NULL,   -- 'CARRIER_MANUAL', 'TELEMATICS', 'OBD', 'ESTIMATED'
    recorded_by UUID NOT NULL REFERENCES users(user_id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(user_id),

    -- ISO-14083 Compliance
    iso_14083_compliant BOOLEAN DEFAULT FALSE,
    calculation_method VARCHAR(50),      -- 'GLEC_V3', 'ISO_14083', 'SFC_CERTIFIED'

    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carbon_records_shipment ON carbon_records(shipment_id);
CREATE INDEX idx_carbon_records_fleet ON carbon_records(fleet_id);
CREATE INDEX idx_carbon_records_carrier ON carbon_records(carrier_id);
CREATE INDEX idx_carbon_records_recorded_at ON carbon_records(recorded_at DESC);
CREATE INDEX idx_carbon_records_hash_chain ON carbon_records(prev_record_hash);

-- -----------------------------------------------
-- Data Signatures: 데이터 무결성 서명 저장소
-- 감사 추적 및 제3자 검증 지원
-- -----------------------------------------------
CREATE TABLE data_signatures (
    signature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- What was signed
    entity_type VARCHAR(50) NOT NULL,    -- 'carbon_record', 'shipment', 'proposal', 'order'
    entity_id UUID NOT NULL,

    -- Signature
    signature TEXT NOT NULL,             -- 디지털 서명 값
    algorithm VARCHAR(50) NOT NULL DEFAULT 'Ed25519', -- 서명 알고리즘
    public_key_id VARCHAR(128) NOT NULL, -- 서명자 공개키 식별자
    key_fingerprint VARCHAR(64),         -- 공개키 핑거프린트

    -- Hash Chain
    data_hash VARCHAR(128) NOT NULL,     -- 서명 대상 데이터 해시
    prev_signature_hash VARCHAR(128),    -- 이전 서명 해시 (체인 유지)
    chain_index BIGINT,                  -- 해시 체인 내 순번

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by VARCHAR(100),            -- 검증자 (시스템 또는 제3자)

    -- Metadata
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signer_id UUID NOT NULL REFERENCES users(user_id),
    signer_role user_role NOT NULL
);

CREATE INDEX idx_data_signatures_entity ON data_signatures(entity_type, entity_id);
CREATE INDEX idx_data_signatures_chain ON data_signatures(prev_signature_hash);
CREATE UNIQUE INDEX idx_data_signatures_chain_index ON data_signatures(entity_type, chain_index);

-- -----------------------------------------------
-- Transport Products: EI별 운송 상품 구성
-- 물류기업이 EI 등급별 서비스 패키지를 정의
-- -----------------------------------------------
CREATE TABLE transport_products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    carrier_id UUID NOT NULL REFERENCES users(user_id),

    -- Product definition
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    tier product_tier NOT NULL DEFAULT 'ECONOMY',
    transport_mode transport_mode NOT NULL DEFAULT 'TRUCK',

    -- EI constraints
    max_ei_value DECIMAL(10, 4),         -- 최대 허용 EI (이하만 이 상품에 해당)
    guaranteed_ei_grade ei_grade,        -- 보장 EI 등급 (Grade 1/2/3)
    eligible_fleet_ids UUID[],           -- 이 상품에 배정 가능한 Fleet ID 목록

    -- Pricing
    base_price_per_km DECIMAL(10, 2),    -- km당 기본 운임 (₩)
    base_price_per_ton DECIMAL(10, 2),   -- 톤당 기본 운임 (₩)
    green_premium_percentage DECIMAL(5, 2) DEFAULT 0, -- 녹색 프리미엄 (%)
    carbon_offset_included BOOLEAN DEFAULT FALSE,

    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE,
    valid_until DATE,
    service_area JSONB,                  -- {"regions": ["서울", "경기"], "nationwide": false}

    -- Performance Metrics
    avg_delivery_hours INTEGER,
    on_time_rate DECIMAL(5, 4) CHECK (on_time_rate >= 0 AND on_time_rate <= 1),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transport_products_carrier ON transport_products(carrier_id);
CREATE INDEX idx_transport_products_tier ON transport_products(tier);
CREATE INDEX idx_transport_products_mode ON transport_products(transport_mode);
CREATE INDEX idx_transport_products_active ON transport_products(is_active) WHERE is_active = TRUE;

-- -----------------------------------------------
-- Webhooks: 화주/물류 전산 시스템 연동
-- 이벤트 기반 Push 데이터 전달
-- -----------------------------------------------
CREATE TABLE webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Owner
    owner_id UUID NOT NULL REFERENCES users(user_id),
    owner_role user_role NOT NULL,

    -- Configuration
    url TEXT NOT NULL,                   -- 콜백 URL (HTTPS만 허용)
    secret VARCHAR(256) NOT NULL,        -- HMAC 서명용 비밀키
    events webhook_event_type[] NOT NULL, -- 구독 이벤트 목록

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,

    -- Headers
    custom_headers JSONB,                -- {"Authorization": "Bearer xxx", ...}

    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,

    -- Metadata
    description VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_owner ON webhooks(owner_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = TRUE;

-- -----------------------------------------------
-- Webhook Delivery Log: 웹훅 전달 이력
-- 재시도 및 실패 추적
-- -----------------------------------------------
CREATE TABLE webhook_deliveries (
    delivery_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    webhook_id UUID NOT NULL REFERENCES webhooks(webhook_id) ON DELETE CASCADE,
    event_type webhook_event_type NOT NULL,

    -- Payload
    payload JSONB NOT NULL,

    -- Delivery attempt
    attempt_number INTEGER NOT NULL DEFAULT 1,
    http_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Status
    delivered BOOLEAN DEFAULT FALSE,
    failed_reason TEXT,

    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivered_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_pending ON webhook_deliveries(delivered, next_retry_at)
    WHERE delivered = FALSE;

-- -----------------------------------------------
-- Multimodal Segments: 복합운송 구간별 정보
-- Shipment가 MULTIMODAL일 때 구간 분리
-- -----------------------------------------------
CREATE TABLE multimodal_segments (
    segment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
    segment_order INTEGER NOT NULL,      -- 구간 순서 (1, 2, 3...)

    -- Segment details
    transport_mode transport_mode NOT NULL,
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    distance_km DECIMAL(10, 2) NOT NULL CHECK (distance_km > 0),

    -- Fleet/Vehicle
    fleet_id UUID REFERENCES fleets(fleet_id),
    carrier_id UUID REFERENCES users(user_id),

    -- EI for this segment
    segment_ei DECIMAL(10, 4),           -- 이 구간의 EI (gCO₂e/t·km)
    segment_emissions_kg DECIMAL(12, 4), -- 이 구간의 배출량 (kg CO₂e)

    -- Timing
    estimated_departure TIMESTAMP WITH TIME ZONE,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_departure TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_multimodal_segments_shipment ON multimodal_segments(shipment_id);
CREATE UNIQUE INDEX idx_multimodal_segments_order ON multimodal_segments(shipment_id, segment_order);

-- ============================================================================
-- SECURITY & ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples - adjust based on authentication system)

-- Users: Users can view all active users, but only update their own profile
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Fleets: Public fleets visible to all, owners can manage their own
CREATE POLICY fleets_select_policy ON fleets
    FOR SELECT
    USING (is_public = TRUE OR owner_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY fleets_insert_policy ON fleets
    FOR INSERT
    WITH CHECK (owner_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY fleets_update_policy ON fleets
    FOR UPDATE
    USING (owner_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Bids: Shippers can manage their own bids, all users can view open bids
CREATE POLICY bids_select_policy ON bids
    FOR SELECT
    USING (status IN ('OPEN', 'CLOSED') OR shipper_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY bids_insert_policy ON bids
    FOR INSERT
    WITH CHECK (shipper_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY bids_update_policy ON bids
    FOR UPDATE
    USING (shipper_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Proposals: Carriers can view/manage their own, shippers can view all for their bids
CREATE POLICY proposals_select_policy ON proposals
    FOR SELECT
    USING (
        carrier_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM bids
            WHERE bids.bid_id = proposals.bid_id
            AND bids.shipper_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

CREATE POLICY proposals_insert_policy ON proposals
    FOR INSERT
    WITH CHECK (carrier_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Orders: Parties involved can view their orders
CREATE POLICY orders_select_policy ON orders
    FOR SELECT
    USING (
        shipper_id = current_setting('app.current_user_id', TRUE)::UUID
        OR carrier_id = current_setting('app.current_user_id', TRUE)::UUID
    );

-- Shipments: Order 관계자만 조회 가능
CREATE POLICY shipments_select_policy ON shipments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.order_id = shipments.order_id
            AND (orders.shipper_id = current_setting('app.current_user_id', TRUE)::UUID
                 OR orders.carrier_id = current_setting('app.current_user_id', TRUE)::UUID)
        )
    );

-- Carbon Records: 관련 운송사 또는 화주만 조회
CREATE POLICY carbon_records_select_policy ON carbon_records
    FOR SELECT
    USING (
        carrier_id = current_setting('app.current_user_id', TRUE)::UUID
        OR EXISTS (
            SELECT 1 FROM shipments s
            JOIN orders o ON o.order_id = s.order_id
            WHERE s.shipment_id = carbon_records.shipment_id
            AND o.shipper_id = current_setting('app.current_user_id', TRUE)::UUID
        )
    );

CREATE POLICY carbon_records_insert_policy ON carbon_records
    FOR INSERT
    WITH CHECK (carrier_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Webhooks: 소유자만 관리 가능
CREATE POLICY webhooks_select_policy ON webhooks
    FOR SELECT
    USING (owner_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY webhooks_insert_policy ON webhooks
    FOR INSERT
    WITH CHECK (owner_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY webhooks_update_policy ON webhooks
    FOR UPDATE
    USING (owner_id = current_setting('app.current_user_id', TRUE)::UUID);

-- Transport Products: 소유 운송사만 관리, 모든 사용자 조회 가능
CREATE POLICY transport_products_select_policy ON transport_products
    FOR SELECT
    USING (is_active = TRUE OR carrier_id = current_setting('app.current_user_id', TRUE)::UUID);

CREATE POLICY transport_products_insert_policy ON transport_products
    FOR INSERT
    WITH CHECK (carrier_id = current_setting('app.current_user_id', TRUE)::UUID);

-- ============================================================================
-- SAMPLE DATA (Development/Testing)
-- ============================================================================

-- NOTE: Remove this section in production or use a separate seed file

-- Insert sample admin user
INSERT INTO users (email, password_hash, company_name, role, is_verified, is_active)
VALUES
    ('admin@glec.com', crypt('admin123', gen_salt('bf')), 'GLEC Platform Admin', 'ADMIN', TRUE, TRUE),
    ('shipper@samsung.com', crypt('shipper123', gen_salt('bf')), '삼성전자 로지스틱스', 'SHIPPER', TRUE, TRUE),
    ('carrier@cj.com', crypt('carrier123', gen_salt('bf')), 'CJ대한통운', 'CARRIER', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MAINTENANCE & MONITORING
-- ============================================================================

-- Function: Clean old API logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM api_request_logs
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Function: Clean old EI history (retention: 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_ei_history()
RETURNS void AS $$
BEGIN
    DELETE FROM ei_history
    WHERE measured_at < CURRENT_TIMESTAMP - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Function: Vacuum analyze all tables (maintenance)
CREATE OR REPLACE FUNCTION maintenance_vacuum_analyze()
RETURNS void AS $$
BEGIN
    VACUUM ANALYZE users;
    VACUUM ANALYZE fleets;
    VACUUM ANALYZE bids;
    VACUUM ANALYZE proposals;
    VACUUM ANALYZE orders;
    VACUUM ANALYZE shipments;
    VACUUM ANALYZE carbon_records;
    VACUUM ANALYZE transport_products;
    VACUUM ANALYZE webhooks;
    VACUUM ANALYZE webhook_deliveries;
    VACUUM ANALYZE multimodal_segments;
    VACUUM ANALYZE ei_history;
    VACUUM ANALYZE api_request_logs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE users IS '통합 사용자 테이블: 화주, 주선업자, 운송사, 차주, 관리자';
COMMENT ON TABLE fleets IS '운송사 차량 편대 정보 및 탄소배출집약도(EI) 데이터';
COMMENT ON TABLE ei_history IS 'EI 시계열 데이터 (파티셔닝됨, 월별)';
COMMENT ON TABLE bids IS '화주가 생성한 운송 입찰 공고';
COMMENT ON TABLE proposals IS '운송사가 제출한 입찰 제안';
COMMENT ON TABLE reverse_proposals IS '화주가 특정 차량 편대를 지정한 역제안';
COMMENT ON TABLE orders IS '확정된 운송 주문 (실행 추적)';
COMMENT ON TABLE api_keys IS '외부 플랫폼 통합을 위한 API 키';
COMMENT ON TABLE api_request_logs IS 'API 사용 로그 (파티셔닝됨, 월별)';
COMMENT ON TABLE notifications IS '사용자 알림 시스템';
COMMENT ON TABLE audit_logs IS '감사 로그 (모든 중요 변경사항 추적, 파티셔닝됨)';

COMMENT ON COLUMN fleets.carbon_intensity IS 'GLEC Framework 기준 탄소배출집약도 (gCO₂e/t·km)';
COMMENT ON COLUMN fleets.ei_grade IS 'ISO-14083 데이터 품질 등급 (Grade 1: 실측, Grade 2: 모델링)';
COMMENT ON COLUMN proposals.score IS '입찰 평가 점수 (0.0~1.0): α×Price + β×Leadtime + γ×EI (표시 시 ×100)';

-- New table comments
COMMENT ON TABLE shipments IS '개별 배송 건: Order 내 실제 운송 단위, 탄소배출 측정 최소 단위';
COMMENT ON TABLE carbon_records IS '운송 건별 탄소배출 기록: 디지털 서명 + 해시체인으로 무결성 보장';
COMMENT ON TABLE data_signatures IS '데이터 무결성 서명: Ed25519 서명 + 해시체인 감사 추적';
COMMENT ON TABLE transport_products IS 'EI별 운송 상품: 물류기업이 정의하는 탄소등급별 서비스 패키지';
COMMENT ON TABLE webhooks IS '웹훅 설정: 화주/물류 전산시스템(ERP/TMS) 연동용 이벤트 Push';
COMMENT ON TABLE webhook_deliveries IS '웹훅 전달 이력: 재시도, 실패 추적';
COMMENT ON TABLE multimodal_segments IS '복합운송 구간: Shipment의 구간별 운송수단·거리·배출량 분리';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
