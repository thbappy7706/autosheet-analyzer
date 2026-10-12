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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold break-anywhere">{meta.data?.filename}</h1>
          <p className="text-xs opacity-70">
            {meta.data ? formatBytes(meta.data.size, formatOptions) : null}
            {analysis.data ? ` · ${t('rowCount', { count: analysis.data.overview.rows })}` : null}
          </p>
        </div>
        <Link to="/" className="btn btn-sm btn-outline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5v14m0 0 6-6m-6 6-6-6" />
          </svg>
          <span>{tUpload('startOver')}</span>
        </Link>
      </div>

      {sheets.length > 1 ? (
        <div role="tablist" className="tabs tabs-boxed w-fit max-w-full overflow-x-auto">
          {sheets.map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={s === sheet}
              className={`tab ${s === sheet ? 'tab-active' : ''}`}
              onClick={() => selectSheet(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <div role="tablist" className="tabs tabs-border overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab}
            role="tab"
            to={`/d/${id}/${tab}?sheet=${encodeURIComponent(sheet)}`}
            aria-selected={tab === activeTab}
            className={`tab whitespace-nowrap ${tab === activeTab ? 'tab-active font-medium' : ''}`}
          >
            {t(`nav.${tab}`)}
          </Link>
        ))}
      </div>

      {analysis.isLoading ? <DashboardSkeleton /> : null}
      {analysis.isError ? (
        <ErrorAlert message={message(analysis.error)} onRetry={() => void analysis.refetch()} />
      ) : null}

      {analysis.data ? (
        <>
          {activeTab === 'summary' ? <SummaryTab analysis={analysis.data} /> : null}
          {activeTab === 'preview' ? <DataTable id={id} sheet={sheet} columns={analysis.data.columns} /> : null}
          {activeTab === 'columns' ? <ColumnsTab columns={analysis.data.columns} /> : null}
          {activeTab === 'charts' ? <ChartsTab id={id} sheet={sheet} analysis={analysis.data} /> : null}
          {activeTab === 'builder' ? <CustomChartBuilder id={id} sheet={sheet} analysis={analysis.data} /> : null}
          {activeTab === 'export' ? (
            <ExportTab id={id} analysis={analysis.data} filename={meta.data?.filename ?? 'data'} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
