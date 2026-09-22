import { AuthStore, UserAccount } from '@/lib/auth/auth-store';
import { mockLeads } from '@/lib/store/mock-data';

export type LeadStatus =
  | 'SUBMITTED'
  | 'DELIVERED'
  | 'PENDING'
  | 'PROCESSING'
  | 'FAILED'
  | 'REVIEW_REQUIRED'
  | 'REVIEW'
  | 'NO_FORM'
  | 'NO-FORM'
  | 'REPLIED'
  | 'UNCONTACTED'
  | 'PROSPECTS'
  | 'DRY_RUN_COMPLETED'
  | 'BLOCKED';

export interface AdminLeadItem {
  id: string;
  companyName: string;
  domain: string;
  website: string;
  contactPageUrl?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  title?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
  status: LeadStatus;
  formConfidence?: number | null;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
  listId?: string | null;
  listName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  createdAt: string;
  lastAttemptAt?: string | null;
  lastActivityAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  httpStatus?: number | null;
  sourceFileName?: string | null;
  customFields?: Record<string, any>;
  submissionHistory?: Array<{
    timestamp: string;
    status: string;
    campaignId?: string;
    campaignName?: string;
    details?: string;
  }>;
  statusHistory?: Array<{
    timestamp: string;
    fromStatus: string;
    toStatus: string;
    reason?: string;
  }>;
}

// In-memory server-side persistent lead repository
const leadRegistry = new Map<string, AdminLeadItem>();

export class AdminLeadStore {
  private static isInitialized = false;

  /**
   * Initializes default system leads linked to system accounts
   */
  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const superAdmin = AuthStore.getUserByEmail(AuthStore.PRIMARY_SUPER_ADMIN_EMAIL);
    const demoUser = AuthStore.getUserByEmail('user@demo.com');
    const operatorUser = AuthStore.getUserByEmail('operator@bulkreach.io');

    const defaultOwnerEmail = superAdmin?.email || AuthStore.PRIMARY_SUPER_ADMIN_EMAIL;

    // Load initial mock leads as system baseline records
    for (const item of mockLeads) {
      let ownerEmail = defaultOwnerEmail;
      let listName = 'General Discovery';
      if (item.id === 'lead-1' || item.id === 'lead-3') {
        ownerEmail = demoUser?.email || 'user@demo.com';
        listName = 'US SaaS Enterprise';
      } else if (item.id === 'lead-2' || item.id === 'lead-4') {
        ownerEmail = operatorUser?.email || 'operator@bulkreach.io';
        listName = 'Global Tech Founders';
      }

      this.saveLead({
        id: item.id,
        companyName: item.companyName || 'Company',
        domain: item.domain || '',
        website: item.website || '',
        contactPageUrl: item.contactPageUrl || null,
        email: item.email || null,
        firstName: item.firstName || null,
        lastName: item.lastName || null,
        phone: item.phone || null,
        industry: item.industry || null,
        city: item.city || null,
        country: item.country || 'United States',
        status: (item.status as LeadStatus) || 'PENDING',
        formConfidence: typeof item.formConfidence === 'number' ? item.formConfidence : null,
        ownerEmail,
        listId: `list-${listName.toLowerCase().replace(/\s+/g, '-')}`,
        listName,
        createdAt: item.createdAt || new Date().toISOString(),
        lastAttemptAt: item.lastAttemptAt || null,
        lastActivityAt: item.lastAttemptAt || item.createdAt || new Date().toISOString(),
        errorCode: item.errorCode || null,
        errorMessage: item.errorMessage || null,
        customFields: {
          Industry: item.industry || 'Technology',
          City: item.city || 'San Francisco',
        },
      });
    }
  }

  /**
   * Enriches lead item with owner details from AuthStore
   */
  public static enrichLead(lead: AdminLeadItem): AdminLeadItem {
    const owner = AuthStore.getUserByEmail(lead.ownerEmail);
    const ownerName = owner ? owner.name : lead.ownerName || lead.ownerEmail.split('@')[0];
    const ownerUserId = owner ? owner.id : lead.ownerUserId || `usr_${lead.ownerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const ownerAvatarUrl = owner?.avatarUrl || undefined;

    return {
      ...lead,
      ownerUserId,
      ownerName,
      ownerAvatarUrl,
      companyName: lead.companyName || 'Unknown Company',
      domain: lead.domain || (lead.website ? lead.website.replace(/^https?:\/\//, '').split('/')[0] : 'N/A'),
      website: lead.website || (lead.domain ? `https://${lead.domain}` : 'N/A'),
      listName: lead.listName || 'General Import',
      country: lead.country || 'N/A',
      status: lead.status || 'UNCONTACTED',
      customFields: lead.customFields || {},
      lastActivityAt: lead.lastActivityAt || lead.lastAttemptAt || lead.createdAt,
    };
  }

  /**
   * Retrieves all leads in the system
   */
  public static getAllLeads(): AdminLeadItem[] {
    this.initialize();
    return Array.from(leadRegistry.values()).map((l) => this.enrichLead(l));
  }

  /**
   * Retrieves leads belonging to a specific owner email
   */
  public static getLeadsByOwner(ownerEmail: string): AdminLeadItem[] {
    const cleanEmail = ownerEmail.toLowerCase().trim();
    return this.getAllLeads().filter((l) => l.ownerEmail.toLowerCase().trim() === cleanEmail);
  }

  /**
   * Retrieves a single lead by ID
   */
  public static getLeadById(id: string): AdminLeadItem | null {
    this.initialize();
    const lead = leadRegistry.get(id);
    if (!lead) return null;
    return this.enrichLead(lead);
  }

  /**
   * Saves or updates a lead record
   */
  public static saveLead(lead: Partial<AdminLeadItem> & { id: string; ownerEmail: string }): AdminLeadItem {
    this.initialize();
    const existing = leadRegistry.get(lead.id);
    const now = new Date().toISOString();

    const merged: AdminLeadItem = {
      id: lead.id,
      companyName: lead.companyName || existing?.companyName || 'Company',
      domain: lead.domain || existing?.domain || '',
      website: lead.website || existing?.website || '',
      contactPageUrl: lead.contactPageUrl !== undefined ? lead.contactPageUrl : existing?.contactPageUrl || null,
      email: lead.email !== undefined ? lead.email : existing?.email || null,
      firstName: lead.firstName !== undefined ? lead.firstName : existing?.firstName || null,
      lastName: lead.lastName !== undefined ? lead.lastName : existing?.lastName || null,
      phone: lead.phone !== undefined ? lead.phone : existing?.phone || null,
      title: lead.title !== undefined ? lead.title : existing?.title || null,
      industry: lead.industry !== undefined ? lead.industry : existing?.industry || null,
      city: lead.city !== undefined ? lead.city : existing?.city || null,
      country: lead.country !== undefined ? lead.country : existing?.country || null,
      status: lead.status || existing?.status || 'UNCONTACTED',
      formConfidence: lead.formConfidence !== undefined ? lead.formConfidence : existing?.formConfidence || null,
      ownerUserId: lead.ownerUserId || existing?.ownerUserId || '',
      ownerEmail: lead.ownerEmail.toLowerCase().trim(),
      ownerName: lead.ownerName || existing?.ownerName || '',
      ownerAvatarUrl: lead.ownerAvatarUrl || existing?.ownerAvatarUrl,
      listId: lead.listId !== undefined ? lead.listId : existing?.listId || null,
      listName: lead.listName !== undefined ? lead.listName : existing?.listName || null,
      campaignId: lead.campaignId !== undefined ? lead.campaignId : existing?.campaignId || null,
      campaignName: lead.campaignName !== undefined ? lead.campaignName : existing?.campaignName || null,
      createdAt: lead.createdAt || existing?.createdAt || now,
      lastAttemptAt: lead.lastAttemptAt !== undefined ? lead.lastAttemptAt : existing?.lastAttemptAt || null,
      lastActivityAt: lead.lastActivityAt || lead.lastAttemptAt || existing?.lastActivityAt || now,
      errorCode: lead.errorCode !== undefined ? lead.errorCode : existing?.errorCode || null,
      errorMessage: lead.errorMessage !== undefined ? lead.errorMessage : existing?.errorMessage || null,
      httpStatus: lead.httpStatus !== undefined ? lead.httpStatus : existing?.httpStatus || null,
      sourceFileName: lead.sourceFileName !== undefined ? lead.sourceFileName : existing?.sourceFileName || null,
      customFields: { ...(existing?.customFields || {}), ...(lead.customFields || {}) },
      submissionHistory: lead.submissionHistory || existing?.submissionHistory || [],
      statusHistory: lead.statusHistory || existing?.statusHistory || [],
    };

    const enriched = this.enrichLead(merged);
    leadRegistry.set(enriched.id, enriched);
    return enriched;
  }

  /**
   * Bulk syncs leads from client or import payloads
   */
  public static syncLeads(leads: Array<Partial<AdminLeadItem> & { id: string; ownerEmail: string }>): AdminLeadItem[] {
    const saved: AdminLeadItem[] = [];
    for (const l of leads) {
      if (l.id && l.ownerEmail) {
        saved.push(this.saveLead(l));
      }
    }
    return saved;
  }

  /**
   * Deletes a lead by ID
   */
  public static deleteLead(id: string): boolean {
    return leadRegistry.delete(id);
  }
}
