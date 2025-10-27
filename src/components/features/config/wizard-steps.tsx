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
interface ApiConfigStepProps {
  apiKeys: {
    jotform: string;
    givebutter: string;
  };
  setApiKeys: (keys: any) => void;
  storedConfig: SyncConfig | null;
  apiStatus: ApiStatus;
  testingApis: boolean;
  onTestApis: () => void;
}

export function ApiConfigStep({
  apiKeys,
  setApiKeys,
  storedConfig,
  apiStatus,
  testingApis,
  onTestApis,
}: ApiConfigStepProps) {
  return (
    <div className="space-y-6">
      {/* Status Card */}
      {storedConfig?.configured && storedConfig.config && (
        <StatusCard
          title="API Configuration"
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

      {/* Jotform API */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Jotform API</h4>
        <div className="space-y-2">
          <Label htmlFor="jotform-key">
            API Key {storedConfig?.configured && <span className="text-success-text text-xs ml-2">(configured)</span>}
          </Label>
          <Input
            id="jotform-key"
            type="password"
            placeholder={storedConfig?.configured ? "••••••••••••••••••••••••" : "Enter your Jotform API key"}
            value={apiKeys.jotform}
            onChange={e => setApiKeys({ ...apiKeys, jotform: e.target.value })}
            autoComplete="off"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground">
            {storedConfig?.configured
              ? 'Leave empty to keep existing key, or enter a new one to update'
              : 'Get your API key from Jotform → Settings → API'
            }
          </p>
        </div>
      </div>

      <Separator />

      {/* Givebutter API */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Givebutter API</h4>
        <div className="space-y-2">
          <Label htmlFor="givebutter-key">
            API Key {storedConfig?.configured && <span className="text-success-text text-xs ml-2">(configured)</span>}
          </Label>
          <Input
            id="givebutter-key"
            type="password"
            placeholder={storedConfig?.configured ? "••••••••••••••••••••••••" : "Enter your Givebutter API key"}
            value={apiKeys.givebutter}
            onChange={e => setApiKeys({ ...apiKeys, givebutter: e.target.value })}
            autoComplete="off"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground">
            {storedConfig?.configured
              ? 'Leave empty to keep existing key, or enter a new one to update'
              : 'Get your API key from Givebutter → Settings → API'
            }
          </p>
        </div>
      </div>

      <Separator />

      {/* Test Button */}
      <div className="space-y-3">
        <Button
          onClick={onTestApis}
          disabled={testingApis || (!apiKeys.jotform && !storedConfig?.configured) || (!apiKeys.givebutter && !storedConfig?.configured)}
          variant="default"
          size="lg"
          className="w-full"
        >
          {testingApis ? 'Testing APIs...' : 'Test API Connections'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {storedConfig?.configured
            ? 'Test with stored keys or enter new ones'
            : 'Test your API keys before proceeding to form selection'
          }
        </p>
      </div>

      {/* API Status */}
      {(apiStatus.jotform !== null || apiStatus.givebutter !== null) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Status</AlertTitle>
          <AlertDescription className="space-y-2">
            {apiStatus.jotform !== null && (
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${apiStatus.jotform ? 'bg-success-DEFAULT' : 'bg-error-DEFAULT'}`} />
                <span className="text-sm">
                  Jotform: {apiStatus.jotform ? 'Connected ✓' : 'Failed ✗'}
                </span>
              </div>
            )}
            {apiStatus.givebutter !== null && (
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${apiStatus.givebutter ? 'bg-success-DEFAULT' : 'bg-error-DEFAULT'}`} />
                <span className="text-sm">
                  Givebutter: {apiStatus.givebutter ? 'Connected ✓' : 'Failed ✗'}
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Step 2: Forms Selection
interface FormsStepProps {
  apiKeys: {
    jotformSignupForm: string;
    jotformSetupForm: string;
    jotformTrainingSignupForm: string;
    givebutterCampaign: string;
  };
  setApiKeys: (keys: any) => void;
  jotformForms: JotformForm[];
  givebutterCampaigns: GivebutterCampaign[];
  discoveringJotform: boolean;
  discoveringGivebutter: boolean;
  onDiscoverJotform: () => void;
  onDiscoverGivebutter: () => void;
}

export function FormsStep({
  apiKeys,
  setApiKeys,
  jotformForms,
  givebutterCampaigns,
  discoveringJotform,
  discoveringGivebutter,
  onDiscoverJotform,
  onDiscoverGivebutter,
}: FormsStepProps) {
  return (
    <div className="space-y-6">
      {/* Jotform Forms */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Jotform Forms</h4>
        <Button
          onClick={onDiscoverJotform}
          disabled={discoveringJotform || jotformForms.length > 0}
          variant="outline"
          className="w-full"
        >
          {discoveringJotform ? 'Loading Forms...' : jotformForms.length > 0 ? `✓ Loaded ${jotformForms.length} Forms` : 'Discover Available Forms'}
        </Button>

        {jotformForms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-2">
              <FormSelector
                label="Signup Form"
                placeholder="Select a form..."
                options={jotformForms.map(form => ({
                  id: form.id,
                  title: form.title,
                  count: form.count,
                  status: form.status,
                }))}
                value={apiKeys.jotformSignupForm}
                onChange={value => setApiKeys({ ...apiKeys, jotformSignupForm: value })}
                searchable
                required
                description="Form used for initial mentor signups"
              />
            </div>

            <div className="space-y-2">
              <FormSelector
                label="Setup Form"
                placeholder="Select a form..."
                options={jotformForms.map(form => ({
                  id: form.id,
                  title: form.title,
                  count: form.count,
                  status: form.status,
                }))}
                value={apiKeys.jotformSetupForm}
                onChange={value => setApiKeys({ ...apiKeys, jotformSetupForm: value })}
                searchable
                required
                description="Form for mentor setup and preferences"
              />
            </div>

            <div className="space-y-2">
              <FormSelector
                label="Training Signup Form"
                placeholder="Select a form..."
                options={jotformForms.map(form => ({
                  id: form.id,
                  title: form.title,
                  count: form.count,
                  status: form.status,
                }))}
                value={apiKeys.jotformTrainingSignupForm}
                onChange={value => setApiKeys({ ...apiKeys, jotformTrainingSignupForm: value })}
                searchable
                required
                description="Form for training session signups"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Givebutter Campaigns */}
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">Givebutter Campaign</h4>
        <Button
          onClick={onDiscoverGivebutter}
          disabled={discoveringGivebutter || givebutterCampaigns.length > 0}
          variant="outline"
          className="w-full"
        >
          {discoveringGivebutter ? 'Loading Campaigns...' : givebutterCampaigns.length > 0 ? `✓ Loaded ${givebutterCampaigns.length} Campaigns` : 'Discover Available Campaigns'}
        </Button>

        {givebutterCampaigns.length > 0 && (
          <FormSelector
            label="Campaign"
            placeholder="Select a campaign..."
            options={givebutterCampaigns.map(campaign => ({
              id: campaign.code,
              title: campaign.title,
              count: campaign.members_count,
            }))}
            value={apiKeys.givebutterCampaign}
            onChange={value => setApiKeys({ ...apiKeys, givebutterCampaign: value })}
            searchable
            required
            description="Givebutter fundraising campaign for this event"
          />
        )}
      </div>
    </div>
  );
}

// Step 3: CSV Upload
interface UploadStepProps {
  uploadedFile: File | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadStep({ uploadedFile, uploadStatus, onFileUpload }: UploadStepProps) {
  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center bg-muted/10">
        <input
          type="file"
          accept=".csv"
          onChange={onFileUpload}
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
            Supports Givebutter contacts export format
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
interface ReviewStepProps {
  apiKeys: {
    jotform: string;
    givebutter: string;
    jotformSignupForm: string;
    jotformSetupForm: string;
    jotformTrainingSignupForm: string;
    givebutterCampaign: string;
  };
  apiStatus: ApiStatus;
  storedConfig: SyncConfig | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  savingConfig: boolean;
  syncRunning: boolean;
  syncProgress: Array<{ step: string; status: 'running' | 'completed' | 'error' }>;
  onSaveConfig: () => void;
  onRunSync: () => void;
}

export function ReviewStep({
  apiKeys,
  apiStatus,
  storedConfig,
  uploadStatus,
  savingConfig,
  syncRunning,
  syncProgress,
  onSaveConfig,
  onRunSync,
}: ReviewStepProps) {
  // Check if APIs have been tested
  const apisNotTested = (apiStatus.jotform !== true && !storedConfig?.configured) ||
                        (apiStatus.givebutter !== true && !storedConfig?.configured);

  return (
    <div className="space-y-6">
      {/* Warning if APIs not tested */}
      {apisNotTested && (
        <Alert className="bg-warning/10 border-warning/20">
          <AlertCircle className="h-4 w-4 text-warning-text" />
          <AlertTitle className="text-warning-text font-semibold">API Keys Not Tested</AlertTitle>
          <AlertDescription className="text-warning-text">
            Please go back to Step 1 and test your API connections before saving the configuration.
          </AlertDescription>
        </Alert>
      )}

      {/* Pre-sync Checklist */}
      <Checklist
        title="Pre-sync Checklist"
        showProgress
        items={[
          {
            id: 'jotform-api',
            label: 'Jotform API configured',
            completed: apiStatus.jotform === true || !!storedConfig?.configured,
            required: true,
            description: 'Jotform API key has been configured and tested'
          },
          {
            id: 'givebutter-api',
            label: 'Givebutter API configured',
            completed: apiStatus.givebutter === true || !!storedConfig?.configured,
            required: true,
            description: 'Givebutter API key has been configured and tested'
          },
          {
            id: 'forms-selected',
            label: 'Forms and campaigns selected',
            completed: !!(apiKeys.jotformSignupForm && apiKeys.jotformSetupForm && apiKeys.jotformTrainingSignupForm && apiKeys.givebutterCampaign),
            required: true,
            description: 'All required forms and campaign have been selected'
          },
          {
            id: 'csv-uploaded',
            label: 'CSV file uploaded',
            completed: uploadStatus === 'success',
            description: 'Givebutter export CSV has been uploaded successfully'
          },
          {
            id: 'config-saved',
            label: 'Configuration saved',
            completed: !!storedConfig?.configured,
            required: true,
            description: 'All settings have been saved to the database'
          },
        ]}
      />

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={onSaveConfig}
            disabled={
              // Need either: new key entered OR stored config OR tested API in this session
              (!apiKeys.jotform && !storedConfig?.configured && apiStatus.jotform !== true) ||
              (!apiKeys.givebutter && !storedConfig?.configured && apiStatus.givebutter !== true) ||
              !apiKeys.jotformSignupForm ||
              !apiKeys.jotformSetupForm ||
              !apiKeys.jotformTrainingSignupForm ||
              !apiKeys.givebutterCampaign ||
              savingConfig
            }
            variant="default"
            size="lg"
            className="w-full"
          >
            {savingConfig ? 'Saving...' : storedConfig?.configured ? 'Update Config' : 'Save Config'}
          </Button>
          <Button
            onClick={onRunSync}
            disabled={syncRunning || !storedConfig?.configured || uploadStatus !== 'success'}
            variant="default"
            size="lg"
            className="w-full"
          >
            {syncRunning ? 'Sync Running...' : 'Run Full Sync'}
          </Button>
        </div>
        <Alert className="bg-info/10 border-info/20">
          <AlertCircle className="h-4 w-4 text-info-text" />
          <AlertDescription className="text-info-text">
            {!storedConfig?.configured
              ? 'Save your configuration first before running the sync'
              : uploadStatus !== 'success'
              ? 'Upload a CSV file before running the full sync, or proceed to save config only'
              : 'Configuration saved! You can now run the full sync'
            }
          </AlertDescription>
        </Alert>
      </div>

      {/* Sync Progress */}
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
          <p>This will synchronize all data from your configured sources</p>
        </div>
      )}
    </div>
  );
}
