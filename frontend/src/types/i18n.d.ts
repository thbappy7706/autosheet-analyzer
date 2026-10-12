import 'i18next'

import type common from '../locales/en/common.json'
import type upload from '../locales/en/upload.json'
import type summary from '../locales/en/summary.json'
import type table from '../locales/en/table.json'
import type columns from '../locales/en/columns.json'
import type charts from '../locales/en/charts.json'
import type insights from '../locales/en/insights.json'
import type errors from '../locales/en/errors.json'

// The English resources are the source of truth for key types, so a missing or
// misspelled key becomes a compile-time error.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      upload: typeof upload
      summary: typeof summary
      table: typeof table
      columns: typeof columns
      charts: typeof charts
      insights: typeof insights
      errors: typeof errors
    }
  }
}
