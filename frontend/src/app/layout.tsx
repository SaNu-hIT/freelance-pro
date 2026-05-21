import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreelancePro — Manage Freelancers at Scale",
  description: "Centralized platform for managing freelancers, client projects, worklogs, timelines, and remuneration.",
  keywords: "freelancer management, project management, worklog, remuneration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&f[]=satoshi@400,500,700&display=swap');
        `}</style>
      </head>
      <body className="min-h-full antialiased" style={{ background: '#0a0a0c', color: '#ffffff' }}>
        {children}
      </body>
    </html>
  );
}
