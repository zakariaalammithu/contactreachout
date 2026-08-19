/**
 * Bulk Contact Form Outreach System — Campaign Lifecycle & State Machine Service
 * Manages transitions (Draft, Ready, Running, Paused, Completed, Cancelled),
 * pre-flight launch checks, and live submission confirmation safety gates.
 */

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface CampaignPreFlightReport {
  campaignId: string;
  campaignName: string;
  totalLeads: number;
  validWebsites: number;
  contactPagesFound: number;
  formsFound: number;
  reviewRequired: number;
  readyToProcess: number;
  submissionMode: 'manual_approval' | 'automatic';
  isDryRun: boolean;
  canLaunch: boolean;
  warnings: string[];
}

export interface CampaignStateTransitionResult {
  success: boolean;
  previousStatus: CampaignStatus;
  newStatus: CampaignStatus;
  timestamp: string;
  errorMessage?: string;
}

export class CampaignLifecycleService {
  /**
   * Generates the pre-flight readiness audit for a campaign before launch.
   */
  public static generatePreFlightReport(campaignData: {
    id: string;
    name: string;
    totalLeads: number;
    validWebsites: number;
    contactPagesFound: number;
    formsFound: number;
    reviewRequired: number;
    submissionMode?: 'manual_approval' | 'automatic';
    isDryRun?: boolean;
  }): CampaignPreFlightReport {
    const warnings: string[] = [];

    const readyToProcess = Math.max(
      0,
      campaignData.formsFound - campaignData.reviewRequired
    );

    if (campaignData.totalLeads === 0) {
      warnings.push('Campaign contains 0 leads. Upload leads before launching.');
    }

    if (campaignData.formsFound === 0) {
      warnings.push('No contact forms have been detected yet. Discovery workers will execute on start.');
    }

    if (campaignData.reviewRequired > 0) {
      warnings.push(`${campaignData.reviewRequired} lead(s) currently require manual sign-off in the Review Queue.`);
    }

    const canLaunch = campaignData.totalLeads > 0;

    return {
      campaignId: campaignData.id,
      campaignName: campaignData.name,
      totalLeads: campaignData.totalLeads,
      validWebsites: campaignData.validWebsites,
      contactPagesFound: campaignData.contactPagesFound,
      formsFound: campaignData.formsFound,
      reviewRequired: campaignData.reviewRequired,
      readyToProcess,
      submissionMode: campaignData.submissionMode || 'manual_approval',
      isDryRun: campaignData.isDryRun ?? true,
      canLaunch,
      warnings,
    };
  }

  /**
   * Validates legal state transitions.
   */
  public static transitionStatus(
    currentStatus: CampaignStatus,
    action: 'start' | 'pause' | 'resume' | 'cancel' | 'complete'
  ): CampaignStateTransitionResult {
    const timestamp = new Date().toISOString();

    switch (action) {
      case 'start':
        if (currentStatus === 'draft' || currentStatus === 'ready') {
          return { success: true, previousStatus: currentStatus, newStatus: 'running', timestamp };
        }
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: currentStatus,
          timestamp,
          errorMessage: `Cannot start campaign from status "${currentStatus}". Must be in Draft or Ready state.`,
        };

      case 'pause':
        if (currentStatus === 'running') {
          return { success: true, previousStatus: currentStatus, newStatus: 'paused', timestamp };
        }
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: currentStatus,
          timestamp,
          errorMessage: `Cannot pause campaign with status "${currentStatus}". Only active Running campaigns can be paused.`,
        };

      case 'resume':
        if (currentStatus === 'paused') {
          return { success: true, previousStatus: currentStatus, newStatus: 'running', timestamp };
        }
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: currentStatus,
          timestamp,
          errorMessage: `Cannot resume campaign with status "${currentStatus}". Only Paused campaigns can be resumed.`,
        };

      case 'cancel':
        if (currentStatus !== 'completed' && currentStatus !== 'cancelled') {
          return { success: true, previousStatus: currentStatus, newStatus: 'cancelled', timestamp };
        }
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: currentStatus,
          timestamp,
          errorMessage: `Cannot cancel campaign that is already "${currentStatus}".`,
        };

      case 'complete':
        return { success: true, previousStatus: currentStatus, newStatus: 'completed', timestamp };

      default:
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: currentStatus,
          timestamp,
          errorMessage: `Unknown action "${action}".`,
        };
    }
  }
}
