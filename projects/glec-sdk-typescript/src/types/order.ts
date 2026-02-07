/**
 * GLEC SDK — Order Types
 */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

export interface Order {
  id: string;
  orderNumber: string;
  bidId: string;
  proposalId: string;
  shipperId: string;
  carrierId: string;
  status: OrderStatus;
  pickupScheduledAt: string;
  deliveryScheduledAt: string;
  pickupActualAt: string | null;
  deliveryActualAt: string | null;
  distanceKm: number | null;
  actualDistanceKm: number | null;
  fuelConsumedLiters: number | null;
  actualEI: number | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  bidId: string;
  proposalId: string;
  pickupScheduledAt: string;
  deliveryScheduledAt: string;
}

export interface UpdateOrderStatusInput {
  status: OrderStatus;
  notes?: string;
}

export interface UpdateTrackingDataInput {
  actualDistanceKm?: number;
  fuelConsumedLiters?: number;
  actualEI?: number;
  pickupActualAt?: string;
  deliveryActualAt?: string;
}

export interface ListOrdersQuery {
  shipperId?: string;
  carrierId?: string;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}
