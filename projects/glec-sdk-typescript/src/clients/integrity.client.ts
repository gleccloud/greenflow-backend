import { HttpClient } from '../utils/http';
import {
  CarbonRecord,
  CreateCarbonRecordInput,
  VerificationResult,
  ChainVerificationResult,
  AnomalyDetectionResult,
  ExportSummary,
} from '../types/integrity';
import { PaginatedResponse } from '../types/common';

/**
 * Data Integrity Client
 * 탄소 데이터 무결성: 기록, 서명, 검증, 이상치 탐지, 내보내기
 */
export class IntegrityClient {
  constructor(private readonly http: HttpClient) {}

  // === Carbon Records ===

  /**
   * Create a carbon record
   */
  async createCarbonRecord(input: CreateCarbonRecordInput): Promise<CarbonRecord> {
    return this.http.post<CarbonRecord>('/integrity/carbon-records', input);
  }

  /**
   * Batch create carbon records (최대 100건)
   */
  async batchCreateCarbonRecords(records: CreateCarbonRecordInput[]): Promise<{
    total: number;
    success: number;
    errors: number;
    results: Array<{ index: number; success: boolean; recordId?: string; error?: string }>;
  }> {
    return this.http.post('/integrity/batch/carbon-records', { records });
  }

  /**
   * Get carbon records for an order
   */
  async getRecordsByOrder(orderId: string): Promise<CarbonRecord[]> {
    return this.http.get<CarbonRecord[]>(`/integrity/carbon-records/order/${orderId}`);
  }

  /**
   * Get carrier's carbon records (paginated)
   */
  async getMyRecords(query?: { page?: number; limit?: number }): Promise<PaginatedResponse<CarbonRecord>> {
    return this.http.get<PaginatedResponse<CarbonRecord>>('/integrity/carbon-records/carrier', query as any);
  }

  // === Signing ===

  /**
   * Generate a signing key pair (Ed25519)
   */
  async generateKeyPair(): Promise<{ keyId: string; publicKey: string }> {
    return this.http.post('/integrity/keys');
  }

  /**
   * Sign a carbon record
   */
  async signRecord(recordId: string): Promise<CarbonRecord> {
    return this.http.post<CarbonRecord>(`/integrity/carbon-records/${recordId}/sign`);
  }

  // === Verification ===

  /**
   * Verify a single record (hash + signature + chain)
   */
  async verifyRecord(recordId: string): Promise<VerificationResult> {
    return this.http.get<VerificationResult>(`/integrity/verify/${recordId}`);
  }

  /**
   * Verify entire hash chain for a carrier
   */
  async verifyChain(carrierId: string): Promise<ChainVerificationResult> {
    return this.http.get<ChainVerificationResult>(`/integrity/verify-chain/${carrierId}`);
  }

  /**
   * Batch verify records
   */
  async batchVerify(recordIds: string[]): Promise<{
    total: number;
    valid: number;
    invalid: number;
    results: VerificationResult[];
  }> {
    return this.http.post('/integrity/batch/verify', { recordIds });
  }

  // === Anomaly Detection ===

  /**
   * Detect anomalies in a single record
   */
  async detectAnomalies(recordId: string): Promise<AnomalyDetectionResult> {
    return this.http.get<AnomalyDetectionResult>(`/integrity/anomaly/${recordId}`);
  }

  /**
   * Detect anomalies across carrier's recent records
   */
  async detectCarrierAnomalies(carrierId: string, options?: { lastDays?: number; limit?: number }): Promise<{
    carrierId: string;
    totalRecords: number;
    anomalousRecords: number;
    anomalyRate: number;
    results: AnomalyDetectionResult[];
  }> {
    return this.http.get(`/integrity/anomaly/carrier/${carrierId}`, options as any);
  }

  /**
   * Batch anomaly check
   */
  async batchAnomalyCheck(recordIds: string[]): Promise<{
    total: number;
    anomalous: number;
    clean: number;
    avgAnomalyScore: number;
    results: AnomalyDetectionResult[];
  }> {
    return this.http.post('/integrity/batch/anomaly-check', { recordIds });
  }

  // === Export ===

  /**
   * Export carbon data as JSON
   */
  async exportJSON(options?: {
    carrierId?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
    minGrade?: number;
    includeSignature?: boolean;
    includeHash?: boolean;
  }): Promise<{ data: any[]; meta: Record<string, any> }> {
    return this.http.get('/export/json', options as any);
  }

  /**
   * Export carbon data as CSV string
   */
  async exportCSV(options?: {
    carrierId?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
    minGrade?: number;
    includeSignature?: boolean;
    includeHash?: boolean;
  }): Promise<string> {
    return this.http.getText('/export/csv', options as any);
  }

  /**
   * Export ISO-14083 summary for ESG reporting
   */
  async exportSummary(options?: {
    carrierId?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
    minGrade?: number;
  }): Promise<ExportSummary> {
    return this.http.get<ExportSummary>('/export/summary', options as any);
  }
}
