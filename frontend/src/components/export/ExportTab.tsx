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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t('download')} JSON</h2>
          <p className="text-sm opacity-70">
            {formatNumber(analysis.overview.rows, opts)} × {formatNumber(analysis.overview.columns, opts)} ·{' '}
            {formatBytes(analysis.overview.fileSize, opts)}
          </p>
          <button type="button" className="btn btn-sm btn-primary mt-2" onClick={exportJson}>
            {t('download')}
          </button>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t('download')} CSV</h2>
          <input
            type="text"
            className="input input-sm input-bordered"
            placeholder={tTable('searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={tTable('filtered')}
          />
          <button type="button" className="btn btn-sm btn-primary mt-2" disabled={busy} onClick={() => void exportCsv()}>
            {busy ? <span className="loading loading-spinner loading-xs" /> : null}
            {t('download')}
          </button>
          {exported !== null ? (
            <p className="text-xs opacity-70 mt-1">{formatNumber(exported, opts)}</p>
          ) : null}
          {error ? <p className="text-xs text-error mt-1 break-anywhere">{error}</p> : null}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t('exportPng')}</h2>
          <p className="text-sm opacity-70">{t('nav.charts')}</p>
          <Link to="../charts" relative="path" className="btn btn-sm btn-outline mt-2">
            {t('nav.charts')}
          </Link>
        </div>
      </div>
    </div>
  )
}
