import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../lib/settingsContext'
import type { SupportedLanguage } from '../../i18n'

const PRESET_THEMES = [
  { id: 'light', name: 'Light', dark: false },
  { id: 'dark', name: 'Dark', dark: true },
  { id: 'cupcake', name: 'Cupcake', dark: false },
  { id: 'emerald', name: 'Emerald', dark: false },
  { id: 'corporate', name: 'Corporate', dark: false },
  { id: 'synthwave', name: 'Synthwave', dark: true },
  { id: 'retro', name: 'Retro', dark: false },
  { id: 'cyberpunk', name: 'Cyberpunk', dark: false },
  { id: 'valentine', name: 'Valentine', dark: false },
  { id: 'halloween', name: 'Halloween', dark: true },
  { id: 'garden', name: 'Garden', dark: false },
  { id: 'forest', name: 'Forest', dark: true },
  { id: 'aqua', name: 'Aqua', dark: false },
  { id: 'lofi', name: 'Lo-Fi', dark: false },
  { id: 'pastel', name: 'Pastel', dark: false },
  { id: 'fantasy', name: 'Fantasy', dark: false },
  { id: 'luxury', name: 'Luxury', dark: true },
  { id: 'dracula', name: 'Dracula', dark: true },
  { id: 'business', name: 'Business', dark: true },
  { id: 'night', name: 'Night', dark: true },
  { id: 'coffee', name: 'Coffee', dark: true },
  { id: 'winter', name: 'Winter', dark: false },
  { id: 'dim', name: 'Dim', dark: true },
  { id: 'nord', name: 'Nord', dark: false },
  { id: 'sunset', name: 'Sunset', dark: true },
  { id: 'caramellatte', name: 'Caramel', dark: false },
  { id: 'abyss', name: 'Abyss', dark: true },
  { id: 'silk', name: 'Silk', dark: false },
] as const

/**
 * Top-level layout: a DaisyUI navbar with branding, theme switcher,
 * language switcher, and settings.
 */
export function AppShell() {
  const { t, i18n } = useTranslation('common')
  const { theme, setTheme, toggleTheme, banglaDigits, setBanglaDigits } = useSettings()

  const currentLang: SupportedLanguage = i18n.language.startsWith('bn') ? 'bn' : 'en'

  const changeLanguage = (lng: SupportedLanguage) => {
    void i18n.changeLanguage(lng)
  }

  const isDarkMode = [
    'dark',
    'synthwave',
    'halloween',
    'forest',
    'black',
    'luxury',
    'dracula',
    'business',
    'night',
    'coffee',
    'dim',
    'sunset',
    'abyss',
  ].includes(theme)

  return (
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col selection:bg-primary/20 selection:text-primary">
      <header className="navbar bg-base-100/90 backdrop-blur-md border-b border-base-300 sticky top-0 z-40 px-3 sm:px-6 shadow-xs">
        <div className="navbar-start flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 min-w-0 group" aria-label={t('appName')}>
            <span
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary text-primary-content grid place-items-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform shrink-0"
              aria-hidden="true"
            >
              A
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-base sm:text-lg truncate">{t('appName')}</span>
                <span className="badge badge-primary badge-soft badge-xs hidden sm:inline-flex" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
              </div>
              <span className="text-[10px] opacity-60 truncate hidden md:inline leading-none">{t('tagline')}</span>
            </div>
          </Link>
        </div>

        <div className="navbar-end flex items-center gap-1 sm:gap-2">
          {/* DaisyUI Theme Picker Dropdown */}
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-sm gap-1.5"
              aria-label={t('theme')}
              title={t('theme')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18" />
                <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9" />
              </svg>
              <span className="capitalize hidden lg:inline text-xs font-medium">{theme}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="opacity-60">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              tabIndex={0}
              className="dropdown-content z-50 mt-2 max-h-96 w-56 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-2xl"
            >
              <div className="px-2 py-1.5 text-xs font-semibold opacity-60 uppercase tracking-wider">
                {t('theme')}
              </div>
              <div className="space-y-1">
                {PRESET_THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    data-theme={th.id}
                    className={`btn btn-sm w-full justify-between font-normal text-xs ${
                      theme === th.id ? 'btn-active btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => setTheme(th.id)}
                  >
                    <span className="flex items-center gap-2">
                      <span className="capitalize">{th.name}</span>
                      {th.dark ? <span className="badge badge-neutral badge-xs">{t('dark')}</span> : null}
                    </span>
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Light/Dark Toggle */}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle"
            onClick={toggleTheme}
            aria-label={isDarkMode ? t('light') : t('dark')}
            title={isDarkMode ? t('light') : t('dark')}
          >
            {isDarkMode ? (
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

          {/* Language Switcher */}
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-sm gap-1"
              aria-label={t('language')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
              </svg>
              <span className="hidden sm:inline text-xs">{currentLang === 'bn' ? t('bangla') : t('english')}</span>
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-50 w-36 p-1.5 shadow-xl border border-base-300 mt-2 text-xs"
            >
              <li>
                <button
                  type="button"
                  className={currentLang === 'en' ? 'active font-medium' : ''}
                  onClick={() => changeLanguage('en')}
                  aria-current={currentLang === 'en'}
                >
                  🇬🇧 {t('english')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={currentLang === 'bn' ? 'active font-medium' : ''}
                  onClick={() => changeLanguage('bn')}
                  aria-current={currentLang === 'bn'}
                >
                  🇧🇩 {t('bangla')}
                </button>
              </li>
            </ul>
          </div>

          {/* Settings */}
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label={t('settings')}
              title={t('settings')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 2.6 14H2.5a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 2.6V2.5a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
            <div
              tabIndex={0}
              className="dropdown-content z-50 w-72 p-4 shadow-2xl bg-base-100 rounded-box border border-base-300 mt-2 space-y-3"
            >
              <h3 className="font-semibold text-sm border-b border-base-200 pb-2">{t('settings')}</h3>
              <label className="label cursor-pointer justify-between py-1">
                <span className="label-text text-xs font-medium">{t('banglaDigits')}</span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={banglaDigits}
                  disabled={currentLang !== 'bn'}
                  onChange={(e) => setBanglaDigits(e.target.checked)}
                />
              </label>
              <p className="text-[11px] opacity-60 leading-relaxed">{t('banglaDigitsHelp')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 transition-all">
        <Outlet />
      </main>

      <footer className="footer footer-center p-4 bg-base-100 text-base-content/70 border-t border-base-300 text-xs">
        <aside className="flex flex-wrap items-center justify-center gap-2">
          <span>{t('appName')} · {t('tagline')}</span>
        </aside>
      </footer>
    </div>
  )
}
