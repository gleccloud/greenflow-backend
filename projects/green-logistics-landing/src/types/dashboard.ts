/**
 * Dashboard Types
 * Shared interfaces for all dashboard pages
 */

export type Grade = 'GRADE_1' | 'GRADE_2' | 'GRADE_3';
export type BidStatus = 'OPEN' | 'CLOSED' | 'AWARDED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type Trend = 'up' | 'down' | 'neutral';

export interface Metric {
  label: string;
  value: string | number;
  change: number; // percentage
  trend: Trend;
  unit?: string;
}

export interface Fleet {
  id: string;
  vehicleType: string;
  carbonIntensity: number; // gCO₂e/t·km
  grade: Grade;
  owner: string;
  price?: number;
  coverage?: number; // percentage
  utilization?: number; // percentage
}

export interface Bid {
  id: string;
  status: BidStatus;
  origin: string;
  destination: string;
  cargoWeight: number; // tons
  proposalCount: number;
  createdAt: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  customerId: string;
  fleetId: string;
  revenue: number;
  carbonSaved?: number; // kg CO₂e
  createdAt: string;
}

export interface DrivingSession {
  id: string;
  date: string;
  duration: number; // minutes
  distance: number; // km
  carbonIntensity: number; // gCO₂e/t·km
  earnings: number;
  greenLabelEligible: boolean;
}

export interface Behavior {
  label: string;
  score: number; // 0-100
  description: string;
  icon: string; // icon name
}

// Shipper Dashboard
export interface ShipperDashboardData {
  metrics: Metric[];
  bids: Bid[];
  fleets: Fleet[];
  scope3Trend: { date: string; value: number }[];
  recentBids: Bid[];
}

// Carrier Dashboard
export interface CarrierDashboardData {
  metrics: Metric[];
  orders: Order[];
  fleets: Fleet[];
  revenue: { date: string; value: number }[];
  premiumOrders: Order[];
}

// Owner Dashboard
export interface OwnerDashboardData {
  metrics: Metric[];
  sessions: DrivingSession[];
  earnings: { date: string; value: number }[];
  behaviors: Behavior[];
  greenLabelProgress: number; // 0-100
}

// Filter Types
export interface DateFilter {
  preset: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface ShipperFilters extends DateFilter {
  route?: string;
  status?: BidStatus;
}

export interface CarrierFilters extends DateFilter {
  customer?: string;
  fleet?: string;
}

export interface OwnerFilters extends DateFilter {
  route?: string;
}
