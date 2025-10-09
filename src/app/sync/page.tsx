'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Settings, Upload, RefreshCw } from 'lucide-react';

interface SyncConfig {
  configured: boolean;
  config: {
    configured_at: string;
  } | null;
}

export default function SyncPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [storedConfig, setStoredConfig] = useState<SyncConfig | null>(null);
  const [syncRunning, setSyncRunning] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogVariant, setDialogVariant] = useState<'default' | 'success' | 'error' | 'warning'>('default');

  // Helper function to show dialog
  const showDialog = (
    message: string,
    title: string = '',
    variant: 'default' | 'success' | 'error' | 'warning' = 'default'
  ) => {
    setDialogMessage(message);
    setDialogTitle(title);
    setDialogVariant(variant);
    setDialogOpen(true);
  };

  // Load stored configuration on mount
  useEffect(() => {
    loadStoredConfig();
  }, []);

  const loadStoredConfig = async () => {
    try {
      const response = await fetch('/api/sync/config');
      if (response.ok) {
        const data = await response.json();
        setStoredConfig(data);
      }
    } catch (error) {
      console.error('Error loading stored config:', error);
    }
  };

  const handleManualSync = async () => {
    if (!storedConfig?.configured) {
      showDialog(
        'Please configure your APIs in Settings first.',
        'Configuration Required',
        'warning'
      );
      return;
    }

    setSyncRunning(true);

    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to start sync');
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          // Just consume the stream for now
          console.log(chunk);
        }
      }

      showDialog(
        'All data has been synced successfully!',
        'Sync Complete',
        'success'
      );
      await loadStoredConfig(); // Reload to get updated stats
    } catch (error) {
      console.error('Error running sync:', error);
      showDialog(
        'Failed to run sync. Please check the console for details.',
        'Sync Failed',
        'error'
      );
    } finally {
      setSyncRunning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadStatus('uploading');

    // TODO: Implement actual file upload to backend API
    // This is currently just a mock implementation
    setTimeout(() => {
      setUploadStatus('success');
    }, 2000);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Sync</h1>
              <p className="text-gray-600">Upload CSV files and manage data synchronization</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleManualSync}
                disabled={!storedConfig?.configured || syncRunning}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncRunning ? 'animate-spin' : ''}`} />
                {syncRunning ? 'Syncing...' : 'Manual Sync'}
              </Button>
              <Link href="/settings?tab=api-config">
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  API Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CSV Upload Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">CSV Import</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Upload Givebutter contacts export CSV files for data synchronization.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Click to upload CSV
                </p>
                <p className="text-xs text-gray-500">
                  or drag and drop
                </p>
              </label>
            </div>

            {/* Upload Status */}
            {uploadedFile && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="text-sm">
                    {uploadStatus === 'uploading' && (
                      <span className="text-blue-600">Uploading...</span>
                    )}
                    {uploadStatus === 'success' && (
                      <span className="text-green-600">✓ Uploaded</span>
                    )}
                    {uploadStatus === 'error' && (
                      <span className="text-red-600">✗ Error</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Future Features Section */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Coming Soon</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Sync Monitoring</p>
                <p>Real-time sync status and progress tracking</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">API Status</p>
                <p>Live connection status for Jotform and Givebutter APIs</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Sync History</p>
                <p>Detailed logs of past sync operations</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Error Tracking</p>
                <p>Automatic error detection and reporting</p>
              </div>
            </div>
          </Card>
        </div>

        {/* TODO: Future Features Section */}
        {/*
        Future Ideas for Sync Page:
        1. Real-time sync status dashboard with live updates
        2. API health monitoring with automatic reconnection
        3. Sync history with filtering and search capabilities
        4. Error alerting and notification system
        5. Performance metrics and analytics
        6. Automated sync scheduling
        7. Data validation and quality checks
        8. Integration with external monitoring services
        */}
      </div>

      {/* Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        variant={dialogVariant}
      >
        {dialogMessage}
      </Dialog>
    </div>
  );
}
