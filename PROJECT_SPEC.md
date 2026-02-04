# GLEC DTG Green Logistics Platform Specification (V2)

## ⚠️ CRITICAL IDENTITY: LOGISTICS BIDDING PLATFORM (NOT A CALCULATOR)
The goal is to match shippers with eco-friendly fleets via Bidding & Reverse Proposals.

## 1. Feature Requirements
1.  **Carbon Monitoring**: Calculate emissions using GLEC Framework (`Fuel x Factor`).
2.  **Reverse Proposal**: Shippers select specific fleets from a bid and send a counter-offer.

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
```
