'use client';

import { useState, useEffect } from 'react';
import { WarningListCard } from '@/components/features/warnings/warning-list-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';

interface Warning {
  id: number;
  mn_id: string;
  warning_type: string;
  warning_message: string;
  field_name: string | null;
  current_value: string | null;
  expected_value: string | null;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
  acknowledged: boolean;
  mentor?: {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    phone: string | null;
    personal_email: string | null;
  };
}

interface WarningSummary {
  total_unacknowledged: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
  };
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<number | null>(null);
  const [bulkAcknowledging, setBulkAcknowledging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [summary, setSummary] = useState<WarningSummary | null>(null);
  const [activeTab, setActiveTab] = useState('false'); // 'false' = unacknowledged, 'true' = acknowledged, 'all' = all

  useEffect(() => {
    fetchWarnings();
  }, [activeTab]);

  async function fetchWarnings() {
    setLoading(true);
    try {
      const res = await fetch(`/api/warnings?acknowledged=${activeTab}&limit=200`);
      const data = await res.json();

      if (res.ok) {
        setWarnings(data.warnings || []);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch warnings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching warnings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(warningId: number) {
    setAcknowledging(warningId);

    try {
      const res = await fetch('/api/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warning_ids: [warningId],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Remove from list or refetch
        setWarnings(prev => prev.filter(w => w.id !== warningId));
        console.log('Warning acknowledged:', data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error acknowledging warning:', error);
      alert('Failed to acknowledge warning');
    } finally {
      setAcknowledging(null);
    }
  }

  async function handleBulkAcknowledge() {
    if (!confirm('Acknowledge all unacknowledged warnings?')) {
      return;
    }

    setBulkAcknowledging(true);

    try {
      const res = await fetch('/api/warnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warning_ids: 'all',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchWarnings();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error bulk acknowledging:', error);
      alert('Failed to bulk acknowledge');
    } finally {
      setBulkAcknowledging(false);
    }
  }

  async function handleDeleteAcknowledged() {
    if (!confirm('Delete all acknowledged warnings? This cannot be undone.')) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch('/api/warnings', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchWarnings();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting warnings:', error);
      alert('Failed to delete warnings');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const unacknowledgedCount = summary?.total_unacknowledged || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sync Warnings</h1>
            <p className="text-gray-600 mt-1">
              Review non-blocking issues from sync operations
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchWarnings}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {unacknowledgedCount > 0 && (
              <Button
                onClick={handleBulkAcknowledge}
                disabled={bulkAcknowledging}
              >
                {bulkAcknowledging && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Acknowledge All
              </Button>
            )}

            <Button
              variant="destructive"
              onClick={handleDeleteAcknowledged}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              Clean Up
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Unacknowledged</CardDescription>
                <CardTitle className="text-3xl">{summary.total_unacknowledged}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>High Severity</CardDescription>
                <CardTitle className="text-3xl text-orange-600">{summary.by_severity.high}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Medium Severity</CardDescription>
                <CardTitle className="text-3xl text-yellow-600">{summary.by_severity.medium}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Low Severity</CardDescription>
                <CardTitle className="text-3xl text-blue-600">{summary.by_severity.low}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="false">
              Unacknowledged
              {unacknowledgedCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unacknowledgedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="true">Acknowledged</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {warnings.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-lg font-medium">
                    {activeTab === 'false'
                      ? 'No unacknowledged warnings'
                      : activeTab === 'true'
                      ? 'No acknowledged warnings'
                      : 'No warnings'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {activeTab === 'false'
                      ? 'All warnings have been acknowledged!'
                      : 'No warnings found.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              warnings.map((warning) => (
                <WarningListCard
                  key={warning.id}
                  warning={warning}
                  onAcknowledge={handleAcknowledge}
                  acknowledging={acknowledging === warning.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
