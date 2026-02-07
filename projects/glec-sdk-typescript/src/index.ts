/**
 * @glec/sdk — GLEC Green Logistics Platform SDK
 *
 * 화주(Shipper)와 물류기업(Carrier)의 전산 시스템에 통합하여
 * 탄소배출집약도(EI) 기반 입찰·운송·데이터 무결성을 관리합니다.
 *
 * @example
 * ```typescript
 * import { GlecClient } from '@glec/sdk';
 *
 * const client = new GlecClient({
 *   baseUrl: 'https://api.glec.kr',
 *   apiKey: 'glk_live_xxxxxxxxxxxx',
 * });
 *
 * // EI 계산: 단일 구간
 * const result = await client.ei.calculate({
 *   fuelType: 'diesel',
 *   fuelConsumed: 150,
 *   distanceKm: 500,
 *   cargoWeightTonnes: 15,
 * });
 * console.log(`EI: ${result.emissionIntensity} gCO₂e/t·km`);
 *
 * // 화주: 입찰 등록
 * const bid = await client.bids.createBid({
 *   title: '서울→부산 11톤 트럭 운송',
 *   cargoType: '일반화물',
 *   cargoWeightTonnes: 8,
 *   originLocation: '서울',
 *   destinationLocation: '부산',
 *   distanceKm: 400,
 *   expiresAt: '2026-03-01T00:00:00Z',
 * });
 *
 * // 물류기업: Fleet EI 조회
 * const ei = await client.fleet.getFleetEI('fleet-uuid');
 * console.log(`EI: ${ei.eiCurrent} gCO₂e/t·km (${ei.eiGrade})`);
 *
 * // 실시간 주문 이벤트 구독
 * const unsubscribe = client.realtime.subscribeOrders((event) => {
 *   console.log(`Order ${event.data.orderId}: ${event.data.status}`);
 * });
 *
 * // 데이터 무결성: 탄소 기록 검증
 * const verification = await client.integrity.verifyRecord('record-uuid');
 * console.log(`Valid: ${verification.valid}`);
 *
 * // 웹훅 관리
 * const webhooks = await client.webhooks.list();
 *
 * // 감사 로그 조회
 * const logs = await client.audit.getLogs({ entityType: 'order' });
 * ```
 */

import { GlecClientConfig } from './types/common';
import { HttpClient } from './utils/http';
import { FleetClient } from './clients/fleet.client';
import { BidClient } from './clients/bid.client';
import { OrderClient } from './clients/order.client';
import { IntegrityClient } from './clients/integrity.client';
import { EIClient } from './clients/ei.client';
import { RealtimeClient } from './clients/realtime.client';
import { WebhookClient } from './clients/webhook.client';
import { AuditClient } from './clients/audit.client';

export class GlecClient {
  /** Fleet & EI 관리 */
  public readonly fleet: FleetClient;
  /** 입찰/투찰 관리 */
  public readonly bids: BidClient;
  /** 주문 관리 */
  public readonly orders: OrderClient;
  /** 데이터 무결성 (기록, 서명, 검증, 이상치, 내보내기) */
  public readonly integrity: IntegrityClient;
  /** EI 계산 엔진 (단일/복합/Fleet 집계) */
  public readonly ei: EIClient;
  /** 실시간 SSE 스트리밍 + HTTP 폴링 */
  public readonly realtime: RealtimeClient;
  /** 웹훅 관리 (CRUD, 시크릿 로테이션, 딜리버리) */
  public readonly webhooks: WebhookClient;
  /** 감사 추적 (로그, 엔티티 변경, 사용자 활동) */
  public readonly audit: AuditClient;

  private readonly http: HttpClient;

  constructor(config: GlecClientConfig) {
    if (!config.baseUrl) throw new Error('baseUrl is required');
    if (!config.apiKey) throw new Error('apiKey is required');

    this.http = new HttpClient(config);
    this.fleet = new FleetClient(this.http);
    this.bids = new BidClient(this.http);
    this.orders = new OrderClient(this.http);
    this.integrity = new IntegrityClient(this.http);
    this.ei = new EIClient(this.http);
    this.realtime = new RealtimeClient(this.http, config);
    this.webhooks = new WebhookClient(this.http);
    this.audit = new AuditClient(this.http);
  }
}

// Re-export all types
export * from './types';
export { FleetClient } from './clients/fleet.client';
export { BidClient } from './clients/bid.client';
export { OrderClient } from './clients/order.client';
export { IntegrityClient } from './clients/integrity.client';
export { EIClient } from './clients/ei.client';
export { RealtimeClient } from './clients/realtime.client';
export { WebhookClient } from './clients/webhook.client';
export { AuditClient } from './clients/audit.client';
