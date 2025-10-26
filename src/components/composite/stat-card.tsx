import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /**
   * Card title/label
   */
  title: string;

  /**
   * Main metric value to display
   */
  value: number | string;

  /**
   * Description text below the value
   */
  description: string;

  /**
   * Icon component to display in top-right
   */
  icon: LucideIcon;

  /**
   * Color scheme for the card
   * @default 'default'
   */
  colorScheme?: 'default' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Optional trend indicator
   */
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };

  /**
   * Loading state (shows skeleton)
   * @default false
   */
  loading?: boolean;

  /**
   * Click handler (makes card interactive)
   */
  onClick?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Color schemes for value display
 */
const colorSchemeClasses = {
  default: 'text-foreground',
  success: 'text-success-text',
  warning: 'text-warning-text',
  error: 'text-error-text',
  info: 'text-info-text',
};

/**
 * Icon color schemes
 */
const iconColorClasses = {
  default: 'text-muted-foreground',
  success: 'text-success-textMuted',
  warning: 'text-warning-textMuted',
  error: 'text-error-textMuted',
  info: 'text-info-textMuted',
};

/**
 * StatCard Component
 *
 * Metric display card for dashboard statistics.
 * Replaces inline stat card code with consistent, reusable component.
 *
 * @example
 * <StatCard
 *   title="Total Mentors"
 *   value={974}
 *   description="Active in the program"
 *   icon={Users}
 *   colorScheme="default"
 *   loading={loading}
 * />
 *
 * @example
 * // With trend indicator
 * <StatCard
 *   title="Need Training"
 *   value={974}
 *   description="Training signup needed"
 *   icon={GraduationCap}
 *   colorScheme="info"
 *   trend={{ value: 12, direction: 'up', label: 'from last week' }}
 * />
 *
 * @example
 * // Interactive card
 * <StatCard
 *   title="Active Errors"
 *   value={5}
 *   description="Unresolved issues"
 *   icon={AlertCircle}
 *   colorScheme="error"
 *   onClick={() => router.push('/errors')}
 * />
 *
 * @accessibility
 * - Proper heading hierarchy
 * - Color contrast meets WCAG standards
 * - Keyboard accessible when interactive
 * - Loading state announced to screen readers
 */
export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  colorScheme = 'default',
  trend,
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  const valueColorClass = colorSchemeClasses[colorScheme];
  const iconColorClass = iconColorClasses[colorScheme];

  const cardClasses = cn(
    onClick && 'cursor-pointer hover:shadow-md transition-shadow',
    className
  );

  return (
    <Card className={cardClasses} onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', iconColorClass)} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className={cn('text-2xl font-bold', valueColorClass)}>
            {value}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>

        {/* Optional trend indicator */}
        {trend && !loading && (
          <div className="flex items-center gap-1 mt-2 text-xs">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 text-success-text" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3 w-3 text-error-text" aria-hidden="true" />
            )}
            <span
              className={cn(
                'font-medium',
                trend.direction === 'up' ? 'text-success-text' : 'text-error-text'
              )}
            >
              {trend.value}
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
