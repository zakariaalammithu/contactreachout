/**
 * Global sending-pause flag (emergency killswitch).
 *
 * In-memory only: the flag resets when the server instance recycles,
 * and other serverless instances do not see a toggle issued elsewhere.
 * The admin UI states this limit honestly.
 *
 * This module is intentionally dependency-free so the campaign process
 * route can import it and enforce the flag in the send path. Enforcement
 * is wired: POST /api/campaigns/process returns a non-terminal SCHEDULED
 * deferral (code SENDING_PAUSED) for live sends while paused; dry-run
 * previews pass through. Limits remain: per-instance memory only.
 */

let sendingPaused = false;

export function isSendingPaused(): boolean {
  return sendingPaused;
}

export function setSendingPaused(paused: boolean): boolean {
  sendingPaused = paused;
  return sendingPaused;
}
