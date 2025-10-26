import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ApiConfigStepProps {
  jotformKey: string;
  givebutterKey: string;
  onJotformKeyChange: (value: string) => void;
  onGivebutterKeyChange: (value: string) => void;
  onTestConnection: () => void | Promise<void>;
  testing?: boolean;
  jotformStatus: boolean | null;
  givebutterStatus: boolean | null;
}

export function ApiConfigStep({
  jotformKey,
  givebutterKey,
  onJotformKeyChange,
  onGivebutterKeyChange,
  onTestConnection,
  testing = false,
  jotformStatus,
  givebutterStatus,
}: ApiConfigStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="jotform-key">
          Jotform API Key
          {jotformStatus !== null && (
            <span className={`ml-2 text-xs ${jotformStatus ? 'text-green-600' : 'text-red-600'}`}>
              {jotformStatus ? '✓ Connected' : '✗ Failed'}
            </span>
          )}
        </Label>
        <Input
          id="jotform-key"
          type="password"
          value={jotformKey}
          onChange={(e) => onJotformKeyChange(e.target.value)}
          placeholder="Enter your Jotform API key"
        />
        <p className="text-xs text-muted-foreground">
          Get your API key from Jotform Settings → API section
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="givebutter-key">
          Givebutter API Key
          {givebutterStatus !== null && (
            <span className={`ml-2 text-xs ${givebutterStatus ? 'text-green-600' : 'text-red-600'}`}>
              {givebutterStatus ? '✓ Connected' : '✗ Failed'}
            </span>
          )}
        </Label>
        <Input
          id="givebutter-key"
          type="password"
          value={givebutterKey}
          onChange={(e) => onGivebutterKeyChange(e.target.value)}
          placeholder="Enter your Givebutter API key"
        />
        <p className="text-xs text-muted-foreground">
          Get your API key from Givebutter Account Settings
        </p>
      </div>

      <Button
        onClick={onTestConnection}
        disabled={testing || !jotformKey || !givebutterKey}
        className="w-full"
      >
        {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Test API Connection
      </Button>
    </div>
  );
}
