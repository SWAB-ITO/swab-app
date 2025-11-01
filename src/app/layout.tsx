import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/layout/top-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SWAB Mentor Database",
  description: "Manage SWAB mentors, fundraising, and communications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased min-h-screen bg-gray-50`}>
        <div className="min-h-screen flex flex-col">
          {/* Simple Top Navigation */}
          <TopNav />

          {/* Main Content with extra padding for floating nav */}
          <main className="flex-1 pb-28">
            {children}
          </main>

          {/* Bottom Floating Navigation */}
          <BottomNav />
        </div>

        {/* Vercel Monitoring - see ai/Code Guidelines/MONITORING_AND_ANALYTICS.md */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
