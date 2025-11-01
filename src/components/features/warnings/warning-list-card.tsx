'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';

interface Warning {
  id: number;
  mn_id: string;
  warning_type: string;
  warning_message: string;
  field_name: string | null;
  current_value: string | null;
  expected_value: string | null;
  severity: 'low' | 'medium' | 'high';
  detected_at: string;
  acknowledged: boolean;
  mentor?: {
    first_name: string;
    last_name: string;
    preferred_name: string | null;
    phone: string | null;
    personal_email: string | null;
  };
}

interface WarningListCardProps {
  warning: Warning;
  onAcknowledge?: (warningId: number) => void;
  acknowledging?: boolean;
}

export function WarningListCard({ warning, onAcknowledge, acknowledging }: WarningListCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const mentorName = warning.mentor?.preferred_name || warning.mentor?.first_name || warning.mn_id;
  const fullName = warning.mentor
    ? `${warning.mentor.first_name} ${warning.mentor.last_name}`
    : warning.mn_id;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getWarningTypeLabel = (type: string) => {
    switch (type) {
      case 'archival_failed': return 'Archival Failed';
      case 'data_staleness': return 'Data Staleness';
      case 'contact_merge_warning': return 'Contact Merge Warning';
      case 'missing_required_field': return 'Missing Required Field';
      case 'validation_warning': return 'Validation Warning';
      case 'api_rate_limit': return 'API Rate Limit';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  return (
    <Card className={`w-full ${warning.acknowledged ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {getSeverityIcon(warning.severity)}
              {mentorName} ({warning.mn_id})
              <Badge className={getSeverityColor(warning.severity)}>
                {warning.severity}
              </Badge>
              {warning.acknowledged && (
                <Badge variant="outline" className="ml-2">
                  <Check className="w-3 h-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {getWarningTypeLabel(warning.warning_type)} •
              Detected {new Date(warning.detected_at).toLocaleDateString()} at {new Date(warning.detected_at).toLocaleTimeString()}
            </CardDescription>
            {fullName && (
              <div className="text-sm text-gray-600">{fullName}</div>
            )}
          </div>

          {!warning.acknowledged && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(warning.id)}
              disabled={acknowledging}
            >
              <Check className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Warning Message */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700">
            {warning.warning_message}
          </div>
        </div>

        {/* Field Information */}
        {warning.field_name && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="font-medium text-gray-600">Field:</span>
              <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{warning.field_name}</code>
            </div>
            {warning.current_value && (
              <div>
                <span className="font-medium text-gray-600">Current Value:</span>
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{warning.current_value}</code>
              </div>
            )}
          </div>
        )}

        {warning.expected_value && (
          <div className="text-sm">
            <span className="font-medium text-gray-600">Expected Value:</span>
            <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{warning.expected_value}</code>
          </div>
        )}

        {/* Contact Details (Collapsible) */}
        {warning.mentor && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Mentor Contact Details
            </button>

            {showDetails && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                {warning.mentor.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{warning.mentor.phone}</span>
                  </div>
                )}
                {warning.mentor.personal_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{warning.mentor.personal_email}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
