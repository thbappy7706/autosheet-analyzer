#!/usr/bin/env node
// Fails when the `bn` and `en` locale files do not have exactly the same keys.
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'locales')

function flatten(obj, prefix = '') {
  const out = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, path))
    } else {
      out[path] = value
    }
  }
  return out
}

function load(lang, file) {
  const raw = readFileSync(join(localesDir, lang, file), 'utf8')
  return flatten(JSON.parse(raw))
}

const files = readdirSync(join(localesDir, 'en')).filter((f) => f.endsWith('.json'))
let failed = false

for (const file of files) {
  const ns = file.replace('.json', '')
  const en = load('en', file)
  const bn = load('bn', file)

  const missingInBn = Object.keys(en).filter((k) => !(k in bn))
  const missingInEn = Object.keys(bn).filter((k) => !(k in en))

  if (missingInBn.length || missingInEn.length) {
    failed = true
    console.error(`\u2717 ${ns}:`)
    for (const k of missingInBn) console.error(`   missing in bn: ${k}`)
    for (const k of missingInEn) console.error(`   missing in en: ${k}`)
  } else {
    console.log(`\u2713 ${ns}: ${Object.keys(en).length} keys in both languages`)
  }
}

if (failed) {
  console.error('\nTranslation keys do not match between en and bn.')
  process.exit(1)
}
console.log('\nAll translation namespaces match.')
