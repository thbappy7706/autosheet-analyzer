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
    <>
      {fullscreen ? (
        <div
          className="fixed inset-0 bg-base-300/60 backdrop-blur-sm z-40"
          onClick={() => setFullscreen(false)}
        />
      ) : null}
      <div
        className={`card bg-base-100 shadow-xs border border-base-300 rounded-2xl transition-all ${
          fullscreen ? 'fixed inset-4 sm:inset-10 z-50 overflow-auto shadow-2xl' : 'hover:shadow-sm'
        }`}
      >
        <div className="card-body p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-base-200">
            <div className="min-w-0">
              <h3 className="card-title text-sm sm:text-base font-bold break-words">{title}</h3>
              {subtitle ? <p className="text-xs opacity-65 break-words mt-0.5">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-1">
              {actions}
              <div className="tooltip tooltip-bottom" data-tip={t('exportPng')}>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-circle"
                  onClick={handleExport}
                  aria-label={t('exportPng')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                </button>
              </div>
              <div className="tooltip tooltip-bottom" data-tip={fullscreen ? t('exitFullscreen') : t('fullscreen')}>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost btn-circle"
                  onClick={() => setFullscreen((f) => !f)}
                  aria-label={fullscreen ? t('exitFullscreen') : t('fullscreen')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div ref={bodyRef} className="pt-2" style={{ height: fullscreen ? 'calc(100vh - 10rem)' : height }}>
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
