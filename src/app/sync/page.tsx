'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/composite/status-badge';
import { StatCard } from '@/components/composite/stat-card';
import { SyncActionCard } from '@/components/features/sync/sync-action-card';
import { SyncLogList, SyncLog as SyncLogType } from '@/components/features/sync/sync-log-list';
import { Settings, Upload, RefreshCw, Play, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface InitStatus {
  initialized: boolean;
  configuredAt?: string;
  lastSyncAt?: string;
}

// Using SyncLog type from SyncLogList component

interface ConflictError {
  error_id: string;
  mn_id?: string;
  error_type: string;
  error_message: string;
  severity: string;
  created_at: string;
}

export default function SyncDashboard() {
  const [initStatus, setInitStatus] = useState<InitStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogType[]>([]);
  const [errors, setErrors] = useState<ConflictError[]>([]);
  const [syncRunning, setSyncRunning] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [syncOutput, setSyncOutput] = useState<string[]>([]);
  const [uploadOutput, setUploadOutput] = useState<string[]>([]);

  useEffect(() => {
    loadInitStatus();
    loadSyncLogs();
    loadErrors();

    // Refresh logs every 30 seconds
    const interval = setInterval(() => {
      if (!syncRunning && !csvUploading) {
        loadSyncLogs();
        loadErrors();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [syncRunning, csvUploading]);

  const loadInitStatus = async () => {
    try {
      const response = await fetch('/api/sync/init');
      if (response.ok) {
        const data = await response.json();
        setInitStatus(data);
      }
    } catch (error) {
      console.error('Error loading init status:', error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await fetch('/api/sync/logs?type=sync_log&limit=10');
      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading sync logs:', error);
    }
  };

  const loadErrors = async () => {
    try {
      const response = await fetch('/api/sync/logs?type=errors&limit=10');
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error('Error loading errors:', error);
    }
  };

  const handlePeriodicSync = async () => {
    if (!initStatus?.initialized) {
      alert('System not initialized. Please configure APIs first.');
      return;
    }

    setSyncRunning(true);
    setSyncOutput([]);

    try {
      const response = await fetch('/api/sync/periodic', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));
              setSyncOutput(prev => [...prev, data.message]);
            }
          }
        }
      }

      await loadSyncLogs();
      await loadInitStatus();
    } catch (error) {
      console.error('Error running sync:', error);
      setSyncOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setSyncRunning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setUploadOutput([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sync/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload CSV');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));
              setUploadOutput(prev => [...prev, data.message]);
            }
          }
        }
      }

      await loadSyncLogs();
      await loadErrors();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadOutput(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setCsvUploading(false);
    }
  };


  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Sync Dashboard</h1>
            <p className="text-muted-foreground text-lg">Monitor and manage data synchronization</p>
          </div>
          <Link href="/settings?tab=api-config">
            <Button variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="System Status"
          value={initStatus?.initialized ? 'Initialized' : 'Not Configured'}
          description={initStatus?.configuredAt
            ? `Configured: ${new Date(initStatus.configuredAt).toLocaleDateString()}`
            : 'Not configured yet'}
          icon={initStatus?.initialized ? CheckCircle : AlertCircle}
          colorScheme={initStatus?.initialized ? 'success' : 'warning'}
        />

        <StatCard
          title="Last Sync"
          value={initStatus?.lastSyncAt
            ? new Date(initStatus.lastSyncAt).toLocaleDateString()
            : 'Never'}
          description={initStatus?.lastSyncAt
            ? new Date(initStatus.lastSyncAt).toLocaleTimeString()
            : 'No syncs yet'}
          icon={Clock}
        />

        <StatCard
          title="Active Errors"
          value={errors.length}
          description="Unresolved issues"
          icon={AlertCircle}
          colorScheme={errors.length > 0 ? 'error' : 'success'}
        />
      </div>

      {/* Sync Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SyncActionCard
          icon={RefreshCw}
          title="Periodic Sync"
          description="Sync from APIs: Jotform signups/setup + Givebutter members + ETL + API contact sync"
          tier={2}
          actionLabel="Run Periodic Sync"
          loading={syncRunning}
          disabled={!initStatus?.initialized}
          onAction={handlePeriodicSync}
          outputLines={syncOutput}
          onClearOutput={() => setSyncOutput([])}
        />

        <SyncActionCard
          icon={Upload}
          title="CSV Upload"
          description="Upload Givebutter full export → match contacts → capture contact_ids"
          tier={3}
          actionLabel="Upload CSV"
          loading={csvUploading}
          onAction={() => document.getElementById('csv-upload')?.click()}
          outputLines={uploadOutput}
          onClearOutput={() => setUploadOutput([])}
        >
          <div className="border-2 border-dashed border-border/40 rounded-lg p-6 text-center bg-muted/10">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={csvUploading}
            />
            <label
              htmlFor="csv-upload"
              className={`${csvUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} flex flex-col items-center`}
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                {csvUploading ? 'Uploading...' : 'Click to upload CSV'}
              </p>
              <p className="text-xs text-gray-500">Givebutter full contact export</p>
            </label>
          </div>
        </SyncActionCard>
      </div>

      {/* Recent Sync Logs */}
      <SyncLogList
        logs={syncLogs}
        className="mb-8"
        maxLogs={10}
      />

        {/* Errors and Conflicts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Errors & Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
          {errors.length === 0 ? (
            <p className="text-muted-foreground text-sm">No unresolved errors</p>
          ) : (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div key={error.error_id || `error-${index}`} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{error.error_type.replace(/_/g, ' ')}</span>
                        <StatusBadge severity={error.severity as 'info' | 'warning' | 'error' | 'critical'} />
                      </div>
                      {error.mn_id && (
                        <p className="text-xs text-gray-500 mb-1">Mentor ID: {error.mn_id}</p>
                      )}
                      <p className="text-sm text-gray-700">{error.error_message}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(error.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          </CardContent>
        </Card>
    </div>
  );
}
