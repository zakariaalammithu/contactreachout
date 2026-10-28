/**
 * ContactReachout website knowledge base for the support chatbot.
 *
 * Every entry is taken from the public website itself (Home, Pricing,
 * Features, How it works, Help FAQ, Contact) or from verified implemented
 * app behaviour. The chatbot answers ONLY from these entries (or from an
 * AI provider given these entries as context) and never invents features,
 * prices, or policies. Internal addresses and credentials are never listed
 * here: the public support contact is hello@contactreachout.com.
 */

export interface KnowledgeEntry {
  id: string;
  /** Lowercase words/phrases that indicate this entry. Multi-word phrases score higher. */
  keywords: string[];
  answer: string;
  /** Public page where the visitor can read more. */
  source: string;
}

export const CHATBOT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    answer:
      'Hello! I can help with ContactReachout — bulk website contact-form outreach, AI personalization, campaigns, credits and pricing, Gmail replies, and referrals. What would you like to know?',
    source: '/help',
  },
  {
    id: 'what-is',
    keywords: ['what is contactreachout', 'what does contactreachout do', 'about contactreachout', 'what is this', 'what do you do'],
    answer:
      'ContactReachout is a B2B outreach workspace for bulk website contact-form submissions and AI Personalization. You upload lead lists, find suitable contact forms on company websites, prepare relevant messages, review them, submit approved outreach, and track verifiable outcomes. It does not send email campaigns — outreach goes through each website’s own contact form.',
    source: '/',
  },
  {
    id: 'not-email',
    keywords: ['email campaign', 'bulk email', 'cold email', 'send email', 'email marketing', 'mail campaign'],
    answer:
      'ContactReachout does not send email campaigns. It finds and interacts with website contact forms and submits your personalized message using the fields available on each website. Gmail is only used separately for receiving and replying to campaign replies in your Inbox.',
    source: '/help',
  },
  {
    id: 'how-it-works',
    keywords: ['how does it work', 'how it works', 'how to use', 'getting started', 'get started', 'steps', 'workflow', 'process'],
    answer:
      'How it works: 1) Sign up and open your dashboard. 2) Import your lead list (CSV or XLSX). 3) Create a campaign and select your lead list. 4) ContactReachout finds suitable website contact forms. 5) Personalize messages with AI (paid plans) or templates. 6) Review and approve every message. 7) Start submission and track each result in Submissions or Usage & History.',
    source: '/how-it-works',
  },
  {
    id: 'signup',
    keywords: ['sign up', 'signup', 'create account', 'register', 'join', 'free trial', 'no credit card'],
    answer:
      'You can start free with no credit card required: sign up, and the Free plan gives you 100 credits per month. Open your dashboard right after signup to import leads and create your first campaign.',
    source: '/signup',
  },
  {
    id: 'campaigns',
    keywords: ['campaign', 'create campaign', 'start campaign', 'new campaign', 'draft campaign', 'save draft', 'pause campaign', 'resume campaign', 'manage campaign'],
    answer:
      'Create a campaign, import a CSV or Excel lead list, map the available fields, find suitable website contact forms, configure your message and optional AI Personalization, review the messages, then start processing and track each result. You can save a campaign as a draft at any time with Save Draft, and Pause, Resume, or Edit it from the Campaigns page depending on its current status.',
    source: '/campaigns',
  },
  {
    id: 'form-fields',
    keywords: ['form field', 'fields', 'different forms', 'website form', 'contact page', 'subject field', 'dropdown'],
    answer:
      'Because every website uses different contact forms, ContactReachout detects the available fields — such as name, email, subject, message, dropdowns, and other supported fields — before submission. Optional fields like Subject are submitted only when the target website supports them.',
    source: '/help',
  },
  {
    id: 'ai-personalization',
    keywords: ['ai personalization', 'personalization', 'personalized message', 'personalise', 'ai draft', 'ai message', 'ai write'],
    answer:
      'AI Personalization uses lead fields, available company website information, your offer, goal, tone, message length, and custom instructions to draft a distinct outreach message for each prospect. You can edit and approve every message before a campaign starts. It is available only on paid plans — Free users cannot use it.',
    source: '/ai-personalization',
  },
  {
    id: 'own-ai-key',
    keywords: ['own openai', 'my openai', 'own api key', 'api key free plan', 'bring your own key'],
    answer:
      'Paid users can use ContactReachout’s configured AI provider or, where supported, connect their own OpenAI API key from Settings. A paid plan is required — your own OpenAI API key does not bypass the Free plan restriction, so it cannot be used on the Free plan.',
    source: '/help',
  },
  {
    id: 'edit-approve',
    keywords: ['edit message', 'review message', 'approve message', 'edit ai', 'review draft', 'approve draft', 'change message'],
    answer:
      'Yes. After generation, review prospects one by one, edit any message, save changes, and approve the final version. The campaign uses the approved or manually edited message rather than silently replacing it.',
    source: '/help',
  },
  {
    id: 'import-leads',
    keywords: ['import lead', 'upload lead', 'lead list', 'csv', 'excel', 'xlsx', 'spreadsheet', 'upload file'],
    answer:
      'Click Import Leads File in the dashboard header or Lead Lists section, choose your CSV or XLSX file, map your spreadsheet columns (company, website, email, and other fields), and confirm the import. Then use the mapped company and contact information in a campaign.',
    source: '/leads',
  },
  {
    id: 'credits-used',
    keywords: ['credit', 'credits', 'how many credits', 'credit cost', 'charge per', 'deduct', 'used'],
    answer:
      '1 credit is consumed per successful eligible contact-form submission. Failed, blocked, or unavailable outcomes charge 0 credits — unreachable sites cost nothing. Free accounts receive 100 credits per month. AI Personalization uses 0 credits on paid plans and is unavailable on the Free plan. See your balance in Usage & Credits.',
    source: '/pricing',
  },
  {
    id: 'pricing',
    keywords: ['pricing', 'price', 'cost', 'plan', 'plans', 'much', 'pay', 'subscription', 'billing', 'monthly', 'yearly', 'annual', 'cheap', 'package'],
    answer:
      'Plans (monthly billing): Free — 100 credits/month, $0. Starter — 5,000 credits/month, $50. Growth — 10,000 credits/month, $99. Agency — 100,000 credits/month, $199. A 300,000 credits/month promotional package is $299. Choose annual billing to save 20%, with no hidden fees and transparent Stripe checkout. You can also estimate any volume up to 300,000 credits with the calculator on the Pricing page.',
    source: '/pricing',
  },
  {
    id: 'buy-credits',
    keywords: ['buy credit', 'purchase credit', 'top up', 'add credit', 'upgrade', 'upgrade plan'],
    answer:
      'Open Usage & Credits from your dashboard sidebar or visit the Pricing page to select a plan or top up your credit balance. Upgrading to a paid plan also unlocks AI Personalization.',
    source: '/pricing',
  },
  {
    id: 'results',
    keywords: ['result', 'submission result', 'track', 'tracking', 'outcome', 'proof', 'screenshot', 'report', 'status'],
    answer:
      'Open Submissions or Usage & History from your dashboard to view detailed pre/post submission logs and status breakdowns. Credits are deducted strictly on successful form submissions, and successful submissions come with screenshot proof.',
    source: '/logs',
  },
  {
    id: 'inbox-replies',
    keywords: ['inbox', 'repl', 'gmail reply', 'campaign reply', 'reply from', 'message reply'],
    answer:
      'Your Inbox shows only replies to your ContactReachout campaign messages — not personal mail. You can reply from the Inbox, and replies also appear in your personal Gmail, so you can answer from either place.',
    source: '/inbox',
  },
  {
    id: 'gmail-connect',
    keywords: ['connect gmail', 'gmail connect', 'gmail mailbox', 'add gmail', 'link gmail', 'gmail setup'],
    answer:
      'Sign in, open Profile, stay on Profile & Contact Settings, then use Email Accounts and choose Connect Gmail. Google will show the requested Gmail read-only and send permissions before you approve the connection. ContactReachout only completes the connection after Google returns to the application callback.',
    source: '/profile',
  },
  {
    id: 'gmail-permissions',
    keywords: ['gmail permission', 'gmail read', 'gmail send', 'why gmail', 'google permission', 'gmail access'],
    answer:
      'The Gmail connection requests read-only access so ContactReachout can synchronize inbox replies, and send access so you can send a reply from the selected connected mailbox. The connection is optional and is separate from website contact-form campaign submissions.',
    source: '/help',
  },
  {
    id: 'gmail-disconnect',
    keywords: ['disconnect gmail', 'remove gmail', 'unlink gmail', 'revoke gmail'],
    answer:
      'Open Profile, then Email Accounts, and choose Disconnect beside the connected mailbox. This disables the mailbox connection in ContactReachout. To also revoke the app’s Google-account permission, use the Google Account third-party access controls.',
    source: '/profile',
  },
  {
    id: 'profile',
    keywords: ['profile', 'update profile', 'change password', 'account setting', 'my account', 'contact detail'],
    answer:
      'Open Profile from the account user menu in your dashboard sidebar to update your contact details or password, and to manage your connected email accounts.',
    source: '/profile',
  },
  {
    id: 'support-contact',
    keywords: ['support', 'contact support', 'help', 'contact us', 'human', 'agent', 'talk to', 'email support', 'customer service'],
    answer:
      'You can reach the ContactReachout team at hello@contactreachout.com, or use the Contact page on this website. The Help page also answers the most common questions about campaigns, credits, Gmail, and referrals.',
    source: '/contact',
  },
  {
    id: 'referral',
    keywords: ['referral', 'refer', 'invite', 'bonus credit', 'referral program', 'refer friend', 'earn credit'],
    answer:
      'Share your unique referral link with someone new to ContactReachout. When they sign up through your link and complete email verification, they receive 50 one-time bonus credits and you receive 100 one-time bonus credits. Self-referrals and duplicate referral activity are not eligible for rewards.',
    source: '/referral',
  },
  {
    id: 'safety',
    keywords: ['safety', 'safeguard', 'captcha', 'bot protection', 'blocked', 'security challenge', 'spam', 'safe'],
    answer:
      'ContactReachout applies safeguards on every submission: it checks for CAPTCHA and bot protection, and uncertain cases go to review instead of being sent blindly. You can also set campaigns to stop on a security challenge, pause after consecutive failures, and review uncertain outcomes before anything is submitted.',
    source: '/help',
  },
  {
    id: 'troubleshoot-campaign',
    keywords: ['campaign not start', 'not starting', 'pending campaign', 'campaign stuck', 'campaign fail', 'campaign error'],
    answer:
      'If a campaign stays pending or draft, check its status, the selected lead list count, your available credit balance, and the required campaign fields. Make sure your lead list is active, credits are available, and the required sender details are completed.',
    source: '/help',
  },
  {
    id: 'troubleshoot-import',
    keywords: ['import fail', 'import issue', 'upload fail', 'column', 'mapping', 'file fail'],
    answer:
      'If a file import fails or columns do not map, check the file format (.csv or .xlsx), the required email/website columns, and the header column mapping. Verify your spreadsheet column headers and re-upload via the Import Leads dialog.',
    source: '/help',
  },
  {
    id: 'troubleshoot-login',
    keywords: ['login', 'log in', 'sign in', 'password forgot', 'cannot login', 'access account', 'locked out'],
    answer:
      'If you cannot log in, it is usually incorrect credentials, an expired session, or an administrative restriction. Use the standard login page, or email hello@contactreachout.com for account access recovery.',
    source: '/login',
  },
  {
    id: 'features',
    keywords: ['feature', 'what can i do', 'dashboard', 'tool', 'service', 'services', 'benefit'],
    answer:
      'The dashboard brings campaigns, lead lists, contact-form discovery, AI Personalization, message review, submission results, inbox replies, templates, credits, settings, and review controls together in one workspace. Main services: bulk contact-form submission and AI personalization, with human review and campaign safeguards built in.',
    source: '/features',
  },
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could',
  'how', 'what', 'why', 'when', 'where', 'who', 'which', 'i', 'you', 'we', 'my', 'your',
  'to', 'of', 'in', 'on', 'for', 'with', 'and', 'or', 'me', 'it', 'this', 'that', 'please',
  'tell', 'give', 'know', 'about', 'want', 'need', 'get', 'doesnt', 'dont', 'isnt',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreEntry(entry: KnowledgeEntry, normalizedQuestion: string): number {
  const words = new Set(normalizedQuestion.split(' ').filter(Boolean));
  let score = 0;
  for (const raw of entry.keywords) {
    const keyword = normalize(raw);
    if (!keyword) continue;
    if (keyword.includes(' ')) {
      if (normalizedQuestion.includes(keyword)) score += 3;
    } else if (!STOPWORDS.has(keyword) && words.has(keyword)) {
      score += 1;
    }
  }
  return score;
}

/** Best website-knowledge answer for a question, or null when nothing matches. */
export function findKnowledgeAnswer(question: string): { answer: string; source: string; id: string } | null {
  const normalized = normalize(question);
  if (!normalized) return null;
  const wordCount = normalized.split(' ').filter(Boolean).length;
  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of CHATBOT_KNOWLEDGE) {
    const score = scoreEntry(entry, normalized);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  if (!best) return null;
  // A single generic word only counts for very short questions ("pricing?").
  if (best.score < 2 && wordCount > 3) return null;
  return { answer: best.entry.answer, source: best.entry.source, id: best.entry.id };
}

/** Top N knowledge entries, for AI-provider context. */
export function findTopKnowledge(
  question: string,
  limit = 3
): Array<{ answer: string; source: string; id: string }> {
  const normalized = normalize(question);
  if (!normalized) return [];
  return CHATBOT_KNOWLEDGE.map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({ answer: item.entry.answer, source: item.entry.source, id: item.entry.id }));
}
