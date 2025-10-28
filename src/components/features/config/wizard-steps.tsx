'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormSelector } from '@/components/composite/form-selector';
import { Checklist } from '@/components/composite/checklist';
import { StatusCard } from '@/components/composite/status-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useConfigWizard } from './wizard-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Exported Types
export interface JotformForm {
  id: string;
  title: string;
  count: number;
  status: string;
}

export interface GivebutterCampaign {
  id: number;
  code: string;
  title: string;
  members_count: number;
}

export interface ApiStatus {
  jotform: boolean | null;
  givebutter: boolean | null;
}

export interface SyncConfig {
  configured: boolean;
  config: {
    jotform_api_key: string;
    givebutter_api_key: string;
    jotform_signup_form_id: string;
    jotform_setup_form_id: string;
    jotform_training_signup_form_id?: string;
    givebutter_campaign_code: string;
    configured_at: string;
  } | null;
  stats: Array<{
    sync_type: string;
    last_sync: string;
    total_syncs: number;
    failed_syncs: number;
    avg_duration_seconds: number;
  }>;
}

// Step 1: API Configuration
export function ApiConfigStep() {
  const { state, dispatch } = useConfigWizard();
  const { apiKeys, storedConfig, apiStatus, testingApis } = state;

  const handleTestApis = async () => {
    dispatch({ type: 'SET_UI_STATE', payload: { key: 'testingApis', value: true } });
    dispatch({ type: 'SET_API_STATUS', payload: { jotform: null, givebutter: null } });

    try {
      const jotformKey = apiKeys.jotform || storedConfig?.config?.jotform_api_key;
      const givebutterKey = apiKeys.givebutter || storedConfig?.config?.givebutter_api_key;

      if (!jotformKey || !givebutterKey) return;

      const response = await fetch('/api/sync/test-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jotform: jotformKey,
          givebutter: givebutterKey,
        }),
      });

      const result = await response.json();
      dispatch({ type: 'SET_API_STATUS', payload: result });

      if (result.jotform && result.givebutter) {
        dispatch({ type: 'SET_TESTED_API_KEYS', payload: { jotform: jotformKey, givebutter: givebutterKey } });
      }
    } catch (error) {
      console.error('Error testing APIs:', error);
      dispatch({ type: 'SET_API_STATUS', payload: { jotform: false, givebutter: false } });
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { key: 'testingApis', value: false } });
    }
  };

  return (
    <div className="space-y-6">
      {storedConfig?.configured && storedConfig.config && (
        <StatusCard
          title="Current Configuration"
          configured={storedConfig.configured}
          configuredAt={storedConfig.config.configured_at ? new Date(storedConfig.config.configured_at) : undefined}
          metrics={storedConfig.stats?.map(stat => ({
            label: stat.sync_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: stat.last_sync ? new Date(stat.last_sync).toLocaleString() : 'Never',
            timestamp: stat.last_sync ? new Date(stat.last_sync) : undefined,
            status: stat.failed_syncs > 0 ? ('error' as const) : ('success' as const),
          })) || []}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="jotform-key">Jotform API Key</Label>
            <div className="flex items-center gap-2">
              {apiStatus.jotform !== null && (
                apiStatus.jotform ? <Badge variant="success">Connected</Badge> : <Badge variant="destructive">Failed</Badge>
              )}
              {storedConfig?.configured && <Badge variant="outline">Configured</Badge>}
            </div>
          </div>
          <Input
            id="jotform-key"
            type="password"
            placeholder="••••••••••••••••••••••••"
            value={apiKeys.jotform}
            onChange={e => dispatch({ type: 'SET_API_KEY', payload: { key: 'jotform', value: e.target.value } })}
            autoComplete="off"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground">
            {storedConfig?.configured ? 'Enter new key to update.' : 'From Jotform → Settings → API.'}
          </p>
        </div>

        <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label htmlFor="givebutter-key">Givebutter API Key</Label>
            <div className="flex items-center gap-2">
                {apiStatus.givebutter !== null && (
                    apiStatus.givebutter ? <Badge variant="success">Connected</Badge> : <Badge variant="destructive">Failed</Badge>
                )}
                {storedConfig?.configured && <Badge variant="outline">Configured</Badge>}
            </div>
          </div>
          <Input
            id="givebutter-key"
            type="password"
            placeholder="••••••••••••••••••••••••"
            value={apiKeys.givebutter}
            onChange={e => dispatch({ type: 'SET_API_KEY', payload: { key: 'givebutter', value: e.target.value } })}
            autoComplete="off"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground">
            {storedConfig?.configured ? 'Enter new key to update.' : 'From Givebutter → Settings → API.'}
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <Button
          onClick={handleTestApis}
          disabled={testingApis || (!apiKeys.jotform && !storedConfig?.configured) || (!apiKeys.givebutter && !storedConfig?.configured)}
          variant="default"
          size="lg"
          className="w-full"
        >
          {testingApis ? 'Testing...' : 'Test Connections'}
        </Button>
      </div>
    </div>
  );
}

// Step 2: Forms Selection
export function FormsStep() {
  const { state, dispatch } = useConfigWizard();
  const { apiKeys, jotformForms, givebutterCampaigns, discoveringJotform, discoveringGivebutter, testedApiKeys, storedConfig } = state;

  const handleDiscoverJotform = async () => {
    const jotformKey = apiKeys.jotform || testedApiKeys.jotform || storedConfig?.config?.jotform_api_key;
    if (!jotformKey) return;

    dispatch({ type: 'SET_UI_STATE', payload: { key: 'discoveringJotform', value: true } });
    try {
      const response = await fetch('/api/sync/discover-jotform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: jotformKey }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_JOTFORM_FORMS', payload: data.forms });
      }
    } catch (error) {
      console.error('Error discovering Jotform forms:', error);
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { key: 'discoveringJotform', value: false } });
    }
  };

  const handleDiscoverGivebutter = async () => {
    const givebutterKey = apiKeys.givebutter || testedApiKeys.givebutter || storedConfig?.config?.givebutter_api_key;
    if (!givebutterKey) return;

    dispatch({ type: 'SET_UI_STATE', payload: { key: 'discoveringGivebutter', value: true } });
    try {
      const response = await fetch('/api/sync/discover-givebutter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: givebutterKey }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_GIVEBUTTER_CAMPAIGNS', payload: data.campaigns });
      }
    } catch (error) {
      console.error('Error discovering Givebutter campaigns:', error);
    } finally {
      dispatch({ type: 'SET_UI_STATE', payload: { key: 'discoveringGivebutter', value: false } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Jotform Forms Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Jotform Forms</CardTitle>
              <CardDescription className="text-sm">Select three required forms.</CardDescription>
            </div>
            <Button
              onClick={handleDiscoverJotform}
              disabled={discoveringJotform || jotformForms.length > 0}
              variant="outline"
            >
              {discoveringJotform ? 'Loading...' : jotformForms.length > 0 ? `✓ Loaded ${jotformForms.length}` : 'Load Forms'}
            </Button>
          </div>
        </CardHeader>
        {jotformForms.length > 0 && (
          <CardContent className="space-y-6 pt-6 border-t">
            <FormSelector
              label="Signup Form"
              placeholder="Select a form..."
              options={jotformForms.map(form => ({ id: form.id, title: form.title, count: form.count, status: form.status }))}
              value={apiKeys.jotformSignupForm}
              onChange={value => dispatch({ type: 'SET_FORM_ID', payload: { key: 'jotformSignupForm', value } })}
              searchable
              required
              description="For initial mentor signups."
            />
            <FormSelector
              label="Setup Form"
              placeholder="Select a form..."
              options={jotformForms.map(form => ({ id: form.id, title: form.title, count: form.count, status: form.status }))}
              value={apiKeys.jotformSetupForm}
              onChange={value => dispatch({ type: 'SET_FORM_ID', payload: { key: 'jotformSetupForm', value } })}
              searchable
              required
              description="For mentor setup."
            />
            <FormSelector
              label="Training Signup Form"
              placeholder="Select a form..."
              options={jotformForms.map(form => ({ id: form.id, title: form.title, count: form.count, status: form.status }))}
              value={apiKeys.jotformTrainingSignupForm}
              onChange={value => dispatch({ type: 'SET_FORM_ID', payload: { key: 'jotformTrainingSignupForm', value } })}
              searchable
              required
              description="For training signups."
            />
          </CardContent>
        )}
      </Card>

      {/* Givebutter Campaign Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Givebutter Campaign</CardTitle>
              <CardDescription className="text-sm">Select a fundraising campaign.</CardDescription>
            </div>
            <Button
              onClick={handleDiscoverGivebutter}
              disabled={discoveringGivebutter || givebutterCampaigns.length > 0}
              variant="outline"
            >
              {discoveringGivebutter ? 'Loading...' : givebutterCampaigns.length > 0 ? `✓ Loaded ${givebutterCampaigns.length}` : 'Load Campaigns'}
            </Button>
          </div>
        </CardHeader>
        {givebutterCampaigns.length > 0 && (
          <CardContent className="pt-6 border-t">
            <FormSelector
              label="Campaign"
              placeholder="Select a campaign..."
              options={givebutterCampaigns.map(campaign => ({ id: campaign.code, title: campaign.title, count: campaign.members_count }))}
              value={apiKeys.givebutterCampaign}
              onChange={value => dispatch({ type: 'SET_FORM_ID', payload: { key: 'givebutterCampaign', value } })}
              searchable
              required
              description="Fundraising campaign for this event."
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Step 3: CSV Upload
export function UploadStep() {
  const { state, dispatch } = useConfigWizard();
  const { uploadedFile, uploadStatus } = state;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch({ type: 'SET_UPLOAD_FILE', payload: { file, status: 'uploading' } });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sync/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        dispatch({ type: 'SET_UPLOAD_FILE', payload: { file, status: 'success' } });
      } else {
        dispatch({ type: 'SET_UPLOAD_FILE', payload: { file, status: 'error' } });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      dispatch({ type: 'SET_UPLOAD_FILE', payload: { file, status: 'error' } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center bg-muted/10">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload-wizard"
        />
        <label
          htmlFor="csv-upload-wizard"
          className="cursor-pointer flex flex-col items-center"
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-1">
            Click to upload CSV
          </p>
          <p className="text-sm text-muted-foreground">
            or drag and drop
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">
            Givebutter contacts export.
          </p>
        </label>
      </div>

      {/* Upload Status */}
      {uploadedFile && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="text-sm">
              {uploadStatus === 'uploading' && (
                <span className="text-info-text">Uploading...</span>
              )}
              {uploadStatus === 'success' && (
                <span className="text-success-text">✓ Uploaded</span>
              )}
              {uploadStatus === 'error' && (
                <span className="text-error-text">✗ Error</span>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Upload Successful</AlertTitle>
          <AlertDescription>
            CSV file uploaded successfully! You can now proceed to save configuration and run the sync.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Step 4: Review & Sync
export function ReviewStep({ onSaveConfig, onRunSync, savingConfig, syncRunning, syncProgress }: {
  onSaveConfig: () => void;
  onRunSync: () => void;
  savingConfig: boolean;
  syncRunning: boolean;
  syncProgress: Array<{ step: string; status: 'running' | 'completed' | 'error' }>;
}) {
  const { state } = useConfigWizard();
  const { apiKeys, apiStatus, storedConfig, uploadStatus } = state;
  const apisNotTested = (apiStatus.jotform !== true && !storedConfig?.configured) ||
                        (apiStatus.givebutter !== true && !storedConfig?.configured);

  return (
    <div className="space-y-6">
      {/* Warning if APIs not tested */}
      {apisNotTested && (
        <Alert className="bg-warning/10 border-warning/20">
          <AlertCircle className="h-4 w-4 text-warning-text" />
          <AlertTitle className="text-warning-text font-semibold">APIs Not Tested</AlertTitle>
          <AlertDescription className="text-warning-text">
            Go to Step 1 and test API connections.
          </AlertDescription>
        </Alert>
      )}

      <Checklist
        title="Final Checklist"
        variant="card"
        showProgress
        items={[
          {
            id: 'jotform-api',
            label: 'Jotform API',
            completed: apiStatus.jotform === true || !!storedConfig?.configured,
            required: true,
            description: 'Jotform API key tested.'
          },
          {
            id: 'givebutter-api',
            label: 'Givebutter API',
            completed: apiStatus.givebutter === true || !!storedConfig?.configured,
            required: true,
            description: 'Givebutter API key tested.'
          },
          {
            id: 'forms-selected',
            label: 'Forms & Campaigns',
            completed: !!(apiKeys.jotformSignupForm && apiKeys.jotformSetupForm && apiKeys.jotformTrainingSignupForm && apiKeys.givebutterCampaign),
            required: true,
            description: 'All required forms selected.'
          },
          {
            id: 'csv-uploaded',
            label: 'CSV File',
            completed: uploadStatus === 'success',
            description: 'Givebutter export uploaded.'
          },
          {
            id: 'config-saved',
            label: 'Configuration Saved',
            completed: !!storedConfig?.configured,
            required: true,
            description: 'Settings saved to database.'
          },
        ]}
      />

      <div className="space-y-4 pt-4 border-t">
        {!storedConfig?.configured ? (
          <Button
            onClick={onSaveConfig}
            disabled={savingConfig || apisNotTested || !apiKeys.jotformSignupForm || !apiKeys.jotformSetupForm || !apiKeys.givebutterCampaign}
            size="lg"
            className="w-full"
          >
            {savingConfig ? 'Saving...' : 'Save Configuration'}
          </Button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={onSaveConfig}
              disabled={savingConfig}
              variant="outline"
              size="lg"
            >
              {savingConfig ? 'Saving...' : 'Update Config'}
            </Button>
            <Button
              onClick={onRunSync}
              disabled={syncRunning || uploadStatus !== 'success'}
              size="lg"
            >
              {syncRunning ? 'Sync in Progress...' : 'Run Full Sync'}
            </Button>
          </div>
        )}

        <Alert className="bg-info/10 border-info/20 text-center">
          <AlertCircle className="h-4 w-4 text-info-text mx-auto mb-2" />
          <AlertDescription className="text-info-text">
            {!storedConfig?.configured
              ? 'You must save the configuration before you can run a sync.'
              : uploadStatus !== 'success'
              ? 'A CSV upload is required to run the full sync.'
              : 'Ready to run the full sync.'
            }
          </AlertDescription>
        </Alert>
      </div>

      {syncProgress.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="font-medium text-foreground">Sync Progress</h4>
          <div className="space-y-2">
            {syncProgress.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-foreground">{item.step}</span>
                <span className={`text-sm ${
                  item.status === 'running' ? 'text-info-text' :
                  item.status === 'completed' ? 'text-success-text' :
                  'text-error-text'
                }`}>
                  {item.status === 'running' ? '⏳ Running...' :
                   item.status === 'completed' ? '✓ Completed' :
                   '✗ Error'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!syncRunning && syncProgress.length === 0 && (
        <div className="text-center text-sm text-muted-foreground">
          <p>This will synchronize all data from your sources.</p>
        </div>
      )}
    </div>
  );
}
