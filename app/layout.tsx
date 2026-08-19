import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContactReachout — Automated Bulk Website Contact Outreach (contactreachout.com)",
  description: "ContactReachout is the ultimate B2B website contact form outreach platform. Reach 10,000+ target websites daily with zero bypass compliance.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
