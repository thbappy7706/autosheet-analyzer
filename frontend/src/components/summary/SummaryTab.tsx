import { useTranslation } from 'react-i18next'
import { formatBytes, formatNumber, formatPercent } from '../../lib/format'
import { useFormatOptions } from '../../lib/settingsContext'
import type { Analysis, Insight } from '../../types/analysis'

function qualityLabel(score: number): 'qualityGreat' | 'qualityGood' | 'qualityFair' | 'qualityPoor' {
  if (score >= 90) return 'qualityGreat'
  if (score >= 75) return 'qualityGood'
  if (score >= 50) return 'qualityFair'
  return 'qualityPoor'
}

function qualityClass(score: number): string {
  if (score >= 90) return 'text-success'
  if (score >= 75) return 'text-info'
  if (score >= 50) return 'text-warning'
  return 'text-error'
}

export function SummaryTab({ analysis }: { analysis: Analysis }) {
  const { t } = useTranslation('summary')
  const { t: tCommon } = useTranslation('common')
  const opts = useFormatOptions()
  const { overview, insights } = analysis

  const list = insights ?? []

  return (
    <div className="space-y-4">
      {overview.sampled ? (
        <div className="alert alert-info py-2">
          <span className="text-sm">
            {t('sampledNotice', {
              analyzedRows: formatNumber(overview.analyzedRows, opts),
              rows: formatNumber(overview.rows, opts),
            })}
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('rows')} value={formatNumber(overview.rows, opts)} />
        <StatCard label={t('columns')} value={formatNumber(overview.columns, opts)} />
        <StatCard
          label={t('missing')}
          value={`${formatNumber(overview.missingCells, opts)} (${formatPercent(overview.missingPercent, opts)})`}
        />
        <StatCard label={t('duplicates')} value={formatNumber(overview.duplicateRows, opts)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body p-4 items-center text-center">
            <span className="text-xs uppercase tracking-wide opacity-60">{t('quality')}</span>
            <div
              className={`radial-progress ${qualityClass(overview.qualityScore)}`}
              style={{ '--value': overview.qualityScore, '--size': '6rem' } as React.CSSProperties}
              role="progressbar"
              aria-valuenow={overview.qualityScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {overview.qualityScore}
            </div>
            <span className="badge badge-outline">{t(qualityLabel(overview.qualityScore))}</span>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 lg:col-span-2">
          <div className="card-body p-4 justify-center">
            <ul className="space-y-1">
              <li className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-70">
                <span>
                  {t('fileSize')}: {formatBytes(overview.fileSize, opts)}
                </span>
                <span>
                  {t('memory')}: {formatBytes(overview.memoryEstimate, opts)}
                </span>
                <span>
                  {t('emptyRows')}: {formatNumber(overview.emptyRows, opts)}
                </span>
                <span>
                  {t('emptyColumns')}: {formatNumber(overview.emptyColumns, opts)}
                </span>
                <span>{t('analysisTime', { ms: formatNumber(analysis.durationMs, opts) })}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <h2 className="card-title text-base">
            {t('insights')}
            <span className="badge badge-sm badge-ghost">{formatNumber(list.length, opts)}</span>
          </h2>
          {list.length === 0 ? (
            <p className="text-sm opacity-70">{t('noInsights')}</p>
          ) : (
            <ul className="space-y-2">
              {list.map((insight, i) => (
                <InsightRow key={`${insight.code}-${insight.column ?? ''}-${i}`} insight={insight} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <span className="sr-only">{tCommon('appName')}</span>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat bg-base-100 border border-base-300 rounded-box py-4 px-4">
      <div className="stat-title text-xs">{label}</div>
      <div className="stat-value text-lg sm:text-2xl break-anywhere">{value}</div>
    </div>
  )
}

function InsightRow({ insight }: { insight: Insight }) {
  const { t } = useTranslation('insights')
  const { t: tSeverity } = useTranslation('summary')
  const translate = t as unknown as (key: string, options?: Record<string, unknown>) => string

  const params = insight.params ?? {}
  const rendered = translate(insight.code, params)
  const text = rendered === insight.code ? insight.code : rendered
  const warning = insight.severity === 'warning'

  return (
    <li className="flex items-start gap-2">
      <span className={`badge badge-sm ${warning ? 'badge-warning' : 'badge-info'} shrink-0`}>
        {warning ? tSeverity('severity.warning') : tSeverity('severity.info')}
      </span>
      <span className="text-sm break-anywhere">{text}</span>
    </li>
  )
}
