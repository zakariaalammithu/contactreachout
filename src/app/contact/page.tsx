import type { Metadata } from 'next';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { LandingFooter } from '@/components/layout/LandingFooter';
import { ContactClient } from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | ContactReachout Support & Help',
  description:
    'Have a question or need assistance with ContactReachout campaigns, credits, billing, AI personalization, or contact form submissions? Get in touch with our support team.',
  openGraph: {
    title: 'Contact Us | ContactReachout',
    description:
      'Have a question or need assistance with ContactReachout campaigns, credits, billing, AI personalization, or contact form submissions? Get in touch with our support team.',
    url: 'https://contactreachout.com/contact',
    siteName: 'ContactReachout',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900 flex flex-col justify-between">
      <LandingHeader />
      <ContactClient />
      <LandingFooter />
    </div>
  );
}
