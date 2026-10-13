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
  const { t: tCommon } = useTranslation('common')

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
      <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs">
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-base-200">
            <div>
              <h2 className="card-title text-base font-bold">{t('builder')}</h2>
              <p className="text-xs opacity-70 mt-0.5">{t('builderHelp')}</p>
            </div>
            {isFetching ? (
              <span className="badge badge-primary badge-soft gap-1.5 text-xs">
                <span className="loading loading-spinner loading-xs text-primary" />
                {tCommon('loading')}
              </span>
            ) : null}
          </div>

          {/* Chart Type Selector Pills */}
          <div className="pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-60 block mb-1.5">
              {t('chartType')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  className={`btn btn-sm capitalize rounded-xl ${
                    chartType === ct ? 'btn-primary font-bold shadow-xs' : 'btn-ghost border-base-300'
                  }`}
                  onClick={() => {
                    setOptimisticType(ct)
                    setChartType(ct)
                  }}
                >
                  {t(ct)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            <label className="form-control">
              <span className="label-text text-xs font-medium mb-1">{t('xAxis')}</span>
              <select
                className="select select-sm select-bordered rounded-xl"
                value={x}
                onChange={(e) => setX(e.target.value)}
              >
                {groupableColumns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text text-xs font-medium mb-1">{t('yAxis')}</span>
              <select
                className="select select-sm select-bordered rounded-xl"
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
              <span className="label-text text-xs font-medium mb-1">{t('aggregation')}</span>
              <select
                className="select select-sm select-bordered rounded-xl"
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
              <span className="label-text text-xs font-medium mb-1">{t('groupBy')}</span>
              <select
                className="select select-sm select-bordered rounded-xl"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
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
          {isError ? <p className="text-sm text-error text-center py-10">{tColumns('noColumns')}</p> : null}
          {!isError && trimmed.length === 0 && !isFetching ? (
            <p className="text-sm opacity-60 text-center py-10">{t('noCharts')}</p>
          ) : null}
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
