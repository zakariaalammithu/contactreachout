/**
 * Multi-Signal Risk Engine for Anti-Abuse Protection
 * Bulk Contact Form Outreach System
 * 
 * Evaluates signup requests based on multiple signals:
 * - IP Address Velocity (short-term & long-term)
 * - User-Agent / Device Header Integrity
 * - Email Domain Reputation & Quality
 * - Signup Request Frequency
 * 
 * Assigns Risk Level: 'LOW' | 'MEDIUM' | 'HIGH'
 */

import { isDisposableEmail } from './disposable-email';

interface RiskEvaluationParams {
  ip: string;
  userAgent?: string | null;
  email: string;
}

export interface RiskEvaluationResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number; // 0 (safest) to 100 (highest risk)
  reasons: string[];
  allowed: boolean;
}

// In-memory server tracking for IP and device velocity
const ipVelocityTracker = new Map<string, { count24h: number; resetAt: number }>();
const deviceVelocityTracker = new Map<string, { count24h: number; resetAt: number }>();

export class RiskEngine {
  public static evaluateSignupRequest(params: RiskEvaluationParams): RiskEvaluationResult {
    const { ip, userAgent, email } = params;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanIp = (ip || '127.0.0.1').split(',')[0].trim();
    const now = Date.now();
    const reasons: string[] = [];
    let score = 0;

    // 1. Check Disposable / Temporary Email Domain (High Penalty)
    if (isDisposableEmail(cleanEmail)) {
      score += 75;
      reasons.push('Disposable or temporary email provider detected');
    }

    // 2. User-Agent / Device Signal Inspection
    if (!userAgent || userAgent.trim().length < 10) {
      score += 35;
      reasons.push('Missing or incomplete browser User-Agent signal');
    } else if (
      userAgent.toLowerCase().includes('bot') ||
      userAgent.toLowerCase().includes('python') ||
      userAgent.toLowerCase().includes('curl')
    ) {
      score += 60;
      reasons.push('Automated client header detected');
    }

    // 3. IP Address Velocity (24h Window)
    let ipRecord = ipVelocityTracker.get(cleanIp);
    if (!ipRecord || now > ipRecord.resetAt) {
      ipRecord = { count24h: 0, resetAt: now + 24 * 60 * 60 * 1000 };
      ipVelocityTracker.set(cleanIp, ipRecord);
    }

    if (ipRecord.count24h >= 10) {
      score += 50;
      reasons.push('High signup frequency from IP address in last 24 hours');
    } else if (ipRecord.count24h >= 5) {
      score += 25;
      reasons.push('Moderate signup frequency from IP address');
    }

    // 4. Device Signature Velocity (24h Window)
    const deviceKey = `${cleanIp}_${(userAgent || 'unknown').slice(0, 30)}`;
    let deviceRecord = deviceVelocityTracker.get(deviceKey);
    if (!deviceRecord || now > deviceRecord.resetAt) {
      deviceRecord = { count24h: 0, resetAt: now + 24 * 60 * 60 * 1000 };
      deviceVelocityTracker.set(deviceKey, deviceRecord);
    }

    if (deviceRecord.count24h >= 5) {
      score += 40;
      reasons.push('High signup velocity from same device profile');
    }

    // Determine Final Risk Level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score >= 60) {
      riskLevel = 'HIGH';
    } else if (score >= 30) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskLevel,
      score,
      reasons,
      allowed: riskLevel !== 'HIGH',
    };
  }

  public static recordSuccessfulSignup(ip: string, userAgent?: string | null): void {
    const cleanIp = (ip || '127.0.0.1').split(',')[0].trim();
    const now = Date.now();

    const ipRecord = ipVelocityTracker.get(cleanIp) || { count24h: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    ipRecord.count24h += 1;
    ipVelocityTracker.set(cleanIp, ipRecord);

    const deviceKey = `${cleanIp}_${(userAgent || 'unknown').slice(0, 30)}`;
    const deviceRecord = deviceVelocityTracker.get(deviceKey) || { count24h: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    deviceRecord.count24h += 1;
    deviceVelocityTracker.set(deviceKey, deviceRecord);
  }
}
