import { describe, expect, it } from 'vitest'
import { resources } from './index'

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value as Record<string, unknown>, path)
    }
    return [path]
  })
}

describe('translation resources', () => {
  it('have the same namespaces in both languages', () => {
    expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.bn).sort())
  })

  it('have the same keys in every namespace', () => {
    for (const ns of Object.keys(resources.en) as Array<keyof typeof resources.en>) {
      const en = flatten(resources.en[ns] as unknown as Record<string, unknown>).sort()
      const bn = flatten(resources.bn[ns] as unknown as Record<string, unknown>).sort()
      expect(bn, `namespace ${ns}`).toEqual(en)
    }
  })
})
