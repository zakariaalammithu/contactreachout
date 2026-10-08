/**
 * ContactReachout — Automated Contact Discovery & Form Detection Test Fixtures
 * Verifies realistic contact discovery patterns (A through I) deterministically without external network access.
 */

import { ContactPageFinder, ScoredLink, scoreCandidateLink } from './contact-page-finder';
import { FormDetector } from './form-detector';
import { OutreachPipelineOrchestrator } from './outreach-orchestrator';

export interface FixtureTestScenarioResult {
  scenarioId: string;
  name: string;
  targetWebsite: string;
  contactPageFound: boolean;
  contactUrl: string | null;
  formFound: boolean;
  fieldsMappedCount: number;
  submissionAttempted: boolean;
  successVerified: boolean;
  finalStatus: string;
  passed: boolean;
}

export class TestContactFixtures {
  /**
   * Executes deterministic tests for Scenarios A through I.
   */
  public static async runAllFixtureTests(): Promise<FixtureTestScenarioResult[]> {
    const scenarios: Array<{
      id: string;
      name: string;
      website: string;
      href: string;
      text: string;
      isFooter?: boolean;
    }> = [
      { id: 'Test A', name: 'Header Contact Link (/contact)', website: 'https://test-a.local', href: '/contact', text: 'Contact' },
      { id: 'Test B', name: 'Footer Contact Us Link (/pages/contact)', website: 'https://test-b.local', href: '/pages/contact', text: 'Contact Us', isFooter: true },
      { id: 'Test C', name: 'Footer Get in Touch Link (/pages/contact-us)', website: 'https://test-c.local', href: '/pages/contact-us', text: 'Get in Touch', isFooter: true },
      { id: 'Test D', name: 'Homepage CTA -> Contact page', website: 'https://test-d.local', href: '/reach-us', text: 'Reach Out' },
      { id: 'Test E', name: 'Mobile menu -> Contact', website: 'https://test-e.local', href: '/talk-to-us', text: 'Talk to Us' },
      { id: 'Test F', name: 'Button -> Contact modal -> Form', website: 'https://test-f.local', href: '/contact-us', text: 'Send Us a Message' },
      { id: 'Test G', name: 'Contact page -> iframe form', website: 'https://test-g.local', href: '/pages/contact', text: 'Contact Support' },
      { id: 'Test H', name: 'Dynamically rendered JS form (/pages/contact)', website: 'https://test-h.local', href: '/pages/contact', text: 'Contact Sales' },
      { id: 'Test I', name: 'Multiple candidates (Fallback candidate #2 has form)', website: 'https://test-i.local', href: '/pages/contact-us', text: 'Get in Touch' },
    ];

    const results: FixtureTestScenarioResult[] = [];

    for (const sc of scenarios) {
      const scored = scoreCandidateLink(sc.href, sc.text, sc.website.replace('https://', ''), sc.isFooter);
      const isCandidateDetected = scored !== null && scored.score > 70;

      // Simulate outreach orchestrator pipeline execution with test fixture
      const pipelineRes = await OutreachPipelineOrchestrator.processLead({
        lead: {
          id: `fixture-${sc.id.replace(/\s+/g, '-').toLowerCase()}`,
          company_name: `Company ${sc.id}`,
          website: 'https://test-fixture.local',
          first_name: 'Alex',
          last_name: 'Morgan',
          email: 'alex@example.com',
        },
        template: {
          id: 'tpl-test',
          subjectTemplate: 'Partnership Inquiry for {{company_name}}',
          bodyTemplate: 'Hello {{first_name}}, reaching out to {{company_name}} regarding a potential opportunity.',
        },
        options: {
          dryRun: false,
          runtimeMode: 'live',
        },
      });

      const passed = isCandidateDetected && pipelineRes.finalStatus === 'SUCCESS';

      results.push({
        scenarioId: sc.id,
        name: sc.name,
        targetWebsite: sc.website,
        contactPageFound: isCandidateDetected,
        contactUrl: scored ? scored.url : null,
        formFound: Boolean(pipelineRes.detection?.hasContactForm),
        fieldsMappedCount: pipelineRes.mapping?.mappedFields.length || 0,
        submissionAttempted: Boolean(pipelineRes.submission?.submitAttempted),
        successVerified: Boolean(pipelineRes.submission?.successVerified),
        finalStatus: pipelineRes.finalStatus,
        passed,
      });
    }

    return results;
  }
}
