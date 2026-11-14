/** Named brand-preset routes through the real built host half. */
import fs from 'fs'
import path from 'path'
import { check } from './shared.mjs'

export async function hostBrand({ host, request, browser, home }) {
  const directory = path.join(home, 'dsh-claude-style', 'branding')
  fs.mkdirSync(directory, { recursive: true })
  const light = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#fff"/></svg>'
  const dark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#000"/></svg>'
  fs.writeFileSync(path.join(directory, 'light.svg'), light)
  fs.writeFileSync(path.join(directory, 'dark.svg'), dark)
  const asset = '/dsh-claude-style/branding/asset'
  const status = '/dsh-claude-style/branding/status'
  const headers = { ...browser, 'content-type': 'image/svg+xml' }
  const upload = await request(host, asset + '?id=company&slot=wordmark-light', 'PUT', light, headers)
  check('preset upload returns its managed reference', upload.status === 200 && JSON.parse(upload.body).ref === '@managed/wordmark-light', upload.body)
  const preset = {
    id: 'company', name: 'Company',
    mark: { light: './branding/light.svg', dark: './branding/dark.svg' },
    wordmark: '@managed/wordmark-light',
  }
  const readStatus = async (record, appearance) => request(host, status, 'POST', JSON.stringify({ ...record, appearance }), { ...browser, 'content-type': 'application/json' })
  const before = await readStatus(preset, 'light')
  const lightAnswer = JSON.parse(before.body)
  check('YAML and managed assets answer together without a problem', before.status === 200 && lightAnswer.problems.length === 0 && lightAnswer.mark.url.includes('light.svg') && lightAnswer.wordmark.url.includes('%40managed%2Fwordmark-light'), before.body)
  const served = await request(host, lightAnswer.mark.url, 'GET', '', browser)
  check('the YAML asset is served with its SVG type and sandbox', served.status === 200 && served.body === light && served.raw !== null, 'HTTP ' + served.status)
  const darkAnswer = JSON.parse((await readStatus(preset, 'dark')).body)
  check('the dark variant and single-image fallback resolve independently', darkAnswer.mark.url.includes('dark.svg') && darkAnswer.wordmark.url.includes('%40managed%2Fwordmark-light'), JSON.stringify(darkAnswer))
  const missing = JSON.parse((await readStatus({ id: 'company', name: 'Company', mark: './branding/missing.svg' }, 'light')).body)
  check('a missing reference is diagnosed without affecting the record', missing.ok === true && missing.mark === null && missing.problems.length === 1, JSON.stringify(missing))
  const refused = await readStatus({ id: 'company', name: 'Company', mark: './branding/../secret.svg' }, 'light')
  check('a traversal reference is refused', refused.status === 400, 'HTTP ' + refused.status)
  const wrongType = await request(host, asset + '?id=company&slot=mark-light', 'PUT', light, { ...browser, 'content-type': 'image/gif' })
  check('preset upload keeps the legacy type checks', wrongType.status === 415, 'HTTP ' + wrongType.status)
  await request(host, asset + '?id=company&slot=wordmark-light', 'DELETE', '', browser)
  const removed = JSON.parse((await readStatus(preset, 'light')).body)
  check('deleting one managed variant leaves its YAML partner intact', removed.mark.url.includes('light.svg') && removed.wordmark === null && removed.problems.length === 1, JSON.stringify(removed))
}
