'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  CreditCard,
  FileText,
  Gift,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Plus,
  ScrollText,
  Search,
  Send,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';

type PreviewTab =
  | 'dashboard'
  | 'campaigns'
  | 'ai'
  | 'inbox'
  | 'crm'
  | 'usage'
  | 'billing'
  | 'profile'
  | 'referral';

const STATS = [
  { label: 'Available Credits', value: '5,250', icon: Wallet },
  { label: 'Active Campaigns', value: '3', icon: Activity },
  { label: 'Draft Campaigns', value: '2', icon: FileText },
  { label: 'Total Submissions', value: '128', icon: Send },
];

const ACTIVITY = [
  { day: 'Mon', delivered: 18, failed: 3 },
  { day: 'Tue', delivered: 24, failed: 2 },
  { day: 'Wed', delivered: 12, failed: 5 },
  { day: 'Thu', delivered: 28, failed: 4 },
  { day: 'Fri', delivered: 20, failed: 1 },
  { day: 'Sat', delivered: 15, failed: 2 },
  { day: 'Sun', delivered: 22, failed: 3 },
];

const DONUT = [
  { label: 'Delivered', value: 62, color: '#1DBF73' },
  { label: 'Failed', value: 23, color: '#fda4af' },
  { label: 'Needs review', value: 15, color: '#F59E0B' },
];

const PERFORMANCE = [
  { name: 'Q4 Outreach', delivered: 86, failed: 12, review: 6 },
  { name: 'Spring Push', delivered: 64, failed: 8, review: 4 },
  { name: 'Partner Drive', delivered: 42, failed: 5, review: 3 },
];

const CAMPAIGNS = [
  { name: 'Q4 Outreach', status: 'ACTIVE', prospects: 240, submitted: 98, progress: 41 },
  { name: 'Spring Push', status: 'PAUSED', prospects: 120, submitted: 76, progress: 63 },
  { name: 'Partner Drive', status: 'DRAFT', prospects: 85, submitted: 0, progress: 0 },
  { name: 'Holiday Blast', status: 'ACTIVE', prospects: 310, submitted: 154, progress: 50 },
  { name: 'Agency Pilot', status: 'REVIEW', prospects: 60, submitted: 12, progress: 20 },
];

const CONTACTS = [
  { name: 'Sarah Mitchell', company: 'Northstar Labs', website: 'northstarlabs.com', list: 'Website list', status: 'CONTACTED' },
  { name: 'David Chen', company: 'Bright Marketing', website: 'brightmarketing.example', list: 'Bulk search', status: 'UNCONTACTED' },
  { name: 'Amelia Ross', company: 'Innovate Studio', website: 'innovatestudio.example', list: 'Website list', status: 'REVIEW' },
  { name: 'James Carter', company: 'Growth Labs', website: 'growthlabs.example', list: 'Website list', status: 'CONTACTED' },
  { name: 'Priya Nair', company: 'DigitalBridge Co.', website: 'digitalbridge.example', list: 'Bulk search', status: 'UNCONTACTED' },
  { name: 'Tom Becker', company: 'Vertex Partners', website: 'vertexpartners.example', list: 'Website list', status: 'CONTACTED' },
];

const THREADS = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    company: 'Northstar Labs',
    campaign: 'Q4 Outreach',
    time: '2h ago',
    unread: true,
    snippet: 'Thanks for reaching out — yes, let us schedule a call…',
    body: 'Hi James, thanks for reaching out through our contact form. Your proposal looks relevant — could we schedule a brief call next week? Best, Sarah',
  },
  {
    id: 2,
    name: 'David Chen',
    company: 'Bright Marketing',
    campaign: 'Spring Push',
    time: 'Yesterday',
    unread: false,
    snippet: 'Please send more details about pricing…',
    body: 'Hi, please send more details about pricing and how the outreach volume works. Thanks, David',
  },
  {
    id: 3,
    name: 'Amelia Ross',
    company: 'Innovate Studio',
    campaign: 'Q4 Outreach',
    time: '2 days ago',
    unread: false,
    snippet: 'We are interested. What are the next steps?…',
    body: 'Hello, we are interested in your service. What are the next steps to get started? Regards, Amelia',
  },
];

const USAGE_HISTORY = [
  { date: '28 Oct 2026', activity: 'Campaign submission — Q4 Outreach', credits: '−4' },
  { date: '27 Oct 2026', activity: 'AI personalization — 12 drafts', credits: '−12' },
  { date: '26 Oct 2026', activity: 'Campaign submission — Spring Push', credits: '−8' },
  { date: '11 Oct 2026', activity: 'Monthly free credits reset', credits: '+100' },
];

const LEDGER = [
  { date: '15 Oct 2026', description: 'Monthly free credits', change: '+100', balance: '5,250' },
  { date: '02 Oct 2026', description: 'Credit purchase', change: '+5,000', balance: '5,150' },
  { date: '28 Sep 2026', description: 'Welcome bonus', change: '+150', balance: '150' },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-950 text-emerald-300 border-emerald-900',
    PAUSED: 'bg-blue-950 text-blue-300 border-blue-900',
    DRAFT: 'bg-amber-950 text-amber-300 border-amber-900',
    REVIEW: 'bg-purple-950 text-purple-300 border-purple-900',
    CONTACTED: 'bg-emerald-950 text-emerald-300 border-emerald-900',
    UNCONTACTED: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  };
  return map[status] || 'bg-zinc-900 text-zinc-400 border-zinc-800';
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm font-black text-zinc-100">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DashboardView() {
  const maxBar = Math.max(...ACTIVITY.map((d) => Math.max(d.delivered, d.failed)));
  let donutOffset = 25;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-blue-400">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
            </div>
            <p className="mt-3 text-2xl font-black text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 lg:col-span-3">
          <p className="text-sm font-black text-zinc-100">Campaign Activity</p>
          <p className="mt-1 text-xs text-zinc-400">Last 7 days of live processing.</p>
          <div className="mt-4 flex h-32 items-end gap-3">
            {ACTIVITY.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end justify-center gap-1">
                  <span
                    className="w-3 rounded-t bg-[#1DBF73]"
                    style={{ height: `${Math.round((d.delivered / maxBar) * 100)}%` }}
                    title={`Delivered ${d.delivered}`}
                  />
                  <span
                    className="w-3 rounded-t bg-[#fda4af]"
                    style={{ height: `${Math.round((d.failed / maxBar) * 100)}%` }}
                    title={`Failed ${d.failed}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-400">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-[11px] font-bold text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#1DBF73]" />Delivered</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fda4af]" />Failed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 lg:col-span-2">
          <p className="text-sm font-black text-zinc-100">Campaign Results</p>
          <p className="mt-1 text-xs text-zinc-400">Latest outcomes per prospect.</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                {DONUT.map((slice) => {
                  const offset = donutOffset;
                  donutOffset -= slice.value;
                  return (
                    <circle
                      key={slice.label}
                      cx="50"
                      cy="50"
                      r="34"
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="15"
                      pathLength={100}
                      strokeDasharray={`${slice.value} ${100 - slice.value}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-lg font-black leading-none text-zinc-100">128</p>
                  <p className="text-[9px] font-bold text-zinc-400">prospects</p>
                </div>
              </div>
            </div>
            <ul className="space-y-2 text-xs font-bold text-zinc-400">
              {DONUT.map((slice) => (
                <li key={slice.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                  {slice.label}
                  <span className="ml-auto text-zinc-100">{slice.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm font-black text-zinc-100">Recent Campaign Performance</p>
        <div className="mt-4 space-y-3">
          {PERFORMANCE.map((c) => {
            const total = c.delivered + c.failed + c.review;
            return (
              <div key={c.name} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-bold text-zinc-300">{c.name}</span>
                <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-zinc-900">
                  <span className="bg-[#1DBF73]" style={{ width: `${(c.delivered / total) * 100}%` }} />
                  <span className="bg-[#fda4af]" style={{ width: `${(c.failed / total) * 100}%` }} />
                  <span className="bg-[#F59E0B]" style={{ width: `${(c.review / total) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-xs font-bold text-zinc-400">{total} total</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CampaignsView() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-zinc-100">Campaigns</p>
          <p className="mt-1 text-xs text-zinc-400">Every campaign, its status, and its progress.</p>
        </div>
        <Link
          href="/campaigns/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0e6de4] px-3.5 py-2 text-xs font-black text-white hover:bg-[#0758bd]"
        >
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </Link>
      </div>
      <div className="mt-4 space-y-2">
        {CAMPAIGNS.map((c) => (
          <div key={c.name} className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-zinc-100">{c.name}</p>
              <p className="text-xs text-zinc-400">{c.prospects} prospects · {c.submitted} submitted</p>
            </div>
            <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-zinc-900 sm:block">
              <span className="block h-full bg-[#0e6de4]" style={{ width: `${c.progress}%` }} />
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusBadge(c.status)}`}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiView() {
  const [tone, setTone] = useState('Professional');
  return (
    <div className="space-y-4">
      <Card title="AI Personalization" subtitle="Guide the AI, then review every draft before it sends.">
        <div className="flex flex-wrap gap-2">
          {['Professional', 'Friendly', 'Concise'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              className={`rounded-full px-4 py-2 text-xs font-black transition-colors ${
                tone === t ? 'bg-[#0e6de4] text-white' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto self-center text-xs font-bold text-zinc-400">Tone: {tone}</span>
        </div>
        <p className="mt-4 rounded-xl bg-zinc-900 p-4 text-xs leading-6 text-zinc-400">
          Guidance: mention the prospect&apos;s industry and one recent public milestone. Keep it under 90
          words. Never invent company facts.
        </p>
        <div className="mt-4 rounded-xl border border-blue-900 bg-blue-950/50 p-4">
          <p className="text-xs font-black text-blue-400">AI draft preview — Partnership inquiry for Northstar Labs</p>
          <p className="mt-3 text-xs leading-6 text-zinc-300">
            Hello Northstar Labs team, I came across your work in cloud infrastructure and wanted to reach
            out about a relevant B2B collaboration. Would you be open to a brief conversation?
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/ai-personalization" className="rounded-lg bg-zinc-950 px-3 py-2 text-[10px] font-black text-blue-400">
              Review draft
            </Link>
            <Link href="/ai-personalization" className="rounded-lg bg-[#0e6de4] px-3 py-2 text-[10px] font-black text-white">
              Use in campaign
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function InboxView() {
  const [selectedId, setSelectedId] = useState(1);
  const selected = THREADS.find((t) => t.id === selectedId) || THREADS[0];
  return (
    <div className="space-y-4">
      <Card title="Inbox" subtitle="Forwarding replies to: james@millerconsulting.com — only campaign replies appear here.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {THREADS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  t.id === selectedId ? 'border-blue-900 bg-blue-950/50' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-zinc-100">{t.name}</p>
                  {t.unread && <span className="h-2 w-2 rounded-full bg-[#0e6de4]" />}
                  <span className="ml-auto text-[10px] font-bold text-zinc-400">{t.time}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">{t.company} · {t.campaign}</p>
                <p className="mt-1 truncate text-xs text-zinc-300">{t.snippet}</p>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-zinc-800 p-4">
            <p className="text-sm font-black text-zinc-100">{selected.name}</p>
            <p className="text-xs text-zinc-400">{selected.company} · {selected.campaign}</p>
            <p className="mt-3 text-xs leading-6 text-zinc-300">{selected.body}</p>
            <Link href="/inbox" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
              Open in Inbox <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CrmView() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = q
    ? CONTACTS.filter((l) => `${l.name} ${l.company} ${l.website}`.toLowerCase().includes(q))
    : CONTACTS;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total Contacts', '148'],
          ['Total Lists', '6'],
          ['Delivered', '86'],
          ['Pending', '42'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <Card title="CRM" subtitle="Every contact, its list, and its outreach status.">
        <div className="mb-4 flex justify-end">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-56 rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-xs font-bold text-zinc-100 placeholder:text-zinc-400 focus:border-[#0e6de4] focus:outline-none"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="py-2 pr-3 font-black">Contact</th>
                <th className="py-2 pr-3 font-black">Company</th>
                <th className="py-2 pr-3 font-black">Website</th>
                <th className="py-2 pr-3 font-black">List</th>
                <th className="py-2 font-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.website} className="border-b border-zinc-800/60 last:border-0">
                  <td className="py-3 pr-3 font-black text-zinc-100">{l.name}</td>
                  <td className="py-3 pr-3 text-zinc-300">{l.company}</td>
                  <td className="py-3 pr-3 text-zinc-400">{l.website}</td>
                  <td className="py-3 pr-3 text-zinc-400">{l.list}</td>
                  <td className="py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusBadge(l.status)}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center font-bold text-zinc-400">
                    No contacts match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Link href="/crm" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
          Open CRM <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

function UsageView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Credits Used', '128'],
          ['Messages Sent', '128'],
          ['Campaigns Run', '5'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <Card title="Usage & History" subtitle="Every credit movement, newest first.">
        <div className="space-y-2">
          {USAGE_HISTORY.map((h) => (
            <div key={h.activity} className="flex items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-zinc-100">{h.activity}</p>
                <p className="text-xs text-zinc-400">{h.date}</p>
              </div>
              <span className={`text-sm font-black ${h.credits.startsWith('+') ? 'text-emerald-400' : 'text-zinc-100'}`}>
                {h.credits}
              </span>
            </div>
          ))}
        </div>
        <Link href="/logs" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
          View full history <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

function BillingView() {
  return (
    <div className="space-y-4">
      <Card title="Billing & Credits" subtitle="Your wallet, at a glance.">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Total Available</p>
        </div>
        <p className="mt-2 text-4xl font-black text-zinc-100">5,250</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            ['Free Monthly', '100 / 100'],
            ['Paid', '5,000'],
            ['Bonus', '150'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-zinc-900 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
              <p className="mt-1 text-sm font-black text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Ledger" subtitle="Recent wallet transactions.">
        <div className="space-y-2">
          {LEDGER.map((t) => (
            <div key={`${t.date}-${t.description}`} className="flex items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-zinc-100">{t.description}</p>
                <p className="text-xs text-zinc-400">{t.date}</p>
              </div>
              <span className="text-sm font-black text-emerald-400">{t.change}</span>
              <span className="w-20 text-right text-xs font-bold text-zinc-400">{t.balance}</span>
            </div>
          ))}
        </div>
        <Link href="/credits" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
          Open Billing & Credits <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

function ProfileView() {
  return (
    <Card title="Profile" subtitle="Your sender identity — the name and reply address prospects see.">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#0e6de4] text-base font-black text-white">
          JM
        </span>
        <div>
          <p className="text-lg font-black text-zinc-100">James Miller</p>
          <p className="text-xs text-zinc-400">james@millerconsulting.com</p>
        </div>
        <span className="rounded-full border border-emerald-900 bg-emerald-950 px-3 py-1 text-[10px] font-black text-emerald-300">
          REPLY EMAIL VERIFIED
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ['Reply Email', 'james@millerconsulting.com'],
          ['Company', 'Miller Consulting'],
          ['Website', 'https://millerconsulting.com'],
          ['Account', 'Growth Plan'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-zinc-900 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="mt-1 truncate text-sm font-black text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
      <Link href="/profile" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
        Edit profile <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  );
}

function ReferralView() {
  const [copied, setCopied] = useState(false);
  const link = 'contactreachout.com/signup?ref=demo';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card title="Referral" subtitle="Share your link — you and your friend both earn credits.">
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-900 p-3">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100">{link}</span>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg bg-[#0e6de4] px-4 py-2 text-xs font-black text-white hover:bg-[#0758bd]"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ['Total Referrals', '12'],
            ['Credits Earned', '240'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zinc-800 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</p>
              <p className="mt-1 text-2xl font-black text-zinc-100">{value}</p>
            </div>
          ))}
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-xs leading-6 text-zinc-400">
          <li>Share your referral link with a friend.</li>
          <li>Your friend signs up and starts their first campaign.</li>
          <li>You both receive bonus credits.</li>
        </ol>
        <Link href="/referral" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-blue-400">
          Open Referral <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </div>
  );
}

// Same sections, order, and icons as the real app sidebar.
const NAV_SECTIONS: Array<{
  title: string;
  items: Array<{ id: PreviewTab; label: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { id: 'ai', label: 'AI Personalization', icon: Bot },
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'crm', label: 'CRM', icon: Users },
      { id: 'usage', label: 'Usage & History', icon: ScrollText },
    ],
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'billing', label: 'Billing & Credits', icon: CreditCard },
      { id: 'profile', label: 'Profile', icon: UserCircle },
      { id: 'referral', label: 'Referral', icon: Gift },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap((s) => s.items);

/**
 * Live dashboard preview on the home page. It mirrors the real app sidebar
 * (same sections, order, and icons) with sample data, because home visitors are
 * not logged in. Clicking a sidebar item switches the preview to that view;
 * Dashboard is the default. The standalone Leads tab was folded into CRM,
 * which is what the real sidebar shows.
 */
export function HomeDashboardPreview() {
  const [tab, setTab] = useState<PreviewTab>('dashboard');

  return (
    <section id="live-dashboard-preview" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-blue-400">Live dashboard preview</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-zinc-100 sm:text-5xl">
            See your outreach, live.
          </h2>
          <p className="mt-5 text-lg leading-8 text-zinc-400">
            The same dashboard, campaigns, and leads views from inside the app — try them below.
            Click a section on the left to switch the preview.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-zinc-800 bg-black shadow-2xl shadow-black/50">
          <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <span className="hidden rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-400 sm:block">
              contactreachout.com/dashboard
            </span>
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-950 px-3 py-1 text-[10px] font-black text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>

          <div className="flex flex-col lg:flex-row">
            <nav className="hidden w-56 shrink-0 flex-col gap-5 border-r border-zinc-800 p-3 lg:flex" aria-label="Preview sections">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    {section.title}
                  </p>
                  <div className="space-y-1">
                    {section.items.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                          tab === id
                            ? 'bg-[#0e6de4] text-white'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-auto px-3 pt-2 text-[10px] font-bold leading-5 text-zinc-500">
                Sample data.
                <br />
                Your live data appears after login.
              </p>
            </nav>

            <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 p-3 lg:hidden" aria-label="Preview sections">
              {ALL_NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition-colors ${
                    tab === id
                      ? 'bg-[#0e6de4] text-white'
                      : 'bg-zinc-900 text-zinc-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="min-w-0 flex-1 p-4 sm:p-5">
              {tab === 'dashboard' && <DashboardView />}
              {tab === 'campaigns' && <CampaignsView />}
              {tab === 'ai' && <AiView />}
              {tab === 'inbox' && <InboxView />}
              {tab === 'crm' && <CrmView />}
              {tab === 'usage' && <UsageView />}
              {tab === 'billing' && <BillingView />}
              {tab === 'profile' && <ProfileView />}
              {tab === 'referral' && <ReferralView />}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0e6de4] px-7 py-4 text-sm font-black text-white shadow-xl hover:bg-[#0758bd]"
          >
            Open your dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
