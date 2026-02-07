/**
 * GLEC SDK — Audit Trail Types
 */

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  ipAddress: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogsQuery {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface EntityTrail {
  entityType: string;
  entityId: string;
  changes: AuditLog[];
  total: number;
}

export interface UserActivity {
  userId: string;
  actions: AuditLog[];
  total: number;
}
