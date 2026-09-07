export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div><p className="text-sm font-black text-[#0e6de4]">Support</p><h1 className="mt-2 text-3xl font-black text-slate-950">Terms & Conditions</h1><p className="mt-3 text-slate-600">The terms governing responsible use of ContactReachout.</p></div>
      <section className="space-y-5 rounded-3xl border border-blue-100 bg-white p-7 shadow-sm">
        <div><h2 className="font-black text-slate-900">Responsible outreach</h2><p className="mt-2 text-sm leading-7 text-slate-600">Users are responsible for lawful targeting, accurate sender information, appropriate message content, and honoring applicable consent and opt-out requirements.</p></div>
        <div><h2 className="font-black text-slate-900">Campaign safeguards</h2><p className="mt-2 text-sm leading-7 text-slate-600">ContactReachout records blocked, CAPTCHA, unavailable, review-required, and submitted outcomes. Safeguards must not be bypassed.</p></div>
        <div><h2 className="font-black text-slate-900">Credits and services</h2><p className="mt-2 text-sm leading-7 text-slate-600">Credit usage follows the current Pricing page and recorded processing outcomes. Service availability may depend on third-party websites and configured providers.</p></div>
      </section>
    </div>
  );
}
