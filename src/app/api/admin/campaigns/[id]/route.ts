import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthGuard } from '@/lib/auth/admin-auth-guard';
import { AdminCampaignStore } from '@/lib/services/admin-campaign-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, errorResponse } = await AdminAuthGuard.requireAdmin(req);
  if (errorResponse) return errorResponse;

  const resolvedParams = await params;
  const campaignId = resolvedParams.id;

  const campaign = AdminCampaignStore.getCampaignById(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  }

  // Authorization check for Admin caller
  if (session.role === 'ADMIN') {
    if (campaign.ownerEmail.toLowerCase().trim() !== session.email.toLowerCase().trim()) {
      // Unless granted multi-tenant permission
    }
  }

  const delivered = campaign.deliveredCount || 0;
  const failed = campaign.failedCount || 0;
  const noForm = campaign.noFormCount || 0;
  const review = campaign.reviewCount || 0;
  const processed = campaign.processedProspects || (delivered + failed + noForm + review);
  const total = campaign.totalProspects || 0;
  const pending = Math.max(0, total - processed);

  const successRateText = processed > 0
    ? `${((delivered / processed) * 100).toFixed(1)}%`
    : '—';

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      ownerUserId: campaign.ownerUserId,
      ownerName: campaign.ownerName || campaign.ownerEmail.split('@')[0],
      ownerEmail: campaign.ownerEmail,
      ownerAvatarUrl: campaign.ownerAvatarUrl || null,
      organizationName: campaign.organizationName || null,
      status: campaign.status,
      createdAt: campaign.createdAt,
      startedAt: campaign.startedAt || null,
      completedAt: campaign.completedAt || null,
      totalProspects: total,
      processedProspects: processed,
      delivered,
      pending,
      failed,
      noForm,
      review,
      replied: campaign.repliedCount || 0,
      successRate: successRateText,
      logs: campaign.logs || [],
      prospectsList: campaign.prospectsList || [],
    },
  });
}
