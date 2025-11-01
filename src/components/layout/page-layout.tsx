'use client';

import React from 'react';

interface PageLayoutProps {
  badgeText: string;
  title: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageLayout = ({
  badgeText,
  title,
  headerActions,
  children,
}: PageLayoutProps) => {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-4">
            <div>
              <div className="inline-block">
                <span className="text-sm font-semibold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                  {badgeText}
                </span>
              </div>
            </div>
            {headerActions}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            {title}
          </h1>
        </div>
        
        <main className="space-y-12">
            {children}
        </main>
      </div>
    </div>
  );
};
