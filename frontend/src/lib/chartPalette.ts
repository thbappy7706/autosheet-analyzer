/**
 * A color-blind safe categorical palette (Okabe-Ito derived) that keeps
 * adequate contrast on both light and dark DaisyUI themes.
 */
export const chartPalette = [
  '#0072B2',
  '#E69F00',
  '#009E73',
  '#D55E00',
  '#CC79A7',
  '#56B4E9',
  '#F0E442',
  '#999999',
] as const

export function paletteColor(index: number): string {
  return chartPalette[index % chartPalette.length] ?? chartPalette[0]
}

/** Maps a correlation r in [-1, 1] to a diverging blue/red colour. */
export function correlationColor(r: number): string {
  const clamped = Math.max(-1, Math.min(1, r))
  const t = Math.abs(clamped)
  const alpha = 0.12 + t * 0.78
  if (clamped >= 0) return `rgba(0, 114, 178, ${alpha.toFixed(3)})`
  return `rgba(213, 94, 0, ${alpha.toFixed(3)})`
}

/** Formats a correlation coefficient compactly. */
export function formatR(r: number): string {
  return r.toFixed(2)
}
