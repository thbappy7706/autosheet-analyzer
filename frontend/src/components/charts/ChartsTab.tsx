import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { ChartCard } from './ChartCard'
import {
  AreaView,
  CategoryBarView,
  CorrelationBars,
  CorrelationHeatmap,
  DonutView,
  HistogramView,
  ScatterView,
  TimeSeriesView,
  type ScatterPoint,
} from './ChartViews'
import { EmptyState } from '../common/States'
import type { Analysis, ColumnProfile, CorrelationPair } from '../../types/analysis'

const SCATTER_SAMPLE = 600

export function ChartsTab({ id, sheet, analysis }: { id: string; sheet: string; analysis: Analysis }) {
  const { t } = useTranslation('charts')
  const { t: tColumns } = useTranslation('columns')

  const numeric = analysis.columns.filter((c) => (c.type === 'integer' || c.type === 'float') && c.numeric)
  const categorical = analysis.columns.filter((c) => c.categorical && c.categorical.cardinality <= 30 && c.categorical.cardinality > 1)
  const dated = analysis.columns.filter((c) => c.date && (c.date.byMonth?.length ?? 0) > 1)
  const booleanCols = analysis.columns.filter((c) => c.boolean)

  const scatterPairs = useMemo(
    () => (analysis.correlation.topPositive ?? []).filter((p) => Math.abs(p.r) >= 0.3).slice(0, 3),
    [analysis.correlation.topPositive],
  )

  const hasAnything =
    numeric.length > 0 || categorical.length > 0 || dated.length > 0 || booleanCols.length > 0 || analysis.correlation.columns.length >= 2

  if (!hasAnything) {
    return <EmptyState title={t('noCharts')} />
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">{t('gallery')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {numeric.slice(0, 8).map((column) => (
            <ChartCard
              key={`hist-${column.name}`}
              title={column.name}
              subtitle={`${t('histogram')} · ${t('frequency')}`}
            >
              {column.numeric?.histogram ? <HistogramView bins={column.numeric.histogram} /> : null}
            </ChartCard>
          ))}

          {categorical.slice(0, 6).map((column) => (
            <ChartCard key={`bar-${column.name}`} title={column.name} subtitle={t('bar')}>
              {column.categorical?.top ? <CategoryBarView data={column.categorical.top} label={column.name} /> : null}
            </ChartCard>
          ))}

          {booleanCols.slice(0, 4).map((column) => (
            <ChartCard key={`bool-${column.name}`} title={column.name} subtitle={t('donut')}>
              <DonutView
                data={[
                  { value: 'true', count: column.boolean?.true ?? 0, pct: 0 },
                  { value: 'false', count: column.boolean?.false ?? 0, pct: 0 },
                ]}
              />
            </ChartCard>
          ))}

          {dated.slice(0, 4).map((column) => (
            <ChartCard key={`line-${column.name}`} title={column.name} subtitle={`${t('line')} · ${column.date?.frequency ?? ''}`}>
              {column.date?.byMonth ? <TimeSeriesView data={column.date.byMonth} /> : null}
            </ChartCard>
          ))}

          {dated.slice(0, 2).map((column) => (
            <ChartCard key={`area-${column.name}`} title={column.name} subtitle={t('area')}>
              {column.date?.byYear ? <AreaView data={column.date.byYear} /> : null}
            </ChartCard>
          ))}

          {scatterPairs.map((pair) => (
            <ScatterCard key={`scatter-${pair.a}-${pair.b}`} id={id} sheet={sheet} pair={pair} />
          ))}
        </div>
      </section>

      {numeric.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">{tColumns('outliers')}</h2>
          <ChartCard title={tColumns('outliers')} subtitle={tColumns('stats')}>
            <OutlierChart columns={numeric} />
          </ChartCard>
        </section>
      ) : null}

      {analysis.correlation.columns.length >= 2 ? (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-60">{t('correlation')}</h2>
          <ChartCard title={t('heatmap')} subtitle={t('correlation')} height={Math.max(240, analysis.correlation.columns.length * 34)}>
            <CorrelationHeatmap correlation={analysis.correlation} />
          </ChartCard>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(analysis.correlation.topPositive?.length ?? 0) > 0 ? (
              <ChartCard title={t('topPositive')} subtitle={t('correlation')}>
                <CorrelationBars pairs={analysis.correlation.topPositive ?? []} positive />
              </ChartCard>
            ) : null}
            {(analysis.correlation.topNegative?.length ?? 0) > 0 ? (
              <ChartCard title={t('topNegative')} subtitle={t('correlation')}>
                <CorrelationBars pairs={analysis.correlation.topNegative ?? []} positive={false} />
              </ChartCard>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ScatterCard({ id, sheet, pair }: { id: string; sheet: string; pair: CorrelationPair }) {
  const { t } = useTranslation('charts')
  const { data, isLoading } = useQuery({
    queryKey: ['scatter', id, sheet, pair.a, pair.b],
    queryFn: () => api.getRows(id, { sheet, page: 1, pageSize: SCATTER_SAMPLE }),
  })

  const points = useMemo<ScatterPoint[]>(() => {
    if (!data) return []
    const xi = data.columns.indexOf(pair.a)
    const yi = data.columns.indexOf(pair.b)
    if (xi < 0 || yi < 0) return []
    const out: ScatterPoint[] = []
    for (const row of data.rows) {
      const x = Number(row[xi])
      const y = Number(row[yi])
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y })
    }
    return out
  }, [data, pair.a, pair.b])

  return (
    <ChartCard title={`${pair.a} · ${pair.b}`} subtitle={`${t('scatter')} · r = ${pair.r.toFixed(2)}`}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : (
        <ScatterView points={points} xName={pair.a} yName={pair.b} />
      )}
    </ChartCard>
  )
}

function OutlierChart({ columns }: { columns: ColumnProfile[] }) {
  const { t } = useTranslation('charts')
  const rows = columns
    .filter((c) => c.numeric)
    .map((c) => ({ name: c.name, count: c.numeric?.outlierCount ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)

  if (rows.length === 0) return <p className="text-sm opacity-60 text-center py-10">{t('noCharts')}</p>

  const max = rows[0]?.count ?? 1

  return (
    <div className="space-y-3 overflow-auto h-full pr-1">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3 text-xs">
          <span className="w-36 font-medium truncate" title={r.name}>
            {r.name}
          </span>
          <div className="flex-1">
            <progress
              className="progress progress-error w-full h-2 rounded-full"
              value={r.count}
              max={max}
            />
          </div>
          <span className="badge badge-error badge-soft badge-sm font-mono w-12 text-center shrink-0">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  )
}
