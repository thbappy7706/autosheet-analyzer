import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { exportContainerToPng, toFileName } from '../../lib/exportImage'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Height of the chart body in pixels. */
  height?: number
  actions?: ReactNode
}

/**
 * Common wrapper for every chart: a DaisyUI card with a title, an optional
 * subtitle, a PNG export button and a fullscreen toggle.
 */
export function ChartCard({ title, subtitle, children, height = 280, actions }: ChartCardProps) {
  const { t } = useTranslation('common')
  const bodyRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const handleExport = async () => {
    if (!bodyRef.current) return
    try {
      await exportContainerToPng(bodyRef.current, toFileName(title))
    } catch {
      // Export failures are non-fatal; the chart stays on screen.
    }
  }

  return (
    <div className={`card bg-base-100 shadow-sm border border-base-300 ${fullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
      <div className="card-body p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="card-title text-base break-words">{title}</h3>
            {subtitle ? <p className="text-xs opacity-60 break-words">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={handleExport}
              aria-label={t('exportPng')}
              title={t('exportPng')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
              title={fullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={bodyRef} style={{ height: fullscreen ? 'calc(100vh - 8rem)' : height }}>
          {children}
        </div>
      </div>
    </div>
  )
}
