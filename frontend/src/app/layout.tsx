import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans-face", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: "Transcript AI Lab — NLP + LLM Engineering",
  description:
    "An interactive laboratory for learning NLP, LLM engineering, evaluation and information extraction on noisy conversational transcripts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('transcript-ai-lab-progress')||'{}');if(s.state&&s.state.settings&&s.state.settings.theme==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
