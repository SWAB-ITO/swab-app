'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSelector } from '@/components/composite/form-selector';
import { Checklist } from '@/components/composite/checklist';
import { StatusCard } from '@/components/composite/status-card';
import { ConfigWizard, WizardStep } from '@/components/features/config/config-wizard';
import {
  ApiConfigStep,
  FormsStep,
  UploadStep,
  ReviewStep,
  type JotformForm,
  type GivebutterCampaign,
  type ApiStatus,
  type SyncConfig
} from '@/components/features/config/wizard-steps';
import { Settings as SettingsIcon, User, Database, Bell, Palette, CheckCircle2, AlertCircle } from 'lucide-react';

type Tab = 'account' | 'api-config' | 'preferences';

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
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-accent-text bg-accent-DEFAULT/10 px-4 py-2 rounded-full border border-accent-DEFAULT/20">
              Configuration & Preferences
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Settings
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
            Manage your account and application preferences
          </p>
        </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Tab)} className="space-y-10">
        <div className="flex justify-center">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl h-12 p-1 bg-muted/30">
            <TabsTrigger
              value="account"
              className="flex items-center justify-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger
              value="api-config"
              className="flex items-center justify-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">API Config</span>
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center justify-center gap-2 text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="account" className="space-y-6">
          <Card className="border-border/40">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl">Account Settings</CardTitle>
              <CardDescription className="text-base mt-2">Manage your account details and authentication</CardDescription>
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

        <TabsContent value="preferences" className="space-y-6">
          <Card className="border-border/40">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl">Appearance & Preferences</CardTitle>
              <CardDescription className="text-base mt-2">Customize your application experience</CardDescription>
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

function ApiConfigContent() {
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
  // Store successfully tested API keys separately
  const [testedApiKeys, setTestedApiKeys] = useState<{
    jotform?: string;
    givebutter?: string;
  }>({});

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
    const jotformKey = apiKeys.jotform || testedApiKeys.jotform || storedConfig?.config?.jotform_api_key;
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
    const givebutterKey = apiKeys.givebutter || testedApiKeys.givebutter || storedConfig?.config?.givebutter_api_key;
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
      // Priority: current input > tested keys > stored config
      const jotformKey = apiKeys.jotform || testedApiKeys.jotform || storedConfig?.config?.jotform_api_key;
      const givebutterKey = apiKeys.givebutter || testedApiKeys.givebutter || storedConfig?.config?.givebutter_api_key;

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
      // Priority: current input > tested keys > stored config
      const jotformKey = apiKeys.jotform || testedApiKeys.jotform || storedConfig?.config?.jotform_api_key;
      const givebutterKey = apiKeys.givebutter || testedApiKeys.givebutter || storedConfig?.config?.givebutter_api_key;

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

      // Store the successfully tested keys
      if (result.jotform && result.givebutter) {
        setTestedApiKeys({
          jotform: jotformKey,
          givebutter: givebutterKey,
        });
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

  // Define wizard steps
  const wizardSteps: WizardStep[] = [
    {
      id: 'api-config',
      title: 'API Configuration',
      description: 'Configure your API keys for Jotform and Givebutter',
      component: (
        <ApiConfigStep
          apiKeys={{ jotform: apiKeys.jotform, givebutter: apiKeys.givebutter }}
          setApiKeys={setApiKeys}
          storedConfig={storedConfig}
          apiStatus={apiStatus}
          testingApis={testingApis}
          onTestApis={handleTestApis}
        />
      ),
      validate: () => {
        if (!apiStatus.jotform && !storedConfig?.configured) {
          return 'Please test your Jotform API connection';
        }
        if (!apiStatus.givebutter && !storedConfig?.configured) {
          return 'Please test your Givebutter API connection';
        }
        return true;
      },
    },
    {
      id: 'form-selection',
      title: 'Form Selection',
      description: 'Select forms and campaigns to sync',
      component: (
        <FormsStep
          apiKeys={{
            jotformSignupForm: apiKeys.jotformSignupForm,
            jotformSetupForm: apiKeys.jotformSetupForm,
            jotformTrainingSignupForm: apiKeys.jotformTrainingSignupForm,
            givebutterCampaign: apiKeys.givebutterCampaign,
          }}
          setApiKeys={setApiKeys}
          jotformForms={jotformForms}
          givebutterCampaigns={givebutterCampaigns}
          discoveringJotform={discoveringJotform}
          discoveringGivebutter={discoveringGivebutter}
          onDiscoverJotform={handleDiscoverJotform}
          onDiscoverGivebutter={handleDiscoverGivebutter}
        />
      ),
      validate: () => {
        if (!apiKeys.jotformSignupForm) return 'Please select a signup form';
        if (!apiKeys.jotformSetupForm) return 'Please select a setup form';
        if (!apiKeys.jotformTrainingSignupForm) return 'Please select a training signup form';
        if (!apiKeys.givebutterCampaign) return 'Please select a campaign';
        return true;
      },
    },
    {
      id: 'csv-upload',
      title: 'CSV Upload',
      description: 'Upload Givebutter contact export',
      component: (
        <UploadStep
          uploadedFile={uploadedFile}
          uploadStatus={uploadStatus}
          onFileUpload={handleFileUpload}
        />
      ),
      optional: true,
    },
    {
      id: 'review-sync',
      title: 'Review & Sync',
      description: 'Review configuration and run sync',
      component: (
        <ReviewStep
          apiKeys={apiKeys}
          apiStatus={apiStatus}
          storedConfig={storedConfig}
          uploadStatus={uploadStatus}
          savingConfig={savingConfig}
          syncRunning={syncRunning}
          syncProgress={syncProgress}
          onSaveConfig={handleSaveConfig}
          onRunSync={handleRunSync}
        />
      ),
    },
  ];

  return (
    <>
    <Card className="border-border/40">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <Database className="h-6 w-6 text-primary" />
          API Configuration & Data Sync
        </CardTitle>
        <CardDescription className="text-base mt-2">Follow the guided wizard to configure your data synchronization</CardDescription>
      </CardHeader>
      <CardContent>
        <ConfigWizard
          title="Sync Configuration Wizard"
          steps={wizardSteps}
          persistState
          storageKey="swab-sync-wizard"
          showProgress
          showStepIndicator
        />

      </CardContent>
    </Card>

    {/* Dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogMessage}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    </>
  );
}
