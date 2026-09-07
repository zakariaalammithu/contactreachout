export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div><p className="text-sm font-black text-[#0e6de4]">Support</p><h1 className="mt-2 text-3xl font-black text-slate-950">Privacy Policy</h1><p className="mt-3 text-slate-600">How ContactReachout handles account and campaign information.</p></div>
      <section className="space-y-5 rounded-3xl border border-blue-100 bg-white p-7 shadow-sm">
        <div><h2 className="font-black text-slate-900">Information used</h2><p className="mt-2 text-sm leading-7 text-slate-600">The application uses account details, uploaded lead fields, campaign settings, generated drafts, processing results, and configuration data required to provide the requested workflow.</p></div>
        <div><h2 className="font-black text-slate-900">Purpose and control</h2><p className="mt-2 text-sm leading-7 text-slate-600">Information is used to configure campaigns, personalize approved messages, process outreach, and present results. Users control the lead lists and campaigns they create.</p></div>
        <div><h2 className="font-black text-slate-900">Security</h2><p className="mt-2 text-sm leading-7 text-slate-600">Secrets are handled through server-side environment or protected configuration paths and are not intentionally displayed in client-facing pages.</p></div>
      </section>
    </div>
  );
}
