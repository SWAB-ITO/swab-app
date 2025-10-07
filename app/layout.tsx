import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
