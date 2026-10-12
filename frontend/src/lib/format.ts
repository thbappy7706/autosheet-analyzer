import type { SupportedLanguage } from '../i18n'

export interface FormatOptions {
  locale: SupportedLanguage
  /** Use Bangla digits (০-৯) and South Asian grouping for UI chrome. */
  bengaliDigits?: boolean
}

function baseLocale(locale: SupportedLanguage): string {
  return locale === 'bn' ? 'bn-BD' : 'en-US'
}

function numberingSystem(locale: SupportedLanguage, bengaliDigits: boolean): string {
  if (locale !== 'bn' || !bengaliDigits) return 'latn'
  return 'beng'
}

/** Formats a UI value (stat cards, pagination) honoring the digit preference. */
export function formatNumber(value: number, opts: FormatOptions): string {
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat(
      `${baseLocale(opts.locale)}-u-nu-${numberingSystem(opts.locale, opts.bengaliDigits ?? false)}`,
      { maximumFractionDigits: 2 },
    ).format(value)
  } catch {
    return String(value)
  }
}

/**
 * Formats a data value. Raw data always uses Latin digits so analysis values
 * stay unambiguous, but locale grouping (lakh/crore) is still applied.
 */
export function formatDataNumber(value: number, locale: SupportedLanguage): string {
  if (!Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat(`${baseLocale(locale)}-u-nu-latn`, {
      maximumFractionDigits: 4,
    }).format(value)
  } catch {
    return String(value)
  }
}

/** Formats a ratio (0-1) as a percentage string. */
export function formatPercent(value: number, opts: FormatOptions): string {
  if (!Number.isFinite(value)) return '—'
  const sys = numberingSystem(opts.locale, opts.bengaliDigits ?? false)
  try {
    return new Intl.NumberFormat(`${baseLocale(opts.locale)}-u-nu-${sys}`, {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value / 100)
  } catch {
    return `${value}%`
  }
}

export function formatBytes(bytes: number, opts: FormatOptions): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${formatNumber(Number(v.toFixed(i === 0 ? 0 : 1)), opts)} ${units[i]}`
}

export function formatDate(iso: string, locale: SupportedLanguage): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  try {
    return new Intl.DateTimeFormat(baseLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return iso
  }
}

/** Truncates a long label for chart axes while keeping the full value intact. */
export function truncateLabel(label: string, max = 18): string {
  const runes = [...label]
  if (runes.length <= max) return label
  return `${runes.slice(0, max - 1).join('')}…`
}
