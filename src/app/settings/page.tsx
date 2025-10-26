'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, User, Database, Bell, Palette, CheckCircle2, AlertCircle } from 'lucide-react';

type Tab = 'account' | 'api-config' | 'preferences';
type SyncTab = 'config' | 'forms' | 'upload' | 'sync';

function SettingsContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || 'account');

  useEffect(() => {
    if (tabParam && ['account', 'api-config', 'preferences'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your account and application preferences</p>
      </div>

      <Separator className="mb-8" />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="api-config" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            API Configuration
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account details and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>User Profile</Label>
                <p className="text-sm text-muted-foreground">User authentication and profile management coming soon</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Session Management</Label>
                <p className="text-sm text-muted-foreground">Login/logout functionality coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-config">
          <ApiConfigContent />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance & Preferences</CardTitle>
              <CardDescription>Customize your application experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">Light/Dark mode toggle coming soon</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Language</Label>
                <p className="text-sm text-muted-foreground">Multi-language support coming soon</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Notifications</Label>
                <p className="text-sm text-muted-foreground">Email and push notification settings coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

interface ApiStatus {
  jotform: boolean | null;
  givebutter: boolean | null;
}

interface JotformForm {
  id: string;
  title: string;
  count: number;
  status: string;
}

interface GivebutterCampaign {
  id: number;
  code: string;
  title: string;
  members_count: number;
}

interface SyncConfig {
  configured: boolean;
  config: {
    jotform_api_key: string;
    givebutter_api_key: string;
    jotform_signup_form_id: string;
    jotform_setup_form_id: string;
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

function ApiConfigContent() {
  const [activeTab, setActiveTab] = useState<SyncTab>('config');
  const [apiKeys, setApiKeys] = useState({
    jotform: '',
    givebutter: '',
    jotformSignupForm: '',
    jotformSetupForm: '',
    jotformTrainingSignupForm: '',
    givebutterCampaign: '',
  });
  const [testingApis, setTestingApis] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    jotform: null,
    givebutter: null,
  });

  // Discovery state
  const [jotformForms, setJotformForms] = useState<JotformForm[]>([]);
  const [givebutterCampaigns, setGivebutterCampaigns] = useState<GivebutterCampaign[]>([]);
  const [discoveringJotform, setDiscoveringJotform] = useState(false);
  const [discoveringGivebutter, setDiscoveringGivebutter] = useState(false);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  // Sync state
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncProgress, setSyncProgress] = useState<Array<{step: string, status: 'running' | 'completed' | 'error'}>>([]);

  // Stored config state
  const [storedConfig, setStoredConfig] = useState<SyncConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

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
    setLoadingConfig(true);
    try {
      const response = await fetch('/api/sync/config');
      if (response.ok) {
        const data = await response.json();
        setStoredConfig(data);

        // Pre-fill form IDs but NOT API keys (security)
        if (data.configured && data.config) {
          setApiKeys({
            jotform: '', // Don't show API keys for security
            givebutter: '', // Don't show API keys for security
            jotformSignupForm: data.config.jotform_signup_form_id,
            jotformSetupForm: data.config.jotform_setup_form_id,
            jotformTrainingSignupForm: data.config.jotform_training_signup_form_id || '',
            givebutterCampaign: data.config.givebutter_campaign_code,
          });
        }
      }
    } catch (error) {
      console.error('Error loading stored config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleDiscoverJotform = async () => {
    const jotformKey = apiKeys.jotform || storedConfig?.config?.jotform_api_key;
    if (!jotformKey) return;

    setDiscoveringJotform(true);
    try {
      const response = await fetch('/api/sync/discover-jotform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: jotformKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setJotformForms(data.forms);
      }
    } catch (error) {
      console.error('Error discovering Jotform forms:', error);
    } finally {
      setDiscoveringJotform(false);
    }
  };

  const handleDiscoverGivebutter = async () => {
    const givebutterKey = apiKeys.givebutter || storedConfig?.config?.givebutter_api_key;
    if (!givebutterKey) return;

    setDiscoveringGivebutter(true);
    try {
      const response = await fetch('/api/sync/discover-givebutter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: givebutterKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setGivebutterCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error discovering Givebutter campaigns:', error);
    } finally {
      setDiscoveringGivebutter(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      // If API keys are empty and config exists, use existing keys
      const jotformKey = apiKeys.jotform || storedConfig?.config?.jotform_api_key;
      const givebutterKey = apiKeys.givebutter || storedConfig?.config?.givebutter_api_key;

      if (!jotformKey || !givebutterKey) {
        showDialog(
          'API keys are required. Please enter them or check existing configuration.',
          'Missing API Keys',
          'warning'
        );
        setSavingConfig(false);
        return;
      }

      const response = await fetch('/api/sync/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jotformApiKey: jotformKey,
          givebutterApiKey: givebutterKey,
          jotformSignupFormId: apiKeys.jotformSignupForm,
          jotformSetupFormId: apiKeys.jotformSetupForm,
          jotformTrainingSignupFormId: apiKeys.jotformTrainingSignupForm,
          givebutterCampaignCode: apiKeys.givebutterCampaign,
        }),
      });

      if (response.ok) {
        await loadStoredConfig(); // Reload to get updated stats
        showDialog(
          'Your API configuration has been saved successfully!',
          'Configuration Saved',
          'success'
        );
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showDialog(
        'Failed to save configuration. Please check the console for details.',
        'Save Failed',
        'error'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestApis = async () => {
    setTestingApis(true);
    setApiStatus({ jotform: null, givebutter: null });

    try {
      // Use stored keys if fields are empty
      const jotformKey = apiKeys.jotform || storedConfig?.config?.jotform_api_key;
      const givebutterKey = apiKeys.givebutter || storedConfig?.config?.givebutter_api_key;

      if (!jotformKey || !givebutterKey) {
        showDialog(
          'API keys are required. Please enter them first.',
          'Missing API Keys',
          'warning'
        );
        setTestingApis(false);
        return;
      }

      const response = await fetch('/api/sync/test-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jotform: jotformKey,
          givebutter: givebutterKey,
          jotformSignupForm: apiKeys.jotformSignupForm,
          jotformSetupForm: apiKeys.jotformSetupForm,
          givebutterCampaign: apiKeys.givebutterCampaign,
        }),
      });

      const result = await response.json();
      setApiStatus(result);

      // Auto-discover forms and campaigns if both APIs are successful
      if (result.jotform && result.givebutter) {
        // Auto-discover Jotform forms
        handleDiscoverJotform();
        // Auto-discover Givebutter campaigns
        handleDiscoverGivebutter();
      }
    } catch (error) {
      console.error('Error testing APIs:', error);
      setApiStatus({ jotform: false, givebutter: false });
    } finally {
      setTestingApis(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadStatus('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sync/upload-csv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('success');
      } else {
        setUploadStatus('error');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('error');
    }
  };

  const handleRunSync = async () => {
    setSyncRunning(true);
    setSyncProgress([]);

    try {
      // Sync now loads configuration from database
      const response = await fetch('/api/sync/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body - config comes from database
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
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              setSyncProgress(prev => {
                const existing = prev.find(p => p.step === data.step);
                if (existing) {
                  return prev.map(p => p.step === data.step ? data : p);
                }
                return [...prev, data];
              });
            }
          }
        }
      }
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

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          API Configuration & Data Sync
        </CardTitle>
        <CardDescription>Configure API keys and run the complete data sync process</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SyncTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">1. Configure</TabsTrigger>
            <TabsTrigger value="forms" disabled={!apiKeys.jotform && !storedConfig?.configured}>2. Forms</TabsTrigger>
            <TabsTrigger value="upload" disabled={!apiKeys.jotformSignupForm || !apiKeys.jotformSetupForm || !apiKeys.jotformTrainingSignupForm || !apiKeys.givebutterCampaign}>3. Upload</TabsTrigger>
            <TabsTrigger value="sync">4. Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            {/* Configuration Status */}
            {storedConfig?.configured && storedConfig.config && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Configuration Active</AlertTitle>
                <AlertDescription className="space-y-2">
                  {storedConfig.config.configured_at && (
                    <p className="text-sm">
                      Configured on {new Date(storedConfig.config.configured_at).toLocaleDateString()} at{' '}
                      {new Date(storedConfig.config.configured_at).toLocaleTimeString()}
                    </p>
                  )}
                  {storedConfig.stats && storedConfig.stats.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Last Sync Times:</p>
                      <ul className="space-y-1 text-sm">
                        {storedConfig.stats.map((stat) => (
                          <li key={stat.sync_type}>
                            {stat.sync_type}: {stat.last_sync ? new Date(stat.last_sync).toLocaleString() : 'Never'}{' '}
                            {stat.failed_syncs > 0 && <span className="text-destructive">({stat.failed_syncs} failed)</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Jotform */}
            <div className="space-y-4">
              <h4 className="font-semibold">Jotform API</h4>
              <div className="space-y-2">
                <Label htmlFor="jotform-key">
                  API Key {storedConfig?.configured && <span className="text-green-600 text-xs ml-2">(configured)</span>}
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

            {/* Givebutter */}
            <div className="space-y-4">
              <h4 className="font-semibold">Givebutter API</h4>
              <div className="space-y-2">
                <Label htmlFor="givebutter-key">
                  API Key {storedConfig?.configured && <span className="text-green-600 text-xs ml-2">(configured)</span>}
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

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleTestApis}
                disabled={testingApis || (!apiKeys.jotform && !storedConfig?.configured) || (!apiKeys.givebutter && !storedConfig?.configured)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {testingApis ? 'Testing...' : 'Test API Connections'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {storedConfig?.configured
                  ? 'Test with stored keys or enter new ones'
                  : 'Test your API keys first, then select forms in the next step'
                }
              </p>
            </div>

            {/* API Status Results */}
            {(apiStatus.jotform !== null || apiStatus.givebutter !== null) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Status</AlertTitle>
                <AlertDescription className="space-y-2">
                  {apiStatus.jotform !== null && (
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${apiStatus.jotform ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">
                        Jotform: {apiStatus.jotform ? 'Connected ✓' : 'Failed ✗'}
                      </span>
                    </div>
                  )}
                  {apiStatus.givebutter !== null && (
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${apiStatus.givebutter ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">
                        Givebutter: {apiStatus.givebutter ? 'Connected ✓' : 'Failed ✗'}
                      </span>
                    </div>
                  )}
                  {apiStatus.jotform && apiStatus.givebutter && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-green-600 mb-2">
                        All APIs connected successfully!
                      </p>
                      <Button
                        onClick={() => setActiveTab('forms')}
                        className="w-full"
                        size="sm"
                      >
                        Continue to Select Forms →
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="forms" className="space-y-6">

            {/* Jotform Forms */}
            <div className="space-y-4">
              <h4 className="font-semibold">Jotform Forms</h4>
              <Button
                onClick={handleDiscoverJotform}
                disabled={discoveringJotform || jotformForms.length > 0}
                variant="outline"
                className="w-full"
              >
                {discoveringJotform ? 'Loading Forms...' : jotformForms.length > 0 ? `✓ Loaded ${jotformForms.length} Forms` : 'Discover Available Forms'}
              </Button>

              {jotformForms.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-form">Signup Form</Label>
                    <select
                      id="signup-form"
                      value={apiKeys.jotformSignupForm}
                      onChange={e => setApiKeys({ ...apiKeys, jotformSignupForm: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    >
                      <option value="">Select a form...</option>
                      {jotformForms.map(form => (
                        <option key={form.id} value={form.id}>
                          {form.title} ({form.count} submissions)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="setup-form">Setup Form</Label>
                    <select
                      id="setup-form"
                      value={apiKeys.jotformSetupForm}
                      onChange={e => setApiKeys({ ...apiKeys, jotformSetupForm: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    >
                      <option value="">Select a form...</option>
                      {jotformForms.map(form => (
                        <option key={form.id} value={form.id}>
                          {form.title} ({form.count} submissions)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="training-form">Training Signup Form</Label>
                    <select
                      id="training-form"
                      value={apiKeys.jotformTrainingSignupForm}
                      onChange={e => setApiKeys({ ...apiKeys, jotformTrainingSignupForm: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    >
                      <option value="">Select a form...</option>
                      {jotformForms.map(form => (
                        <option key={form.id} value={form.id}>
                          {form.title} ({form.count} submissions)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Givebutter Campaigns */}
            <div className="space-y-4">
              <h4 className="font-semibold">Givebutter Campaign</h4>
              <Button
                onClick={handleDiscoverGivebutter}
                disabled={discoveringGivebutter || givebutterCampaigns.length > 0}
                variant="outline"
                className="w-full"
              >
                {discoveringGivebutter ? 'Loading Campaigns...' : givebutterCampaigns.length > 0 ? `✓ Loaded ${givebutterCampaigns.length} Campaigns` : 'Discover Available Campaigns'}
              </Button>

              {givebutterCampaigns.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign</Label>
                  <select
                    id="campaign"
                    value={apiKeys.givebutterCampaign}
                    onChange={e => setApiKeys({ ...apiKeys, givebutterCampaign: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  >
                    <option value="">Select a campaign...</option>
                    {givebutterCampaigns.map(campaign => (
                      <option key={campaign.id} value={campaign.code}>
                        {campaign.title} ({campaign.members_count} members)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Continue Button */}
            {apiKeys.jotformSignupForm && apiKeys.jotformSetupForm && apiKeys.jotformTrainingSignupForm && apiKeys.givebutterCampaign && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Forms Selected</AlertTitle>
                <AlertDescription>
                  <p className="mb-3">Forms and campaign selected! Proceed to upload CSV.</p>
                  <Button onClick={() => setActiveTab('upload')} className="w-full" size="sm">
                    Continue to CSV Upload →
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">

            <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center bg-muted/10">
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
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  Click to upload CSV
                </p>
                <p className="text-sm text-gray-500">
                  or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports Givebutter contacts export format
                </p>
              </label>
            </div>

            {/* Upload Status */}
            {uploadedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
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

            {/* Success message with continue button */}
            {uploadStatus === 'success' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Upload Successful</AlertTitle>
                <AlertDescription>
                  <p className="mb-3">CSV file uploaded successfully! You can now proceed to run the sync.</p>
                  <Button onClick={() => setActiveTab('sync')} className="w-full" size="sm">
                    Continue to Run Sync →
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="sync" className="space-y-6">

            {/* Pre-sync Checklist */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pre-sync Checklist</AlertTitle>
              <AlertDescription>
              <ul className="space-y-1 text-sm mt-2">
                <li className="flex items-center">
                  <span className={`mr-2 ${apiKeys.jotform ? 'text-green-600' : 'text-gray-400'}`}>
                    {apiKeys.jotform ? '✓' : '○'}
                  </span>
                  Jotform API configured
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${apiKeys.givebutter ? 'text-green-600' : 'text-gray-400'}`}>
                    {apiKeys.givebutter ? '✓' : '○'}
                  </span>
                  Givebutter API configured
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${apiKeys.jotformSignupForm && apiKeys.jotformSetupForm && apiKeys.jotformTrainingSignupForm && apiKeys.givebutterCampaign ? 'text-green-600' : 'text-gray-400'}`}>
                    {apiKeys.jotformSignupForm && apiKeys.jotformSetupForm && apiKeys.jotformTrainingSignupForm && apiKeys.givebutterCampaign ? '✓' : '○'}
                  </span>
                  Forms and campaigns selected
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${uploadStatus === 'success' ? 'text-green-600' : 'text-gray-400'}`}>
                    {uploadStatus === 'success' ? '✓' : '○'}
                  </span>
                  CSV file uploaded
                </li>
                <li className="flex items-center">
                  <span className={`mr-2 ${storedConfig?.configured ? 'text-green-600' : 'text-gray-400'}`}>
                    {storedConfig?.configured ? '✓' : '○'}
                  </span>
                  Configuration saved
                </li>
              </ul>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleSaveConfig}
                disabled={
                  (!apiKeys.jotform && !storedConfig?.configured) ||
                  (!apiKeys.givebutter && !storedConfig?.configured) ||
                  !apiKeys.jotformSignupForm ||
                  !apiKeys.jotformSetupForm ||
                  !apiKeys.jotformTrainingSignupForm ||
                  !apiKeys.givebutterCampaign ||
                  savingConfig
                }
                variant="outline"
                size="lg"
              >
                {savingConfig ? 'Saving...' : storedConfig?.configured ? 'Update Config' : 'Save Config'}
              </Button>
              <Button
                onClick={handleRunSync}
                disabled={syncRunning || !storedConfig?.configured || uploadStatus !== 'success'}
                size="lg"
              >
                {syncRunning ? 'Sync Running...' : 'Run Full Sync'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {storedConfig?.configured
                ? 'Update configuration if needed, then run the sync'
                : 'Save your configuration first, then run the sync'
              }
            </p>

            {/* Sync Progress */}
            {syncProgress.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-gray-900">Sync Progress</h4>
                <div className="space-y-2">
                  {syncProgress.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900">{item.step}</span>
                      <span className={`text-sm ${
                        item.status === 'running' ? 'text-blue-600' :
                        item.status === 'completed' ? 'text-green-600' :
                        'text-red-600'
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
              <div className="text-center text-sm text-gray-500">
                <p>This will synchronize all data from your configured sources</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>

    {/* Dialog */}
    <Dialog
      isOpen={dialogOpen}
      onClose={() => setDialogOpen(false)}
      title={dialogTitle}
      variant={dialogVariant}
    >
      {dialogMessage}
    </Dialog>
    </>
  );
}
