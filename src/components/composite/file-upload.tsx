'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  /**
   * Accepted file types (e.g., ".csv", "image/*")
   */
  accept?: string;

  /**
   * Maximum file size in bytes
   * @default 10MB (10 * 1024 * 1024)
   */
  maxSize?: number;

  /**
   * Change handler when file is selected
   */
  onChange: (file: File) => void;

  /**
   * Error handler
   */
  onError?: (error: string) => void;

  /**
   * Upload status
   */
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';

  /**
   * Uploaded file info (for displaying after upload)
   */
  uploadedFile?: {
    name: string;
    size: number;
  };

  /**
   * Error message to display
   */
  errorMessage?: string;

  /**
   * Whether upload is in progress
   * @default false
   */
  uploading?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Description/helper text
   */
  description?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * FileUpload Component
 *
 * Drag-and-drop file upload component with validation and status display.
 * Replaces native file inputs with better UX.
 *
 * @example
 * <FileUpload
 *   accept=".csv"
 *   maxSize={10 * 1024 * 1024}
 *   onChange={handleFileUpload}
 *   uploading={csvUploading}
 *   uploadStatus={uploadStatus}
 *   uploadedFile={uploadedFile}
 * />
 *
 * @example
 * // With custom description
 * <FileUpload
 *   accept=".csv"
 *   onChange={handleFile}
 *   description="Givebutter full contact export (CSV format)"
 *   onError={(err) => toast.error(err)}
 * />
 *
 * @accessibility
 * - Keyboard accessible (space/enter to trigger)
 * - Screen reader friendly status announcements
 * - Visible focus indicators
 * - ARIA labels and live regions
 */
export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onChange,
  onError,
  uploadStatus = 'idle',
  uploadedFile,
  errorMessage,
  uploading = false,
  disabled = false,
  description,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    if (accept) {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExt = '.' + file.name.split('.').pop();

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Expected: ${accept}`;
      }
    }

    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size: ${formatFileSize(maxSize)}`;
    }

    return null;
  };

  // Handle file selection
  const handleFile = (file: File) => {
    const error = validateFile(file);

    if (error) {
      if (onError) {
        onError(error);
      }
      return;
    }

    onChange(file);
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Handle click to upload
  const handleClick = () => {
    if (!disabled && !uploading && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Remove uploaded file
  const handleRemove = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    // Note: Parent component should handle clearing uploadedFile
  };

  const isDisabled = disabled || uploading;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Upload area (only show if no file uploaded or error) */}
      {(uploadStatus === 'idle' || uploadStatus === 'error') && !uploadedFile && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragging && 'border-primary bg-primary/5',
            !isDragging && !isDisabled && 'border-border hover:border-primary/50 hover:bg-muted/50',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-label="Upload file"
          aria-disabled={isDisabled}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={isDisabled}
            className="sr-only"
            aria-label="File input"
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
              {accept && (
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted: {accept}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploading state */}
      {uploading && uploadStatus === 'uploading' && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Uploading...</p>
              <p className="text-xs text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {uploadStatus === 'success' && uploadedFile && (
        <div className="border border-success-border bg-success-bg rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-success-DEFAULT flex-shrink-0" />
            <File className="h-5 w-5 text-success-text flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success-text truncate">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-success-textMuted">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="flex-shrink-0 h-8 w-8 p-0"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {uploadStatus === 'error' && errorMessage && (
        <div className="border border-error-border bg-error-bg rounded-lg p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error-DEFAULT flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-text">Upload failed</p>
              <p className="text-xs text-error-textMuted mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
