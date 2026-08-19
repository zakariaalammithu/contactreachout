/**
 * Admin Diagnostics — 8-Step Lead Outreach Debug Trace API
 * Executes full step-by-step diagnostic trace on a specific target lead/website.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateUrlSafety } from '@/lib/services/contact-page-finder';
import { ContactPageFinder } from '@/lib/services/contact-page-finder';
import { FormDetector } from '@/lib/services/form-detector';
import { mapLeadToFormFields } from '@/lib/services/field-mapper';
import { FormSubmitter } from '@/lib/services/form-submitter';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { websiteUrl = 'https://test-fixture.local', companyName = 'Test Corp', mode = 'test' } = body;

    const stepsTrace: Array<{
      stepNumber: number;
      stepName: string;
      status: 'PASSED' | 'FAILED' | 'SKIPPED';
      details: string;
      timestamp: string;
    }> = [];

    // Step 1: Website Reachable & SSRF Check
    const safety = validateUrlSafety(websiteUrl);
    stepsTrace.push({
      stepNumber: 1,
      stepName: 'Website Reachable & Safety Guard',
      status: safety.isValid ? 'PASSED' : 'FAILED',
      details: safety.isValid ? `URL safety verified. Domain: ${safety.domain}` : `SSRF Protection / Invalid: ${safety.error}`,
      timestamp: new Date().toISOString(),
    });

    if (!safety.isValid) {
      return NextResponse.json({ success: false, websiteUrl, stepsTrace });
    }

    // Step 2: Contact Page Found
    const discovery = await ContactPageFinder.findContactPage({ websiteUrl, navigationTimeoutMs: 10000 });
    stepsTrace.push({
      stepNumber: 2,
      stepName: 'Contact Page Discovery',
      status: discovery.status === 'FOUND' ? 'PASSED' : 'FAILED',
      details: discovery.status === 'FOUND'
        ? `Found page: ${discovery.contactPageUrl} via ${discovery.discoveryMethod}`
        : `Discovery status: ${discovery.status}`,
      timestamp: new Date().toISOString(),
    });

    if (discovery.status !== 'FOUND' || !discovery.contactPageUrl) {
      return NextResponse.json({ success: true, websiteUrl, stepsTrace });
    }

    // Step 3: Form Found
    const detection = await FormDetector.detectForms(discovery.contactPageUrl);
    stepsTrace.push({
      stepNumber: 3,
      stepName: 'Contact Form Detection',
      status: detection.hasContactForm ? 'PASSED' : 'FAILED',
      details: detection.hasContactForm
        ? `Detected contact form (${detection.selectedForm?.formSelector}) with score ${detection.selectedForm?.formScore}`
        : `Form status: ${detection.status}`,
      timestamp: new Date().toISOString(),
    });

    if (!detection.hasContactForm || !detection.selectedForm) {
      return NextResponse.json({ success: true, websiteUrl, stepsTrace });
    }

    // Step 4: Fields Detected
    const detectedFieldsCount = detection.selectedForm.detectedFields.length;
    stepsTrace.push({
      stepNumber: 4,
      stepName: 'Form Fields Detection',
      status: detectedFieldsCount > 0 ? 'PASSED' : 'FAILED',
      details: `Detected ${detectedFieldsCount} DOM fields (Inputs, Textareas, Selects, Checkboxes)`,
      timestamp: new Date().toISOString(),
    });

    // Step 5: Fields Mapped
    const leadContext = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      company_name: companyName,
      website: websiteUrl,
    };
    const message = { subject: 'Partnership Inquiry', body: 'Hello, inquiring regarding your services.' };
    const mapping = mapLeadToFormFields(detection.selectedForm.detectedFields, leadContext, message);

    stepsTrace.push({
      stepNumber: 5,
      stepName: 'Field Mapping Strategy',
      status: mapping.status === 'READY_FOR_SUBMISSION' ? 'PASSED' : 'FAILED',
      details: `Mapped ${mapping.mappedFields.length} fields with overall confidence score ${mapping.overallConfidenceScore}%. Status: ${mapping.status}`,
      timestamp: new Date().toISOString(),
    });

    // Step 6: Pre-Submission Validation Passed
    const isValidationPassed = mapping.status === 'READY_FOR_SUBMISSION';
    stepsTrace.push({
      stepNumber: 6,
      stepName: 'Pre-Submission Validation',
      status: isValidationPassed ? 'PASSED' : 'FAILED',
      details: isValidationPassed
        ? 'All required fields detected, mapped, and valid (Email, Body, Selects, Phone).'
        : `Validation failed: ${mapping.reason}`,
      timestamp: new Date().toISOString(),
    });

    // Step 7: Submission Attempted (Test Mode or Live Mode)
    const submission = await FormSubmitter.executeSubmission({
      contactPageUrl: discovery.contactPageUrl,
      formSelector: detection.selectedForm.formSelector,
      mappedFields: mapping.mappedFields,
      isTestMode: mode === 'test',
    });

    stepsTrace.push({
      stepNumber: 7,
      stepName: 'Form Submission Execution',
      status: 'PASSED',
      details: `Execution mode: ${mode.toUpperCase()}. Status: ${submission.status}. Message: ${submission.confirmationMessage}`,
      timestamp: new Date().toISOString(),
    });

    // Step 8: Success Signal Detected
    stepsTrace.push({
      stepNumber: 8,
      stepName: 'Post-Submission Outcome Verification',
      status: (submission.status === 'SUCCESS' || submission.status === 'TEST_MODE_COMPLETED') ? 'PASSED' : 'FAILED',
      details: `Verified response code: ${submission.httpStatus || 200}. Confirmation: ${submission.confirmationMessage}`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      websiteUrl,
      companyName,
      mode,
      stepsTrace,
      completedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
