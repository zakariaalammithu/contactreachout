import { AuthStore, UserAccount } from '@/lib/auth/auth-store';

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface CampaignProspectLog {
  leadId: string;
  domain: string;
  url?: string;
  status: 'DELIVERED' | 'FAILED' | 'NO-FORM' | 'REVIEW' | 'DRY_RUN_COMPLETED';
  code?: string;
  time?: string;
  timestamp?: string;
}

export interface AdminCampaign {
  id: string;
  name: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  organizationName?: string;
  status: CampaignStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
  totalProspects: number;
  processedProspects: number;
  deliveredCount: number;
  failedCount: number;
  noFormCount: number;
  reviewCount: number;
  repliedCount: number;
  prospectsList?: any[];
  logs?: CampaignProspectLog[];
  tag?: string;
}

// In-memory server-side persistent campaign registry
const campaignRegistry = new Map<string, AdminCampaign>();

export class AdminCampaignStore {
  /**
   * Enriches campaign with owner user profile details from AuthStore
   */
  public static enrichCampaign(campaign: AdminCampaign): AdminCampaign {
    const owner = AuthStore.getUserByEmail(campaign.ownerEmail);
    const ownerName = owner ? owner.name : campaign.ownerName || campaign.ownerEmail.split('@')[0];
    const ownerUserId = owner ? owner.id : campaign.ownerUserId || `usr_${campaign.ownerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const ownerAvatarUrl = owner?.avatarUrl || undefined;

    const total = campaign.totalProspects || (Array.isArray(campaign.prospectsList) ? campaign.prospectsList.length : 0);
    const delivered = campaign.deliveredCount || 0;
    const failed = campaign.failedCount || 0;
    const noForm = campaign.noFormCount || 0;
    const review = campaign.reviewCount || 0;
    const processed = campaign.processedProspects || (delivered + failed + noForm + review);

    return {
      ...campaign,
      ownerUserId,
      ownerName,
      ownerAvatarUrl,
      totalProspects: total,
      processedProspects: Math.min(processed, Math.max(total, processed)),
      deliveredCount: delivered,
      failedCount: failed,
      noFormCount: noForm,
      reviewCount: review,
      repliedCount: campaign.repliedCount || 0,
    };
  }

  /**
   * Retrieves all campaigns registered in the system
   */
  public static getAllCampaigns(): AdminCampaign[] {
    return Array.from(campaignRegistry.values()).map((c) => this.enrichCampaign(c));
  }

  /**
   * Retrieves campaigns owned by a specific user email
   */
  public static getCampaignsByOwner(ownerEmail: string): AdminCampaign[] {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    return this.getAllCampaigns().filter((c) => c.ownerEmail.toLowerCase().trim() === cleanEmail);
  }

  /**
   * Retrieves a single campaign by ID
   */
  public static getCampaignById(id: string): AdminCampaign | null {
    const campaign = campaignRegistry.get(id);
    if (!campaign) return null;
    return this.enrichCampaign(campaign);
  }

  /**
   * Upserts or updates a campaign in the server store
   */
  public static saveCampaign(campaign: Partial<AdminCampaign> & { id: string; name: string; ownerEmail: string }): AdminCampaign {
    const existing = campaignRegistry.get(campaign.id);
    const now = new Date().toISOString();

    const merged: AdminCampaign = {
      id: campaign.id,
      name: campaign.name,
      ownerUserId: campaign.ownerUserId || existing?.ownerUserId || '',
      ownerEmail: campaign.ownerEmail.toLowerCase().trim(),
      ownerName: campaign.ownerName || existing?.ownerName,
      organizationName: campaign.organizationName || existing?.organizationName,
      status: campaign.status || existing?.status || 'draft',
      createdAt: campaign.createdAt || existing?.createdAt || now,
      startedAt: campaign.startedAt !== undefined ? campaign.startedAt : existing?.startedAt || null,
      completedAt: campaign.completedAt !== undefined ? campaign.completedAt : existing?.completedAt || null,
      updatedAt: now,
      totalProspects: campaign.totalProspects ?? existing?.totalProspects ?? 0,
      processedProspects: campaign.processedProspects ?? existing?.processedProspects ?? 0,
      deliveredCount: campaign.deliveredCount ?? existing?.deliveredCount ?? 0,
      failedCount: campaign.failedCount ?? existing?.failedCount ?? 0,
      noFormCount: campaign.noFormCount ?? existing?.noFormCount ?? 0,
      reviewCount: campaign.reviewCount ?? existing?.reviewCount ?? 0,
      repliedCount: campaign.repliedCount ?? existing?.repliedCount ?? 0,
      prospectsList: campaign.prospectsList || existing?.prospectsList || [],
      logs: campaign.logs || existing?.logs || [],
      tag: campaign.tag || existing?.tag || 'CUSTOM',
    };

    const enriched = this.enrichCampaign(merged);
    campaignRegistry.set(enriched.id, enriched);
    return enriched;
  }

  /**
   * Deletes a campaign from server store
   */
  public static deleteCampaign(id: string): boolean {
    return campaignRegistry.delete(id);
  }

  /**
   * Bulk syncs campaigns (e.g. from client sync payload)
   */
  public static syncCampaigns(campaigns: Array<Partial<AdminCampaign> & { id: string; name: string; ownerEmail: string }>): AdminCampaign[] {
    const saved: AdminCampaign[] = [];
    for (const c of campaigns) {
      if (c.id && c.name && c.ownerEmail) {
        saved.push(this.saveCampaign(c));
      }
    }
    return saved;
  }
}
