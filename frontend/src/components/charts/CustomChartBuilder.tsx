import { useMemo, useOptimistic, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAggregate } from '../../api/hooks'
import { ChartCard } from './ChartCard'
import { AreaView, CategoryBarView, DonutView } from './ChartViews'
import { EmptyState } from '../common/States'
import type { AggregatePoint, Aggregation, Analysis } from '../../types/analysis'

type BuilderChartType = 'bar' | 'line' | 'area' | 'donut' | 'histogram'

const CHART_TYPES: BuilderChartType[] = ['bar', 'line', 'area', 'donut', 'histogram']
const AGGS: Aggregation[] = ['count', 'sum', 'avg', 'min', 'max']

export function CustomChartBuilder({ id, sheet, analysis }: { id: string; sheet: string; analysis: Analysis }) {
  const { t } = useTranslation('charts')
  const { t: tColumns } = useTranslation('columns')

  const columns = analysis.columns
  const numericColumns = columns.filter((c) => c.type === 'integer' || c.type === 'float')
  const groupableColumns = columns.filter((c) => c.type !== 'constant')

  const [chartType, setChartType] = useState<BuilderChartType>('bar')
  // Optimistically reflect the newest chart type while the query is pending.
  const [optimisticType, setOptimisticType] = useOptimistic(chartType, (_current, next: BuilderChartType) => next)

  const [x, setX] = useState<string>(groupableColumns[0]?.name ?? '')
  const [y, setY] = useState<string>(numericColumns[0]?.name ?? '')
  const [agg, setAgg] = useState<Aggregation>(numericColumns.length > 0 ? 'sum' : 'count')
  const [groupBy, setGroupBy] = useState<string>('')

  const needsY = agg !== 'count'

  const request = useMemo(
    () => ({
      sheet,
      x,
      y: needsY ? y : undefined,
      agg,
      groupBy: groupBy || undefined,
    }),
    [sheet, x, y, agg, groupBy, needsY],
  )

  const { data, isFetching, isError } = useAggregate(id, request, Boolean(x))

  const points = data?.points ?? []
  const maxGroups = 40
  const trimmed = points.slice(0, maxGroups)

  return (
    <div className="space-y-4">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="card-title text-base">{t('builder')}</h2>
          <p className="text-sm opacity-70">{t('builderHelp')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            <label className="form-control">
              <span className="label-text text-xs mb-1">{t('chartType')}</span>
              <select
                className="select select-sm select-bordered"
                value={chartType}
                onChange={(e) => {
                  const next = e.target.value as BuilderChartType
                  setOptimisticType(next)
                  setChartType(next)
                }}
              >
                {CHART_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {t(ct)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-xs mb-1">{t('xAxis')}</span>
              <select className="select select-sm select-bordered" value={x} onChange={(e) => setX(e.target.value)}>
                {groupableColumns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-xs mb-1">{t('yAxis')}</span>
              <select
                className="select select-sm select-bordered"
                value={y}
                disabled={!needsY}
                onChange={(e) => setY(e.target.value)}
              >
                <option value="">{t('none')}</option>
                {numericColumns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-xs mb-1">{t('aggregation')}</span>
              <select
                className="select select-sm select-bordered"
                value={agg}
                onChange={(e) => setAgg(e.target.value as Aggregation)}
              >
                {AGGS.map((a) => (
                  <option key={a} value={a}>
                    {t(a)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-xs mb-1">{t('groupBy')}</span>
              <select className="select select-sm select-bordered" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="">{t('none')}</option>
                {groupableColumns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {!x ? (
        <EmptyState title={t('emptyBuilder')} />
      ) : (
        <ChartCard
          title={`${optimisticType.toUpperCase()} · ${x}${needsY && y ? ` → ${y}` : ''}`}
          subtitle={`${t(agg)}${groupBy ? ` · ${t('groupBy')}: ${groupBy}` : ''}`}
        >
          {isError ? <p className="text-sm text-error">{tColumns('noColumns')}</p> : null}
          {!isError && trimmed.length === 0 && !isFetching ? <p className="text-sm opacity-60">{t('noCharts')}</p> : null}
          {!isError && trimmed.length > 0 ? <BuilderChart type={optimisticType} points={trimmed} name={x} /> : null}
        </ChartCard>
      )}
    </div>
  )
}

function BuilderChart({
  type,
  points,
  name,
}: {
  type: BuilderChartType
  points: AggregatePoint[]
  name: string
}) {
  switch (type) {
    case 'donut':
      return <DonutView data={points.map((p) => ({ value: p.label, count: p.value, pct: 0 }))} />
    case 'line':
    case 'area':
      return <AreaView data={points.map((p) => ({ period: p.label, count: p.value }))} />
    default:
      // Bar and histogram both render the aggregated value per category.
      return <CategoryBarView data={points.map((p) => ({ value: p.label, count: p.value, pct: 0 }))} label={name} />
  }
}
