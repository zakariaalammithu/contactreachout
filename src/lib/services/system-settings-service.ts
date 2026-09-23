/**
 * Bulk Contact Form Outreach System — System Settings Service
 * Manages global application settings, maintenance mode, and root admin configuration.
 * Server-persisted and protected against unauthorized mutations.
 */

export interface SystemSettings {
  appName: string;
  masterRootAdminEmail: string;
  maintenanceMode: boolean;
  updatedAt: string;
  updatedBy?: string;
}

// In-memory persistent store for system settings
let currentSettings: SystemSettings = {
  appName: 'ContactReachout',
  masterRootAdminEmail: 'mithusquare@gmail.com',
  maintenanceMode: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export class SystemSettingsService {
  /**
   * Retrieves current system settings.
   */
  public static getSettings(): SystemSettings {
    return { ...currentSettings };
  }

  /**
   * Updates system settings with server-side validation.
   */
  public static updateSettings(
    updates: Partial<SystemSettings>,
    userRole: string,
    userEmail?: string
  ): { success: boolean; settings: SystemSettings; error?: string } {
    // Check if non-SUPER_ADMIN is trying to change master root admin email
    if (updates.masterRootAdminEmail && updates.masterRootAdminEmail !== currentSettings.masterRootAdminEmail) {
      if (userRole !== 'SUPER_ADMIN') {
        return {
          success: false,
          settings: { ...currentSettings },
          error: 'Only SUPER_ADMIN is authorized to modify the Master Root Admin Email.',
        };
      }
    }

    const appName = updates.appName ? updates.appName.trim() : currentSettings.appName;
    if (!appName) {
      return {
        success: false,
        settings: { ...currentSettings },
        error: 'Application title cannot be empty.',
      };
    }

    const masterEmail = updates.masterRootAdminEmail
      ? updates.masterRootAdminEmail.trim().toLowerCase()
      : currentSettings.masterRootAdminEmail;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(masterEmail)) {
      return {
        success: false,
        settings: { ...currentSettings },
        error: 'Invalid Master Root Admin Email format.',
      };
    }

    currentSettings = {
      appName,
      masterRootAdminEmail: masterEmail,
      maintenanceMode: updates.maintenanceMode !== undefined ? Boolean(updates.maintenanceMode) : currentSettings.maintenanceMode,
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'system',
    };

    return {
      success: true,
      settings: { ...currentSettings },
    };
  }

  /**
   * Checks whether System Maintenance Mode is active.
   */
  public static isMaintenanceModeActive(): boolean {
    return currentSettings.maintenanceMode;
  }
}
