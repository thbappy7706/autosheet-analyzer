import '@testing-library/jest-dom/vitest'
import '../i18n'

// jsdom does not implement matchMedia, which the theme settings rely on.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// recharts relies on ResizeObserver for ResponsiveContainer.
if (!('ResizeObserver' in window)) {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const w = window as unknown as { ResizeObserver: unknown }
  w.ResizeObserver = RO
}
