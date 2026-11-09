// Logic and mechanism specs run in a local browser (D87); the aliases expose
// only the product surfaces lint permits.
// Generate the virtual module from the shipped values (D36, D65); names that
// require a bundle stay unavailable so no spec silently uses a stand-in.
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import fs from 'node:fs'
import path from 'node:path'
import { motionValues } from './scripts/shared/motion-tokens.mjs'
import { generatedSource } from './scripts/virtual-modules.mjs'
import { findChrome } from './packages/testing/browser.mjs'

const executablePath = findChrome()
if (executablePath === undefined) throw new Error('vitest: no Chrome or Edge found; set CHROME_PATH')

const SRC = path.resolve(import.meta.dirname, 'packages', 'client', 'src')
const GENERATED_FILE = path.resolve(import.meta.dirname, '.debug', 'vitest', 'generated.mjs')
const tokens = JSON.parse(fs.readFileSync(path.join(SRC, 'theme', 'tokens.json'), 'utf8'))
fs.mkdirSync(path.dirname(GENERATED_FILE), { recursive: true })
fs.writeFileSync(GENERATED_FILE, `${generatedSource({ MOTION: motionValues(tokens), PALETTE_CARDS: tokens.palette.cards })}\n`)

export default defineConfig({
  resolve: {
    alias: {
      '@dsh-claude-style/client/pure': path.join(SRC, 'pure.ts'),
      '@dsh-claude-style/contracts': path.resolve(import.meta.dirname, 'packages/contracts/src'),
      '@dsh-claude-style/engine': path.resolve(import.meta.dirname, 'packages/engine/src'),
      'virtual:dsh-claude-style/generated': GENERATED_FILE,
    },
  },
  test: {
    include: ['packages/testing/specs/logic/**/*.spec.ts', 'packages/testing/specs/mechanism/**/*.spec.ts'],
    // Fixtures supply their own engine vocabulary, keeping specs off skin names (D73).
    setupFiles: ['packages/testing/specs/fixtures/setup.ts'],
    attachmentsDir: '.debug/vitest',
    // Fixed IPv4 and port 51233 avoid localhost mismatches and Windows excluded ports.
    api: { host: '127.0.0.1', port: 51233 },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { executablePath } }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
