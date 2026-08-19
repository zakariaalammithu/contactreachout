import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AuditLogService } from '@/lib/services/audit-log-service';

export async function GET(req: NextRequest) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const stats = {
    totalUsers: 14,
    activeUsers: 12,
    totalCampaigns: 28,
    runningCampaigns: 4,
    totalLeads: 18450,
    pendingJobs: 124,
    processingJobs: 8,
    successfulSubmissions: 14210,
    failedSubmissions: 312,
    reviewRequired: 184,
    captchaDetected: 98,
    systemErrors: 0,
    globalLiveSubmissionsEnabled: false, // Default safety killswitch
  };

  // Submissions trend by day
  const submissionTrends = [
    { day: 'Mon', successful: 1840, failed: 42, reviewReq: 18 },
    { day: 'Tue', successful: 2150, failed: 38, reviewReq: 24 },
    { day: 'Wed', successful: 2490, failed: 45, reviewReq: 31 },
    { day: 'Thu', successful: 2210, failed: 29, reviewReq: 19 },
    { day: 'Fri', successful: 2830, failed: 51, reviewReq: 42 },
    { day: 'Sat', successful: 1420, failed: 20, reviewReq: 12 },
    { day: 'Sun', successful: 1270, failed: 15, reviewReq: 9 },
  ];

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
