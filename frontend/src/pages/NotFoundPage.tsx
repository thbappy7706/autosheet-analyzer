import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation('errors')
  const { t: tCommon } = useTranslation('common')
  return (
    <div className="hero min-h-[60vh] bg-base-100/70 border border-base-300 rounded-3xl p-6 shadow-sm my-6">
      <div className="hero-content text-center flex-col max-w-md">
        <span className="badge badge-error badge-soft font-mono font-bold text-sm px-3 py-2">404</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">{tCommon('appName')}</h1>
        <p className="opacity-70 text-sm mt-1">{t('NOT_FOUND')}</p>
        <Link to="/" className="btn btn-primary btn-sm gap-2 rounded-xl mt-6 shadow-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 12h18M3 12l6-6M3 12l6 6" />
          </svg>
          {tCommon('back')}
        </Link>
      </div>
    </div>
  )
}
