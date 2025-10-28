'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigWizard, WizardStep } from '@/components/features/config/config-wizard';
import {
  ApiConfigStep,
  FormsStep,
  ReviewStep,
  UploadStep
} from '@/components/features/config/wizard-steps';
import { Database } from 'lucide-react';
import { ConfigWizardProvider, useConfigWizard } from '@/components/features/config/wizard-context';

function SettingsContent() {
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto p-6 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-accent-text bg-accent-DEFAULT/10 px-4 py-2 rounded-full border border-accent-DEFAULT/20">
              Configuration & Preferences
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Settings
          </h1>
          <p className="text-muted-foreground text-xl md:text-2xl font-light max-w-2xl">
            Configure API keys and data sources.
          </p>
        </div>

        {/* Render API Config directly, removing tabs */}
        <ApiConfigContent />
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
  // Dialog state is local to this component as it's a UI concern
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');

  const showDialog = (
    message: string,
    title: string = ''
  ) => {
    setDialogMessage(message);
    setDialogTitle(title);
    setDialogOpen(true);
  };

  const WizardWithState = () => {
    const { state, dispatch } = useConfigWizard();
    const { apiKeys, apiStatus, storedConfig, uploadStatus, testedApiKeys } = state;
    const [savingConfig, setSavingConfig] = useState(false);
    const [syncRunning, setSyncRunning] = useState(false);
    const [syncProgress, setSyncProgress] = useState<Array<{step: string, status: 'running' | 'completed' | 'error'}>>([]);

    useEffect(() => {
      const loadConfig = async () => {
        try {
          const response = await fetch('/api/sync/config');
          if (response.ok) {
            const data = await response.json();
            dispatch({ type: 'SET_STORED_CONFIG', payload: data });
          }
        } catch (error) {
          console.error('Error loading stored config:', error);
        }
      };
      loadConfig();
    }, [dispatch]);

    const handleSaveConfig = async () => {
      setSavingConfig(true);
      try {
        const jotformKey = apiKeys.jotform || testedApiKeys.jotform || storedConfig?.config?.jotform_api_key;
        const givebutterKey = apiKeys.givebutter || testedApiKeys.givebutter || storedConfig?.config?.givebutter_api_key;
  
        if (!jotformKey || !givebutterKey) {
            showDialog('API keys are required.', 'Missing API Keys');
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
            const data = await response.json();
            dispatch({ type: 'SET_STORED_CONFIG', payload: data });
            showDialog('Configuration saved successfully!', 'Success');
        } else {
            throw new Error('Failed to save configuration');
        }
      } catch (error) {
        console.error('Error saving config:', error);
        showDialog('Failed to save configuration.', 'Error');
      } finally {
        setSavingConfig(false);
      }
    };

    const handleRunSync = async () => {
        setSyncRunning(true);
        setSyncProgress([]);
        try {
          const response = await fetch('/api/sync/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
    
          if (!response.ok) throw new Error('Failed to start sync');
    
          const reader = response.body?.getReader();
          if (!reader) return;
    
          const decoder = new TextDecoder();
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
                    return existing ? prev.map(p => p.step === data.step ? data : p) : [...prev, data];
                });
              }
            }
          }
        } catch (error) {
          console.error('Error running sync:', error);
          showDialog('Failed to run sync.', 'Error');
        } finally {
          setSyncRunning(false);
        }
      };

    const wizardSteps: WizardStep[] = [
      {
        id: 'api-config',
        title: 'API Configuration',
        description: 'Connect to Jotform and Givebutter',
        component: <ApiConfigStep />,
        validate: () => {
          if (!apiStatus.jotform && !storedConfig?.configured) return 'Please test your Jotform API connection';
          if (!apiStatus.givebutter && !storedConfig?.configured) return 'Please test your Givebutter API connection';
          return true;
        },
      },
      {
        id: 'form-selection',
        title: 'Form Selection',
        description: 'Select forms and campaigns to sync',
        component: <FormsStep />,
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
        description: 'Upload Givebutter contact export (optional)',
        component: <UploadStep />,
        optional: true,
      },
      {
        id: 'review-sync',
        title: 'Review & Sync',
        description: 'Review configuration and run sync',
        component: <ReviewStep 
            onSaveConfig={handleSaveConfig}
            onRunSync={handleRunSync}
            savingConfig={savingConfig}
            syncRunning={syncRunning}
            syncProgress={syncProgress}
        />,
      },
    ];

    return (
        <ConfigWizard
            title="Sync Configuration Wizard"
            steps={wizardSteps}
            persistState
            storageKey="swab-sync-wizard"
            showProgress
        />
    )
  }

  return (
    <>
      <Card className="border-border/40">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <Database className="h-6 w-6 text-primary" />
            API Configuration & Data Sync
          </CardTitle>
          <CardDescription className="text-base mt-2">A guided setup for data sync.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigWizardProvider>
            <WizardWithState />
          </ConfigWizardProvider>
        </CardContent>
      </Card>

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
