import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

/** Full-page skeleton shown while the analysis is being computed. */
export function DashboardSkeleton() {
  const { t } = useTranslation('upload')
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="loading loading-spinner loading-sm" />
        <span className="text-sm opacity-70">{t('processing')}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 w-full rounded-box" />
        ))}
      </div>
      <div className="skeleton h-10 w-72 rounded-box" />
      <div className="skeleton h-64 w-full rounded-box" />
    </div>
  )
}

/** Inline error state with an optional retry action. */
export function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation('common')
  return (
    <div role="alert" className="alert alert-error">
      <span className="text-sm break-anywhere">{message}</span>
      {onRetry ? (
        <button type="button" className="btn btn-sm btn-ghost" onClick={onRetry}>
          {t('retry')}
        </button>
      ) : null}
    </div>
  )
}

/** Neutral empty state with an icon slot. */
export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-base-300 rounded-box">
      <p className="font-medium break-anywhere">{title}</p>
      {description ? <p className="text-sm opacity-70 mt-1 break-anywhere">{description}</p> : null}
      {children}
    </div>
  )
}
