/**
 * GLEC SDK — EI Calculation Types
 */

export type FuelType =
  | 'diesel'
  | 'gasoline'
  | 'lng'
  | 'cng'
  | 'lpg'
  | 'hvo'
  | 'biodiesel_b20'
  | 'electric_kr'
  | 'electric_eu'
  | 'electric_us'
  | 'hydrogen_green'
  | 'hydrogen_grey';

export type TransportModeEI = 'ROAD' | 'RAIL' | 'SEA' | 'AIR' | 'INLAND_WATERWAY';

export interface EICalculateInput {
  fuelType: FuelType;
  fuelConsumed: number;
  distanceKm: number;
  cargoWeightTonnes: number;
}

export interface EICalculateResult {
  emissionIntensity: number;
  totalEmissionsCo2e: number;
  ttwEmissions: number;
  wttEmissions: number;
  grade: number;
  unit: string;
}

export interface EIMultimodalSegment {
  mode: TransportModeEI;
  fuelType: FuelType;
  fuelConsumed: number;
  distanceKm: number;
  cargoWeightTonnes: number;
}

export interface EIMultimodalInput {
  segments: EIMultimodalSegment[];
}

export interface EIMultimodalResult {
  overallEI: number;
  totalEmissionsCo2e: number;
  segments: Array<EICalculateResult & { mode: TransportModeEI }>;
  totalDistanceKm: number;
}

export interface EIFleetInput {
  trips: EICalculateInput[];
}

export interface EIFleetResult {
  fleetEI: number;
  totalEmissionsCo2e: number;
  tripCount: number;
  totalDistanceKm: number;
  totalCargoTonneKm: number;
  trips: EICalculateResult[];
}

export interface FuelFactor {
  fuelType: FuelType;
  ttwFactor: number;
  wttFactor: number;
  totalFactor: number;
  unit: string;
  source: string;
}

export interface EIDefaults {
  mode: TransportModeEI;
  defaultEI: number;
  grade: number;
  source: string;
}

export interface GradeInfo {
  grade: number;
  label: string;
  description: string;
  range: { min: number; max: number } | null;
}
