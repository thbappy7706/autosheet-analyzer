import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../lib/settingsContext'
import type { SupportedLanguage } from '../../i18n'

/**
 * Top-level layout: a DaisyUI navbar with the app name, a language switcher
 * and a light/dark theme toggle, plus the routed page content.
 */
export function AppShell() {
  const { t, i18n } = useTranslation('common')
  const { theme, toggleTheme, banglaDigits, setBanglaDigits } = useSettings()

  const currentLang: SupportedLanguage = i18n.language.startsWith('bn') ? 'bn' : 'en'

  const changeLanguage = (lng: SupportedLanguage) => {
    void i18n.changeLanguage(lng)
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <header className="navbar bg-base-100 border-b border-base-300 sticky top-0 z-40 gap-2 px-3 sm:px-6">
        <div className="flex-1 min-w-0">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-primary text-primary-content grid place-items-center font-bold shrink-0" aria-hidden="true">
              A
            </span>
            <span className="font-semibold truncate">{t('appName')}</span>
          </Link>
        </div>

        <div className="flex-none flex items-center gap-1">
          {/* Language switcher */}
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-sm gap-1"
              aria-label={t('language')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
              </svg>
              <span className="hidden sm:inline">{currentLang === 'bn' ? t('bangla') : t('english')}</span>
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-50 w-40 p-2 shadow-lg border border-base-300"
            >
              <li>
                <button
                  type="button"
                  className={currentLang === 'en' ? 'active' : ''}
                  onClick={() => changeLanguage('en')}
                  aria-current={currentLang === 'en'}
                >
                  {t('english')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={currentLang === 'bn' ? 'active' : ''}
                  onClick={() => changeLanguage('bn')}
                  aria-current={currentLang === 'bn'}
                >
                  {t('bangla')}
                </button>
              </li>
            </ul>
          </div>

          {/* Settings */}
          <div className="dropdown dropdown-end">
            <button type="button" tabIndex={0} className="btn btn-ghost btn-sm" aria-label={t('settings')} title={t('settings')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 2.6V2.5a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
            <div tabIndex={0} className="dropdown-content z-50 w-64 p-4 shadow-lg bg-base-100 rounded-box border border-base-300">
              <label className="label cursor-pointer gap-3 py-1">
                <span className="label-text text-sm">{t('banglaDigits')}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={banglaDigits}
                  disabled={currentLang !== 'bn'}
                  onChange={(e) => setBanglaDigits(e.target.checked)}
                />
              </label>
              <p className="text-xs opacity-60 mt-1">{t('banglaDigitsHelp')}</p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('light') : t('dark')}
            title={theme === 'dark' ? t('light') : t('dark')}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6">
        <Outlet />
      </main>

      <footer className="text-center text-xs opacity-60 py-4">{t('tagline')}</footer>
    </div>
  )
}
