import * as React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  /**
   * Unique identifier for the item
   */
  id: string;

  /**
   * Label text for the item
   */
  label: string;

  /**
   * Optional description/subtitle
   */
  description?: string;

  /**
   * Whether the item is completed
   */
  completed: boolean;

  /**
   * Whether the item is required
   * @default false
   */
  required?: boolean;
}

export interface ChecklistProps {
  /**
   * Array of checklist items
   */
  items: ChecklistItem[];

  /**
   * Optional title for the checklist
   */
  title?: string;

  /**
   * Whether to show progress bar and completion count
   * @default true
   */
  showProgress?: boolean;

  /**
   * Visual variant
   * @default 'default'
   */
  variant?: 'default' | 'compact';

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Checklist Component
 *
 * Visual checklist with progress indicator for tracking completion status.
 * Perfect for pre-sync checklists, onboarding flows, and task tracking.
 *
 * @example
 * <Checklist
 *   title="Pre-sync Checklist"
 *   showProgress
 *   items={[
 *     { id: '1', label: 'Jotform API configured', completed: true, required: true },
 *     { id: '2', label: 'Givebutter API configured', completed: true, required: true },
 *     { id: '3', label: 'Forms selected', completed: false, required: true },
 *     { id: '4', label: 'CSV uploaded', completed: false },
 *   ]}
 * />
 *
 * @example
 * // Compact variant without progress
 * <Checklist
 *   items={tasks}
 *   variant="compact"
 *   showProgress={false}
 * />
 *
 * @accessibility
 * - Uses semantic HTML list structure
 * - Screen reader friendly status announcements
 * - Color contrast meets WCAG standards
 * - Keyboard navigation support
 */
export function Checklist({
  items,
  title,
  showProgress = true,
  variant = 'default',
  className,
}: ChecklistProps) {
  // Calculate completion percentage
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isCompact = variant === 'compact';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with title and progress */}
      {(title || showProgress) && (
        <div className="space-y-2">
          {title && (
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{title}</h3>
              {showProgress && (
                <span className="text-sm text-muted-foreground">
                  ({completedCount}/{totalCount})
                </span>
              )}
            </div>
          )}

          {/* Progress bar */}
          {showProgress && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  progressPercentage === 100 ? 'bg-success-DEFAULT' : 'bg-info-DEFAULT'
                )}
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progressPercentage}% complete`}
              />
            </div>
          )}
        </div>
      )}

      {/* Checklist items */}
      <ul className={cn('space-y-3', isCompact && 'space-y-2')} role="list">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              'flex items-start gap-3',
              isCompact && 'gap-2'
            )}
          >
            {/* Icon */}
            {item.completed ? (
              <CheckCircle
                className={cn(
                  'flex-shrink-0 text-success-DEFAULT',
                  isCompact ? 'h-4 w-4' : 'h-5 w-5'
                )}
                aria-hidden="true"
              />
            ) : (
              <Circle
                className={cn(
                  'flex-shrink-0 text-muted-foreground',
                  isCompact ? 'h-4 w-4' : 'h-5 w-5'
                )}
                aria-hidden="true"
              />
            )}

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-medium',
                    item.completed ? 'text-foreground' : 'text-muted-foreground',
                    isCompact && 'text-sm'
                  )}
                >
                  {item.label}
                  {item.required && (
                    <span className="text-error-text ml-1" aria-label="required">
                      *
                    </span>
                  )}
                </span>
              </div>

              {/* Description */}
              {item.description && !isCompact && (
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>

            {/* Screen reader status */}
            <span className="sr-only">
              {item.completed ? 'Completed' : 'Not completed'}
            </span>
          </li>
        ))}
      </ul>

      {/* Empty state */}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No items in checklist
        </p>
      )}
    </div>
  );
}
