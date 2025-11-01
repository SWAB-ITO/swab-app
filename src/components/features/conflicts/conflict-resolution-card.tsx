'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, X, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface ConflictOption {
  value: any;
  source: string;
  metadata?: Record<string, any>;
}

interface Conflict {
  id: number;
  mn_id: string;
  conflict_type: string;
  option_a: ConflictOption;
  option_b: ConflictOption;
  context?: Record<string, any>;
  recommended_option: 'a' | 'b' | null;
  recommendation_reason: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  mentor?: {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    phone: string | null;
    personal_email: string | null;
  };
}

interface ConflictResolutionCardProps {
  conflict: Conflict;
  onResolve: (conflictId: number, decision: 'a' | 'b' | 'custom' | 'skip', customValue?: any) => Promise<void>;
  resolving?: boolean;
}

export function ConflictResolutionCard({ conflict, onResolve, resolving }: ConflictResolutionCardProps) {
  const [customValue, setCustomValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const mentorName = conflict.mentor?.preferred_name || conflict.mentor?.first_name || conflict.mn_id;
  const fullName = conflict.mentor
    ? `${conflict.mentor.first_name} ${conflict.mentor.last_name}`
    : conflict.mn_id;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'contact_selection': return 'Contact Selection';
      case 'phone_mismatch': return 'Phone Number Mismatch';
      case 'email_mismatch': return 'Email Mismatch';
      case 'external_id_collision': return 'External ID Collision';
      case 'data_staleness': return 'Data Staleness';
      default: return type;
    }
  };

  const renderOptionDetails = (option: ConflictOption, label: string) => {
    return (
      <div className="p-4 border rounded-lg space-y-2">
        <div className="font-semibold text-sm text-gray-600">{label}</div>
        <div className="space-y-1">
          <div className="font-mono text-lg">{option.value}</div>
          <div className="text-xs text-gray-500">Source: {option.source}</div>

          {option.metadata && Object.keys(option.metadata).length > 0 && (
            <div className="mt-2 pt-2 border-t text-xs space-y-1">
              {Object.entries(option.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {mentorName} ({conflict.mn_id})
              <Badge className={getSeverityColor(conflict.severity)}>
                {conflict.severity}
              </Badge>
            </CardTitle>
            <CardDescription>
              {getConflictTypeLabel(conflict.conflict_type)} •
              Detected {new Date(conflict.detected_at).toLocaleDateString()}
            </CardDescription>
            {fullName && (
              <div className="text-sm text-gray-600">{fullName}</div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recommendation Banner */}
        {conflict.recommended_option && conflict.recommendation_reason && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-blue-900">
                Recommended: Option {conflict.recommended_option.toUpperCase()}
              </div>
              <div className="text-sm text-blue-700 mt-1">
                {conflict.recommendation_reason}
              </div>
            </div>
          </div>
        )}

        {/* Option Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderOptionDetails(conflict.option_a, 'Option A')}
          {renderOptionDetails(conflict.option_b, 'Option B')}
        </div>

        {/* Context Details (Collapsible) */}
        {conflict.context && Object.keys(conflict.context).length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Additional Context
            </button>

            {showDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                {Object.entries(conflict.context).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Value Input */}
        <div className="space-y-2">
          <Label htmlFor={`custom-${conflict.id}`} className="text-sm font-medium">
            Or enter custom value:
          </Label>
          <Input
            id={`custom-${conflict.id}`}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter custom value..."
            className="font-mono"
          />
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 flex-wrap">
        <Button
          variant={conflict.recommended_option === 'a' ? 'default' : 'outline'}
          onClick={() => onResolve(conflict.id, 'a')}
          disabled={resolving}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Choose A
        </Button>

        <Button
          variant={conflict.recommended_option === 'b' ? 'default' : 'outline'}
          onClick={() => onResolve(conflict.id, 'b')}
          disabled={resolving}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Choose B
        </Button>

        <Button
          variant="secondary"
          onClick={() => onResolve(conflict.id, 'custom', customValue)}
          disabled={resolving || !customValue.trim()}
          className="flex-1"
        >
          Use Custom
        </Button>

        <Button
          variant="ghost"
          onClick={() => onResolve(conflict.id, 'skip')}
          disabled={resolving}
        >
          <X className="w-4 h-4 mr-2" />
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}
