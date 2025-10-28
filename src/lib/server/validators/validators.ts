/**
 * Validation Utilities
 *
 * Common validation functions used across the application.
 */

import { ValidationResult } from '../types/operators';

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return '';
  const last10 = digits.slice(-10);
  return `+1${last10}`;
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const normalized = normalizePhone(phone);
  return normalized.length === 12 && normalized.startsWith('+1');
}

/**
 * Validate email address
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): ValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate mentor data
 */
export function validateMentorData(data: {
  mn_id?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  uga_email?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.mn_id) errors.push('Missing mn_id');
  if (!data.phone) errors.push('Missing phone');
  if (!data.first_name) errors.push('Missing first_name');
  if (!data.last_name) errors.push('Missing last_name');

  // Validate phone format
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push(`Invalid phone format: ${data.phone}`);
  }

  // Validate UGA email format
  if (data.uga_email && !data.uga_email.endsWith('@uga.edu')) {
    warnings.push(`UGA email doesn't end with @uga.edu: ${data.uga_email}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate contact data
 */
export function validateContactData(data: {
  contact_id?: number;
  primary_phone?: string;
  primary_email?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.contact_id) errors.push('Missing contact_id');

  // At least one contact method required
  if (!data.primary_phone && !data.primary_email) {
    errors.push('Must have either primary_phone or primary_email');
  }

  // Validate phone if present
  if (data.primary_phone && !isValidPhone(data.primary_phone)) {
    warnings.push(`Invalid phone format: ${data.primary_phone}`);
  }

  // Validate email if present
  if (data.primary_email && !isValidEmail(data.primary_email)) {
    warnings.push(`Invalid email format: ${data.primary_email}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize string (remove dangerous characters)
 */
export function sanitizeString(str: string | null | undefined): string {
  if (!str) return '';
  // Remove null bytes and trim
  return str.replace(/\0/g, '').trim();
}

/**
 * Parse comma-separated emails
 */
export function parseEmails(emailString: string | null | undefined): string[] {
  if (!emailString) return [];

  return emailString
    .split(',')
    .map(e => normalizeEmail(e))
    .filter(e => e && isValidEmail(e));
}

/**
 * Validate batch size
 */
export function validateBatchSize(size: number, min: number = 1, max: number = 1000): number {
  if (size < min) return min;
  if (size > max) return max;
  return size;
}
