import { HttpClient } from '../utils/http';
import {
  Order,
  CreateOrderInput,
  UpdateOrderStatusInput,
  UpdateTrackingDataInput,
  ListOrdersQuery,
} from '../types/order';
import { PaginatedResponse } from '../types/common';

/**
 * Order Client
 * 주문 생명주기 관리 및 운행 추적
 */
export class OrderClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Create order (주문 생성 — 보통 낙찰 시 자동 생성)
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    return this.http.post<Order>('/orders', input);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    return this.http.get<Order>(`/orders/${orderId}`);
  }

  /**
   * List orders with filters
   */
  async listOrders(query?: ListOrdersQuery): Promise<PaginatedResponse<Order>> {
    return this.http.get<PaginatedResponse<Order>>('/orders', query as any);
  }

  /**
   * Update order status (상태 변경)
   */
  async updateOrderStatus(orderId: string, input: UpdateOrderStatusInput): Promise<Order> {
    return this.http.put<Order>(`/orders/${orderId}/status`, input);
  }

  /**
   * Update tracking data (운행 추적 데이터 갱신)
   */
  async updateTrackingData(orderId: string, input: UpdateTrackingDataInput): Promise<Order> {
    return this.http.put<Order>(`/orders/${orderId}/tracking`, input);
  }
}
