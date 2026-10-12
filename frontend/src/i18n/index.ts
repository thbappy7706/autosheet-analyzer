import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from '../locales/en/common.json'
import enUpload from '../locales/en/upload.json'
import enSummary from '../locales/en/summary.json'
import enTable from '../locales/en/table.json'
import enColumns from '../locales/en/columns.json'
import enCharts from '../locales/en/charts.json'
import enInsights from '../locales/en/insights.json'
import enErrors from '../locales/en/errors.json'

import bnCommon from '../locales/bn/common.json'
import bnUpload from '../locales/bn/upload.json'
import bnSummary from '../locales/bn/summary.json'
import bnTable from '../locales/bn/table.json'
import bnColumns from '../locales/bn/columns.json'
import bnCharts from '../locales/bn/charts.json'
import bnInsights from '../locales/bn/insights.json'
import bnErrors from '../locales/bn/errors.json'

export const defaultNS = 'common'

export const namespaces = [
  'common',
  'upload',
  'summary',
  'table',
  'columns',
  'charts',
  'insights',
  'errors',
] as const

export const resources = {
  en: {
    common: enCommon,
    upload: enUpload,
    summary: enSummary,
    table: enTable,
    columns: enColumns,
    charts: enCharts,
    insights: enInsights,
    errors: enErrors,
  },
  bn: {
    common: bnCommon,
    upload: bnUpload,
    summary: bnSummary,
    table: bnTable,
    columns: bnColumns,
    charts: bnCharts,
    insights: bnInsights,
    errors: bnErrors,
  },
} as const

export const supportedLanguages = ['en', 'bn'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    ns: [...namespaces],
    supportedLngs: [...supportedLanguages],
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
  })

// Keep <html lang> in sync so :lang(bn) styles and a11y tools work.
function syncHtmlLang(lng: string) {
  const lang = lng.startsWith('bn') ? 'bn' : 'en'
  document.documentElement.lang = lang
}
syncHtmlLang(i18n.language ?? 'en')
i18n.on('languageChanged', syncHtmlLang)

export default i18n
