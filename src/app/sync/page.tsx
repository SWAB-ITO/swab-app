'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/composite/stat-card';
import { SyncActionCard } from '@/components/features/sync/sync-action-card';
import { SyncLogList, SyncLog as SyncLogType } from '@/components/features/sync/sync-log-list';
import { ErrorLogList, ConflictError } from '@/components/features/sync/error-log-list';
import { Settings, Upload, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageSection } from '@/components/layout/page-section';

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
    <PageLayout
      badgeText="Data Synchronization"
      title="Sync Dashboard"
      headerActions={
        <Link href="/settings?tab=api-config">
          <Button size="lg" variant="outline" className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all shadow-sm">
            <Settings className="h-5 w-5" />
            Configure
          </Button>
        </Link>
      }
    >
      <PageSection>
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
      </PageSection>

      <PageSection
        title="Sync Operations"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SyncActionCard
            icon={RefreshCw}
            title="Periodic Sync"
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
      </PageSection>

      <PageSection
        title="Recent Activity"
      >
        <SyncLogList
          logs={syncLogs}
          maxLogs={10}
        />
      </PageSection>

      <PageSection
        title="Errors & Conflicts"
      >
        <ErrorLogList errors={errors} />
      </PageSection>
    </PageLayout>
  );
}
