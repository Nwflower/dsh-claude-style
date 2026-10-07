// Unit tests (D45): Vitest in browser mode, driving a local Chrome/Edge through
// Playwright, so the DOM, MutationObserver, ResizeObserver and frames under
// test are the browser's own. CHROME_PATH chooses the browser, as for the smoke.
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import chrome from './scripts/chrome.cjs'

const executablePath = chrome.findChrome()
if (executablePath === undefined) throw new Error('vitest: no Chrome or Edge found; set CHROME_PATH')

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Failure screenshots and other attachments are local artifacts.
    attachmentsDir: '.debug/vitest',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { executablePath } }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
