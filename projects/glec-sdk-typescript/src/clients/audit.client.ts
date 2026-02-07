import { HttpClient } from '../utils/http';
import type {
  AuditLogsQuery,
  AuditLogsResponse,
  EntityTrail,
  UserActivity,
} from '../types/audit';

/**
 * Audit Trail Client
 * 감사 로그 조회, 엔티티 변경 추적, 사용자 활동 이력
 */
export class AuditClient {
  constructor(private readonly http: HttpClient) {}

  /**
   * Query audit logs with filters
   */
  async getLogs(query?: AuditLogsQuery): Promise<AuditLogsResponse> {
    return this.http.get<AuditLogsResponse>('/audit/logs', query as any);
  }

  /**
   * Get complete change trail for a specific entity
   */
  async getEntityTrail(entityType: string, entityId: string): Promise<EntityTrail> {
    return this.http.get<EntityTrail>(`/audit/entity/${entityType}/${entityId}`);
  }

  /**
   * Get activity history for a user
   */
  async getUserActivity(userId: string, page = 1, limit = 50): Promise<UserActivity> {
    return this.http.get<UserActivity>(`/audit/user/${userId}`, { page, limit });
  }
}
