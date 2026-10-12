import { useTranslation } from 'react-i18next'
import { UploadForm } from '../components/upload/UploadForm'

export function UploadPage() {
  const { t } = useTranslation('upload')

  return (
    <div className="py-6 sm:py-12 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold break-anywhere">{t('title')}</h1>
        <p className="opacity-70 mt-2 break-anywhere">{t('subtitle')}</p>
      </div>
      <UploadForm />
    </div>
  )
}
