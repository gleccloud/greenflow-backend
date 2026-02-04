/**
 * Mock Dashboard Data
 * Used for Phase 2 development until backend API integration
 */

import type {
  ShipperDashboardData,
  CarrierDashboardData,
  OwnerDashboardData,
} from '../types/dashboard';

// ============================================================================
// SHIPPER DASHBOARD DATA
// ============================================================================

export const shipperDashboardData: ShipperDashboardData = {
  metrics: [
    {
      label: '총 Scope 3',
      value: '2,450 tCO₂e',
      change: -12.5,
      trend: 'down',
      unit: 'tCO₂e',
    },
    {
      label: '평균 탄소집약도',
      value: '142.3 gCO₂e/t·km',
      change: -8.2,
      trend: 'down',
      unit: 'gCO₂e/t·km',
    },
    {
      label: '활성 입찰',
      value: '12',
      change: 2,
      trend: 'up',
      unit: '개',
    },
    {
      label: '물류 파트너',
      value: '24',
      change: 1,
      trend: 'neutral',
      unit: '개',
    },
  ],
  bids: [
    {
      id: 'BID-2024-001',
      status: 'OPEN',
      origin: '서울',
      destination: '부산',
      cargoWeight: 25.5,
      proposalCount: 8,
      createdAt: '2024-02-01',
    },
    {
      id: 'BID-2024-002',
      status: 'AWARDED',
      origin: '인천',
      destination: '대구',
      cargoWeight: 18.2,
      proposalCount: 5,
      createdAt: '2024-01-28',
    },
    {
      id: 'BID-2024-003',
      status: 'OPEN',
      origin: '경기',
      destination: '광주',
      cargoWeight: 32.0,
      proposalCount: 12,
      createdAt: '2024-02-03',
    },
  ],
  fleets: [
    {
      id: 'FLT-001',
      vehicleType: '10톤 트럭',
      carbonIntensity: 145.2,
      grade: 'GRADE_1',
      owner: 'EcoTransport Co.',
      price: 250000,
    },
    {
      id: 'FLT-002',
      vehicleType: '25톤 트랙터',
      carbonIntensity: 138.5,
      grade: 'GRADE_1',
      owner: 'GreenLogistics Ltd',
      price: 280000,
    },
    {
      id: 'FLT-003',
      vehicleType: '5톤 밴',
      carbonIntensity: 162.3,
      grade: 'GRADE_2',
      owner: 'FastShip Inc',
      price: 180000,
    },
    {
      id: 'FLT-004',
      vehicleType: '10톤 트럭',
      carbonIntensity: 155.8,
      grade: 'GRADE_2',
      owner: 'BudgetCarriers',
      price: 220000,
    },
    {
      id: 'FLT-005',
      vehicleType: '20톤 트레일러',
      carbonIntensity: 135.2,
      grade: 'GRADE_1',
      owner: 'CarbonNeutral Logistics',
      price: 300000,
    },
    {
      id: 'FLT-006',
      vehicleType: '15톤 트럭',
      carbonIntensity: 170.5,
      grade: 'GRADE_3',
      owner: 'Standard Shipping',
      price: 160000,
    },
    {
      id: 'FLT-007',
      vehicleType: '25톤 트랙터',
      carbonIntensity: 142.1,
      grade: 'GRADE_1',
      owner: 'Premium Logistics',
      price: 320000,
    },
    {
      id: 'FLT-008',
      vehicleType: '10톤 트럭',
      carbonIntensity: 165.3,
      grade: 'GRADE_2',
      owner: 'Metro Freight',
      price: 210000,
    },
  ],
  scope3Trend: [
    { date: '1월', value: 2800 },
    { date: '2월 1주', value: 2750 },
    { date: '2월 2주', value: 2650 },
    { date: '2월 3주', value: 2550 },
    { date: '현재', value: 2450 },
  ],
  recentBids: [
    {
      id: 'BID-2024-001',
      status: 'OPEN',
      origin: '서울',
      destination: '부산',
      cargoWeight: 25.5,
      proposalCount: 8,
      createdAt: '2024-02-01',
    },
    {
      id: 'BID-2024-003',
      status: 'OPEN',
      origin: '경기',
      destination: '광주',
      cargoWeight: 32.0,
      proposalCount: 12,
      createdAt: '2024-02-03',
    },
  ],
};

// ============================================================================
// CARRIER DASHBOARD DATA
// ============================================================================

export const carrierDashboardData: CarrierDashboardData = {
  metrics: [
    {
      label: '활성 오더',
      value: '18',
      change: 3,
      trend: 'up',
      unit: '개',
    },
    {
      label: '차량 커버리지',
      value: '87.5%',
      change: 5.2,
      trend: 'up',
      unit: '%',
    },
    {
      label: '평균 등급',
      value: '1.2',
      change: -0.1,
      trend: 'down',
      unit: '(낮을수록 좋음)',
    },
    {
      label: '월 수익',
      value: '₩24.5M',
      change: 8.3,
      trend: 'up',
      unit: '₩',
    },
  ],
  orders: [
    {
      id: 'ORD-2024-001',
      status: 'COMPLETED',
      customerId: 'CUST-001',
      fleetId: 'FLT-001',
      revenue: 250000,
      carbonSaved: 1250,
      createdAt: '2024-02-01',
    },
    {
      id: 'ORD-2024-002',
      status: 'CONFIRMED',
      customerId: 'CUST-002',
      fleetId: 'FLT-002',
      revenue: 280000,
      carbonSaved: 1680,
      createdAt: '2024-02-02',
    },
    {
      id: 'ORD-2024-003',
      status: 'PENDING',
      customerId: 'CUST-003',
      fleetId: 'FLT-005',
      revenue: 320000,
      carbonSaved: 2100,
      createdAt: '2024-02-04',
    },
  ],
  fleets: [
    {
      id: 'FLT-001',
      vehicleType: '10톤 트럭',
      carbonIntensity: 145.2,
      grade: 'GRADE_1',
      owner: 'EcoTransport Co.',
      coverage: 92,
      utilization: 85,
    },
    {
      id: 'FLT-002',
      vehicleType: '25톤 트랙터',
      carbonIntensity: 138.5,
      grade: 'GRADE_1',
      owner: 'GreenLogistics Ltd',
      coverage: 95,
      utilization: 78,
    },
    {
      id: 'FLT-005',
      vehicleType: '20톤 트레일러',
      carbonIntensity: 135.2,
      grade: 'GRADE_1',
      owner: 'CarbonNeutral Logistics',
      coverage: 88,
      utilization: 92,
    },
    {
      id: 'FLT-007',
      vehicleType: '25톤 트랙터',
      carbonIntensity: 142.1,
      grade: 'GRADE_1',
      owner: 'Premium Logistics',
      coverage: 90,
      utilization: 81,
    },
  ],
  revenue: [
    { date: '1월 1주', value: 5200000 },
    { date: '1월 2주', value: 5800000 },
    { date: '1월 3주', value: 6100000 },
    { date: '2월 1주', value: 6500000 },
    { date: '2월 2주', value: 7200000 },
    { date: '현재', value: 8100000 },
  ],
  premiumOrders: [
    {
      id: 'ORD-2024-002',
      status: 'CONFIRMED',
      customerId: 'CUST-002',
      fleetId: 'FLT-002',
      revenue: 280000,
      carbonSaved: 1680,
      createdAt: '2024-02-02',
    },
    {
      id: 'ORD-2024-003',
      status: 'PENDING',
      customerId: 'CUST-003',
      fleetId: 'FLT-005',
      revenue: 320000,
      carbonSaved: 2100,
      createdAt: '2024-02-04',
    },
  ],
};

// ============================================================================
// OWNER DASHBOARD DATA
// ============================================================================

export const ownerDashboardData: OwnerDashboardData = {
  metrics: [
    {
      label: '탄소집약도',
      value: '148.5 gCO₂e/t·km',
      change: -6.3,
      trend: 'down',
      unit: 'gCO₂e/t·km',
    },
    {
      label: '그린라벨 진행률',
      value: '78%',
      change: 12,
      trend: 'up',
      unit: '%',
    },
    {
      label: '주간 수익',
      value: '₩2.8M',
      change: 5.2,
      trend: 'up',
      unit: '₩',
    },
    {
      label: '오늘 운행',
      value: '3',
      change: 1,
      trend: 'up',
      unit: '회',
    },
  ],
  sessions: [
    {
      id: 'SES-2024-001',
      date: '2024-02-04',
      duration: 420,
      distance: 245,
      carbonIntensity: 145.2,
      earnings: 350000,
      greenLabelEligible: true,
    },
    {
      id: 'SES-2024-002',
      date: '2024-02-03',
      duration: 380,
      distance: 212,
      carbonIntensity: 152.1,
      earnings: 310000,
      greenLabelEligible: false,
    },
    {
      id: 'SES-2024-003',
      date: '2024-02-03',
      duration: 290,
      distance: 168,
      carbonIntensity: 148.5,
      earnings: 250000,
      greenLabelEligible: true,
    },
    {
      id: 'SES-2024-004',
      date: '2024-02-02',
      duration: 450,
      distance: 268,
      carbonIntensity: 155.3,
      earnings: 380000,
      greenLabelEligible: false,
    },
  ],
  earnings: [
    { date: '월요일', value: 1050000 },
    { date: '화요일', value: 1200000 },
    { date: '수요일', value: 1100000 },
    { date: '목요일', value: 1350000 },
    { date: '금요일', value: 1450000 },
    { date: '토요일', value: 910000 },
    { date: '현재', value: 800000 },
  ],
  behaviors: [
    {
      label: '정속 유지',
      score: 92,
      description: '급가속/급감속 최소화',
      icon: 'Gauge',
    },
    {
      label: '공회전 시간',
      score: 78,
      description: '불필요한 공회전 감소',
      icon: 'Wind',
    },
    {
      label: '타이어 압력',
      score: 88,
      description: '적절한 타이어 압력 유지',
      icon: 'Circle',
    },
    {
      label: '연비 효율',
      score: 85,
      description: '평균 이상의 연비 달성',
      icon: 'Zap',
    },
  ],
  greenLabelProgress: 78,
};

// Export all data
export const mockDashboardData = {
  shipper: shipperDashboardData,
  carrier: carrierDashboardData,
  owner: ownerDashboardData,
};

export default mockDashboardData;
