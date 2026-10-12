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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return columns
    return columns.filter((c) => c.name.toLowerCase().includes(q) || c.type.includes(q))
  }, [columns, query])

  return (
    <div className="space-y-3">
      <label className="input input-sm flex items-center gap-2 w-full sm:w-72">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
      </label>

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
    <details className="collapse collapse-arrow bg-base-100 border border-base-300" open>
      <summary className="collapse-title pr-10 cursor-pointer">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-anywhere">{column.name}</span>
          <span className="badge badge-sm badge-primary badge-outline">{t(`types.${column.type}`)}</span>
          {column.mixedTypes ? <span className="badge badge-sm badge-warning">!</span> : null}
        </div>
        <div className="text-xs opacity-70 mt-1 flex flex-wrap gap-x-3">
          <span>
            {t('missing')}: {formatPercent(column.missingPct, opts)}
          </span>
          <span>
            {t('unique')}: {formatNumber(column.unique, opts)}
          </span>
        </div>
        {column.missingPct > 30 ? (
          <p className="text-xs text-warning mt-1 break-anywhere">{t('missingWarning')}</p>
        ) : null}
        {column.mixedTypes ? <p className="text-xs text-warning mt-1 break-anywhere">{t('mixedTypes')}</p> : null}
      </summary>

      <div className="collapse-content">
        <div className="h-40 mb-3">
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
  return <p className="text-sm opacity-60">{column.name}</p>
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
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2 border-b border-base-200 py-1">
            <dt className="opacity-60">{label}</dt>
            <dd className="font-medium break-anywhere text-right">{value}</dd>
          </div>
        ))}
      </dl>

      {column.categorical && column.categorical.top && column.categorical.top.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-xs uppercase tracking-wide opacity-60 mb-1">{t('topValues')}</h4>
          <ul className="text-xs space-y-1">
            {column.categorical.top.slice(0, 5).map((v) => (
              <li key={v.value} className="flex justify-between gap-2">
                <span className="break-anywhere">{v.value}</span>
                <span className="opacity-70 shrink-0">
                  {formatNumber(v.count, opts)} · {formatPercent(v.pct, opts)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
