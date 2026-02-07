import { HttpClient } from '../utils/http';
import {
  Fleet,
  FleetEIResponse,
  FleetEIHistory,
  TransportProduct,
  CreateTransportProductInput,
  ListFleetsQuery,
  ListTransportProductsQuery,
} from '../types/fleet';
import { PaginatedResponse } from '../types/common';

/**
 * Fleet & EI Client
 * 운송수단/Fleet 관리 및 탄소배출집약도(EI) 조회
 */
export class FleetClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get fleet EI data
   */
  async getFleetEI(fleetId: string): Promise<FleetEIResponse> {
    return this.http.get<FleetEIResponse>(`/fleet/ei/${fleetId}`);
  }

  /**
   * Get fleet EI history (30-day trend)
   */
  async getFleetEIHistory(fleetId: string, days?: number): Promise<FleetEIHistory> {
    return this.http.get<FleetEIHistory>(`/fleet/ei/${fleetId}/history`, { days });
  }

  /**
   * List eco-friendly fleets
   */
  async getEcoFriendlyFleets(maxEI?: number, limit?: number): Promise<Fleet[]> {
    return this.http.get<Fleet[]>('/fleet/eco-friendly', { maxEI, limit });
  }

  /**
   * List public fleets (marketplace)
   */
  async getPublicFleets(query?: ListFleetsQuery): Promise<PaginatedResponse<Fleet>> {
    return this.http.get<PaginatedResponse<Fleet>>('/fleet/public', query as any);
  }

  // === Transport Products ===

  /**
   * Create a transport product
   */
  async createTransportProduct(input: CreateTransportProductInput): Promise<TransportProduct> {
    return this.http.post<TransportProduct>('/transport-products', input);
  }

  /**
   * List transport products
   */
  async listTransportProducts(query?: ListTransportProductsQuery): Promise<PaginatedResponse<TransportProduct>> {
    return this.http.get<PaginatedResponse<TransportProduct>>('/transport-products', query as any);
  }

  /**
   * Get a transport product by ID
   */
  async getTransportProduct(productId: string): Promise<TransportProduct> {
    return this.http.get<TransportProduct>(`/transport-products/${productId}`);
  }

  /**
   * Publish a transport product (DRAFT → ACTIVE)
   */
  async publishTransportProduct(productId: string): Promise<TransportProduct> {
    return this.http.post<TransportProduct>(`/transport-products/${productId}/publish`);
  }

  /**
   * Suspend a transport product (ACTIVE → SUSPENDED)
   */
  async suspendTransportProduct(productId: string): Promise<TransportProduct> {
    return this.http.post<TransportProduct>(`/transport-products/${productId}/suspend`);
  }
}
