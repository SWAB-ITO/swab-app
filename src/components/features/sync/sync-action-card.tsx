import React, { useState } from 'react';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConsoleOutput } from '@/components/composite/console-output';

/**
 * Tier levels for sync actions
 */
export type SyncTier = 1 | 2 | 3 | 4;

/**
 * Props for the SyncActionCard component
 */
export interface SyncActionCardProps {
  /**
   * Icon to display in the card header
   */
  icon: LucideIcon;

  /**
   * Title of the sync action
   */
  title: string;

  /**
   * Detailed description of what this action does
   */
  description: string;

  /**
   * Tier level of this sync action (1-4)
   */
  tier: SyncTier;

  /**
   * Action button text
   * @default "Run"
   */
  actionLabel?: string;

  /**
   * Loading state for the action button
   * @default false
   */
  loading?: boolean;

  /**
   * Disabled state for the action button
   * @default false
   */
  disabled?: boolean;

  /**
   * Callback when action button is clicked
   */
  onAction: () => void | Promise<void>;

  /**
   * Console output lines to display
   * @default []
   */
  outputLines?: string[];

  /**
   * Whether to show the console output section
   * @default true when outputLines has content
   */
  showOutput?: boolean;

  /**
   * Whether the output section is expanded by default
   * @default true
   */
  defaultExpanded?: boolean;

  /**
   * Whether to show the copy button in console output
   * @default true
   */
  showCopyOutput?: boolean;

  /**
   * Whether to show the clear button in console output
   * @default true
   */
  showClearOutput?: boolean;

  /**
   * Callback when clear button is clicked
   */
  onClearOutput?: () => void;

  /**
   * Additional content to render in the card (e.g., file upload)
   */
  children?: React.ReactNode;

  /**
   * Custom CSS class for the card
   */
  className?: string;
}

/**
 * Get tier badge variant and label
 */
function getTierConfig(tier: SyncTier): { variant: 'default' | 'secondary' | 'outline', label: string } {
  const configs = {
    1: { variant: 'default' as const, label: 'Tier 1' },
    2: { variant: 'secondary' as const, label: 'Tier 2' },
    3: { variant: 'outline' as const, label: 'Tier 3' },
    4: { variant: 'outline' as const, label: 'Tier 4' },
  };
  return configs[tier];
}

/**
 * SyncActionCard Component
 *
 * A specialized card component for sync operations that combines:
 * - Action metadata (icon, title, tier, description)
 * - Action button with loading state
 * - Expandable console output
 * - Optional custom content (e.g., file upload)
 *
 * @example
 * ```tsx
 * <SyncActionCard
 *   icon={RefreshCw}
 *   title="Periodic Sync"
 *   description="Sync from APIs: Jotform + Givebutter + ETL"
 *   tier={2}
 *   actionLabel="Run Periodic Sync"
 *   loading={syncRunning}
 *   disabled={!initialized}
 *   onAction={handleSync}
 *   outputLines={syncOutput}
 *   onClearOutput={() => setSyncOutput([])}
 * />
 * ```
 *
 * @example With file upload
 * ```tsx
 * <SyncActionCard
 *   icon={Upload}
 *   title="CSV Upload"
 *   description="Upload Givebutter export and match contacts"
 *   tier={3}
 *   actionLabel="Upload CSV"
 *   loading={uploading}
 *   onAction={handleUpload}
 *   outputLines={uploadOutput}
 * >
 *   <FileUpload
 *     accept=".csv"
 *     onChange={handleFileChange}
 *     uploading={uploading}
 *   />
 * </SyncActionCard>
 * ```
 */
export function SyncActionCard({
  icon: Icon,
  title,
  description,
  tier,
  actionLabel = 'Run',
  loading = false,
  disabled = false,
  onAction,
  outputLines = [],
  showOutput,
  defaultExpanded = true,
  showCopyOutput = true,
  showClearOutput = true,
  onClearOutput,
  children,
  className,
}: SyncActionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const tierConfig = getTierConfig(tier);

  // Determine if we should show output
  const shouldShowOutput = showOutput ?? outputLines.length > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant={tierConfig.variant}>{tierConfig.label}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Custom content (e.g., file upload) */}
        {children}

        {/* Action Button */}
        <Button
          onClick={onAction}
          disabled={disabled || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Icon className="h-4 w-4 mr-2 animate-spin" />
              {actionLabel}ing...
            </>
          ) : (
            <>
              <Icon className="h-4 w-4 mr-2" />
              {actionLabel}
            </>
          )}
        </Button>

        {/* Console Output Section */}
        {shouldShowOutput && (
          <div className="space-y-2">
            {/* Expand/Collapse Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Output
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Output ({outputLines.length} lines)
                </>
              )}
            </button>

            {/* Console Output */}
            {isExpanded && (
              <ConsoleOutput
                lines={outputLines}
                loading={loading}
                showCopy={showCopyOutput}
                showClear={showClearOutput}
                onClear={onClearOutput}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
