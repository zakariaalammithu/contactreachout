/**
 * Client-side fire-and-forget recorder for integration test outcomes.
 * Detail pages call this after their own test action completes so the
 * API & Integrations Center hub can show a last-verified time. A
 * record failure must never break the test UX, so errors are swallowed.
 */
export function recordIntegrationTest(
  integration: 'stripe' | 'resend' | 'ai',
  ok: boolean,
): void {
  try {
    void fetch('/api/admin/integrations/test-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integration, ok }),
    }).catch(() => {});
  } catch {
    // Never break the test UX on a bookkeeping failure.
  }
}
