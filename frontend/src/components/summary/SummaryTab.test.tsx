import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../../i18n'
import { SettingsProvider } from '../../lib/settings'
import { SummaryTab } from './SummaryTab'
import type { Analysis } from '../../types/analysis'

const analysis: Analysis = {
  overview: {
    rows: 5,
    columns: 6,
    fileSize: 2048,
    sheet: 'Sheet1',
    memoryEstimate: 4096,
    duplicateRows: 1,
    emptyRows: 0,
    emptyColumns: 0,
    missingCells: 2,
    missingPercent: 6.67,
    sampled: false,
    analyzedRows: 5,
    qualityScore: 92,
    truncatedColumns: false,
  },
  columns: [],
  correlation: { columns: [], matrix: [], topPositive: [], topNegative: [], highPairs: [] },
  insights: [
    { code: 'DUPLICATE_ROWS', severity: 'warning', params: { count: 1, percent: 20 } },
    { code: 'LIKELY_ID', severity: 'info', column: 'id', params: { column: 'id' } },
  ],
  generatedAt: '2024-01-01T00:00:00Z',
  durationMs: 12,
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <SettingsProvider>{ui}</SettingsProvider>
    </I18nextProvider>,
  )
}

describe('SummaryTab', () => {
  it('renders the row and column counts', () => {
    renderWithProviders(<SummaryTab analysis={analysis} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('renders translated insights instead of raw codes', () => {
    renderWithProviders(<SummaryTab analysis={analysis} />)
    expect(screen.queryByText('DUPLICATE_ROWS')).not.toBeInTheDocument()
    expect(screen.getByText(/Found 1 duplicate rows/)).toBeInTheDocument()
    expect(screen.getByText(/looks like an identifier column/)).toBeInTheDocument()
  })

  it('renders the quality score', () => {
    renderWithProviders(<SummaryTab analysis={analysis} />)
    expect(screen.getByText('92')).toBeInTheDocument()
  })
})
