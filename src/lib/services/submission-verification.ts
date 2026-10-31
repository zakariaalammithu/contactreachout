// Pure check for whether a pipeline SUCCESS counts as a verified form
// submission (DELIVERED) in the campaign report.
//
// The discovery condition is deliberately wider than "fetch probing said
// FOUND": on Vercel, discovery runs fetch probing, which cannot verify
// client-rendered pages, so it returns NOT_FOUND for JS-rendered contact
// pages. The orchestrator then falls back to worker-based detection, and
// a worker that rendered a form on one of the lead's own candidate URLs
// has strictly stronger evidence than fetch probing — the candidate URLs
// come only from the lead's domain, so a selected form proves a real
// contact page exists. Requiring fetch-FOUND here made every
// worker-verified delivery to a JS-rendered site report FAILED (and
// deduct no credit) even though the message went out.
export function isVerifiedFormSubmission(input: {
  discovery?: { status?: string } | null;
  detection?: { hasContactForm?: boolean; selectedForm?: unknown } | null;
  mapping?: { status?: string } | null;
  submission?: { status?: string; successVerified?: boolean } | null;
}): boolean {
  const discoveryVerified =
    input.discovery?.status === 'FOUND' ||
    Boolean(input.detection?.hasContactForm && input.detection?.selectedForm);
  return (
    discoveryVerified &&
    Boolean(input.detection?.hasContactForm) &&
    (input.mapping?.status === 'READY_FOR_SUBMISSION' || input.mapping?.status === 'MAPPED') &&
    input.submission?.status === 'SUCCESS' &&
    input.submission?.successVerified === true
  );
}
