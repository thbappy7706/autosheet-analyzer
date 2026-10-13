import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AreaView, CategoryBarView, DonutView, HistogramView } from '../charts/ChartViews'
import { EmptyState } from '../common/States'
import { formatDataNumber, formatNumber, formatPercent } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import type { ColumnProfile } from '../../types/analysis'

export function ColumnsTab({ columns }: { columns: ColumnProfile[] }) {
  const { t } = useTranslation('columns')
  const [query, setQuery] = useState('')
  const opts = useFormatOptions()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return columns
    return columns.filter((c) => c.name.toLowerCase().includes(q) || c.type.includes(q))
  }, [columns, query])

  return (
    <div className="space-y-4">
      {/* Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-2xs">
        <label className="input input-sm input-bordered flex items-center gap-2 w-full sm:w-80 rounded-xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="opacity-60">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            className="grow"
            placeholder={t('search')}
            aria-label={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </label>

        <span className="badge badge-neutral badge-soft text-xs font-medium">
          {formatNumber(filtered.length, opts)} / {formatNumber(columns.length, opts)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('noColumns')} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filtered.map((column) => (
            <ColumnCard key={column.name} column={column} />
          ))}
        </div>
      )}
    </div>
  )
}

function ColumnCard({ column }: { column: ColumnProfile }) {
  const { t } = useTranslation('columns')
  const opts = useFormatOptions()

  return (
    <details className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl shadow-2xs hover:shadow-sm transition-all" open>
      <summary className="collapse-title pr-10 cursor-pointer">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm sm:text-base break-anywhere tracking-tight">{column.name}</span>
          <span className="badge badge-sm badge-primary badge-soft font-medium">{t(`types.${column.type}`)}</span>
          {column.mixedTypes ? <span className="badge badge-sm badge-warning badge-soft font-bold">!</span> : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-75 mt-2">
          <div className="flex items-center gap-1.5">
            <span>{t('missing')}:</span>
            <span className="font-medium">{formatPercent(column.missingPct, opts)}</span>
            {column.missingPct > 0 ? (
              <progress
                className="progress progress-warning w-16 h-1.5 rounded-full"
                value={column.missingPct}
                max={100}
              />
            ) : null}
          </div>
          <div>
            <span>{t('unique')}:</span>{' '}
            <span className="font-medium">{formatNumber(column.unique, opts)}</span>
          </div>
        </div>

        {column.missingPct > 30 ? (
          <p className="text-xs text-warning font-medium mt-1.5 break-anywhere">{t('missingWarning')}</p>
        ) : null}
        {column.mixedTypes ? <p className="text-xs text-warning font-medium mt-1 break-anywhere">{t('mixedTypes')}</p> : null}
      </summary>

      <div className="collapse-content pt-2 border-t border-base-200">
        <div className="h-44 mb-3 bg-base-200/40 p-2.5 rounded-xl border border-base-200">
          <MiniChart column={column} />
        </div>
        <StatsGrid column={column} />
      </div>
    </details>
  )
}

function MiniChart({ column }: { column: ColumnProfile }) {
  if (column.numeric && column.numeric.histogram && column.numeric.histogram.length > 0) {
    return <HistogramView bins={column.numeric.histogram} />
  }
  if (column.boolean) {
    return <DonutView data={[{ value: 'true', count: column.boolean.true, pct: 0 }, { value: 'false', count: column.boolean.false, pct: 0 }]} />
  }
  if (column.date && column.date.byMonth && column.date.byMonth.length > 0) {
    return <AreaView data={column.date.byMonth} />
  }
  if (column.categorical && column.categorical.top) {
    return <CategoryBarView data={column.categorical.top.slice(0, 8)} label={column.name} />
  }
  return <p className="text-sm opacity-60 text-center py-8">{column.name}</p>
}

function StatsGrid({ column }: { column: ColumnProfile }) {
  const { t } = useTranslation('columns')
  const opts = useFormatOptions()
  const rows: Array<[string, string]> = []

  if (column.numeric) {
    const n = column.numeric
    rows.push(
      [t('min'), formatDataNumber(n.min, opts.locale)],
      [t('max'), formatDataNumber(n.max, opts.locale)],
      [t('mean'), formatDataNumber(Number(n.mean.toFixed(4)), opts.locale)],
      [t('median'), formatDataNumber(Number(n.median.toFixed(4)), opts.locale)],
      [t('mode'), formatDataNumber(n.mode, opts.locale)],
      [t('stdDev'), formatDataNumber(Number(n.stdDev.toFixed(4)), opts.locale)],
      [t('variance'), formatDataNumber(Number(n.variance.toFixed(4)), opts.locale)],
      [t('q1'), formatDataNumber(Number(n.q1.toFixed(4)), opts.locale)],
      [t('q3'), formatDataNumber(Number(n.q3.toFixed(4)), opts.locale)],
      [t('iqr'), formatDataNumber(Number(n.iqr.toFixed(4)), opts.locale)],
      [t('skewness'), formatDataNumber(Number(n.skewness.toFixed(3)), opts.locale)],
      [t('kurtosis'), formatDataNumber(Number(n.kurtosis.toFixed(3)), opts.locale)],
      [t('sum'), formatDataNumber(Number(n.sum.toFixed(4)), opts.locale)],
      [t('outliers'), formatNumber(n.outlierCount, opts)],
    )
  }
  if (column.categorical) {
    const c = column.categorical
    rows.push(
      [t('cardinality'), formatNumber(c.cardinality, opts)],
      [t('avgLength'), formatNumber(c.avgLength, opts)],
      [t('minLength'), formatNumber(c.minLength, opts)],
      [t('maxLength'), formatNumber(c.maxLength, opts)],
    )
  }
  if (column.date) {
    rows.push(
      [t('min'), column.date.min],
      [t('max'), column.date.max],
      [t('range'), formatNumber(column.date.rangeDays, opts)],
      [t('frequency'), column.date.frequency],
    )
  }
  if (column.boolean) {
    rows.push(
      [t('trueCount'), formatNumber(column.boolean.true, opts)],
      [t('falseCount'), formatNumber(column.boolean.false, opts)],
    )
  }

  return (
    <div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="bg-base-200/40 p-2 rounded-lg border border-base-200 flex justify-between items-center gap-1">
            <dt className="opacity-60 truncate">{label}</dt>
            <dd className="font-semibold break-anywhere text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {column.categorical && column.categorical.top && column.categorical.top.length > 0 ? (
        <div className="mt-4 pt-3 border-t border-base-200">
          <h4 className="text-xs uppercase tracking-wider font-semibold opacity-60 mb-2">{t('topValues')}</h4>
          <div className="space-y-1.5 text-xs">
            {column.categorical.top.slice(0, 5).map((v) => (
              <div key={v.value} className="space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium break-anywhere truncate max-w-[200px]">{v.value}</span>
                  <span className="opacity-70 shrink-0 text-[11px]">
                    {formatNumber(v.count, opts)} ({formatPercent(v.pct, opts)})
                  </span>
                </div>
                <progress className="progress progress-primary w-full h-1.5 rounded-full" value={v.pct} max={100} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
