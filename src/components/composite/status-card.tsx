import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './status-badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusMetric {
  /**
   * Label for the metric
   */
  label: string;

  /**
   * Value to display (can be text or relative time)
   */
  value: string | number;

  /**
   * Optional timestamp
   */
  timestamp?: Date;

  /**
   * Status indicator for this metric
   */
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

export interface StatusCardProps {
  /**
   * Card title
   */
  title: string;

  /**
   * Whether the system/feature is configured
   */
  configured: boolean;

  /**
   * When the system was configured
   */
  configuredAt?: Date;

  /**
   * Array of status metrics to display
   */
  metrics: StatusMetric[];

  /**
   * Optional actions slot (e.g., buttons)
   */
  actions?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

/**
 * StatusCard Component
 *
 * System status display card with multiple metrics and indicators.
 * Replaces Alert component misuse for status displays.
 *
 * @example
 * <StatusCard
 *   title="API Configuration"
 *   configured={true}
 *   configuredAt={new Date('2025-10-24')}
 *   metrics={[
 *     { label: 'Jotform Sync', value: '2 hours ago', status: 'success' },
 *     { label: 'Givebutter Sync', value: '3 hours ago', status: 'success' },
 *     { label: 'ETL Process', value: 'Failed', status: 'error' },
 *   ]}
 * />
 *
 * @example
 * // With actions
 * <StatusCard
 *   title="Database Connection"
 *   configured={true}
 *   metrics={dbMetrics}
 *   actions={
 *     <Button variant="outline" size="sm">Test Connection</Button>
 *   }
 * />
 *
 * @accessibility
 * - Semantic HTML structure
 * - Status indicators announced to screen readers
 * - Color contrast meets WCAG standards
 * - Keyboard accessible actions
 */
export function StatusCard({
  title,
  configured,
  configuredAt,
  metrics,
  actions,
  className,
}: StatusCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {configured ? (
                <CheckCircle className="h-5 w-5 text-success-DEFAULT" aria-hidden="true" />
              ) : (
                <XCircle className="h-5 w-5 text-error-DEFAULT" aria-hidden="true" />
              )}
              <CardTitle>{title}</CardTitle>
            </div>
            {configuredAt && (
              <p className="text-sm text-muted-foreground">
                Configured {formatRelativeTime(configuredAt)}
              </p>
            )}
          </div>

          <Badge variant={configured ? 'success' : 'error'}>
            {configured ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics */}
        {metrics.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Status Metrics
            </h4>
            <div className="space-y-2">
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{metric.label}</p>
                    {metric.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(metric.timestamp)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {metric.value}
                    </span>
                    {metric.status && (
                      <div className="flex-shrink-0">
                        {metric.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-success-DEFAULT" aria-label="Success" />
                        )}
                        {metric.status === 'warning' && (
                          <Clock className="h-4 w-4 text-warning-DEFAULT" aria-label="Warning" />
                        )}
                        {metric.status === 'error' && (
                          <XCircle className="h-4 w-4 text-error-DEFAULT" aria-label="Error" />
                        )}
                        {metric.status === 'neutral' && (
                          <Clock className="h-4 w-4 text-muted-foreground" aria-label="Neutral" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="pt-2">
            {actions}
          </div>
        )}

        {/* Empty state */}
        {metrics.length === 0 && !actions && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No metrics available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
