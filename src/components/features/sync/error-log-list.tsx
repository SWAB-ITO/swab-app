import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/composite/status-badge';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

export interface ConflictError {
  error_id: string;
  mn_id?: string;
  error_type: string;
  error_message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
}

export interface ErrorLogListProps {
  errors: ConflictError[];
  loading?: boolean;
  title?: string;
  className?: string;
}

export function ErrorLogList({
  errors,
  loading = false,
  title = 'Errors & Conflicts',
  className,
}: ErrorLogListProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-4">
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!loading && errors.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-success-DEFAULT mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-base font-medium">No unresolved errors</p>
            <p className="text-muted-foreground text-sm mt-1">All systems operating normally</p>
          </div>
        )}

        {!loading && errors.length > 0 && (
          <div className="space-y-4">
            {errors.map((error, index) => (
              <div key={error.error_id || `error-${index}`} className="bg-gradient-to-br from-error-DEFAULT/5 to-muted/30 rounded-xl p-5 border border-error-DEFAULT/20 hover:border-error-DEFAULT/40 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="h-5 w-5 text-error-DEFAULT flex-shrink-0" />
                      <span className="font-semibold text-foreground text-base">{error.error_type.replace(/_/g, ' ')}</span>
                      <StatusBadge severity={error.severity} />
                    </div>
                    {error.mn_id && (
                      <p className="text-sm text-muted-foreground mb-2 ml-8">Mentor ID: {error.mn_id}</p>
                    )}
                    <p className="text-sm text-foreground/90 ml-8">{error.error_message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 ml-8">
                  <Clock className="h-3 w-3" />
                  {new Date(error.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
