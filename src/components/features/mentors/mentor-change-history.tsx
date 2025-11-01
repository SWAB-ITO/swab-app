'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface MentorChange {
  id: number;
  mn_id: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  source_table: string | null;
  notes: string | null;
  changed_at: string;
}

interface ChangeHistoryProps {
  mnId: string;
}

export function MentorChangeHistory({ mnId }: ChangeHistoryProps) {
  const [changes, setChanges] = useState<MentorChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ total_changes: number; by_type: Record<string, number> } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchChanges();
  }, [mnId, activeFilter]);

  async function fetchChanges() {
    setLoading(true);
    try {
      const filterParam = activeFilter ? `&change_type=${activeFilter}` : '';
      const res = await fetch(`/api/mentors/${mnId}/changes?limit=100${filterParam}`);
      const data = await res.json();

      if (res.ok) {
        setChanges(data.changes || []);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch changes:', data.error);
      }
    } catch (error) {
      console.error('Error fetching changes:', error);
    } finally {
      setLoading(false);
    }
  }

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'field_updated': return 'Field Updated';
      case 'new_mentor': return 'New Mentor';
      case 'conflict_resolved': return 'Conflict Resolved';
      case 'status_changed': return 'Status Changed';
      case 'dropped': return 'Dropped';
      case 'reactivated': return 'Reactivated';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'new_mentor': return 'bg-green-500';
      case 'dropped': return 'bg-red-500';
      case 'reactivated': return 'bg-blue-500';
      case 'conflict_resolved': return 'bg-purple-500';
      case 'status_changed': return 'bg-yellow-500';
      case 'field_updated': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatValue = (value: string | null) => {
    if (value === null) return <span className="text-gray-400 italic">null</span>;
    if (value === '') return <span className="text-gray-400 italic">empty</span>;

    // Try to parse JSON for better display
    try {
      const parsed = JSON.parse(value);
      return <code className="text-xs bg-gray-100 px-2 py-1 rounded">{JSON.stringify(parsed, null, 2)}</code>;
    } catch {
      return <span className="font-mono text-sm">{value}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading change history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Change History</h3>
          {summary && (
            <Badge variant="outline">{summary.total_changes} changes</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchChanges}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      {summary && Object.keys(summary.by_type).length > 1 && (
        <Tabs value={activeFilter || 'all'} onValueChange={(v) => setActiveFilter(v === 'all' ? null : v)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({summary.total_changes})
            </TabsTrigger>
            {Object.entries(summary.by_type).map(([type, count]) => (
              <TabsTrigger key={type} value={type}>
                {getChangeTypeLabel(type)} ({count})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Change Timeline */}
      {changes.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-lg font-medium">No change history</p>
            <p className="text-gray-600 text-sm mt-1">
              Changes will appear here when data is updated
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {changes.map((change) => (
            <Card key={change.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getChangeTypeColor(change.change_type)}>
                        {getChangeTypeLabel(change.change_type)}
                      </Badge>
                      {change.field_name && (
                        <span className="text-sm text-gray-600">
                          • Field: <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{change.field_name}</code>
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {new Date(change.changed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                      {change.source_table && ` • Source: ${change.source_table}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Value Changes */}
                {(change.old_value !== null || change.new_value !== null) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600 uppercase">Old Value</div>
                      <div className="p-2 bg-gray-50 rounded border">
                        {formatValue(change.old_value)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-gray-600 uppercase">New Value</div>
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        {formatValue(change.new_value)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {change.notes && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                    <div className="font-medium text-blue-900 mb-1">Note:</div>
                    {change.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
