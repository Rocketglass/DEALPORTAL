'use client';

import { useState, useCallback, useRef } from 'react';
import type { z, ZodIssue } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => void | Promise<void>;
}

export interface UseFormValidationReturn {
  /** Field-level error messages keyed by dot-path (e.g. "party.lessor_name") */
  errors: Record<string, string>;
  /** Validate all fields. Returns true when the form is valid. */
  validate: (data: unknown) => boolean;
  /** Validate a single field on blur. Only fires after the first submit attempt. */
  validateField: (field: string, value: unknown, fullData: unknown) => void;
  /** Clear the error for a single field (call on change). */
  clearError: (field: string) => void;
  /** Whether the async onSubmit callback is currently running. */
  isSubmitting: boolean;
  /** Pass as the form's onSubmit handler. Validates, then calls onSubmit. */
  handleSubmit: (data: unknown) => void | Promise<void>;
  /** Whether the user has attempted to submit at least once. */
  hasAttemptedSubmit: boolean;
  /** Trigger the shake animation on the form container. */
  shakeKey: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Zod issue path array to a dot-separated string. */
function issuePath(issue: ZodIssue): string {
  return issue.path.map(String).join('.');
}

/** Map Zod issues into a flat Record<fieldPath, firstErrorMessage>. */
function mapIssues(issues: ZodIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = issuePath(issue);
    // Keep only the first error per field
    if (key && !map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFormValidation<T>({
  schema,
  onSubmit,
}: UseFormValidationOptions<T>): UseFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const submitAttemptedRef = useRef(false);

  // ---- Validate all fields ----
  const validate = useCallback(
    (data: unknown): boolean => {
      const result = schema.safeParse(data);
      if (result.success) {
        setErrors({});
        return true;
      }
      const mapped = mapIssues(result.error.issues);
      setErrors(mapped);
      setShakeKey((k) => k + 1);
      return false;
    },
    [schema],
  );

  // ---- Validate a single field (for onBlur) ----
  const validateField = useCallback(
    (field: string, _value: unknown, fullData: unknown) => {
      // Only validate on blur after the user has tried to submit
      if (!submitAttemptedRef.current) return;

      const result = schema.safeParse(fullData);
      if (result.success) {
        // Field is now valid — clear its error
        setErrors((prev) => {
          if (!prev[field]) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return;
      }

      const mapped = mapIssues(result.error.issues);
      if (mapped[field]) {
        setErrors((prev) => ({ ...prev, [field]: mapped[field] }));
      } else {
        // Field is valid now — clear its error
        setErrors((prev) => {
          if (!prev[field]) return prev;
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [schema],
  );

  // ---- Clear error on field change ----
  const clearError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ---- Handle submit ----
  const handleSubmit = useCallback(
    async (data: unknown) => {
      setHasAttemptedSubmit(true);
      submitAttemptedRef.current = true;

      const result = schema.safeParse(data);
      if (!result.success) {
        const mapped = mapIssues(result.error.issues);
        setErrors(mapped);
        setShakeKey((k) => k + 1);
        return;
      }

      setErrors({});
      setIsSubmitting(true);
      try {
        await onSubmit(result.data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [schema, onSubmit],
  );

  return {
    errors,
    validate,
    validateField,
    clearError,
    isSubmitting,
    handleSubmit,
    hasAttemptedSubmit,
    shakeKey,
  };
}
