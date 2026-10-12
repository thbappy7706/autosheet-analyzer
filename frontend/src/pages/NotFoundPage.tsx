import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation('errors')
  const { t: tCommon } = useTranslation('common')
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-bold">{tCommon('appName')}</h1>
      <p className="opacity-70 mt-2">{t('NOT_FOUND')}</p>
      <Link to="/" className="btn btn-primary btn-sm mt-6">
        {tCommon('back')}
      </Link>
    </div>
  )
}
