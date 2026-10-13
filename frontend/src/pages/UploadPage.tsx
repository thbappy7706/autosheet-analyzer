import { useTranslation } from 'react-i18next'
import { UploadForm } from '../components/upload/UploadForm'

export function UploadPage() {
  const { t } = useTranslation('upload')
  const { t: tCommon } = useTranslation('common')

  return (
    <div className="py-4 sm:py-8 max-w-4xl mx-auto space-y-6">
      <div className="hero bg-base-100/70 border border-base-300 rounded-3xl p-6 sm:p-10 shadow-sm text-center">
        <div className="hero-content flex-col max-w-2xl p-0">
          <div className="inline-flex items-center gap-1.5 badge badge-primary badge-soft px-3 py-2 text-xs font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
            </svg>
            <span>{tCommon('tagline')}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight break-anywhere mt-2">
            {t('title')}
          </h1>
          <p className="opacity-75 text-sm sm:text-base break-anywhere max-w-lg mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <UploadForm />
    </div>
  )
}
