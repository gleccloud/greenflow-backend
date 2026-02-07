/**
 * GLEC SDK — Fleet & EI Types
 */

export type TransportMode = 'ROAD' | 'RAIL' | 'SEA' | 'AIR' | 'INLAND_WATERWAY' | 'MULTIMODAL';
export type EIGrade = 'GRADE_1' | 'GRADE_2' | 'GRADE_3';
export type TransportProductStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export interface Fleet {
  id: string;
  carrierId: string;
  carrierName: string;
  fleetCode: string;
  transportMode: TransportMode;
  vehicleClass: string;
  fuelType: string;
  eiCurrent: number | null;
  eiGrade: EIGrade;
  eiConfidence: number;
  eiLastUpdated: string;
  isPublic: boolean;
  metadata: Record<string, any>;
}

export interface FleetEIResponse {
  fleetId: string;
  carrierId: string;
  eiCurrent: number;
  eiGrade: EIGrade;
  eiConfidence: number;
  ttwEmissions: number;
  wttEmissions: number;
  lastUpdated: string;
  trendDirection: 'improving' | 'stable' | 'worsening';
}

export interface FleetEIHistory {
  fleetId: string;
  period: { start: string; end: string };
  dataPoints: Array<{
    date: string;
    ei: number;
    grade: EIGrade;
  }>;
  statistics: {
    min: number;
    max: number;
    average: number;
    stdDev: number;
    trend: 'improving' | 'stable' | 'worsening';
  };
}

export interface TransportProduct {
  id: string;
  fleetId: string;
  carrierId: string;
  name: string;
  description: string;
  transportMode: TransportMode;
  eiGuaranteedMax: number;
  eiActual: number | null;
  eiGrade: EIGrade;
  status: TransportProductStatus;
  serviceArea: Record<string, any>;
  certifications: string[];
  pricing: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransportProductInput {
  fleetId: string;
  name: string;
  description?: string;
  transportMode: TransportMode;
  eiGuaranteedMax: number;
  serviceArea?: Record<string, any>;
  certifications?: string[];
  pricing?: Record<string, any>;
}

export interface ListFleetsQuery {
  carrierId?: string;
  transportMode?: TransportMode;
  maxEI?: number;
  eiGrade?: EIGrade;
  page?: number;
  limit?: number;
}

export interface ListTransportProductsQuery {
  carrierId?: string;
  fleetId?: string;
  transportMode?: TransportMode;
  maxEI?: number;
  publicOnly?: boolean;
  status?: TransportProductStatus;
  page?: number;
  limit?: number;
}
