import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useErrorMessage } from '../../lib/errorMessage'
import { formatBytes, formatNumber } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import type { Analysis } from '../../types/analysis'

const EXPORT_PAGE_SIZE = 1000
const MAX_EXPORT_ROWS = 100_000

/** Quotes a single CSV field per RFC 4180. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportTab({ id, analysis, filename }: { id: string; analysis: Analysis; filename: string }) {
  const { t } = useTranslation('common')
  const { t: tTable } = useTranslation('table')
  const message = useErrorMessage()
  const opts = useFormatOptions()

  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState<number | null>(null)

  const baseName = filename.replace(/\.[^.]+$/, '')

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' })
    download(blob, `${baseName}-summary.json`)
  }

  const exportCsv = async () => {
    setBusy(true)
    setError(null)
    setExported(null)
    try {
      const sheet = analysis.overview.sheet
      const lines: string[] = []
      let page = 1
      let total = 0
      let columns: string[] = []

      for (;;) {
        const result = await api.getRows(id, {
          sheet,
          page,
          pageSize: EXPORT_PAGE_SIZE,
          filter: filter || undefined,
        })
        if (page === 1) {
          columns = result.columns
          lines.push(columns.map(csvField).join(','))
        }
        for (const row of result.rows) {
          lines.push(row.map((v) => csvField(v ?? '')).join(','))
          total++
          if (total >= MAX_EXPORT_ROWS) break
        }
        if (page >= result.totalPages || total >= MAX_EXPORT_ROWS) break
        page++
      }

      // Excel and most tools expect a BOM to read UTF-8 (Bangla) correctly.
      const csv = `\uFEFF${lines.join('\r\n')}`
      download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${baseName}-data.csv`)
      setExported(total)
    } catch (err) {
      setError(message(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* JSON Export Card */}
      <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
        <div className="card-body p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="card-title text-base font-bold">Analysis Profile (JSON)</h2>
            <p className="text-xs opacity-70">
              Complete computed statistics, type inferences, correlation matrix, and insights in structured JSON.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="badge badge-neutral badge-soft badge-xs">
                {formatNumber(analysis.overview.rows, opts)} × {formatNumber(analysis.overview.columns, opts)}
              </span>
              <span className="badge badge-primary badge-soft badge-xs">
                {formatBytes(analysis.overview.fileSize, opts)}
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-primary gap-2 mt-4 rounded-xl shadow-xs" onClick={exportJson}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('download')} JSON</span>
          </button>
        </div>
      </div>

      {/* CSV Export Card */}
      <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
        <div className="card-body p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </div>
            <h2 className="card-title text-base font-bold">Filtered Table Data (CSV)</h2>
            <p className="text-xs opacity-70">
              Download clean UTF-8 encoded CSV with optional search filter and BOM support for Excel & Bangla.
            </p>
            <div className="pt-1">
              <label className="input input-sm input-bordered flex items-center gap-2 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="opacity-60">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  className="grow"
                  placeholder={tTable('searchPlaceholder')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label={tTable('filtered')}
                />
              </label>
            </div>
            {exported !== null ? (
              <span className="badge badge-success badge-soft badge-sm gap-1">
                ✓ Exported {formatNumber(exported, opts)} rows
              </span>
            ) : null}
            {error ? <p className="text-xs text-error mt-1 break-anywhere font-medium">{error}</p> : null}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary gap-2 mt-4 rounded-xl shadow-xs"
            disabled={busy}
            onClick={() => void exportCsv()}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>{t('download')} CSV</span>
          </button>
        </div>
      </div>

      {/* Visual PNG Export Card */}
      <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs hover:shadow-md transition-shadow">
        <div className="card-body p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <h2 className="card-title text-base font-bold">Chart Figures (PNG)</h2>
            <p className="text-xs opacity-70">
              Download any individual visualization as high-resolution PNG image directly from the charts view.
            </p>
          </div>
          <Link to="../charts" relative="path" className="btn btn-sm btn-outline gap-2 mt-4 rounded-xl shadow-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>{t('nav.charts')}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
