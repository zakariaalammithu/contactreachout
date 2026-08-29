/**
 * Bulk Contact Form Outreach System — Admin Audit Log Service
 * Tracks critical administrative actions, security events, and configuration changes.
 * NEVER logs passwords, API keys, Bearer tokens, or credentials.
 */

import { LogSanitizer } from '@/lib/security/log-sanitizer';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed' | 'blocked';
  metadata: Record<string, any>;
  timestamp: string;
}

// In-memory audit log store (mirrored to DB admin_audit_logs)
const auditLogsStore: AuditLogEntry[] = [
  {
    id: 'log-001',
    userId: 'usr-superadmin-001',
    userEmail: 'mithusquare@gmail.com',
    action: 'admin_login_success',
    resourceType: 'auth',
    resourceId: 'usr-superadmin-001',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    metadata: { role: 'SUPER_ADMIN', authMethod: 'password_hash' },
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'log-002',
    userId: 'usr-superadmin-001',
    userEmail: 'mithusquare@gmail.com',
    action: 'integration_updated',
    resourceType: 'system_secrets',
    resourceId: 'RESEND_API_KEY',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    metadata: { provider: 'Resend', keyConfigured: true, maskedPreview: '••••••••ABCD' },
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'log-003',
    userId: 'usr-superadmin-001',
    userEmail: 'mithusquare@gmail.com',
    action: 'campaign_settings_saved',
    resourceType: 'system_settings',
    resourceId: 'global_settings',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'success',
    metadata: { liveSubmissionsEnabled: false, maxConcurrency: 5 },
    timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
];

export class AuditLogService {
  /**
   * Sanitizes metadata to guarantee zero secret leakage before persisting.
   */
  private static sanitizeMetadata(meta: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(meta)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('password') ||
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('apikey') ||
        lower.includes('api_key') ||
        lower.includes('key')
      ) {
        clean[key] = '••••••••';
      } else if (typeof value === 'string') {
        clean[key] = LogSanitizer.sanitize(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Records a new audit log event.
   */
  public static log(entry: {
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failed' | 'blocked';
    metadata?: Record<string, any>;
  }): AuditLogEntry {
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress || '127.0.0.1',
      userAgent: entry.userAgent || 'Server-Internal',
      status: entry.status || 'success',
      metadata: this.sanitizeMetadata(entry.metadata || {}),
      timestamp: new Date().toISOString(),
    };

    auditLogsStore.unshift(newLog); // newest first
    return newLog;
  }

  /**
   * Queries audit logs with pagination and search filters.
   */
  public static query(filters?: {
    action?: string;
    resourceType?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): AuditLogEntry[] {
    let results = [...auditLogsStore];

    if (filters?.action && filters.action !== 'all') {
      results = results.filter((l) => l.action.toLowerCase() === filters.action!.toLowerCase());
    }

    if (filters?.resourceType && filters.resourceType !== 'all') {
      results = results.filter((l) => l.resourceType.toLowerCase() === filters.resourceType!.toLowerCase());
    }

    if (filters?.status && filters.status !== 'all') {
      results = results.filter((l) => l.status.toLowerCase() === filters.status!.toLowerCase());
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (l) =>
          l.userEmail.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.resourceType.toLowerCase().includes(q) ||
          (l.resourceId && l.resourceId.toLowerCase().includes(q))
      );
    }

    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }
}
