'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Upload, RefreshCw, Play, AlertCircle, CheckCircle, Clock, FileText, Database } from 'lucide-react';

interface InitStatus {
  initialized: boolean;
  configuredAt?: string;
  lastSyncAt?: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  records_processed?: number;
  records_inserted?: number;
  error_message?: string;
}

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
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
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

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
      case 'error':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Info</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sync Dashboard</h1>
              <p className="text-gray-600">Monitor and manage data synchronization</p>
            </div>
            <Link href="/settings?tab=api-config">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              {initStatus?.initialized ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <h3 className="font-medium text-gray-900">System Status</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {initStatus?.initialized ? 'Initialized' : 'Not Configured'}
            </p>
            {initStatus?.configuredAt && (
              <p className="text-xs text-gray-500 mt-1">
                Configured: {new Date(initStatus.configuredAt).toLocaleDateString()}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900">Last Sync</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {initStatus?.lastSyncAt
                ? new Date(initStatus.lastSyncAt).toLocaleDateString()
                : 'Never'}
            </p>
            {initStatus?.lastSyncAt && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(initStatus.lastSyncAt).toLocaleTimeString()}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h3 className="font-medium text-gray-900">Active Errors</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{errors.length}</p>
            <p className="text-xs text-gray-500 mt-1">Unresolved issues</p>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Periodic Sync */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Periodic Sync (Tier 2)</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Sync from APIs: Jotform signups/setup + Givebutter members + ETL + API contact sync
            </p>
            <Button
              onClick={handlePeriodicSync}
              disabled={!initStatus?.initialized || syncRunning}
              className="w-full"
            >
              {syncRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Periodic Sync
                </>
              )}
            </Button>

            {syncOutput.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
                {syncOutput.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}
          </Card>

          {/* CSV Upload */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">CSV Upload (Tier 3)</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Upload Givebutter full export → match contacts → capture contact_ids
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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

            {uploadOutput.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-64 overflow-y-auto font-mono text-xs">
                {uploadOutput.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Sync Logs */}
        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Recent Sync Operations</h3>
          </div>

          {syncLogs.filter(log => log.sync_type !== 'automated').length === 0 ? (
            <p className="text-gray-500 text-sm">No sync operations yet</p>
          ) : (
            <div className="space-y-3">
              {syncLogs.filter(log => log.sync_type !== 'automated').map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{log.sync_type.replace(/_/g, ' ')}</span>
                        {getSyncStatusBadge(log.status)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Started: {new Date(log.started_at).toLocaleString()}
                      </p>
                      {log.completed_at && (
                        <p className="text-xs text-gray-500">
                          Duration: {log.duration_seconds}s
                        </p>
                      )}
                    </div>
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
                  {log.error_message && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                      {log.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Errors and Conflicts */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-medium text-gray-900">Errors & Conflicts</h3>
          </div>

          {errors.length === 0 ? (
            <p className="text-gray-500 text-sm">No unresolved errors</p>
          ) : (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div key={error.error_id || `error-${index}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{error.error_type.replace(/_/g, ' ')}</span>
                        {getSeverityBadge(error.severity)}
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
        </Card>
      </div>
    </div>
  );
}
