import { describe, expect, it } from 'vitest'
import { formatDataNumber, formatNumber, truncateLabel } from './format'

describe('formatDataNumber', () => {
  it('always uses Latin digits for data values', () => {
    expect(formatDataNumber(1234.5, 'bn')).toContain('1')
    expect(formatDataNumber(1234.5, 'bn')).not.toMatch(/[০-৯]/)
  })

  it('returns a dash for non-finite values', () => {
    expect(formatDataNumber(Number.NaN, 'en')).toBe('—')
  })
})

describe('formatNumber', () => {
  it('uses Latin digits for English', () => {
    expect(formatNumber(12, { locale: 'en' })).toBe('12')
  })

  it('uses Bangla digits when requested', () => {
    const out = formatNumber(12, { locale: 'bn', bengaliDigits: true })
    expect(out).toMatch(/[০-৯]/)
  })
})

describe('truncateLabel', () => {
  it('leaves short labels untouched', () => {
    expect(truncateLabel('short')).toBe('short')
  })

  it('truncates long labels and keeps Bengali runes intact', () => {
    const label = 'একটি খুব লম্বা বাংলা লেবেল যা ছোট করতে হবে'
    const out = truncateLabel(label, 10)
    expect([...out].length).toBeLessThanOrEqual(10)
    expect(out.endsWith('…')).toBe(true)
  })
})
