# 실시간 데이터 처리 아키텍처 (Real-time Data Processing)

## Executive Summary

GLEC 녹색물류 API에서 요구되는 실시간 기능:
1. **EI 실시간 업데이트**: Fleet 탄소배출집약도 변경 시 즉시 알림 (<100ms)
2. **입찰 상태 변화**: Bid 오픈/마감/낙찰 시 실시간 공지
3. **제안 랭킹 변동**: 새 제안 추가 시 모든 제안의 순위 재계산 및 브로드캐스트
4. **주문 실시간 추적**: Order 상태 변화 실시간 반영

**선택 기준**: SSE (Server-Sent Events) → WebSocket (필요시 업그레이드)
- 이유: 대부분 서버 → 클라이언트 단방향 통신, HTTP/2 지원, 구현 단순

---

## 1. 아키텍처 개요

### 1.1 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser/Client                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  EventSource     │  │  WebSocket       │  │  HTTP Poll │ │
│  │  (SSE stream)    │  │  (Bidirectional) │  │ (Fallback) │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────┬───────┘ │
└───────────┼──────────────────────┼────────────────┼──────────┘
            │                      │                │
┌───────────┴──────────────────────┴────────────────┴──────────────┐
│                    NestJS API Server                             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │  Connection Manager (SSE / WebSocket)                        │ │
│ │  - Maintain active connections                              │ │
│ │  - Route messages to correct clients                        │ │
│ │  - Handle reconnections & backpressure                      │ │
│ └────────────────┬─────────────────────────────────────────────┘ │
│                  │                                               │
│ ┌────────────────┴─────────────────────────────────────────────┐ │
│ │  Message Bus (Redis Pub/Sub)                                 │ │
│ │  - channel:ei:updates          (EI 변경 이벤트)             │ │
│ │  - channel:bid:status          (입찰 상태 변경)             │ │
│ │  - channel:proposal:ranking    (제안 순위 변경)             │ │
│ │  - channel:order:status        (주문 상태 변경)             │ │
│ └────────────────┬─────────────────────────────────────────────┘ │
└───────────┬──────────────────────────────────────────────────────┘
            │
┌───────────┴──────────────────────────────────────────────────────┐
│                    Data Sources                                  │
│ ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│ │  PostgreSQL      │  │  Redis Cache     │  │  Event Queue   │  │
│ │  (Primary DB)    │  │  (Hot Data)      │  │  (BullMQ)      │  │
│ └──────────────────┘  └──────────────────┘  └────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름

**예: Fleet EI 업데이트 시나리오**

```
1. DTG 시스템 → EI 데이터 수신
2. API Server: /fleet/ei-update 엔드포인트
   ├─ PostgreSQL 업데이트
   ├─ Redis 캐시 갱신
   └─ Redis Pub/Sub으로 메시지 발행 (channel:ei:updates)

3. Redis Subscriber (연결된 모든 서버 인스턴스)
   └─ 메시지 수신 → 해당 fleet_id를 watch 중인 클라이언트 추출

4. WebSocket/SSE Connection Manager
   └─ 각 클라이언트에게 메시지 브로드캐스트 (<100ms)

5. Client (Browser)
   └─ 실시간 UI 업데이트
```

---

## 2. SSE (Server-Sent Events) 구현

### 2.1 SSE vs WebSocket 비교

| 특성 | SSE | WebSocket |
|------|-----|-----------|
| 방향 | 서버 → 클라이언트 (단방향) | 양방향 (full-duplex) |
| 프로토콜 | HTTP | HTTP Upgrade (WS) |
| 연결 복잡도 | 낮음 | 중간 |
| 메모리 오버헤드 | 매우 낮음 | 약간 높음 |
| 자동 재연결 | 예 (브라우저 기본) | 아니오 (수동 구현) |
| HTTP/2 호환성 | 완벽 | 제한적 |
| 텍스트/바이너리 | 텍스트만 | 둘 다 |

**GLEC API 권장**: **SSE** (대부분 단방향, 실시간성 <1초 수준, HTTP/2 활용)

### 2.2 SSE 엔드포인트 구현 (NestJS)

#### Server-side (NestJS)

```typescript
// src/modules/realtime/realtime.controller.ts
import {
  Controller,
  Get,
  Sse,
  Param,
  Query,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map, filter, takeUntil } from 'rxjs/operators';
import { RealtimeService } from './realtime.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('realtime')
export class RealtimeController {
  private clientConnections = new Map<string, Subject<any>>();

  constructor(private realtimeService: RealtimeService) {}

  /**
   * SSE Endpoint: Real-time EI Updates
   * Usage: curl -H "X-API-Key: glec_live_xxx" https://api.glec.com/v2/realtime/ei-updates?fleet_ids=FLT-A01,FLT-B02
   */
  @Get('ei-updates')
  @Sse()
  streamEIUpdates(
    @Query('fleet_ids') fleetIds: string,
    @Headers('x-api-key') apiKey: string,
  ): Observable<any> {
    // 1. Validate API key
    if (!apiKey) {
      throw new HttpException('Missing API key', HttpStatus.UNAUTHORIZED);
    }

    const userId = this.realtimeService.validateApiKey(apiKey);
    if (!userId) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    // 2. Parse fleet IDs
    const watchFleetIds = fleetIds.split(',').map((id) => id.trim());
    const connectionId = `${userId}-${Date.now()}-${Math.random()}`;

    // 3. Create subject for this connection
    const connection$ = new Subject<any>();
    this.clientConnections.set(connectionId, connection$);

    // 4. Subscribe to Redis Pub/Sub
    const unsubscribe$ = this.realtimeService.subscribeToEIUpdates(
      watchFleetIds,
      (message) => {
        connection$.next({
          data: JSON.stringify(message),
          event: 'ei_updated',
          id: `${Date.now()}`,
        });
      },
    );

    // 5. Handle client disconnect
    const cleanup$ = interval(30000).pipe(
      // Send heartbeat every 30s to detect disconnections
      map(() => ({
        data: JSON.stringify({ type: 'heartbeat', timestamp: new Date() }),
        event: 'heartbeat',
      })),
      takeUntil(unsubscribe$),
    );

    // 6. Combine streams
    return connection$.asObservable().pipe(
      // Cleanup on disconnect
      takeUntil(
        new Observable((subscriber) => {
          // Monitor connection health
          const healthCheckInterval = setInterval(() => {
            if (!this.clientConnections.has(connectionId)) {
              clearInterval(healthCheckInterval);
              subscriber.next();
            }
          }, 5000);
        }),
      ),
      // Final cleanup
      map((event) => event),
    );
  }

  /**
   * SSE Endpoint: Real-time Bid Status Updates
   */
  @Get('bid-updates')
  @Sse()
  streamBidUpdates(
    @Query('bid_ids') bidIds: string,
    @Headers('x-api-key') apiKey: string,
  ): Observable<any> {
    const userId = this.realtimeService.validateApiKey(apiKey);
    if (!userId) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    const watchBidIds = bidIds.split(',').map((id) => id.trim());
    const connection$ = new Subject<any>();

    this.realtimeService.subscribeToBidUpdates(watchBidIds, (message) => {
      connection$.next({
        data: JSON.stringify(message),
        event: 'bid_status_changed',
        id: `${Date.now()}`,
      });
    });

    return connection$.asObservable();
  }

  /**
   * SSE Endpoint: Real-time Proposal Ranking Updates
   */
  @Get('proposal-ranking-updates')
  @Sse()
  streamProposalRankingUpdates(
    @Query('bid_id') bidId: string,
    @Headers('x-api-key') apiKey: string,
  ): Observable<any> {
    const userId = this.realtimeService.validateApiKey(apiKey);
    if (!userId) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    const connection$ = new Subject<any>();

    this.realtimeService.subscribeToProposalRankingUpdates(bidId, (message) => {
      connection$.next({
        data: JSON.stringify(message),
        event: 'proposal_ranking_updated',
        id: `${Date.now()}`,
      });
    });

    return connection$.asObservable();
  }

  /**
   * SSE Endpoint: Real-time Order Status Updates
   */
  @Get('order-updates')
  @Sse()
  streamOrderUpdates(
    @Query('order_ids') orderIds: string,
    @Headers('x-api-key') apiKey: string,
  ): Observable<any> {
    const userId = this.realtimeService.validateApiKey(apiKey);
    if (!userId) {
      throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
    }

    const watchOrderIds = orderIds.split(',').map((id) => id.trim());
    const connection$ = new Subject<any>();

    this.realtimeService.subscribeToOrderUpdates(watchOrderIds, (message) => {
      connection$.next({
        data: JSON.stringify(message),
        event: 'order_status_changed',
        id: `${Date.now()}`,
      });
    });

    return connection$.asObservable();
  }
}
```

#### Service Layer (RealtimeService)

```typescript
// src/modules/realtime/realtime.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ApiKeyService } from '../auth/api-key.service';

@Injectable()
export class RealtimeService {
  private redis: Redis;
  private pubSubRedis: Redis;

  constructor(
    private apiKeyService: ApiKeyService,
    private redisService: RedisService,
  ) {
    this.redis = redisService.getClient();
    // Separate connection for Pub/Sub (can't use regular commands on Pub/Sub connection)
    this.pubSubRedis = redisService.getDuplicateClient();
  }

  /**
   * Validate API key and return user ID
   */
  validateApiKey(apiKey: string): string | null {
    const userId = this.apiKeyService.validateAndGetUserId(apiKey);
    return userId;
  }

  /**
   * Subscribe to EI updates for specific fleets
   * Channel pattern: channel:ei:updates
   */
  subscribeToEIUpdates(
    fleetIds: string[],
    callback: (message: any) => void,
  ): void {
    const subscriber = this.redisService.getDuplicateClient();

    subscriber.subscribe('channel:ei:updates', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to EI updates:', err);
        return;
      }
      console.log(`Subscribed to ${count} channel(s)`);
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'channel:ei:updates') {
        const data = JSON.parse(message);

        // Filter for requested fleet IDs
        if (fleetIds.includes(data.fleet_id)) {
          callback({
            fleet_id: data.fleet_id,
            old_ei: data.old_ei,
            new_ei: data.new_ei,
            ei_grade: data.ei_grade,
            timestamp: data.timestamp,
          });
        }
      }
    });

    // Return cleanup function
    return () => {
      subscriber.unsubscribe();
      subscriber.disconnect();
    };
  }

  /**
   * Subscribe to Bid status updates
   */
  subscribeToBidUpdates(
    bidIds: string[],
    callback: (message: any) => void,
  ): () => void {
    const subscriber = this.redisService.getDuplicateClient();

    subscriber.subscribe('channel:bid:status', (err) => {
      if (err) {
        console.error('Failed to subscribe to bid updates:', err);
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'channel:bid:status') {
        const data = JSON.parse(message);

        if (bidIds.includes(data.bid_id)) {
          callback({
            bid_id: data.bid_id,
            old_status: data.old_status,
            new_status: data.new_status,
            updated_at: data.timestamp,
          });
        }
      }
    });

    return () => {
      subscriber.unsubscribe();
      subscriber.disconnect();
    };
  }

  /**
   * Subscribe to Proposal ranking updates
   */
  subscribeToProposalRankingUpdates(
    bidId: string,
    callback: (message: any) => void,
  ): () => void {
    const subscriber = this.redisService.getDuplicateClient();
    const channelName = `channel:bid:${bidId}:proposal_ranking`;

    subscriber.subscribe(channelName, (err) => {
      if (err) {
        console.error(`Failed to subscribe to ${channelName}:`, err);
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === channelName) {
        const data = JSON.parse(message);
        callback({
          bid_id: bidId,
          ranked_proposals: data.ranked_proposals, // Array of proposals with new ranks
          timestamp: data.timestamp,
        });
      }
    });

    return () => {
      subscriber.unsubscribe();
      subscriber.disconnect();
    };
  }

  /**
   * Subscribe to Order status updates
   */
  subscribeToOrderUpdates(
    orderIds: string[],
    callback: (message: any) => void,
  ): () => void {
    const subscriber = this.redisService.getDuplicateClient();

    subscriber.subscribe('channel:order:status', (err) => {
      if (err) {
        console.error('Failed to subscribe to order updates:', err);
      }
    });

    subscriber.on('message', (channel, message) => {
      if (channel === 'channel:order:status') {
        const data = JSON.parse(message);

        if (orderIds.includes(data.order_id)) {
          callback({
            order_id: data.order_id,
            old_status: data.old_status,
            new_status: data.new_status,
            updated_at: data.timestamp,
            tracking_event: data.tracking_event, // Optional: detailed tracking info
          });
        }
      }
    });

    return () => {
      subscriber.unsubscribe();
      subscriber.disconnect();
    };
  }

  /**
   * Publish EI update event (called from fleet update endpoint)
   */
  async publishEIUpdate(
    fleetId: string,
    oldEI: number,
    newEI: number,
    eiGrade: string,
  ): Promise<void> {
    const message = {
      fleet_id: fleetId,
      old_ei: oldEI,
      new_ei: newEI,
      ei_grade: eiGrade,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish(
      'channel:ei:updates',
      JSON.stringify(message),
    );
  }

  /**
   * Publish Bid status change event
   */
  async publishBidStatusChange(
    bidId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    const message = {
      bid_id: bidId,
      old_status: oldStatus,
      new_status: newStatus,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish(
      'channel:bid:status',
      JSON.stringify(message),
    );
  }

  /**
   * Publish Proposal ranking update event
   */
  async publishProposalRankingUpdate(
    bidId: string,
    rankedProposals: any[],
  ): Promise<void> {
    const message = {
      bid_id: bidId,
      ranked_proposals: rankedProposals,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish(
      `channel:bid:${bidId}:proposal_ranking`,
      JSON.stringify(message),
    );
  }

  /**
   * Publish Order status change event
   */
  async publishOrderStatusChange(
    orderId: string,
    oldStatus: string,
    newStatus: string,
    trackingEvent?: any,
  ): Promise<void> {
    const message = {
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      tracking_event: trackingEvent,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish(
      'channel:order:status',
      JSON.stringify(message),
    );
  }
}
```

### 2.3 Client-side (JavaScript/TypeScript)

```typescript
// src/services/realtimeClient.ts
export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private apiKey: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // 1 second
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Subscribe to EI updates for fleets
   */
  subscribeToEIUpdates(
    fleetIds: string[],
    onUpdate: (data: any) => void,
    onError?: (error: any) => void,
  ): () => void {
    const query = `fleet_ids=${fleetIds.join(',')}`;
    return this.subscribe(
      `realtime/ei-updates?${query}`,
      'ei_updated',
      onUpdate,
      onError,
    );
  }

  /**
   * Subscribe to Bid status updates
   */
  subscribeToBidUpdates(
    bidIds: string[],
    onUpdate: (data: any) => void,
    onError?: (error: any) => void,
  ): () => void {
    const query = `bid_ids=${bidIds.join(',')}`;
    return this.subscribe(
      `realtime/bid-updates?${query}`,
      'bid_status_changed',
      onUpdate,
      onError,
    );
  }

  /**
   * Subscribe to Proposal ranking updates
   */
  subscribeToProposalRankingUpdates(
    bidId: string,
    onUpdate: (data: any) => void,
    onError?: (error: any) => void,
  ): () => void {
    const query = `bid_id=${bidId}`;
    return this.subscribe(
      `realtime/proposal-ranking-updates?${query}`,
      'proposal_ranking_updated',
      onUpdate,
      onError,
    );
  }

  /**
   * Subscribe to Order status updates
   */
  subscribeToOrderUpdates(
    orderIds: string[],
    onUpdate: (data: any) => void,
    onError?: (error: any) => void,
  ): () => void {
    const query = `order_ids=${orderIds.join(',')}`;
    return this.subscribe(
      `realtime/order-updates?${query}`,
      'order_status_changed',
      onUpdate,
      onError,
    );
  }

  /**
   * Core subscription logic
   */
  private subscribe(
    endpoint: string,
    eventType: string,
    onUpdate: Function,
    onError?: Function,
  ): () => void {
    const url = `${process.env.REACT_APP_API_URL}/v2/${endpoint}`;

    // Register listener
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(onUpdate);

    // Create EventSource connection
    const eventSource = new EventSource(url, {
      headers: { 'X-API-Key': this.apiKey },
    });

    // Handle incoming events
    eventSource.addEventListener(eventType, (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        console.error(`Failed to parse ${eventType}:`, error);
        onError?.(error);
      }
    });

    // Handle heartbeat
    eventSource.addEventListener('heartbeat', (event) => {
      // Heartbeat received - connection is alive
      this.reconnectAttempts = 0;
    });

    // Handle errors
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);

      if (eventSource.readyState === EventSource.CLOSED) {
        // Connection closed - try to reconnect
        this.handleDisconnection(
          endpoint,
          eventType,
          onUpdate,
          onError,
        );
      }

      onError?.(error);
    };

    // Return unsubscribe function
    return () => {
      eventSource.close();
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(onUpdate);
      }
    };
  }

  /**
   * Handle reconnection logic
   */
  private handleDisconnection(
    endpoint: string,
    eventType: string,
    onUpdate: Function,
    onError?: Function,
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      onError?.(new Error('Connection lost'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.subscribe(endpoint, eventType, onUpdate, onError);
    }, delay);
  }

  /**
   * Close all connections
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }
}

// Usage example:
/*
const realtimeClient = new RealtimeClient(apiKey);

// Subscribe to Fleet EI updates
const unsubscribeEI = realtimeClient.subscribeToEIUpdates(
  ['FLT-A01', 'FLT-B02'],
  (data) => {
    console.log(`Fleet ${data.fleet_id} EI updated:`, data.new_ei);
    // Update UI
  },
  (error) => {
    console.error('EI subscription error:', error);
  }
);

// Later: unsubscribe
unsubscribeEI();

// Cleanup on component unmount
realtimeClient.disconnect();
*/
```

---

## 3. WebSocket 구현 (선택적, 미래 업그레이드)

### 3.1 Socket.io vs Native WebSocket

**권장**: **Socket.io** (80% 사용 사례)
- 자동 재연결
- Fallback to HTTP polling
- Binary support
- Namespace & room management
- 더 나은 DX (Developer Experience)

### 3.2 NestJS + Socket.io 예제

```typescript
// src/modules/realtime/realtime.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(','),
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Fallback to polling
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSubscriptions = new Map<string, Set<string>>();

  constructor(private realtimeService: RealtimeService) {}

  afterInit(server: Server): void {
    console.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    const apiKey = client.handshake.auth.apiKey;

    if (!apiKey) {
      client.disconnect();
      return;
    }

    const userId = this.realtimeService.validateApiKey(apiKey);
    if (!userId) {
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    console.log(`Client ${client.id} connected (userId: ${userId})`);

    // Initialize subscription tracking
    this.userSubscriptions.set(client.id, new Set());
  }

  handleDisconnect(client: Socket): void {
    const subscriptions = this.userSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((sub) => {
        client.leave(sub); // Leave all rooms
      });
      this.userSubscriptions.delete(client.id);
    }

    console.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe_ei')
  handleSubscribeEI(client: Socket, data: { fleet_ids: string[] }): void {
    data.fleet_ids.forEach((fleetId) => {
      const room = `fleet:ei:${fleetId}`;
      client.join(room);

      const subscriptions = this.userSubscriptions.get(client.id) || new Set();
      subscriptions.add(room);
      this.userSubscriptions.set(client.id, subscriptions);

      console.log(`Client ${client.id} subscribed to ${room}`);
    });

    client.emit('subscribe_ei_ack', {
      status: 'ok',
      fleet_ids: data.fleet_ids,
    });
  }

  @SubscribeMessage('unsubscribe_ei')
  handleUnsubscribeEI(client: Socket, data: { fleet_ids: string[] }): void {
    data.fleet_ids.forEach((fleetId) => {
      const room = `fleet:ei:${fleetId}`;
      client.leave(room);

      const subscriptions = this.userSubscriptions.get(client.id);
      if (subscriptions) {
        subscriptions.delete(room);
      }

      console.log(`Client ${client.id} unsubscribed from ${room}`);
    });
  }

  // Emit EI update to all subscribed clients
  emitEIUpdate(fleetId: string, eiData: any): void {
    const room = `fleet:ei:${fleetId}`;
    this.server.to(room).emit('ei_updated', {
      fleet_id: fleetId,
      ...eiData,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 4. 메시지 브로드캐스팅 (Message Broadcasting)

### 4.1 신뢰성 있는 메시지 전달

```typescript
// src/services/messageQueue.service.ts
import { Injectable } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

@Injectable()
export class MessageQueueService {
  private realtimeQueue: Queue;

  constructor(private redis: Redis) {
    // Create queue for realtime message broadcasting
    this.realtimeQueue = new Queue('realtime:broadcasts', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    });

    this.setupWorker();
  }

  /**
   * Queue a broadcast job (guaranteed delivery)
   */
  async queueBroadcast(
    eventType: string,
    eventData: any,
  ): Promise<void> {
    await this.realtimeQueue.add(
      'broadcast',
      {
        eventType,
        eventData,
        publishedAt: new Date().toISOString(),
      },
      {
        jobId: `${eventType}-${Date.now()}`, // Idempotent job ID
      },
    );
  }

  /**
   * Setup worker to process broadcasts
   */
  private setupWorker(): void {
    const worker = new Worker(
      'realtime:broadcasts',
      async (job) => {
        const { eventType, eventData, publishedAt } = job.data;

        try {
          // Publish to Redis Pub/Sub
          const channel = this.getChannelForEventType(eventType);
          await this.redis.publish(
            channel,
            JSON.stringify({
              ...eventData,
              publishedAt,
              jobId: job.id,
            }),
          );

          return { success: true, published: true };
        } catch (error) {
          console.error(`Failed to broadcast event ${eventType}:`, error);
          throw error; // Retry
        }
      },
      {
        connection: this.redis,
        concurrency: 10, // Process up to 10 jobs concurrently
      },
    );

    worker.on('completed', (job) => {
      console.log(`Broadcast job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Broadcast job ${job.id} failed:`, err);
    });
  }

  private getChannelForEventType(eventType: string): string {
    const channelMap = {
      ei_update: 'channel:ei:updates',
      bid_status_change: 'channel:bid:status',
      proposal_ranking_change: 'channel:proposal:ranking',
      order_status_change: 'channel:order:status',
    };

    return channelMap[eventType] || `channel:${eventType}`;
  }
}
```

### 4.2 중복 제거 (Deduplication)

```typescript
/**
 * Prevent duplicate broadcasts within time window
 */
async function publishWithDeduplication(
  redisClient: Redis,
  eventKey: string,
  eventData: any,
  deduplicationWindow = 1000, // 1 second
): Promise<boolean> {
  const lastPublishKey = `dedup:${eventKey}`;
  const lastPublishTime = await redisClient.get(lastPublishKey);

  if (lastPublishTime) {
    // Event was published recently, skip
    console.log(`Skipping duplicate event: ${eventKey}`);
    return false;
  }

  // Publish event
  await redisClient.publish(
    'channel:events',
    JSON.stringify(eventData),
  );

  // Mark as published
  await redisClient.setex(
    lastPublishKey,
    Math.ceil(deduplicationWindow / 1000),
    Date.now().toString(),
  );

  return true;
}
```

---

## 5. 확장성 & 고가용성

### 5.1 다중 서버 인스턴스

Redis Pub/Sub은 자동으로 모든 구독자에게 메시지를 브로드캐스트:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  NestJS 1    │     │  NestJS 2    │     │  NestJS 3    │
│  (SSE)       │     │  (SSE)       │     │  (SSE)       │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Redis Pub/Sub  │
                   └─────────────────┘
```

각 서버 인스턴스가 독립적으로 Redis 구독 → 자동 부하 분산

### 5.2 메시지 순서 보장

Redis Streams 사용 (Pub/Sub 대신, 순서 보장 필요 시):

```typescript
// src/services/eventStream.service.ts
async publishEventToStream(
  streamKey: string,
  eventData: any,
): Promise<string> {
  const eventId = await this.redis.xadd(
    streamKey,
    '*',
    'data', JSON.stringify(eventData),
    'timestamp', new Date().toISOString(),
  );

  return eventId;
}

// Consumer group for guaranteed processing
async subscribeToEventStream(
  streamKey: string,
  groupName: string,
  consumerName: string,
  callback: (message: any) => Promise<void>,
): Promise<void> {
  // Create consumer group (if not exists)
  try {
    await this.redis.xgroup(
      'CREATE',
      streamKey,
      groupName,
      '$',
      'MKSTREAM',
    );
  } catch (error) {
    // Group already exists
  }

  // Continuously read from stream
  while (true) {
    const messages = await this.redis.xreadgroup(
      'GROUP', groupName, consumerName,
      'COUNT', '10',
      'BLOCK', '1000',
      'STREAMS', streamKey, '>'
    );

    if (!messages || messages.length === 0) {
      continue;
    }

    for (const [stream, messageList] of messages) {
      for (const [messageId, fieldValues] of messageList) {
        try {
          const data = JSON.parse(fieldValues[1]); // fieldValues[1] is data field
          await callback(data);

          // Acknowledge message
          await this.redis.xack(streamKey, groupName, messageId);
        } catch (error) {
          console.error(`Failed to process message ${messageId}:`, error);
          // Message will be retried by consumer group
        }
      }
    }
  }
}
```

---

## 6. 모니터링 & 디버깅

### 6.1 실시간 연결 추적

```typescript
// src/modules/realtime/realtime-metrics.service.ts
@Injectable()
export class RealtimeMetricsService {
  async getConnectionMetrics(): Promise<any> {
    const metrics = {
      activeConnections: await this.redis.get('metrics:realtime:connections'),
      totalMessagesPublished: await this.redis.get('metrics:realtime:messages'),
      messagesPerSecond: await this.redis.get('metrics:realtime:messages_per_sec'),
      averageMessageLatency: await this.redis.get('metrics:realtime:avg_latency_ms'),
      errorRate: await this.redis.get('metrics:realtime:error_rate'),
    };

    return metrics;
  }

  async trackConnection(connectionId: string): Promise<void> {
    await this.redis.incr('metrics:realtime:connections');
  }

  async trackDisconnection(connectionId: string): Promise<void> {
    await this.redis.decr('metrics:realtime:connections');
  }

  async trackPublishedMessage(latencyMs: number): Promise<void> {
    await this.redis.incr('metrics:realtime:messages');

    // Update average latency
    const avgLatency = await this.redis.get('metrics:realtime:avg_latency_ms') || 0;
    const totalMessages = await this.redis.get('metrics:realtime:messages') || 1;
    const newAvg = (parseInt(avgLatency) * (totalMessages - 1) + latencyMs) / totalMessages;
    await this.redis.set('metrics:realtime:avg_latency_ms', newAvg.toString());
  }
}
```

---

## 7. 성능 최적화

### 7.1 배압 처리 (Backpressure)

```typescript
/**
 * Handle backpressure when client is slow
 */
handleMessageWithBackpressure(
  connection$: Subject<any>,
  message: any,
): void {
  // Check if queue is full
  if (connection$.observed && connection$.observers.length > 0) {
    const observer = connection$.observers[0];

    if (observer.isStopped) {
      // Client disconnected
      return;
    }

    // Send message
    observer.next({
      data: JSON.stringify(message),
      event: 'update',
    });
  }
}
```

### 7.2 메시지 배치 처리

```typescript
/**
 * Batch messages to reduce network overhead
 */
async function publishBatchedMessages(
  messages: any[],
  batchSize: number = 50,
  batchIntervalMs: number = 100,
): Promise<void> {
  let batch = [];

  for (const message of messages) {
    batch.push(message);

    if (batch.length >= batchSize) {
      await publishBatch(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await publishBatch(batch);
  }
}

async function publishBatch(batch: any[]): Promise<void> {
  await redis.publish(
    'channel:events',
    JSON.stringify({
      type: 'batch',
      events: batch,
      timestamp: new Date().toISOString(),
    }),
  );
}
```

---

## Summary

**선택된 기술**:
- **프로토콜**: SSE (Server-Sent Events) - 단방향, 자동 재연결, 간단
- **메시징**: Redis Pub/Sub - <1ms 지연, 간단한 구조
- **신뢰성**: BullMQ + Redis Streams (필요시)
- **확장성**: 다중 서버 인스턴스 지원

**주요 채널**:
1. `channel:ei:updates` - Fleet EI 변경
2. `channel:bid:status` - Bid 상태 변경
3. `channel:bid:{bidId}:proposal_ranking` - Proposal 순위 변경
4. `channel:order:status` - Order 상태 변경

**성능 특성**:
- 메시지 지연: <100ms (SSE + Redis)
- 동시 연결: 10,000+ (NestJS + Node.js)
- 처리량: 100,000+ msg/sec (Redis)
