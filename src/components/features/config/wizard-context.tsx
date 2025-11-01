import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { JotformForm, GivebutterCampaign, ApiStatus, SyncConfig } from './wizard-steps';

// 1. Define State Shape
interface WizardState {
  apiKeys: {
    jotform: string;
    givebutter: string;
    jotformSignupForm: string;
    jotformSetupForm: string;
    jotformTrainingSignupForm: string;
    jotformPartnerPreferenceForm: string;
    givebutterCampaign: string;
  };
  testedApiKeys: {
    jotform?: string;
    givebutter?: string;
  };
  apiStatus: ApiStatus;
  jotformForms: JotformForm[];
  givebutterCampaigns: GivebutterCampaign[];
  uploadedFile: File | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  storedConfig: SyncConfig | null;

  // UI state
  testingApis: boolean;
  discoveringJotform: boolean;
  discoveringGivebutter: boolean;
}

// 2. Define Initial State
const initialState: WizardState = {
  apiKeys: {
    jotform: '',
    givebutter: '',
    jotformSignupForm: '',
    jotformSetupForm: '',
    jotformTrainingSignupForm: '',
    jotformPartnerPreferenceForm: '',
    givebutterCampaign: '',
  },
  testedApiKeys: {},
  apiStatus: { jotform: null, givebutter: null },
  jotformForms: [],
  givebutterCampaigns: [],
  uploadedFile: null,
  uploadStatus: 'idle',
  storedConfig: null,
  testingApis: false,
  discoveringJotform: false,
  discoveringGivebutter: false,
};

// 3. Define Actions
type WizardAction =
  | { type: 'SET_API_KEY'; payload: { key: 'jotform' | 'givebutter'; value: string } }
  | { type: 'SET_FORM_ID'; payload: { key: 'jotformSignupForm' | 'jotformSetupForm' | 'jotformTrainingSignupForm' | 'jotformPartnerPreferenceForm' | 'givebutterCampaign'; value: string } }
  | { type: 'SET_API_STATUS'; payload: ApiStatus }
  | { type: 'SET_JOTFORM_FORMS'; payload: JotformForm[] }
  | { type: 'SET_GIVEBUTTER_CAMPAIGNS'; payload: GivebutterCampaign[] }
  | { type: 'SET_UPLOAD_FILE'; payload: { file: File | null; status: WizardState['uploadStatus'] } }
  | { type: 'SET_STORED_CONFIG'; payload: SyncConfig | null }
  | { type: 'SET_UI_STATE'; payload: { key: 'testingApis' | 'discoveringJotform' | 'discoveringGivebutter'; value: boolean } }
  | { type: 'SET_TESTED_API_KEYS'; payload: { jotform?: string; givebutter?: string } };

// 4. Create Reducer
const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKeys: { ...state.apiKeys, [action.payload.key]: action.payload.value } };
    case 'SET_FORM_ID':
      return { ...state, apiKeys: { ...state.apiKeys, [action.payload.key]: action.payload.value } };
    case 'SET_API_STATUS':
      return { ...state, apiStatus: action.payload };
    case 'SET_JOTFORM_FORMS':
      return { ...state, jotformForms: action.payload };
    case 'SET_GIVEBUTTER_CAMPAIGNS':
      return { ...state, givebutterCampaigns: action.payload };
    case 'SET_UPLOAD_FILE':
      return { ...state, uploadedFile: action.payload.file, uploadStatus: action.payload.status };
    case 'SET_STORED_CONFIG':
        const config = action.payload;
        let apiKeys = state.apiKeys;
        if (config?.configured && config.config) {
            apiKeys = {
                ...apiKeys,
                jotformSignupForm: config.config.jotform_signup_form_id,
                jotformSetupForm: config.config.jotform_setup_form_id,
                jotformTrainingSignupForm: config.config.jotform_training_signup_form_id || '',
                jotformPartnerPreferenceForm: config.config.jotform_partner_form_id || '',
                givebutterCampaign: config.config.givebutter_campaign_code,
            };
        }
      return { ...state, storedConfig: action.payload, apiKeys };
    case 'SET_UI_STATE':
        return { ...state, [action.payload.key]: action.payload.value };
    case 'SET_TESTED_API_KEYS':
        return { ...state, testedApiKeys: action.payload };
    default:
      return state;
  }
};

// 5. Create Context
interface WizardContextType {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

// 6. Create Provider Component
export const ConfigWizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
};

// 7. Create Custom Hook
export const useConfigWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useConfigWizard must be used within a ConfigWizardProvider');
  }
  return context;
};
