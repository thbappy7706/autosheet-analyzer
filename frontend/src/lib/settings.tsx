import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DIGITS_KEY,
  SettingsContext,
  THEME_KEY,
  type SettingsValue,
  type Theme,
} from './settingsContext'

const DARK_THEMES = new Set([
  'dark',
  'synthwave',
  'halloween',
  'forest',
  'black',
  'luxury',
  'dracula',
  'business',
  'night',
  'coffee',
  'dim',
  'sunset',
  'abyss',
])

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readDigits(): boolean {
  return localStorage.getItem(DIGITS_KEY) === 'true'
}

/** Provides theme and digit preferences, persisting both to localStorage. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readTheme())
  const [banglaDigits, setBanglaDigitsState] = useState<boolean>(() => readDigits())

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(DIGITS_KEY, String(banglaDigits))
  }, [banglaDigits])

  const setTheme = useCallback((t: string) => {
    setThemeState(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (DARK_THEMES.has(current) ? 'light' : 'dark'))
  }, [])

  const setBanglaDigits = useCallback((v: boolean) => setBanglaDigitsState(v), [])

  const value = useMemo<SettingsValue>(
    () => ({ theme, setTheme, toggleTheme, banglaDigits, setBanglaDigits }),
    [theme, setTheme, toggleTheme, banglaDigits, setBanglaDigits],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
