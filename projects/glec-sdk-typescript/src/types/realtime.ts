/**
 * GLEC SDK — Realtime / SSE Types
 */

export type StreamChannel =
  | 'orders'
  | 'bids'
  | 'proposals'
  | 'fleet'
  | 'metrics';

export interface StreamEvent<T = unknown> {
  type: string;
  data: T;
  id?: string;
  timestamp: string;
}

export interface OrderStreamEvent {
  orderId: string;
  status: string;
  updatedAt: string;
}

export interface BidStreamEvent {
  bidId: string;
  status: string;
  proposalCount: number;
  updatedAt: string;
}

export interface ProposalStreamEvent {
  proposalId: string;
  bidId: string;
  status: string;
  updatedAt: string;
}

export interface FleetStreamEvent {
  fleetId: string;
  eiCurrent: number;
  eiGrade: string;
  updatedAt: string;
}

export interface PollResult<T> {
  events: Array<StreamEvent<T>>;
  lastEventId: string | null;
}
