'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FormOption {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Display title
   */
  title: string;

  /**
   * Optional count/metric (e.g., submission count)
   */
  count?: number;

  /**
   * Optional status (e.g., "active", "archived")
   */
  status?: string;

  /**
   * Optional category for grouping
   */
  category?: string;
}

export interface FormSelectorProps {
  /**
   * Label for the selector
   */
  label: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Array of options
   */
  options: FormOption[];

  /**
   * Currently selected value (option ID)
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Loading state
   * @default false
   */
  loading?: boolean;

  /**
   * Group options by field
   */
  groupBy?: 'category' | 'status';

  /**
   * Whether to show search input
   * @default false
   */
  searchable?: boolean;

  /**
   * Whether field is required
   * @default false
   */
  required?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Helper text / description
   */
  description?: string;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FormSelector Component
 *
 * Enhanced select dropdown for forms/campaigns with search and grouping.
 * Replaces native HTML select elements with better UX.
 *
 * @example
 * <FormSelector
 *   label="Signup Form"
 *   placeholder="Select a form..."
 *   options={jotformForms}
 *   value={selectedForm}
 *   onChange={setSelectedForm}
 *   searchable
 *   required
 *   description="Form for mentor signups"
 * />
 *
 * @example
 * // With grouping
 * <FormSelector
 *   label="Campaign"
 *   options={campaigns}
 *   value={selected}
 *   onChange={setSelected}
 *   groupBy="status"
 * />
 *
 * @accessibility
 * - Built on shadcn Select (Radix UI)
 * - Keyboard navigation support
 * - Screen reader friendly
 * - ARIA labels and descriptions
 */
export function FormSelector({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  loading = false,
  groupBy,
  searchable = false,
  required = false,
  error,
  description,
  disabled = false,
  className,
}: FormSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;

    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.title.toLowerCase().includes(query) ||
      option.id.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Group options if groupBy is specified
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { ungrouped: filteredOptions };

    const groups: Record<string, FormOption[]> = {};

    filteredOptions.forEach(option => {
      const groupKey = groupBy === 'category' ? option.category : option.status;
      const key = groupKey || 'Other';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(option);
    });

    return groups;
  }, [filteredOptions, groupBy]);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <Label htmlFor={label} className="flex items-center gap-1">
        {label}
        {required && <span className="text-error-text">*</span>}
      </Label>

      {/* Select */}
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || loading}
      >
        <SelectTrigger
          id={label}
          className={cn(
            error && 'border-error-border focus-visible:ring-error-DEFAULT'
          )}
          aria-describedby={
            description ? `${label}-description` : error ? `${label}-error` : undefined
          }
          aria-invalid={!!error}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder}>
              {selectedOption && (
                <div className="flex items-center gap-2">
                  <span>{selectedOption.title}</span>
                  {selectedOption.count !== undefined && (
                    <Badge variant="secondary" className="ml-auto">
                      {selectedOption.count}
                    </Badge>
                  )}
                </div>
              )}
            </SelectValue>
          )}
        </SelectTrigger>

        <SelectContent>
          {/* Search input */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          )}

          {/* Options */}
          {Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
            <div key={groupName}>
              {/* Group header (only if grouping is enabled) */}
              {groupBy && (
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  {groupName} ({groupOptions.length})
                </div>
              )}

              {/* Group options */}
              {groupOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="flex-1">{option.title}</span>
                    {option.count !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}

          {/* Empty state */}
          {filteredOptions.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No results found' : 'No options available'}
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Description */}
      {description && !error && (
        <p id={`${label}-description`} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={`${label}-error`} className="text-sm text-error-text" role="alert">
          {error}
        </p>
      )}

      {/* Options count */}
      {!loading && options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {options.length} option{options.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}
