import { HttpClient } from '../utils/http';
import type {
  StreamChannel,
  StreamEvent,
  OrderStreamEvent,
  BidStreamEvent,
  ProposalStreamEvent,
  FleetStreamEvent,
  PollResult,
} from '../types/realtime';
import { GlecClientConfig } from '../types/common';

type EventCallback<T> = (event: StreamEvent<T>) => void;
type ErrorCallback = (error: Error) => void;

/**
 * Realtime SSE Streaming Client
 * SSE 기반 실시간 업데이트 구독 + HTTP 폴링 폴백
 */
export class RealtimeClient {
  private config: GlecClientConfig;

  constructor(private readonly http: HttpClient, config: GlecClientConfig) {
    this.config = config;
  }

  // === SSE Streaming ===

  /**
   * Subscribe to order events via SSE
   */
  subscribeOrders(onEvent: EventCallback<OrderStreamEvent>, onError?: ErrorCallback): () => void {
    return this.createStream('/realtime/orders/stream', onEvent, onError);
  }

  /**
   * Subscribe to bid events via SSE
   */
  subscribeBids(onEvent: EventCallback<BidStreamEvent>, onError?: ErrorCallback): () => void {
    return this.createStream('/realtime/bids/stream', onEvent, onError);
  }

  /**
   * Subscribe to proposal events via SSE
   */
  subscribeProposals(onEvent: EventCallback<ProposalStreamEvent>, onError?: ErrorCallback): () => void {
    return this.createStream('/realtime/proposals/stream', onEvent, onError);
  }

  /**
   * Subscribe to fleet EI update events via SSE
   */
  subscribeFleet(onEvent: EventCallback<FleetStreamEvent>, onError?: ErrorCallback): () => void {
    return this.createStream('/realtime/fleet/stream', onEvent, onError);
  }

  /**
   * Subscribe to a specific entity's events
   */
  subscribeEntity(
    channel: StreamChannel,
    entityId: string,
    onEvent: EventCallback<unknown>,
    onError?: ErrorCallback,
  ): () => void {
    return this.createStream(`/realtime/${channel}/${entityId}/stream`, onEvent, onError);
  }

  /**
   * Subscribe to all channels (multiplexed stream)
   */
  subscribeAll(onEvent: EventCallback<unknown>, onError?: ErrorCallback): () => void {
    return this.createStream('/realtime/stream', onEvent, onError);
  }

  // === HTTP Polling Fallback ===

  /**
   * Poll for order events (fallback for environments without SSE)
   */
  async pollOrders(lastEventId?: string): Promise<PollResult<OrderStreamEvent>> {
    return this.http.get<PollResult<OrderStreamEvent>>('/realtime/orders/poll', {
      ...(lastEventId && { lastEventId }),
    });
  }

  /**
   * Poll for bid events
   */
  async pollBids(lastEventId?: string): Promise<PollResult<BidStreamEvent>> {
    return this.http.get<PollResult<BidStreamEvent>>('/realtime/bids/poll', {
      ...(lastEventId && { lastEventId }),
    });
  }

  /**
   * Poll for proposal events
   */
  async pollProposals(lastEventId?: string): Promise<PollResult<ProposalStreamEvent>> {
    return this.http.get<PollResult<ProposalStreamEvent>>('/realtime/proposals/poll', {
      ...(lastEventId && { lastEventId }),
    });
  }

  /**
   * Poll for fleet events
   */
  async pollFleet(lastEventId?: string): Promise<PollResult<FleetStreamEvent>> {
    return this.http.get<PollResult<FleetStreamEvent>>('/realtime/fleet/poll', {
      ...(lastEventId && { lastEventId }),
    });
  }

  /**
   * Get available channels and their status
   */
  async getChannels(): Promise<Array<{ channel: StreamChannel; active: boolean; subscriberCount: number }>> {
    return this.http.get('/realtime/channels');
  }

  /**
   * Get connection health
   */
  async getHealth(): Promise<{ status: string; activeConnections: number }> {
    return this.http.get('/realtime/health');
  }

  // === Internal ===

  private createStream<T>(path: string, onEvent: EventCallback<T>, onError?: ErrorCallback): () => void {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/api/v2${path}?token=${this.config.apiKey}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as StreamEvent<T>;
        onEvent(parsed);
      } catch (err) {
        onError?.(new Error(`Failed to parse SSE event: ${err}`));
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError?.(new Error('SSE connection lost'));
    };

    return () => {
      eventSource.close();
    };
  }
}
