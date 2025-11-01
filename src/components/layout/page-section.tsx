'use client';

import React from 'react';

interface PageSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const PageSection = ({ title, children, className }: PageSectionProps) => {
  return (
    <section className={className}>
      {title && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            {title}
          </h2>
        </div>
      )}
      {children}
    </section>
  );
};
