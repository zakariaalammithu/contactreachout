import { Bot, CheckCircle2, FileSpreadsheet, Gauge, Globe2, Layers3, Mail, MessageSquareText, Minus, Send, ShieldCheck, Sparkles, UploadCloud, Webhook } from 'lucide-react';

const connections = [
  { name: 'CSV & Excel', detail: 'Lead import', icon: FileSpreadsheet },
  { name: 'Google Sheets', detail: 'Connected data', icon: Layers3 },
  { name: 'OpenAI', detail: 'AI personalization', icon: Sparkles },
  { name: 'Anthropic', detail: 'AI personalization', icon: Bot },
  { name: 'Webhooks', detail: 'Workflow events', icon: Webhook },
  { name: 'Results export', detail: 'Campaign reporting', icon: Gauge },
];

const outreachProfiles = [
  { name: 'Austin Smith', image: '/client-reviews/austin-smith.png' },
  { name: 'Emily Davidson', image: '/client-reviews/emily-davidson.png' },
  { name: 'Michael Kokernak', image: '/client-reviews/michael-kokernak.jpg' },
  { name: 'Dr. Bill Bradford', image: '/client-reviews/bill-bradford.jpg' },
  { name: 'Felix Dragoi', image: '/client-reviews/felix-dragoi.jpg' },
  { name: 'Bruce Dinger', image: '/client-reviews/bruce-dinger.jpg' },
  { name: 'Kotaiba Alhaj', image: '/client-reviews/kotaiba-alhaj.jpg' },
  { name: 'Michael Jessimy', image: '/client-reviews/michael-jessimy.jpg' },
  { name: 'Misti Morgenstern', image: '/client-reviews/misti-morgenstern.jpg' },
  { name: 'Paola Marinone', image: '/client-reviews/paola-marinone.jpg' },
];

const homeFaqs = [
  { question: 'What does ContactReachout automate?', answer: 'ContactReachout helps teams upload named lead lists, find suitable website contact pages, prepare campaign messages, process contact-form outreach with safeguards, and track verifiable results.' },
  { question: 'How does AI personalization work?', answer: 'The AI uses the lead fields and campaign guidance you provide to draft a relevant message. You can review the campaign configuration before processing, and the system does not need to invent company facts.' },
  { question: 'How are credits used?', answer: 'A successful website submission uses 2 credits. Optional AI personalization uses 1 additional credit. Current plan allowances are shown on the Pricing page.' },
  { question: 'Can I pause or review a campaign?', answer: 'Yes. Campaign controls and per-lead states help you pause work, review outcomes, and keep submission history connected to the original lead list.' },
  { question: 'Which lead-list formats are supported?', answer: 'The campaign workflow is designed for CSV and Excel lead lists. You can map the available company and contact fields before starting outreach.' },
  { question: 'Does ContactReachout guarantee every website can be submitted?', answer: 'No. Some websites have no suitable contact form, use CAPTCHA, block automation, or require manual review. ContactReachout records these outcomes instead of claiming an unverified submission.' },
];

export function HomeProductSections() {
  return (
    <>
      <section className="overflow-hidden bg-[#f4f7ff] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:px-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black text-blue-600">Scalable campaign capacity</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">Every outreach profile in one clear workspace.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">A visual campaign preview for organizing contact-form outreach, lead queues and verified results.</p>
          </div>

          <div className="relative mx-auto mt-14 max-w-6xl overflow-hidden rounded-[2.5rem] border border-blue-100 bg-gradient-to-b from-[#f8fbff] via-white to-[#f4f7ff] px-4 pb-6 pt-10 shadow-[0_30px_90px_rgba(37,99,235,.12)] sm:px-8 sm:pb-10 sm:pt-12">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,.18),transparent_68%)]" />
            <div className="relative text-center">
              <p className="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Campaign workspace preview</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Sample data · Your profiles · Shared campaigns</p>
            </div>

            <div className="relative mx-auto mt-7 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {outreachProfiles.slice(0, 6).map((profile, index) => (
                <div key={profile.name} className="flex items-center justify-between rounded-full border border-blue-100 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(37,99,235,.08)]">
                  <div className="flex min-w-0 items-center gap-2.5"><img src={profile.image} alt={`${profile.name} profile`} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-50" /><div className="min-w-0"><p className="truncate text-[11px] font-black text-slate-950">{profile.name}</p><p className="truncate text-[9px] font-semibold text-slate-400">Campaign profile</p></div></div>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600">{index % 2 === 0 ? '↗' : '✓'}</span>
                </div>
              ))}
            </div>

            <div className="relative mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-3">
              {outreachProfiles.slice(6).map((profile) => (
                <div key={profile.name} className="flex min-w-[220px] items-center justify-between rounded-full border border-blue-100 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(37,99,235,.08)]">
                  <div className="flex min-w-0 items-center gap-2.5"><img src={profile.image} alt={`${profile.name} profile`} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-50" /><div className="min-w-0"><p className="truncate text-[11px] font-black text-slate-950">{profile.name}</p><p className="truncate text-[9px] font-semibold text-slate-400">Campaign profile</p></div></div>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-black text-blue-600">✓</span>
                </div>
              ))}
            </div>

            <div className="relative mt-16 rounded-[2rem] border border-blue-100 bg-white/80 p-3 shadow-inner sm:p-5">
              <div className="absolute -top-9 left-1/2 z-10 w-[min(90%,310px)] -translate-x-1/2 rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-2xl">
                <div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Processed leads</p><p className="mt-1 text-3xl font-black">2,640</p></div><div className="text-right"><p className="text-[9px] text-slate-400">Campaign status</p><p className="mt-1 text-sm font-black text-blue-300">In progress</p></div></div>
              </div>
              <div className="grid grid-cols-6 gap-2 pt-8 sm:grid-cols-10 sm:gap-3">
                {Array.from({ length: 40 }).map((_, index) => {
                  const profile = outreachProfiles.find((__, profileIndex) => [1, 4, 7, 10, 14, 19, 23, 28, 33, 37][profileIndex] === index);
                  return <div key={index} className="aspect-square rounded-xl border border-blue-50 bg-[#f8fbff] p-1 shadow-sm">{profile ? <img src={profile.image} alt="Sample campaign profile" className="h-full w-full rounded-lg object-cover" /> : null}</div>;
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#f4f7ff] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:px-14">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-blue-600">How it works</p><h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">From lead list to tracked contact-form outreach.</h2><p className="mt-5 text-lg leading-8 text-slate-600">One connected workflow keeps the core bulk-submission process clear and reviewable.</p></div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: UploadCloud, step: '01', title: 'Upload Leads', text: 'Import a CSV or Excel lead list and map the available fields.' },
              { icon: Globe2, step: '02', title: 'Find Contact Forms', text: 'Locate suitable company contact pages and identify review blockers.' },
              { icon: Sparkles, step: '03', title: 'AI Personalize', text: 'Create relevant drafts from your lead context and campaign guidance.' },
              { icon: Gauge, step: '04', title: 'Submit & Track', text: 'Process approved outreach and record each verifiable outcome.' },
            ].map(({ icon: Icon, step, title, text }, index) => <article key={title} className="relative rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white"><Icon className="h-6 w-6" /></span><span className="text-xs font-black text-blue-300">{step}</span></div><h3 className="mt-6 text-xl font-black text-slate-950">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>{index < 3 && <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 place-items-center rounded-full border border-blue-100 bg-white text-blue-500 lg:grid">→</span>}</article>)}
          </div>
        </div>
      </section>

      <section id="integrations" className="overflow-hidden bg-[#f4f7ff] px-4 py-6 text-slate-950 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:px-14">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-blue-600">Connected workflow</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Integrates with the tools your outreach already uses.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Bring lead data in, personalize it with your configured AI provider and move verified outcomes into the rest of your workflow.</p></div>
          <div className="relative mx-auto mt-14 max-w-5xl rounded-[2rem] border border-blue-100 bg-white p-6 shadow-[0_24px_70px_rgba(37,99,235,.10)] sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(59,130,246,.16)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">{connections.slice(0, 3).map(({ name, detail, icon: Icon }) => <div key={name} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#f8fbff] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-600"><Icon className="h-5 w-5" /></span><div><p className="font-extrabold">{name}</p><p className="text-xs text-slate-500">{detail}</p></div></div>)}</div>
              <div className="relative mx-auto grid h-44 w-44 place-items-center rounded-full border border-blue-200 bg-blue-50 shadow-[0_0_80px_rgba(59,130,246,.18)]"><div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-500 shadow-xl"><img src="/logo-128.png" alt="ContactReachout" width="64" height="64" className="h-16 w-16 object-contain" /></div></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">{connections.slice(3).map(({ name, detail, icon: Icon }) => <div key={name} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#f8fbff] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-600"><Icon className="h-5 w-5" /></span><div><p className="font-extrabold">{name}</p><p className="text-xs text-slate-500">{detail}</p></div></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-4 my-6 rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:mx-6 sm:px-10 sm:py-20 xl:mx-auto xl:max-w-7xl xl:px-14">
        <div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-blue-600">Personalization that earns attention</p><h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Made to convert, not just connect.</h2><p className="mt-5 text-lg leading-8 text-slate-600">Turn campaign context into relevant drafts, keep control before submission and measure every verifiable outcome.</p></div>
          <div className="mt-14 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-xl shadow-blue-100/60 sm:p-8"><div className="flex items-center justify-between border-b border-slate-100 pb-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-700"><MessageSquareText className="h-5 w-5" /></span><div><p className="font-black">Before vs after AI personalization</p><p className="text-xs text-slate-500">Demo message preview</p></div></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Reviewable</span></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600"><p className="text-xs font-black uppercase tracking-[.14em] text-slate-400">Before</p><p className="mt-3">Hello, I wanted to tell you about our service. Are you available for a call?</p></div><div className="rounded-2xl border border-blue-200 bg-[#f8fbff] p-5 text-sm leading-7 text-slate-600"><p className="text-xs font-black uppercase tracking-[.14em] text-blue-600">After AI personalization</p><p className="mt-3">Hi <strong className="text-blue-700">{'{first_name}'}</strong>, I noticed <strong className="text-slate-900">{'{company}'}</strong> works in <strong className="text-slate-900">{'{industry}'}</strong>. I prepared a concise idea based on that context—would it be useful to share?</p></div></div><div className="mt-5 flex flex-wrap gap-2">{['Company context', 'Campaign guidance', 'Custom variables'].map(item => <span key={item} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{item}</span>)}</div></div>
            <div className="grid gap-4">{[{ icon: Sparkles, title: 'Relevant drafts', text: 'Generate messages from campaign and lead context.' }, { icon: ShieldCheck, title: 'Human control', text: 'Review guidance and use campaign safeguards.' }, { icon: Globe2, title: 'Contact-form delivery', text: 'Find and process suitable website contact forms.' }, { icon: Send, title: 'Measurable outcomes', text: 'Track submitted, blocked and review states.' }].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span><div><h3 className="font-black text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div></div>)}</div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f7ff] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:grid-cols-2 lg:px-14">
          <div className="rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm sm:p-9"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-black text-blue-600">Results preview</p><h2 className="mt-2 text-3xl font-black text-slate-950">See every outcome clearly.</h2></div><span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-blue-700">Demo UI · sample data</span></div><div className="mt-8 grid grid-cols-3 gap-3">{[['Forms Found', '842'], ['Messages Submitted', '615'], ['Replies', '37']].map(([label, value]) => <div key={label} className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 text-center"><p className="text-2xl font-black text-slate-950 sm:text-3xl">{value}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p></div>)}</div><div className="mt-5 flex h-28 items-end gap-2 rounded-2xl border border-slate-100 bg-white p-4">{[42, 58, 48, 72, 64, 86, 78, 94].map((height, index) => <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-blue-600 to-blue-300" style={{ height: `${height}%` }} />)}</div></div>
          <div className="rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-black text-blue-600">Simple credit pricing</p><h2 className="mt-2 text-3xl font-black text-slate-950">Start free, then scale as needed.</h2><div className="mt-8 space-y-3">{[['Flexible', 'pay-as-you-go credit packages'], ['2', 'credits per successful website submission'], ['+1', 'credit for optional AI personalization']].map(([value, label]) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-4"><span className="grid h-12 min-w-12 place-items-center rounded-xl bg-blue-600 px-2 text-sm font-black text-white">{value}</span><span className="font-bold text-slate-700">{label}</span></div>)}</div><a href="/pricing" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-blue-700">View pricing details</a></div>
        </div>
      </section>

      <section className="bg-[#f4f7ff] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:px-14">
          <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-black text-[#0e6de4]">Another channel for thoughtful outreach</p><h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Cold email and website contact forms serve different roles.</h2><p className="mt-5 text-lg leading-8 text-slate-600">ContactReachout complements an existing email strategy with controlled website contact-form outreach and AI-assisted relevance.</p></div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2"><ChannelCard icon={Mail} title="Traditional cold email" tone="muted" items={['Depends on sending domains and mailboxes','Requires ongoing deliverability management','Messages are affected by the recipient’s email environment','Useful as an established outbound channel']} /><ChannelCard icon={Globe2} title="ContactReachout website outreach" tone="positive" items={['Uses suitable forms on target company websites','Adds a channel beyond traditional email infrastructure','Personalizes drafts from available lead and company context','Centralizes campaign controls and verifiable outcomes']} /></div>
          <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-6 sm:p-8"><div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0e6de4] text-white"><Sparkles className="h-6 w-6" /></span><div><h3 className="text-xl font-black text-slate-950">Why ContactReachout?</h3><p className="mt-2 leading-7 text-slate-700">Cold email and website contact forms are different outreach channels. ContactReachout gives businesses another way to reach prospects through their websites, while AI personalization helps make each message more relevant. Results still depend on the target website, form availability and the quality of the outreach.</p></div></div></div>
        </div>
      </section>

      <section id="faq" className="bg-[#f4f7ff] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-12 rounded-[2.75rem] border border-blue-100/80 bg-white px-6 py-16 shadow-[0_22px_70px_rgba(37,99,235,.08)] sm:px-10 sm:py-20 lg:grid-cols-[.72fr_1.28fr] lg:px-14">
          <div>
            <p className="text-sm font-black text-blue-600">Frequently asked questions</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Everything you need to start confidently.</h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-600">Clear answers about campaigns, credits, AI personalization and contact-form processing.</p>
          </div>
          <div className="divide-y divide-slate-200 rounded-[2rem] border border-slate-200 bg-[#fafaff] px-5 sm:px-7">
            {homeFaqs.map((item, index) => (
              <details key={item.question} className="group py-1" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-black text-slate-950 marker:content-none">
                  {item.question}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-blue-200 bg-white text-lg text-blue-700 transition group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ChannelCard({ icon: Icon, title, items, tone }: { icon: typeof Mail; title: string; items: string[]; tone: 'muted' | 'positive' }) {
  const positive = tone === 'positive';
  return <article className={`rounded-[2rem] border p-7 sm:p-8 ${positive ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-100 bg-rose-50/30'}`}><div className="flex items-center gap-3"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${positive ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-700'}`}><Icon className="h-6 w-6" /></span><h3 className="text-2xl font-black text-slate-950">{title}</h3></div><div className="mt-6 space-y-3">{items.map(item => <div key={item} className="flex gap-3 rounded-2xl border border-white bg-white/90 p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm">{positive ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Minus className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}<span>{item}</span></div>)}</div></article>;
}
