'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  UserCheck,
  CheckCircle2,
  Flame,
  MessageSquare,
  Globe,
  SlidersHorizontal,
  Bot,
  Paperclip,
  PenTool,
  Wand2,
  FileText,
} from 'lucide-react';

export function AimfoxConversionSection() {
  const [activeTab, setActiveTab] = useState<'ai' | 'variables' | 'attachments'>('ai');

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 font-sans">
      {/* Title Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Made to convert not just connect
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Send website contact form messages that sound authentic, human, and tailored to every target business owner.
        </p>
      </div>

      {/* Hero Visual Card (Pixel-Perfect Aimfox Layout Matching User Screenshot) */}
      <div className="relative rounded-[36px] overflow-hidden bg-gradient-to-br from-[#1A0B42] via-[#0D1248] to-[#0A0724] p-6 sm:p-12 border border-indigo-500/30 shadow-2xl space-y-8">
        {/* Top Purple-Cyan Glowing Ambient Arc */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[80%] h-48 bg-gradient-to-r from-purple-500/30 via-indigo-500/40 to-cyan-400/30 blur-3xl rounded-full pointer-events-none" />

        {/* Subtle Background Grid Pattern */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Black Capsule Face Pills + Tagline + Badges */}
          <div className="lg:col-span-5 space-y-8">
            {/* Aimfox Black Capsule Face Pills Cluster */}
            <div className="relative h-64 w-full flex items-center justify-center">
              {/* Purple Neon Connection Line SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 200">
                <path
                  d="M 120,110 C 180,90 220,130 290,100"
                  fill="none"
                  stroke="#A855F7"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="opacity-70"
                />
              </svg>

              {/* Capsule 1 (Top Left): Redhead Woman (media_1786613661070.jpg) */}
              <div className="absolute left-0 top-0 h-22 w-36 rounded-[28px] border border-white/20 overflow-hidden shadow-2xl bg-black group hover:scale-105 transition-transform">
                {/* eslint-disable-next-html-element-attributes */}
                <img
                  src="/client-assets/media_1786613661070.jpg"
                  alt="Original Client - Sarah"
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Capsule 2 (Top Right): Man with Glasses (media_1786613660530.jpg) */}
              <div className="absolute right-2 top-0 h-26 w-44 rounded-[32px] border border-white/20 overflow-hidden shadow-2xl bg-black group hover:scale-105 transition-transform">
                <img
                  src="/client-assets/media_1786613660530.jpg"
                  alt="Original Client - Alex"
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Capsule 3 (Bottom Left): Man in Grey Shirt (media_1786613661192.jpg) */}
              <div className="absolute left-2 bottom-0 h-28 w-52 rounded-[36px] border border-white/20 overflow-hidden shadow-2xl bg-black group hover:scale-105 transition-transform">
                <img
                  src="/client-assets/media_1786613661192.jpg"
                  alt="Original Client - Jason"
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Capsule 4 (Bottom Right): Man in Suit (media_1786613661195.png) */}
              <div className="absolute right-0 bottom-3 h-24 w-38 rounded-[30px] border border-white/20 overflow-hidden shadow-2xl bg-black group hover:scale-105 transition-transform">
                <img
                  src="/client-assets/media_1786613661195.png"
                  alt="Original Client - Robert"
                  className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>

              {/* Background Subtle Capsule 5 (media_1786612014739.png) */}
              <div className="absolute left-1/3 top-6 h-10 w-16 rounded-full border border-white/10 overflow-hidden bg-black/80 opacity-50">
                <img
                  src="/client-assets/media_1786612014739.png"
                  alt="Original Client - Elena"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Title & Pill Badges (Aimfox Exact Styling) */}
            <div className="space-y-4 text-left pt-2">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Messages that sound human, not robotic
              </h3>

              <div className="flex flex-wrap gap-2.5 pt-1 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer font-bold ${
                    activeTab === 'ai'
                      ? 'bg-white/20 text-white border-white/40 shadow-lg backdrop-blur-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  AI customization
                </button>

                <button
                  onClick={() => setActiveTab('variables')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer font-bold ${
                    activeTab === 'variables'
                      ? 'bg-white/20 text-white border-white/40 shadow-lg backdrop-blur-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Variables
                </button>

                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer font-bold ${
                    activeTab === 'attachments'
                      ? 'bg-white/20 text-white border-white/40 shadow-lg backdrop-blur-md'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  Attachments
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Aimfox White Glassmorphic Floating Message Window */}
          <div className="lg:col-span-7 relative">
            <div className="rounded-[28px] border border-white/40 bg-white/95 text-slate-900 p-6 sm:p-7 shadow-2xl backdrop-blur-3xl space-y-4 font-sans text-xs">
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">Website Contact Form Outreach Pitch</span>
                  <PenTool className="h-3.5 w-3.5 text-slate-400 cursor-pointer" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>
              </div>

              {/* Subject Input Field */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Partnership & Business Growth Inquiry for {"{{Company name}}"}</span>
                <span className="text-[10px] text-slate-400 font-mono">max 250</span>
              </div>

              {/* Body Text Box with Variable Pills */}
              <div className="space-y-3 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed font-sans text-xs">
                <p>
                  Hey <span className="bg-blue-100 text-blue-700 font-mono font-bold px-2 py-0.5 rounded-md border border-blue-300">{"{{First name}}"}</span>, awesome to connect.
                </p>

                <p>
                  I just checked out <span className="bg-pink-100 text-pink-700 font-mono font-bold px-2 py-0.5 rounded-md border border-pink-300">{"{{Company name}}"}</span> and saw that you&apos;re also expanding services in <span className="bg-cyan-100 text-cyan-700 font-mono font-bold px-2 py-0.5 rounded-md border border-cyan-300">{"{{Location}}"}</span>.
                </p>

                {/* Purple AI Prompt Banner (Website Outreach AI Box) */}
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple-700">
                    <Wand2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Find target company&apos;s contact page, map form fields, and generate a personalized 100% deliverable inquiry.</span>
                  </div>
                </div>

                <p className="text-slate-700">
                  We deliver personalized B2B messages directly into target business contact form inboxes with 0% spam folder bounces. I&apos;m attaching our case study proof below!
                </p>

                {/* PDF Attachment Pill (Website Outreach Case Study) */}
                <div className="inline-flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs font-sans text-xs text-slate-800">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Outreach_Case_Study.pdf</p>
                    <p className="text-[10px] text-slate-400 font-mono">PDF 2.4 MB</p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3">
                <div className="flex items-center gap-3 text-slate-400">
                  <Paperclip className="h-4 w-4 hover:text-slate-700 cursor-pointer" />
                  <PenTool className="h-4 w-4 hover:text-slate-700 cursor-pointer" />
                  <Sparkles className="h-4 w-4 hover:text-slate-700 cursor-pointer" />
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                  <span>Variables: {"{{First name}}"}, {"{{Company name}}"}</span>
                </div>
              </div>
            </div>

            {/* 3D Translucent Floating Send Pointer Badge (Exact Aimfox 3D Arrow) */}
            <div className="absolute -bottom-8 -right-4 h-24 w-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-0.5 shadow-2xl shadow-purple-500/50 animate-bounce duration-1000">
              <div className="h-full w-full rounded-3xl bg-purple-950/70 backdrop-blur-xl flex items-center justify-center text-white relative">
                <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-cyan-400/40 to-transparent blur-md rounded-b-3xl" />
                <Send className="h-10 w-10 text-cyan-300 transform -rotate-12 relative z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
