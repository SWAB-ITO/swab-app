'use client';

import { useState, useEffect } from 'react';
import { ConflictResolutionCard } from '@/components/features/conflicts/conflict-resolution-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface Conflict {
  id: number;
  mn_id: string;
  conflict_type: string;
  option_a: any;
  option_b: any;
  context?: Record<string, any>;
  recommended_option: 'a' | 'b' | null;
  recommendation_reason: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  status: 'pending' | 'resolved' | 'skipped';
  mentor?: {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    phone: string | null;
    personal_email: string | null;
  };
}

interface ConflictSummary {
  total_pending: number;
  by_type: Record<string, number>;
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);
  const [bulkResolving, setBulkResolving] = useState(false);
  const [summary, setSummary] = useState<ConflictSummary | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchConflicts();
  }, [activeTab]);

  async function fetchConflicts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conflicts?status=${activeTab}&limit=100`);
      const data = await res.json();

      if (res.ok) {
        setConflicts(data.conflicts || []);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch conflicts:', data.error);
      }
    } catch (error) {
      console.error('Error fetching conflicts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(
    conflictId: number,
    decision: 'a' | 'b' | 'custom' | 'skip',
    customValue?: any
  ) {
    setResolving(conflictId);

    try {
      const res = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          custom_value: customValue,
          resolved_by: 'admin@swabuga.org', // TODO: Get from auth
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Remove resolved conflict from list
        setConflicts(prev => prev.filter(c => c.id !== conflictId));

        // Show success message
        console.log('Conflict resolved:', data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('Failed to resolve conflict');
    } finally {
      setResolving(null);
    }
  }

  async function handleBulkResolve() {
    if (!confirm('Resolve all pending conflicts using system recommendations?')) {
      return;
    }

    setBulkResolving(true);

    try {
      const res = await fetch('/api/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolved_by: 'admin@swabuga.org', // TODO: Get from auth
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Resolved ${data.resolved_count} conflicts${data.failed_count > 0 ? ` (${data.failed_count} failed)` : ''}`);
        fetchConflicts();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error bulk resolving:', error);
      alert('Failed to bulk resolve');
    } finally {
      setBulkResolving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const pendingCount = summary?.total_pending || 0;
  const hasRecommendations = conflicts.some(c => c.recommended_option);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Conflict Resolution</h1>
            <p className="text-gray-600 mt-1">
              Resolve data conflicts from sync operations
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchConflicts}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {hasRecommendations && pendingCount > 0 && (
              <Button
                onClick={handleBulkResolve}
                disabled={bulkResolving}
              >
                {bulkResolving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Accept All Recommendations
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending Conflicts</CardDescription>
                <CardTitle className="text-3xl">{summary.total_pending}</CardTitle>
              </CardHeader>
            </Card>

            {Object.entries(summary.by_type).length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardDescription>By Type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.by_type).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="skipped">Skipped</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {conflicts.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium">No {activeTab} conflicts</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {activeTab === 'pending'
                      ? 'All conflicts have been resolved!'
                      : `No ${activeTab} conflicts found.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              conflicts.map((conflict) => (
                <ConflictResolutionCard
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={handleResolve}
                  resolving={resolving === conflict.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
