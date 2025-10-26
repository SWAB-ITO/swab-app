import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Info,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Status types for sync operations and processes
 */
type Status = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Severity types for errors and alerts
 */
type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Status of a sync operation or process
   */
  status?: Status;

  /**
   * Severity level for errors or alerts
   */
  severity?: Severity;

  /**
   * Size of the badge and icon
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom label text (overrides default label)
   */
  label?: string;

  /**
   * Whether to show the icon
   * @default true
   */
  showIcon?: boolean;
}

interface StatusConfig {
  variant: 'success' | 'info' | 'warning' | 'error';
  icon: LucideIcon;
  label: string;
  animated?: boolean;
}

/**
 * Configuration for status indicators
 */
const statusConfig: Record<Status, StatusConfig> = {
  pending: {
    variant: 'warning',
    icon: Clock,
    label: 'Pending',
  },
  running: {
    variant: 'info',
    icon: Loader2,
    label: 'Running',
    animated: true,
  },
  completed: {
    variant: 'success',
    icon: CheckCircle,
    label: 'Completed',
  },
  failed: {
    variant: 'error',
    icon: XCircle,
    label: 'Failed',
  },
};

/**
 * Configuration for severity indicators
 */
const severityConfig: Record<Severity, StatusConfig> = {
  info: {
    variant: 'info',
    icon: Info,
    label: 'Info',
  },
  warning: {
    variant: 'warning',
    icon: AlertTriangle,
    label: 'Warning',
  },
  error: {
    variant: 'error',
    icon: AlertCircle,
    label: 'Error',
  },
  critical: {
    variant: 'error',
    icon: AlertOctagon,
    label: 'Critical',
  },
};

/**
 * Icon size classes based on badge size
 */
const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

/**
 * StatusBadge Component
 *
 * Unified status and severity indicator for the application.
 * Replaces inline badge logic and provides consistent status display.
 *
 * @example
 * // Sync status
 * <StatusBadge status="completed" />
 * <StatusBadge status="running" />
 * <StatusBadge status="failed" />
 *
 * @example
 * // Error severity
 * <StatusBadge severity="critical" />
 * <StatusBadge severity="warning" />
 *
 * @example
 * // Custom label and size
 * <StatusBadge status="completed" label="Done" size="lg" />
 * <StatusBadge severity="error" showIcon={false} />
 *
 * @accessibility
 * - Uses semantic HTML and ARIA labels
 * - Icon provides visual indication, label provides text
 * - Meets WCAG color contrast requirements
 * - Keyboard accessible and screen reader friendly
 */
export function StatusBadge({
  status,
  severity,
  size = 'md',
  label,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  // Determine which config to use (status or severity)
  const config = status ? statusConfig[status] : severity ? severityConfig[severity] : null;

  if (!config) {
    console.warn('StatusBadge: Either status or severity prop must be provided');
    return null;
  }

  const Icon = config.icon;
  const displayLabel = label || config.label;
  const iconSize = iconSizeClasses[size];

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', className)}
      {...props}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSize,
            config.animated && 'animate-spin'
          )}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </Badge>
  );
}
