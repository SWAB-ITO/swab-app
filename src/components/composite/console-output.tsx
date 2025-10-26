'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConsoleOutputProps {
  /**
   * Array of output lines to display
   */
  lines: string[];

  /**
   * Whether the process is currently running (shows loading cursor)
   * @default false
   */
  loading?: boolean;

  /**
   * Maximum height of the console output
   * @default 'max-h-64' (16rem / 256px)
   */
  maxHeight?: string;

  /**
   * Whether to show the copy button
   * @default true
   */
  showCopy?: boolean;

  /**
   * Whether to show the clear button
   * @default false
   */
  showClear?: boolean;

  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ConsoleOutput Component
 *
 * Terminal-style output display for sync operations and command execution.
 * Replaces duplicated console output code throughout the application.
 *
 * @example
 * <ConsoleOutput
 *   lines={syncOutput}
 *   loading={syncRunning}
 *   showCopy
 *   showClear
 *   onClear={() => setSyncOutput([])}
 * />
 *
 * @features
 * - Auto-scrolls to bottom on new lines
 * - Copy to clipboard functionality
 * - Clear output functionality
 * - Loading state with pulsing cursor
 * - Monospace font for terminal feel
 *
 * @accessibility
 * - Keyboard accessible buttons
 * - Screen reader announcements for actions
 * - Proper ARIA labels
 */
export function ConsoleOutput({
  lines,
  loading = false,
  maxHeight = 'max-h-64',
  showCopy = true,
  showClear = false,
  onClear,
  className,
}: ConsoleOutputProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll to bottom when lines change
  React.useEffect(() => {
    if (scrollRef.current) {
      const isNearBottom =
        scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 100;

      // Only auto-scroll if user is near the bottom
      if (isNearBottom || lines.length === 1) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [lines]);

  // Copy all output to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Clear all output
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  // Don't render if no lines and not loading
  if (lines.length === 0 && !loading) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with action buttons */}
      {(showCopy || showClear) && (
        <div className="flex items-center justify-end gap-2">
          {showCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={lines.length === 0}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}
          {showClear && onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={lines.length === 0}
              className="h-7 px-2 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Console output area */}
      <div
        ref={scrollRef}
        className={cn(
          'p-3 bg-muted rounded-lg overflow-y-auto font-mono text-xs',
          maxHeight
        )}
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="whitespace-pre-wrap break-words"
          >
            {line}
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-1 mt-1">
            <span className="animate-pulse">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
