import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'

const MAX_UPLOAD_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 50)

/**
 * Returns a function that turns any thrown error into a localized string.
 * Backend error codes are dynamic, so the translator is called through a
 * string-keyed signature.
 */
export function useErrorMessage() {
  const { t } = useTranslation('errors')
  const translate = t as unknown as (key: string, options?: Record<string, unknown>) => string

  return useCallback(
    (err: unknown): string => {
      if (err instanceof ApiError) {
        const params: Record<string, string | number> = { ...err.params, size: MAX_UPLOAD_MB }
        const translated = translate(err.code, params)
        // i18next returns the key itself when a code has no translation.
        return translated === err.code
          ? translate('withCode', { message: err.message, code: err.code })
          : translated
      }
      if (err instanceof Error) return err.message
      return translate('unknown')
    },
    [translate],
  )
}
