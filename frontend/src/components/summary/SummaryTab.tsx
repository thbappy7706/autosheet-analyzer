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

function qualityClass(score: number): { text: string; badge: string } {
  if (score >= 90) return { text: 'text-success', badge: 'badge-success' }
  if (score >= 75) return { text: 'text-info', badge: 'badge-info' }
  if (score >= 50) return { text: 'text-warning', badge: 'badge-warning' }
  return { text: 'text-error', badge: 'badge-error' }
}

export function SummaryTab({ analysis }: { analysis: Analysis }) {
  const { t } = useTranslation('summary')
  const { t: tCommon } = useTranslation('common')
  const opts = useFormatOptions()
  const { overview, insights } = analysis

  const list = insights ?? []
  const quality = qualityClass(overview.qualityScore)

  return (
    <div className="space-y-4">
      {overview.sampled ? (
        <div role="alert" className="alert alert-info alert-soft rounded-2xl shadow-2xs py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span className="text-sm">
            {t('sampledNotice', {
              analyzedRows: formatNumber(overview.analyzedRows, opts),
              rows: formatNumber(overview.rows, opts),
            })}
          </span>
        </div>
      ) : null}

      {/* Main Stats Banner using DaisyUI stats */}
      <div className="stats stats-vertical sm:stats-horizontal shadow-xs bg-base-100 border border-base-300 w-full rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-base-200">
        <div className="stat py-4 px-5">
          <div className="stat-figure text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </div>
          <div className="stat-title text-xs uppercase tracking-wider font-semibold opacity-60">{t('rows')}</div>
          <div className="stat-value text-2xl sm:text-3xl text-primary font-black break-anywhere">
            {formatNumber(overview.rows, opts)}
          </div>
        </div>

        <div className="stat py-4 px-5">
          <div className="stat-figure text-secondary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 3v18M12 3v18M18 3v18" />
            </svg>
          </div>
          <div className="stat-title text-xs uppercase tracking-wider font-semibold opacity-60">{t('columns')}</div>
          <div className="stat-value text-2xl sm:text-3xl text-secondary font-black break-anywhere">
            {formatNumber(overview.columns, opts)}
          </div>
        </div>

        <div className="stat py-4 px-5">
          <div className="stat-figure text-warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="m4.93 4.93 14.14 14.14" />
            </svg>
          </div>
          <div className="stat-title text-xs uppercase tracking-wider font-semibold opacity-60">{t('missing')}</div>
          <div className="stat-value text-2xl sm:text-3xl text-warning font-black break-anywhere">
            {formatNumber(overview.missingCells, opts)}
          </div>
          <div className="stat-desc opacity-70 text-xs">
            {formatPercent(overview.missingPercent, opts)}
          </div>
        </div>

        <div className="stat py-4 px-5">
          <div className="stat-figure text-accent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect width="14" height="14" x="8" y="8" rx="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </div>
          <div className="stat-title text-xs uppercase tracking-wider font-semibold opacity-60">{t('duplicates')}</div>
          <div className="stat-value text-2xl sm:text-3xl text-accent font-black break-anywhere">
            {formatNumber(overview.duplicateRows, opts)}
          </div>
        </div>
      </div>

      {/* Quality Score & Technical Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quality Score Card */}
        <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs">
          <div className="card-body p-5 items-center text-center justify-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">{t('quality')}</span>
            <div
              className={`radial-progress ${quality.text} font-bold text-xl`}
              style={{
                '--value': overview.qualityScore,
                '--size': '6.5rem',
                '--thickness': '7px',
              } as React.CSSProperties}
              role="progressbar"
              aria-valuenow={overview.qualityScore}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {overview.qualityScore}
            </div>
            <div>
              <span className={`badge ${quality.badge} badge-soft font-semibold text-xs py-2 px-3`}>
                {t(qualityLabel(overview.qualityScore))}
              </span>
            </div>
          </div>
        </div>

        {/* Dataset Profile Details */}
        <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs lg:col-span-2">
          <div className="card-body p-5 justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-200">
                <span className="text-[11px] opacity-60 uppercase tracking-wide block">{t('fileSize')}</span>
                <span className="font-semibold text-sm mt-0.5 block">{formatBytes(overview.fileSize, opts)}</span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-200">
                <span className="text-[11px] opacity-60 uppercase tracking-wide block">{t('memory')}</span>
                <span className="font-semibold text-sm mt-0.5 block">{formatBytes(overview.memoryEstimate, opts)}</span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-200">
                <span className="text-[11px] opacity-60 uppercase tracking-wide block">{t('emptyRows')}</span>
                <span className="font-semibold text-sm mt-0.5 block">{formatNumber(overview.emptyRows, opts)}</span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-200">
                <span className="text-[11px] opacity-60 uppercase tracking-wide block">{t('emptyColumns')}</span>
                <span className="font-semibold text-sm mt-0.5 block">{formatNumber(overview.emptyColumns, opts)}</span>
              </div>
              <div className="bg-base-200/50 p-3 rounded-xl border border-base-200 sm:col-span-2">
                <span className="text-[11px] opacity-60 uppercase tracking-wide block">{t('quality')}</span>
                <span className="font-semibold text-sm mt-0.5 block">
                  {t('analysisTime', { ms: formatNumber(analysis.durationMs, opts) })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Insights */}
      <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs">
        <div className="card-body p-5">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base gap-2">
              <span>{t('insights')}</span>
              <span className="badge badge-primary badge-soft badge-sm">{formatNumber(list.length, opts)}</span>
            </h2>
          </div>

          {list.length === 0 ? (
            <p className="text-sm opacity-70 py-4">{t('noInsights')}</p>
          ) : (
            <div className="space-y-2.5 mt-2">
              {list.map((insight, i) => (
                <InsightRow key={`${insight.code}-${insight.column ?? ''}-${i}`} insight={insight} />
              ))}
            </div>
          )}
        </div>
      </div>

      <span className="sr-only">{tCommon('appName')}</span>
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
    <div
      role="alert"
      className={`alert ${
        warning ? 'alert-warning alert-soft' : 'alert-info alert-soft'
      } rounded-xl py-2.5 px-3.5 flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm`}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <span className={`badge badge-sm ${warning ? 'badge-warning' : 'badge-info'} shrink-0 font-medium`}>
          {warning ? tSeverity('severity.warning') : tSeverity('severity.info')}
        </span>
        <span className="break-anywhere leading-snug">{text}</span>
      </div>
    </div>
  )
}
