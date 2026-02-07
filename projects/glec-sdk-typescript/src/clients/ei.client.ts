import { HttpClient } from '../utils/http';
import type {
  EICalculateInput, EICalculateResult,
  EIMultimodalInput, EIMultimodalResult,
  EIFleetInput, EIFleetResult,
  FuelFactor, EIDefaults, GradeInfo,
  TransportModeEI,
} from '../types/ei';

/**
 * EI Calculation Client
 * GLEC Framework 기반 탄소배출집약도(EI) 계산 엔진
 */
export class EIClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Calculate EI for a single transport segment
   */
  async calculate(input: EICalculateInput): Promise<EICalculateResult> {
    return this.http.post<EICalculateResult>('/ei/calculate', input);
  }

  /**
   * Calculate EI for multimodal transport (multiple segments)
   */
  async calculateMultimodal(input: EIMultimodalInput): Promise<EIMultimodalResult> {
    return this.http.post<EIMultimodalResult>('/ei/calculate-multimodal', input);
  }

  /**
   * Calculate fleet-level aggregated EI from multiple trips
   */
  async calculateFleet(input: EIFleetInput): Promise<EIFleetResult> {
    return this.http.post<EIFleetResult>('/ei/calculate-fleet', input);
  }

  /**
   * Get fuel emission factors (TTW + WTT)
   */
  async getFuelFactors(): Promise<FuelFactor[]> {
    return this.http.get<FuelFactor[]>('/ei/fuel-factors');
  }

  /**
   * Get default EI values per transport mode (GLEC Framework defaults)
   */
  async getDefaults(mode?: TransportModeEI): Promise<EIDefaults[]> {
    return this.http.get<EIDefaults[]>('/ei/defaults', mode ? { mode } : undefined);
  }

  /**
   * Get grade classification info (Grade 1-3 thresholds)
   */
  async getGradeInfo(): Promise<GradeInfo[]> {
    return this.http.get<GradeInfo[]>('/ei/grade-info');
  }
}
