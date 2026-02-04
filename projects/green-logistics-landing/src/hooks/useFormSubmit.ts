/**
 * useFormSubmit Hook
 * Wrapper around react-hook-form with automatic error handling
 * and submission state management
 */

import { useState, useCallback } from 'react';
import type { UseFormSetError } from 'react-hook-form';
import { ZodError, type ZodSchema } from 'zod';

export interface UseFormSubmitOptions {
  schema: ZodSchema;
  onSubmit: (data: unknown) => Promise<{ success: boolean; message?: string }>;
  onSuccess?: (message?: string) => void;
  onError?: (error: Error) => void;
}

export interface UseFormSubmitState {
  isSubmitting: boolean;
  isSuccess: boolean;
  successMessage: string | null;
  errorMessage: string | null;
}

export function useFormSubmit(options: UseFormSubmitOptions) {
  const [state, setState] = useState<UseFormSubmitState>({
    isSubmitting: false,
    isSuccess: false,
    successMessage: null,
    errorMessage: null,
  });

  const handleSubmit = useCallback(
    async (data: unknown, setError?: UseFormSetError<any>) => {
      setState({
        isSubmitting: true,
        isSuccess: false,
        successMessage: null,
        errorMessage: null,
      });

      try {
        const validatedData = options.schema.parse(data);

        const result = await options.onSubmit(validatedData);

        if (result.success) {
          setState({
            isSubmitting: false,
            isSuccess: true,
            successMessage: result.message || '저장되었습니다',
            errorMessage: null,
          });

          options.onSuccess?.(result.message);
        } else {
          setState({
            isSubmitting: false,
            isSuccess: false,
            successMessage: null,
            errorMessage: result.message || '저장에 실패했습니다',
          });
        }
      } catch (error) {
        if (error instanceof ZodError) {
          if (setError && error.issues) {
            error.issues.forEach((issue) => {
              const path = issue.path.join('.') as any;
              setError(path, {
                type: 'validation',
                message: issue.message,
              });
            });
          }

          const firstIssue = error.issues?.[0];
          setState({
            isSubmitting: false,
            isSuccess: false,
            successMessage: null,
            errorMessage: firstIssue?.message || 'Validation error',
          });
        } else {
          const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류';

          setState({
            isSubmitting: false,
            isSuccess: false,
            successMessage: null,
            errorMessage,
          });

          options.onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    },
    [options]
  );

  const resetState = useCallback(() => {
    setState({
      isSubmitting: false,
      isSuccess: false,
      successMessage: null,
      errorMessage: null,
    });
  }, []);

  return {
    ...state,
    handleSubmit,
    resetState,
  };
}

export default useFormSubmit;
