import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/composite/status-badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';

/**
 * Sync log entry
 */
export interface SyncLog {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Type of sync operation
   */
  sync_type: string;

  /**
   * Status of the sync
   */
  status: 'pending' | 'running' | 'completed' | 'failed';

  /**
   * Start timestamp
   */
  started_at: string;

  /**
   * Completion timestamp (if completed)
   */
  completed_at?: string;

  /**
   * Duration in seconds
   */
  duration_seconds?: number;

  /**
   * Number of records processed
   */
  records_processed?: number;

  /**
   * Number of records inserted
   */
  records_inserted?: number;

  /**
   * Error message (if failed)
   */
  error_message?: string;
}

/**
 * Filter type for sync logs
 */
export type SyncLogFilter = 'all' | 'completed' | 'failed' | 'running';

/**
 * Props for the SyncLogList component
 */
export interface SyncLogListProps {
  /**
   * Array of sync logs to display
   */
  logs: SyncLog[];

  /**
   * Whether the logs are loading
   * @default false
   */
  loading?: boolean;

  /**
   * Title for the log list
   * @default "Recent Sync Operations"
   */
  title?: string;

  /**
   * Whether to show filter buttons
   * @default true
   */
  showFilters?: boolean;

  /**
   * Initial filter
   * @default "all"
   */
  initialFilter?: SyncLogFilter;

  /**
   * Maximum number of logs to display
   * @default undefined (show all)
   */
  maxLogs?: number;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Whether to exclude automated syncs
   * @default true
   */
  excludeAutomated?: boolean;
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format sync type to human-readable string
 */
function formatSyncType(syncType: string): string {
  return syncType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * SyncLogList Component
 *
 * Displays a filterable list of sync operation logs with expandable error details.
 *
 * @example
 * ```tsx
 * <SyncLogList
 *   logs={syncLogs}
 *   loading={loadingLogs}
 *   showFilters
 *   maxLogs={10}
 * />
 * ```
 *
 * @example With custom title
 * ```tsx
 * <SyncLogList
 *   logs={syncLogs}
 *   title="Sync History"
 *   initialFilter="failed"
 *   excludeAutomated={false}
 * />
 * ```
 */
export function SyncLogList({
  logs,
  loading = false,
  title = 'Recent Sync Operations',
  showFilters = true,
  initialFilter = 'all',
  maxLogs,
  className,
  excludeAutomated = true,
}: SyncLogListProps) {
  const [filter, setFilter] = useState<SyncLogFilter>(initialFilter);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter logs based on selected filter
  let filteredLogs = logs;

  // Exclude automated syncs if requested
  if (excludeAutomated) {
    filteredLogs = filteredLogs.filter(log => log.sync_type !== 'automated');
  }

  // Apply status filter
  if (filter !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.status === filter);
  }

  // Limit number of logs if specified
  if (maxLogs) {
    filteredLogs = filteredLogs.slice(0, maxLogs);
  }

  // Toggle log expansion
  const toggleLog = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {title}
          </CardTitle>

          {/* Filter Buttons */}
          {showFilters && (
            <div className="flex gap-2">
              {(['all', 'completed', 'failed', 'running'] as SyncLogFilter[]).map((filterOption) => (
                <Button
                  key={filterOption}
                  variant={filter === filterOption ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterOption)}
                  className="capitalize"
                >
                  {filterOption}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredLogs.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">
            {filter === 'all'
              ? 'No sync operations yet'
              : `No ${filter} sync operations`}
          </p>
        )}

        {/* Log List */}
        {!loading && filteredLogs.length > 0 && (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasError = log.status === 'failed' && log.error_message;

              return (
                <div
                  key={log.id}
                  className="bg-muted/30 rounded-lg p-4 space-y-2"
                >
                  {/* Log Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {formatSyncType(log.sync_type)}
                        </span>
                        <StatusBadge status={log.status} />
                      </div>

                      <p className="text-xs text-gray-500">
                        Started: {new Date(log.started_at).toLocaleString()}
                      </p>

                      {log.completed_at && log.duration_seconds !== undefined && (
                        <p className="text-xs text-gray-500">
                          Duration: {formatDuration(log.duration_seconds)}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    {log.records_processed !== undefined && (
                      <div className="text-right text-sm">
                        <div className="text-gray-600">
                          Processed: <span className="font-medium">{log.records_processed}</span>
                        </div>
                        {log.records_inserted !== undefined && (
                          <div className="text-green-600">
                            Inserted: <span className="font-medium">{log.records_inserted}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Error Details (Expandable) */}
                  {hasError && (
                    <div>
                      <button
                        onClick={() => toggleLog(log.id)}
                        className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Error
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show Error
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 bg-destructive/10 text-destructive text-sm p-3 rounded-md font-mono whitespace-pre-wrap">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show count if filtered */}
        {!loading && filteredLogs.length > 0 && filter !== 'all' && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Showing {filteredLogs.length} {filter} operation{filteredLogs.length !== 1 ? 's' : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
