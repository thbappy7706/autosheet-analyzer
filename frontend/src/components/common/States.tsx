import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

/** Full-page skeleton shown while the analysis is being computed. */
export function DashboardSkeleton() {
  const { t } = useTranslation('upload')
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2.5 bg-base-100 p-3 rounded-2xl border border-base-300 shadow-2xs">
        <span className="loading loading-spinner loading-sm text-primary" />
        <span className="text-xs font-semibold opacity-75">{t('processing')}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-2xl" />
        ))}
      </div>
      <div className="skeleton h-12 w-full rounded-2xl" />
      <div className="skeleton h-72 w-full rounded-2xl" />
    </div>
  )
}

/** Inline error state with an optional retry action. */
export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation('common')
  return (
    <div role="alert" className="alert alert-error alert-soft rounded-2xl shadow-xs py-3 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-sm font-medium break-anywhere">{message}</span>
      </div>
      {onRetry ? (
        <button type="button" className="btn btn-xs btn-error btn-outline rounded-xl shrink-0" onClick={onRetry}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  )
}

/** Neutral empty state with an icon slot. */
export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="card bg-base-100 border-2 border-dashed border-base-300 rounded-3xl p-8 sm:p-14 text-center shadow-2xs">
      <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-base-200/80 text-base-content/50 grid place-items-center mb-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="font-bold text-base break-anywhere">{title}</p>
        {description ? <p className="text-xs opacity-65 break-anywhere leading-relaxed">{description}</p> : null}
        {children ? <div className="pt-2">{children}</div> : null}
      </div>
    </div>
  )
}
