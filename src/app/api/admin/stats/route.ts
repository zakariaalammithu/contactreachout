

import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';
import { AuthStore } from '@/lib/auth/auth-store';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const users = AuthStore.getAllUsers();
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((user) => !user.isSuspended).length,
    totalCampaigns: 0,
    runningCampaigns: 0,
    totalLeads: 0,
    pendingJobs: 0,
    processingJobs: 0,
    successfulSubmissions: 0,
    failedSubmissions: 0,
    reviewRequired: 0,
    captchaDetected: 0,
    systemErrors: 0,
    globalLiveSubmissionsEnabled: false, // Default safety killswitch
  };

  const submissionTrends: Array<{ day: string; successful: number; failed: number; reviewReq: number }> = [];

  // Recent system & admin activity
  const recentActivity = AuditLogService.query({ limit: 10 });

  return NextResponse.json({
    stats,
    submissionTrends,
    recentActivity,
    currentUser: {
      email: session.email,
      role: session.role,
    },
    timestamp: new Date().toISOString(),
  });
}
