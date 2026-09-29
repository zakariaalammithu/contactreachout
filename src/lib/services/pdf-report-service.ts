export interface CampaignReportItem {
  id: string;
  name: string;
  date: string;
  status: string;
  prospects: number;
  reached: number;
  failed?: number;
  noContactPage?: number;
  captchaBlocked?: number;
  replied?: number;
  ownerEmail?: string;
}

export interface TelemetryAuditLog {
  domain: string;
  url: string;
  formStatus: string;
  fieldsDetected: string;
  submissionStatus: string;
  successVerification: string;
  finalStatus: string;
  techStack: string;
  domainAge: string;
  lastUpdated: string;
  code: string;
  details: string;
  time: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  isDryRun?: boolean;
  httpStatus?: number;
  renderedSubject?: string;
  renderedMessage?: string;
}

/**
 * Generate & Download Executive PDF Campaign Telemetry Report
 * Creates a clean, professional ContactReachout SaaS Executive PDF document using standard A4 vector print engine.
 */
export function generateCampaignPDFReport(
  campaign: CampaignReportItem,
  auditLogs: TelemetryAuditLog[],
  accountEmail: string = 'User'
) {
  if (typeof window === 'undefined') return;

  const totalProspects = campaign.prospects || 0;
  const delivered = campaign.reached || 0;
  const failed = campaign.failed || 0;
  const noForm = campaign.noContactPage || 0;
  const captcha = campaign.captchaBlocked || 0;
  const replied = campaign.replied || 0;
  const pending = Math.max(0, totalProspects - delivered - failed - noForm - captcha);
  const yieldPct = totalProspects > 0 ? Math.round((delivered / totalProspects) * 100) : 0;

  // Calculate Timeline details
  let startedAtStr = 'N/A';
  let finishedAtStr = 'N/A';
  let durationStr = 'N/A';

  if (auditLogs.length > 0) {
    const validStarts = auditLogs.map((l) => l.startedAt).filter(Boolean);
    const validEnds = auditLogs.map((l) => l.completedAt).filter(Boolean);

    if (validStarts.length > 0) {
      startedAtStr = new Date(validStarts[0]!).toLocaleString('en-GB');
    }
    if (validEnds.length > 0) {
      finishedAtStr = new Date(validEnds[validEnds.length - 1]!).toLocaleString('en-GB');
    }

    const totalMs = auditLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0);
    if (totalMs > 0) {
      const seconds = Math.floor(totalMs / 1000);
      const mins = Math.floor(seconds / 60);
      const remainingSecs = seconds % 60;
      durationStr = mins > 0 ? `${mins}m ${remainingSecs}s` : `${seconds}s`;
    }
  }

  const printWindow = window.open('', '_blank', 'width=1100,height=900');
  if (!printWindow) {
    alert('Please allow popups for this site to generate the PDF report.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ContactReachout Campaign Telemetry Report - ${escapeHtml(campaign.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 11px;
      line-height: 1.4;
    }
    
    /* Header Brand Bar */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0e6de4;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-title span {
      color: #0e6de4;
    }
    .report-badge {
      background-color: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Campaign Meta Card */
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 18px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-value {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      word-break: break-all;
    }

    /* KPI Cards Grid */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin-bottom: 8px;
      border-left: 3px solid #0e6de4;
      padding-left: 8px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 6px;
      text-align: center;
      background-color: #ffffff;
    }
    .kpi-card.delivered { border-color: #a7f3d0; background-color: #ecfdf5; }
    .kpi-card.failed { border-color: #fecdd3; background-color: #fff1f2; }
    .kpi-card.no-form { border-color: #fde68a; background-color: #fffbeb; }
    .kpi-card.captcha { border-color: #e9d5ff; background-color: #faf5ff; }
    .kpi-card.pending { border-color: #bfdbfe; background-color: #eff6ff; }
    .kpi-card.replied { border-color: #c7d2fe; background-color: #eef2ff; }
    
    .kpi-num {
      font-size: 16px;
      font-weight: 800;
      font-family: monospace;
      margin-top: 2px;
    }
    .kpi-title {
      font-size: 8px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }

    /* Performance Bar */
    .perf-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 18px;
      background-color: #ffffff;
    }
    .perf-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-weight: 700;
      font-size: 10px;
    }
    .progress-bar-bg {
      height: 8px;
      background-color: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%);
      border-radius: 999px;
    }

    /* Audit Breakdown Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 9px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #0f172a;
      vertical-align: top;
      word-break: break-word;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      font-family: monospace;
      text-transform: uppercase;
    }
    .badge-delivered { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-failed { background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-no-form { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-captcha { background-color: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .badge-pending { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 8px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header-bar">
    <div class="brand-title">Contact<span>Reachout</span></div>
    <div class="report-badge">Executive Telemetry Report</div>
  </div>

  <!-- Campaign Meta -->
  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Campaign Name</span>
      <span class="meta-value">${escapeHtml(campaign.name)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Campaign ID</span>
      <span class="meta-value">${escapeHtml(campaign.id)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Created Date</span>
      <span class="meta-value">${escapeHtml(campaign.date)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Status</span>
      <span class="meta-value">${escapeHtml(campaign.status.toUpperCase())}</span>
    </div>
  </div>

  <!-- KPI Cards -->
  <div class="section-title">Campaign KPI Summary</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Total</div>
      <div class="kpi-num" style="color: #0f172a;">${totalProspects}</div>
    </div>
    <div class="kpi-card delivered">
      <div class="kpi-title">Delivered</div>
      <div class="kpi-num" style="color: #047857;">${delivered}</div>
    </div>
    <div class="kpi-card failed">
      <div class="kpi-title">Failed</div>
      <div class="kpi-num" style="color: #be123c;">${failed}</div>
    </div>
    <div class="kpi-card no-form">
      <div class="kpi-title">No Contact Page</div>
      <div class="kpi-num" style="color: #b45309;">${noForm}</div>
    </div>
    <div class="kpi-card captcha">
      <div class="kpi-title">CAPTCHA/Review</div>
      <div class="kpi-num" style="color: #7e22ce;">${captcha}</div>
    </div>
    <div class="kpi-card pending">
      <div class="kpi-title">Pending</div>
      <div class="kpi-num" style="color: #1d4ed8;">${pending}</div>
    </div>
    <div class="kpi-card replied">
      <div class="kpi-title">Replied</div>
      <div class="kpi-num" style="color: #4338ca;">${replied}</div>
    </div>
  </div>

  <!-- Performance Yield -->
  <div class="perf-box">
    <div class="perf-flex">
      <span>OUTREACH DELIVERABILITY YIELD</span>
      <span style="color: #047857;">${yieldPct}% Form Deliverability Rate (${delivered}/${totalProspects})</span>
    </div>
    <div class="progress-bar-bg">
      <div class="progress-bar-fill" style="width: ${Math.min(100, yieldPct)}%;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 8px; color: #64748b;">
      <span>Started At: ${escapeHtml(startedAtStr)}</span>
      <span>Finished At: ${escapeHtml(finishedAtStr)}</span>
      <span>Duration: ${escapeHtml(durationStr)}</span>
    </div>
  </div>

  <!-- Target Website Audit Breakdown -->
  <div class="section-title">Target Website Audit Breakdown</div>
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Website Domain</th>
        <th style="width: 16%;">Contact Page URL</th>
        <th style="width: 10%;">Form Status</th>
        <th style="width: 12%;">Fields Detected</th>
        <th style="width: 10%;">Submission</th>
        <th style="width: 12%;">Success Verification</th>
        <th style="width: 10%;">Final Status</th>
        <th style="width: 10%;">Diagnostic Details</th>
        <th style="width: 6%;">Time</th>
      </tr>
    </thead>
    <tbody>
      ${
        auditLogs.length === 0
          ? `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 14px;">No website audit records found for this campaign.</td></tr>`
          : auditLogs
              .map((item) => {
                const badgeClass =
                  item.finalStatus === 'DELIVERED'
                    ? 'badge-delivered'
                    : item.finalStatus === 'FAILED' || item.finalStatus === 'SUBMIT_FAILED'
                    ? 'badge-failed'
                    : item.finalStatus === 'NO_CONTACT_PAGE' || item.finalStatus === 'NO-FORM'
                    ? 'badge-no-form'
                    : item.finalStatus === 'CAPTCHA_REVIEW' || item.finalStatus === 'REVIEW'
                    ? 'badge-captcha'
                    : 'badge-pending';

                return `
        <tr>
          <td><strong>${escapeHtml(item.domain)}</strong></td>
          <td style="font-family: monospace;">${escapeHtml(item.url)}</td>
          <td>${escapeHtml(item.formStatus)}</td>
          <td>${escapeHtml(item.fieldsDetected)}</td>
          <td>${escapeHtml(item.submissionStatus)}</td>
          <td>${escapeHtml(item.successVerification)}</td>
          <td><span class="badge ${badgeClass}">${escapeHtml(item.finalStatus)}</span></td>
          <td style="font-size: 8px; color: #475569;">${escapeHtml(item.details || item.code)}</td>
          <td style="font-family: monospace;">${escapeHtml(item.time)}</td>
        </tr>
      `;
              })
              .join('')
      }
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>ContactReachout Automated Form Outreach Intelligence System</div>
    <div>Report Generated on: ${new Date().toLocaleString('en-GB')} • User: ${escapeHtml(accountEmail)}</div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
