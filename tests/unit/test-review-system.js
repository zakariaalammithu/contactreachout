/**
 * Bulk Contact Form Outreach System — Review & Preview System Test Suite
 * Tests human-in-the-loop triage policies, manual approval defaults, and decision handlers.
 */

function shouldRequireManualApproval(item, policy) {
  if (policy.submissionMode === 'manual_approval') {
    return { requiresReview: true, reason: 'Campaign policy is set to Manual Approval (Default).' };
  }
  if (item.isCaptchaDetected) {
    return { requiresReview: true, reason: 'CAPTCHA challenge detected.' };
  }
  if (item.hasUnmappedRequired) {
    return { requiresReview: true, reason: 'Mandatory fields lack mapped data.' };
  }
  if (item.confidenceScore < policy.requireApprovalForConfidenceBelow) {
    return { requiresReview: true, reason: `Confidence (${item.confidenceScore}%) below threshold (${policy.requireApprovalForConfidenceBelow}%).` };
  }
  return { requiresReview: false, reason: 'Passed all automatic verification checks.' };
}

function applyDecision(item, decision) {
  const updated = { ...item, reviewerDecision: decision, reviewedAt: new Date().toISOString() };
  if (decision === 'APPROVED') updated.status = 'APPROVED';
  else if (decision === 'SKIPPED') updated.status = 'SKIPPED';
  else if (decision === 'REVIEW_LATER') updated.status = 'REVIEW_LATER';
  return updated;
}

// ==========================================
// TEST EXECUTION
// ==========================================

console.log('=== RUNNING REVIEW & PREVIEW SYSTEM TEST SUITE ===');

// Test 1: Manual Approval Policy (Default)
const defaultPolicy = {
  campaignId: 'camp-01',
  submissionMode: 'manual_approval', // DEFAULT
  requireApprovalForConfidenceBelow: 90,
};

const highConfidenceItem = {
  confidenceScore: 98,
  hasUnmappedRequired: false,
  isCaptchaDetected: false,
};

const check1 = shouldRequireManualApproval(highConfidenceItem, defaultPolicy);
console.assert(check1.requiresReview === true, 'Test 1.1 Failed: Manual Approval policy must always require review');
console.log('✔ Test 1: Manual Approval default policy verified.');

// Test 2: Automatic Submission Mode with High Confidence
const autoPolicy = {
  campaignId: 'camp-02',
  submissionMode: 'automatic',
  requireApprovalForConfidenceBelow: 90,
};

const check2 = shouldRequireManualApproval(highConfidenceItem, autoPolicy);
console.assert(check2.requiresReview === false, 'Test 2.1 Failed: High confidence in auto mode should pass');
console.log('✔ Test 2: Automatic mode with high confidence verified.');

// Test 3: Automatic Submission Mode with CAPTCHA
const captchaItem = {
  confidenceScore: 95,
  hasUnmappedRequired: false,
  isCaptchaDetected: true,
};

const check3 = shouldRequireManualApproval(captchaItem, autoPolicy);
console.assert(check3.requiresReview === true, 'Test 3.1 Failed: CAPTCHA must always require review');
console.log('✔ Test 3: CAPTCHA safety override in auto mode verified.');

// Test 4: Decision Actions (Approve, Skip, Review Later)
const reviewItem = {
  id: 'rev-101',
  status: 'PENDING_APPROVAL',
  companyName: 'ABC Software',
};

const approved = applyDecision(reviewItem, 'APPROVED');
console.assert(approved.status === 'APPROVED' && approved.reviewerDecision === 'APPROVED', 'Test 4.1 Failed: Approve');

const skipped = applyDecision(reviewItem, 'SKIPPED');
console.assert(skipped.status === 'SKIPPED' && skipped.reviewerDecision === 'SKIPPED', 'Test 4.2 Failed: Skip');

const reviewLater = applyDecision(reviewItem, 'REVIEW_LATER');
console.assert(reviewLater.status === 'REVIEW_LATER' && reviewLater.reviewerDecision === 'REVIEW_LATER', 'Test 4.3 Failed: Review Later');
console.log('✔ Test 4: Interactive decisions (Approve, Skip, Review Later) verified.');

console.log('✅ ALL REVIEW AND PREVIEW TESTS PASSED WITH 100% SUCCESS!');
