import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAnalysis, useUploadMeta } from '../api/hooks'
import { DashboardSkeleton, ErrorAlert } from '../components/common/States'
import { SummaryTab } from '../components/summary/SummaryTab'
import { DataTable } from '../components/table/DataTable'
import { ColumnsTab } from '../components/columns/ColumnsTab'
import { ChartsTab } from '../components/charts/ChartsTab'
import { CustomChartBuilder } from '../components/charts/CustomChartBuilder'
import { ExportTab } from '../components/export/ExportTab'
import { useErrorMessage } from '../lib/errorMessage'
import { formatBytes } from '../lib/format'
import { useFormatOptions } from '../lib/settingsContext'

const TABS = ['summary', 'preview', 'columns', 'charts', 'builder', 'export'] as const
type Tab = (typeof TABS)[number]

export function DashboardPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation('common')
  const { t: tUpload } = useTranslation('upload')
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const message = useErrorMessage()
  const formatOptions = useFormatOptions()

  const meta = useUploadMeta(id)
  const sheets = meta.data?.sheets ?? []
  const sheet = searchParams.get('sheet') ?? sheets[0] ?? ''

  const activeTab: Tab = useMemo(() => {
    const segment = location.pathname.split('/').pop() ?? 'summary'
    return (TABS as readonly string[]).includes(segment) ? (segment as Tab) : 'summary'
  }, [location.pathname])

  const analysis = useAnalysis(id, sheet)

  if (meta.isLoading) return <DashboardSkeleton />
  if (meta.isError) {
    return <ErrorAlert message={message(meta.error)} onRetry={() => void meta.refetch()} />
  }

  const selectSheet = (next: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('sheet', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumbs */}
      <div className="breadcrumbs text-xs opacity-70 py-0">
        <ul>
          <li>
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>{t('appName')}</span>
            </Link>
          </li>
          <li className="font-medium truncate max-w-xs">{meta.data?.filename}</li>
          {sheet ? <li className="badge badge-sm badge-ghost">{sheet}</li> : null}
        </ul>
      </div>

      {/* Header card with file metadata */}
      <div className="card bg-base-100 border border-base-300 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M8 13h8M8 17h5" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold break-anywhere tracking-tight">{meta.data?.filename}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {meta.data ? (
                  <span className="badge badge-neutral badge-soft badge-xs">
                    {formatBytes(meta.data.size, formatOptions)}
                  </span>
                ) : null}
                {analysis.data ? (
                  <span className="badge badge-primary badge-soft badge-xs">
                    {t('rowCount', { count: analysis.data.overview.rows })}
                  </span>
                ) : null}
                {analysis.data ? (
                  <span className="badge badge-secondary badge-soft badge-xs">
                    {t('columnCount', { count: analysis.data.overview.columns })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <Link to="/" className="btn btn-sm btn-ghost border-base-300 gap-1.5 shadow-2xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h18M3 12l6-6M3 12l6 6" />
            </svg>
            <span>{tUpload('startOver')}</span>
          </Link>
        </div>

        {/* Multi-sheet selector */}
        {sheets.length > 1 ? (
          <div className="pt-4 mt-4 border-t border-base-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-semibold opacity-60 tracking-wider">{t('sheets')}:</span>
            </div>
            <div role="tablist" className="tabs tabs-box max-w-full overflow-x-auto gap-1">
              {sheets.map((s) => (
                <button
                  key={s}
                  role="tab"
                  type="button"
                  aria-selected={s === sheet}
                  className={`tab tab-sm font-medium transition-all ${
                    s === sheet ? 'tab-active font-semibold shadow-xs' : ''
                  }`}
                  onClick={() => selectSheet(s)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="mr-1 opacity-70">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Main navigation tabs */}
      <div role="tablist" className="tabs tabs-box bg-base-100 p-1.5 rounded-2xl border border-base-300 shadow-xs overflow-x-auto gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab}
            role="tab"
            to={`/d/${id}/${tab}?sheet=${encodeURIComponent(sheet)}`}
            aria-selected={tab === activeTab}
            className={`tab whitespace-nowrap text-xs sm:text-sm font-medium gap-2 transition-all ${
              tab === activeTab ? 'tab-active font-bold shadow-xs' : 'hover:bg-base-200/50'
            }`}
          >
            {tab === 'summary' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            )}
            {tab === 'preview' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
            )}
            {tab === 'columns' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
            )}
            {tab === 'charts' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            )}
            {tab === 'builder' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
            )}
            {tab === 'export' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            <span>{t(`nav.${tab}`)}</span>
          </Link>
        ))}
      </div>

      {analysis.isLoading ? <DashboardSkeleton /> : null}
      {analysis.isError ? (
        <ErrorAlert message={message(analysis.error)} onRetry={() => void analysis.refetch()} />
      ) : null}

      {analysis.data ? (
        <div className="transition-all">
          {activeTab === 'summary' ? <SummaryTab analysis={analysis.data} /> : null}
          {activeTab === 'preview' ? <DataTable id={id} sheet={sheet} columns={analysis.data.columns} /> : null}
          {activeTab === 'columns' ? <ColumnsTab columns={analysis.data.columns} /> : null}
          {activeTab === 'charts' ? <ChartsTab id={id} sheet={sheet} analysis={analysis.data} /> : null}
          {activeTab === 'builder' ? <CustomChartBuilder id={id} sheet={sheet} analysis={analysis.data} /> : null}
          {activeTab === 'export' ? (
            <ExportTab id={id} analysis={analysis.data} filename={meta.data?.filename ?? 'data'} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
