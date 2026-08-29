/**
 * Bulk Contact Form Outreach System — Master Verification Test Runner
 * Executes all unit & integration test suites in sequence.
 */

const { execSync } = require('child_process');

const testSuites = [
  'tests/unit/run-tests.js',
  'tests/unit/test-contact-finder.js',
  'tests/unit/test-form-detector.js',
  'tests/unit/test-field-mapper.js',
  'tests/unit/test-review-system.js',
  'tests/unit/test-contact-form-submitter.js',
  'tests/unit/test-production-submitter.js',
  'tests/unit/test-queue-system.js',
  'tests/unit/test-results-and-sheets.js',
  'tests/unit/test-ai-personalization.js',
  'tests/unit/test-website-analyzer.js',
  'tests/unit/test-security-audit.js',
  'tests/browser-fixtures/test-html-fixtures-runner.js',
  'tests/local-environment/run-10-sites-test.js',
  'tests/unit/test-campaign-controls.js',
  'tests/unit/test-processing-controls.js',
  'tests/unit/test-admin-system.js',
  'tests/unit/test-scrambled-columns.js',
  'tests/unit/test-named-lists-and-ai-fields.js',
  'tests/unit/test-e2e-pipeline.js',
];

console.log('====================================================');
console.log('🚀 RUNNING COMPLETE MASTER REGRESSION SUITE (10 TEST SUITES)');
console.log('====================================================\n');

let allPassed = true;

for (const suite of testSuites) {
  try {
    console.log(`▶ Running: ${suite}...`);
    const output = execSync(`node "${suite}"`, { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    console.error(`❌ Suite Failed: ${suite}`);
    console.error(err.stdout || err.message);
    allPassed = false;
  }
}

console.log('====================================================');
if (allPassed) {
  console.log('🏆 ALL 10 MASTER TEST SUITES PASSED WITH 100% SUCCESS!');
} else {
  console.error('❌ SOME TEST SUITES FAILED.');
  process.exit(1);
}
console.log('====================================================');
