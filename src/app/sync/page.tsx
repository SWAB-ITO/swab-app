'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/composite/status-badge';
import { StatCard } from '@/components/composite/stat-card';
import { SyncActionCard } from '@/components/features/sync/sync-action-card';
import { SyncLogList, SyncLog as SyncLogType } from '@/components/features/sync/sync-log-list';
import { ErrorLogList, ConflictError } from '@/components/features/sync/error-log-list';
import { Settings, Upload, RefreshCw, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface InitStatus {
  initialized: boolean;
  configuredAt?: string;
  lastSyncAt?: string;
}

// Using SyncLog type from SyncLogList component

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
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="inline-block mb-3">
                <span className="text-sm font-semibold text-info-text bg-info-DEFAULT/10 px-4 py-2 rounded-full border border-info-DEFAULT/20">
                  Data Synchronization
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                Sync Dashboard
              </h1>
              <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
                Run syncs and monitor status.
              </p>
            </div>
            <Link href="/settings?tab=api-config">
              <Button size="lg" variant="outline" className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all shadow-sm">
                <Settings className="h-5 w-5" />
                Configure
              </Button>
            </Link>
          </div>
        </div>

        {/* System Status Section */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <div className="w-1 h-8 bg-info-DEFAULT rounded-full"></div>
              System Status
            </h2>
            <p className="text-muted-foreground text-base ml-7">System configuration and status.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </section>

      {/* Sync Operations Section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <div className="w-1 h-8 bg-primary rounded-full"></div>
            Sync Operations
          </h2>
          <p className="text-muted-foreground text-base ml-7">Run synchronization tasks.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          actionLabel="Select CSV File"
          loading={csvUploading}
          onAction={() => document.getElementById('csv-upload')?.click()}
          outputLines={uploadOutput}
          onClearOutput={() => setUploadOutput([])}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
            disabled={csvUploading}
          />
        </SyncActionCard>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <div className="w-1 h-8 bg-success-DEFAULT rounded-full"></div>
            Recent Activity
          </h2>
          <p className="text-muted-foreground text-base ml-7">Recent sync operations.</p>
        </div>
        <SyncLogList
          logs={syncLogs}
          maxLogs={10}
        />
      </section>

      {/* Errors & Conflicts Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <div className="w-1 h-8 bg-error-DEFAULT rounded-full"></div>
            Errors & Conflicts
          </h2>
          <p className="text-muted-foreground text-base ml-7">Review and resolve conflicts.</p>
        </div>
        <ErrorLogList errors={errors} />
      </section>
      </div>
    </div>
  );
}
