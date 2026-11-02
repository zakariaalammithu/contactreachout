import { jsPDF } from 'jspdf';

export interface CampaignReportItem {
  id: string;
  name: string;
  date: string;
  status: string;
  prospects: number;
  reached: number;
  dryRunCompleted?: number;
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
 * Generate & download a REAL Executive PDF Campaign Telemetry Report.
 *
 * Previous implementation opened a print window (window.open + window.print)
 * and threw an alert when popups were blocked, so "Download PDF" never
 * produced a file. This version builds a genuine PDF with jsPDF and saves
 * it via a Blob + anchor download — no popup, no print dialog.
 *
 * On any generation failure an error is shown to the user (alert) instead
 * of failing silently; the error is also rethrown so callers can react.
 */
export function generateCampaignPDFReport(
  campaign: CampaignReportItem,
  auditLogs: TelemetryAuditLog[],
  accountEmail: string = 'User'
) {
  if (typeof window === 'undefined') return;

  try {
    const totalProspects = campaign.prospects || 0;
    const delivered = campaign.reached || 0;
    const dryRunCompleted = campaign.dryRunCompleted || 0;
    const failed = campaign.failed || 0;
    const noForm = campaign.noContactPage || 0;
    const captcha = campaign.captchaBlocked || 0;
    const replied = campaign.replied || 0;
    const pending = Math.max(0, totalProspects - delivered - dryRunCompleted - failed - noForm - captcha);
    const yieldPct = totalProspects > 0 ? Math.round((delivered / totalProspects) * 100) : 0;

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

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const safe = (value: unknown): string => {
      if (value === undefined || value === null) return '';
      return String(value);
    };

    // ---- Header (brand bar) ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('ContactReachout', margin, y + 6);
    const brandWidth = doc.getTextWidth('ContactReachout');
    doc.setTextColor(14, 109, 228);
    doc.text(' — Executive Telemetry Report', margin + brandWidth + 2, y + 6);
    y += 12;
    doc.setDrawColor(14, 109, 228);
    doc.setLineWidth(0.7);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ---- Campaign meta ----
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const metaLines = [
      `Campaign: ${safe(campaign.name)}`,
      `Campaign ID: ${safe(campaign.id)}`,
      `Created: ${safe(campaign.date)}    Status: ${safe(campaign.status).toUpperCase()}`,
    ];
    for (const line of metaLines) {
      doc.text(line, margin, y);
      y += 6;
    }
    y += 2;

    // ---- KPI summary ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Campaign KPI Summary', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const kpiLine =
      `Total: ${totalProspects}  |  Delivered: ${delivered}  |  Failed: ${failed}  |  ` +
      `No Contact Page: ${noForm}  |  CAPTCHA/Review: ${captcha}  |  Pending: ${pending}  |  Replied: ${replied}`;
    const kpiWrapped = doc.splitTextToSize(kpiLine, contentWidth);
    for (const line of kpiWrapped) {
      doc.text(line, margin, y);
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`Outreach deliverability yield: ${yieldPct}% (${delivered}/${totalProspects})`, margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Started: ${startedAtStr}    Finished: ${finishedAtStr}    Duration: ${durationStr}`, margin, y);
    y += 10;

    // ---- Audit breakdown table ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Target Website Audit Breakdown', margin, y);
    y += 7;

    if (auditLogs.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('No website audit records found for this campaign.', margin, y);
      y += 6;
    } else {
      // Columns: Domain | Final status | Time | Diagnostic details (wrapped)
      const colX = [margin, margin + 52, margin + 88, margin + 108];
      const colW = [52, 36, 20, contentWidth - 108];
      const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y - 4, contentWidth, 7, 'F');
        doc.text('Website Domain', colX[0], y);
        doc.text('Final Status', colX[1], y);
        doc.text('Time', colX[2], y);
        doc.text('Diagnostic Details', colX[3], y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      };
      drawHeader();
      for (const item of auditLogs) {
        const detail = safe(item.details || item.code);
        const detailLines = doc.splitTextToSize(detail, colW[3]);
        const rowHeight = Math.max(6, detailLines.length * 5);
        ensureSpace(rowHeight + 1);
        // Re-draw the header after a page break (y reset means header is missing).
        if (y === margin) drawHeader();
        doc.text(safe(item.domain), colX[0], y, { maxWidth: colW[0] });
        doc.text(safe(item.finalStatus), colX[1], y, { maxWidth: colW[1] });
        doc.text(safe(item.time), colX[2], y, { maxWidth: colW[2] });
        let dy = y;
        for (const line of detailLines) {
          doc.text(line, colX[3], dy);
          dy += 5;
        }
        y += rowHeight + 1;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 1, pageWidth - margin, y - 1);
      }
    }

    // ---- Footer ----
    ensureSpace(12);
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('ContactReachout Automated Form Outreach Intelligence System', margin, y);
    doc.text(`Report generated: ${new Date().toLocaleString('en-GB')}  •  User: ${accountEmail}`, margin, y + 5);

    // ---- Real file download (Blob + anchor, no popup) ----
    const fileName = `${safe(campaign.name).replace(/[^a-zA-Z0-9]/g, '_') || 'Campaign'}_Outreach_Report.pdf`;
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke after the download has had a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error while generating the PDF report.';
    alert(`Could not generate the PDF report: ${message}`);
    throw err;
  }
}
