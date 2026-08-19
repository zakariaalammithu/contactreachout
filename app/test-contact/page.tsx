'use client';

import React, { useState } from 'react';

export default function TestContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-12 space-y-6">
      <h1 className="text-2xl font-bold">Public Contact Form Test Page</h1>

      {submitted ? (
        <div className="p-4 bg-emerald-900/50 border border-emerald-500 rounded-xl text-emerald-300 font-bold">
          Thank you! Your message has been sent successfully.
        </div>
      ) : (
        <form id="contact-form" action="/api/test-form-submit" method="POST" onSubmit={handleSubmit} className="space-y-4 max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-bold mb-1">Full Name</label>
            <input type="text" name="name" id="name" placeholder="John Doe" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Email Address</label>
            <input type="email" name="email" id="email" placeholder="john@example.com" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Subject</label>
            <input type="text" name="subject" id="subject" placeholder="Inquiry" className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Message</label>
            <textarea name="message" id="message" rows={4} placeholder="Your message here..." className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs" />
          </div>

          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs">
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}
