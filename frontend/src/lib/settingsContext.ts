import { createContext, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SupportedLanguage } from '../i18n'

export type Theme = string

export interface SettingsValue {
  theme: Theme
  setTheme: (theme: string) => void
  toggleTheme: () => void
  banglaDigits: boolean
  setBanglaDigits: (v: boolean) => void
}

export const SettingsContext = createContext<SettingsValue | null>(null)

export const THEME_KEY = 'theme'
export const DIGITS_KEY = 'banglaDigits'

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside a SettingsProvider')
  return ctx
}

export interface FormatOptions {
  locale: SupportedLanguage
  bengaliDigits: boolean
}

/** Returns the active language plus formatting options for the UI. */
export function useFormatOptions(): FormatOptions {
  const { i18n } = useTranslation()
  const { banglaDigits } = useSettings()
  const locale: SupportedLanguage = i18n.language.startsWith('bn') ? 'bn' : 'en'
  return useMemo(() => ({ locale, bengaliDigits: banglaDigits }), [locale, banglaDigits])
}
