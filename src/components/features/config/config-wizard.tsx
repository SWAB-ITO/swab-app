import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Individual step in the wizard
 */
export interface WizardStep {
  /**
   * Unique identifier for the step
   */
  id: string;

  /**
   * Display title for the step
   */
  title: string;

  /**
   * Optional description of the step
   */
  description?: string;

  /**
   * React component to render for this step
   */
  component: React.ReactNode;

  /**
   * Optional validation function
   * Return true if valid, false or error message if invalid
   */
  validate?: () => boolean | string;

  /**
   * Whether this step can be skipped
   * @default false
   */
  optional?: boolean;
}

/**
 * Props for the ConfigWizard component
 */
export interface ConfigWizardProps {
  /**
   * Title for the wizard
   */
  title: string;

  /**
   * Description for the wizard
   */
  description?: string;

  /**
   * Array of wizard steps
   */
  steps: WizardStep[];

  /**
   * Initial step index
   * @default 0
   */
  initialStep?: number;

  /**
   * Whether to persist state to localStorage
   * @default false
   */
  persistState?: boolean;

  /**
   * localStorage key for state persistence
   * @default "config-wizard-state"
   */
  storageKey?: string;

  /**
   * Callback when wizard is completed
   */
  onComplete?: () => void | Promise<void>;

  /**
   * Callback when step changes
   */
  onStepChange?: (stepIndex: number, step: WizardStep) => void;

  /**
   * Whether to show progress bar
   * @default true
   */
  showProgress?: boolean;

  /**
   * Whether to show step indicators
   * @default true
   */
  showStepIndicator?: boolean;

  /**
   * Custom CSS class for the wizard card
   */
  className?: string;
}

/**
 * ConfigWizard Component
 *
 * A multi-step wizard component with navigation, validation, and state persistence.
 * Supports keyboard navigation (Arrow keys) and step validation.
 *
 * @example
 * ```tsx
 * const steps: WizardStep[] = [
 *   {
 *     id: 'api-config',
 *     title: 'API Configuration',
 *     description: 'Configure your API keys',
 *     component: <ApiConfigStep />,
 *     validate: () => apiKeysValid(),
 *   },
 *   {
 *     id: 'form-selection',
 *     title: 'Form Selection',
 *     description: 'Select your forms and campaigns',
 *     component: <FormSelectionStep />,
 *     validate: () => formsSelected(),
 *   },
 * ];
 *
 * <ConfigWizard
 *   title="Setup Wizard"
 *   description="Configure your sync settings"
 *   steps={steps}
 *   persistState
 *   onComplete={handleComplete}
 * />
 * ```
 */
export function ConfigWizard({
  title,
  description,
  steps,
  initialStep = 0,
  persistState = false,
  storageKey = 'config-wizard-state',
  onComplete,
  onStepChange,
  showProgress = true,
  showStepIndicator = true,
  className,
}: ConfigWizardProps) {
  // Load initial step from localStorage if persistence is enabled
  const getInitialStep = () => {
    if (persistState && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const { currentStep } = JSON.parse(stored);
          return Math.min(currentStep, steps.length - 1);
        } catch {
          // Invalid stored state, use default
        }
      }
    }
    return initialStep;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep);
  const [validationError, setValidationError] = useState<string | null>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Persist state to localStorage
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          currentStep,
          timestamp: Date.now(),
        })
      );
    }
  }, [currentStep, persistState, storageKey]);

  // Notify parent of step change
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep, step);
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Navigate to a specific step
   * Only allow going back or to the next step
   */
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      // Allow going backwards or to the immediate next step
      if (stepIndex <= currentStep + 1) {
        setCurrentStep(stepIndex);
        setValidationError(null);
      }
    }
  }, [steps.length, currentStep]);

  /**
   * Navigate to next step
   */
  const handleNext = useCallback(async () => {
    // Validate current step
    if (step.validate) {
      const result = step.validate();
      if (result !== true) {
        setValidationError(typeof result === 'string' ? result : 'Please complete this step before continuing');
        return;
      }
    }

    setValidationError(null);

    if (isLastStep) {
      // Complete wizard
      if (onComplete) {
        await onComplete();
      }
      // Clear persisted state
      if (persistState && typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }
    } else {
      // Go to next step
      goToStep(currentStep + 1);
    }
  }, [currentStep, step, isLastStep, onComplete, goToStep, persistState, storageKey]);

  /**
   * Navigate to previous step
   */
  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep, goToStep]);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when not in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight' && !isLastStep) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isFirstStep) {
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, isFirstStep, isLastStep]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="space-y-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>

          {/* Progress Bar */}
          {showProgress && (
            <Progress value={progress} className="h-2" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step Content */}
        <div className="min-h-[300px]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            {step.description && (
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            )}
          </div>

          {/* Render step component */}
          {step.component}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {validationError}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step.optional && !isLastStep && (
            <div className="text-sm text-muted-foreground">
              (Optional)
            </div>
          )}

          {!isLastStep ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            // On the last step, there's no "Next" button, 
            // the primary actions are inside the step component itself.
            <div></div> 
          )}
        </div>
      </CardContent>
    </Card>
  );
}
