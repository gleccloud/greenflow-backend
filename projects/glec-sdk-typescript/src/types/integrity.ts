/**
 * GLEC SDK — Data Integrity Types
 */

export type CarbonRecordSource = 'TELEMATICS' | 'FUEL_LOG' | 'MODELED' | 'DEFAULT';

export interface CarbonRecord {
  id: string;
  orderId: string;
  fleetId: string;
  carrierId: string;
  distanceKm: number;
  cargoWeightTonnes: number;
  fuelConsumedLiters: number;
  fuelType: string;
  ttwEmissionsGrams: number;
  wttEmissionsGrams: number;
  totalEmissionsGrams: number;
  emissionIntensity: number;
  grade: number;
  source: CarbonRecordSource;
  recordHash: string;
  prevRecordHash: string | null;
  signature: string | null;
  signerKeyId: string | null;
  signedAt: string | null;
  sourceSystem: string | null;
  sourceTimestamp: string | null;
  externalRefId: string | null;
  chainOfCustody: Array<{
    actor: string;
    action: string;
    timestamp: string;
    system: string;
    details?: string;
  }>;
  createdAt: string;
}

export interface CreateCarbonRecordInput {
  orderId: string;
  fleetId: string;
  distanceKm: number;
  cargoWeightTonnes: number;
  fuelConsumedLiters: number;
  fuelType: string;
  grade: number;
  source: CarbonRecordSource;
  sourceSystem?: string;
  sourceTimestamp?: string;
  externalRefId?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  valid: boolean;
  recordId: string;
  recordHash: string;
  signatureValid: boolean | null;
  chainValid: boolean;
  errors: string[];
}

export interface ChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  verifiedRecords: number;
  brokenAt?: string;
  errors: string[];
}

export interface AnomalyDetectionResult {
  recordId: string;
  carrierId: string;
  isAnomalous: boolean;
  anomalyScore: number;
  alerts: Array<{
    type: string;
    severity: string;
    field: string;
    actualValue: number;
    expectedRange: { min: number; max: number };
    deviation?: number;
    message: string;
  }>;
  checkedAt: string;
}

export interface ExportSummary {
  period: { start: string; end: string };
  totalRecords: number;
  totalDistanceKm: number;
  totalCargoTonneKm: number;
  totalEmissionsKgCO2e: number;
  totalTTWEmissionsKgCO2e: number;
  totalWTTEmissionsKgCO2e: number;
  weightedAverageEI: number;
  byGrade: Array<{ grade: number; count: number; totalEmissionsKgCO2e: number }>;
  byFuelType: Array<{ fuelType: string; count: number; totalEmissionsKgCO2e: number }>;
  dataQualityScore: number;
  generatedAt: string;
  generatedBy: string;
}
