import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import React from 'react';

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  footerContent: React.ReactNode;
  colorScheme?: 'primary' | 'info' | 'accent';
}

export function ActionCard({ href, icon, title, description, footerContent, colorScheme = 'primary' }: ActionCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-primary/10',
      hoverBg: 'group-hover:bg-primary/20',
      text: 'text-primary',
      hoverText: 'group-hover:text-primary',
      to: 'to-primary/5',
    },
    info: {
      bg: 'bg-info/10',
      hoverBg: 'group-hover:bg-info/20',
      text: 'text-info-text',
      hoverText: 'group-hover:text-info-text',
      to: 'to-info/5',
    },
    accent: {
      bg: 'bg-accent/10',
      hoverBg: 'group-hover:bg-accent/20',
      text: 'text-accent',
      hoverText: 'group-hover:text-accent',
      to: 'to-accent/5',
    },
  };

  const colors = colorClasses[colorScheme];

  return (
    <Link href={href} className="group">
      <Card className={`h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-gradient-to-br from-card via-card ${colors.to} border-border/40`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 ${colors.bg} rounded-xl ${colors.hoverBg} transition-colors`}>
              {icon}
            </div>
            <ArrowRight className={`h-5 w-5 text-muted-foreground ${colors.hoverText} group-hover:translate-x-1 transition-all duration-300`} />
          </div>
          <CardTitle className={`text-2xl ${colors.hoverText} transition-colors`}>
            {title}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {footerContent}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
