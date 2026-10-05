import type { Metadata } from "next";
import "./globals.css";
import { RevealOnScroll } from "@/components/brand/RevealOnScroll";

export const metadata: Metadata = {
  title: "BLACKORWHITE — Freelance Pro",
  description: "Centralized platform for managing team members, client projects, worklogs, timelines, and remuneration.",
  keywords: "team member management, project management, worklog, remuneration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply saved theme class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('fp-theme')||'dark';document.documentElement.classList.toggle('light',t==='light');document.documentElement.classList.toggle('dark',t==='dark');})();` }} />
      </head>
      <body className="min-h-full antialiased">
        {children}
        <div className="grain" aria-hidden="true" />
        <RevealOnScroll />
      </body>
    </html>
  );
}
