import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const sampleFile = resolve(here, '../../samples/clean.csv')

test('upload a CSV, land on the dashboard and switch to Bangla', async ({ page }) => {
  await page.goto('/')

  // The upload form is the landing page.
  const input = page.locator('input[type="file"]')
  await input.setInputFiles(sampleFile)

  // The dashboard header shows the uploaded file name.
  await expect(page.getByRole('heading', { name: 'clean.csv' })).toBeVisible()

  // Summary stat cards render real numbers.
  await expect(page.getByText('Rows', { exact: true })).toBeVisible()
  await expect(page.getByText('Data quality')).toBeVisible()

  // The virtualized data preview renders real cells from the uploaded file.
  await page.getByRole('tab', { name: 'Data Preview' }).click()
  await expect(page.getByRole('cell', { name: 'Alice', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Erin', exact: true })).toBeVisible()
  // Server-side search filters the rows.
  await page.getByRole('searchbox', { name: 'Search all rows…' }).fill('Bob')
  await expect(page.getByRole('cell', { name: 'Bob', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Alice', exact: true })).toBeHidden()

  // Column profiles are reachable through the tab bar.
  await page.getByRole('tab', { name: 'Columns' }).click()
  await expect(page.getByText('age')).toBeVisible()

  // Charts gallery renders at least one chart.
  await page.getByRole('tab', { name: 'Charts' }).click()
  await expect(page.locator('svg.recharts-surface').first()).toBeVisible()

  // Switch the whole UI to Bangla without a reload.
  await page.getByRole('button', { name: 'Language' }).click()
  await page.getByRole('button', { name: 'বাংলা' }).click()

  await expect(page.getByRole('tab', { name: 'সারসংক্ষেপ' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')

  // No untranslated keys such as "summary:rows" should be rendered anywhere.
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/\b(common|upload|summary|table|columns|charts|insights|errors):[a-zA-Z.]/)
})
