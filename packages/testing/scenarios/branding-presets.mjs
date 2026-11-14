#!/usr/bin/env node
/** Structured YAML colour schemes and named logo presets on the real host. */
import { openSkinSettings } from './settings-route.mjs'
import { waitForSkin, dismissOverlays } from '../dsh-web.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'
import { host, surface } from '../specs/fixtures/behaviour.mjs'

const CARD = surface('settings.brand-card')
const EDITOR = surface('settings.brand-editor')
const ERROR = surface('settings.brand-error')
const DARK = host('shell.dark-theme')
const ACCENT = surface.property('brand.custom-accent')
const CANVAS = surface.property('brand.custom-canvas-light')
const MARK = surface.property('brand.custom-mark')

const PATCH = [
  '- id: ui-skin-claude-style',
  '  config:',
  '    paletteColors: company-ocean',
  '    paletteSchemes:',
  '      - id: company-ocean',
  '        name: Company Ocean',
  '        base: deepseek',
  '        accent: "#2855d9"',
  '        background:',
  '          light: "#f7f9ff"',
  '          dark: "#111827"',
  '    brandingPreset: company-primary',
  '    brandingPresets:',
  '      - id: company-primary',
  '        name: Company Primary',
  '        mark:',
  '          light: "@managed/mark-light"',
  '          dark: "@managed/mark-dark"',
  '        wordmark: "@managed/wordmark-light"',
]

async function openAppearance(page) {
  await openSkinSettings(page)
  await page.getByRole('tab', { name: '外观', exact: true }).click()
}

async function reloadAndOpenAppearance(page) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await waitForSkin(page)
  await dismissOverlays(page)
  await openAppearance(page)
}

/** The set the brand card shows as painted: its id (empty for the theme style's own art) and its name. */
function selectedCard(page) {
  return page.evaluate(selector => {
    const card = document.querySelector(selector + '[data-active]')
    return card === null ? null : { id: card.getAttribute('data-branding'), name: card.getAttribute('aria-label') }
  }, CARD)
}

function waitForSelected(page, id) {
  return page.waitForFunction(([selector, want]) => document.querySelector(selector + '[data-active]')?.getAttribute('data-branding') === want, [CARD, id])
}

/** Open the brand manager from the door beside the brand switch, on the set the page paints. */
async function openBrandManager(page) {
  await page.locator('[data-action="manage-brand"]').click()
  await page.locator(EDITOR).waitFor()
}

async function duplicateAndRename(page, name, notes) {
  await openAppearance(page)
  await openBrandManager(page)
  await page.locator(EDITOR).getByRole('button', { name: '存为副本', exact: true }).click()
  await waitForSelected(page, 'preset-1')
  if (notes !== undefined) notes.afterDuplicate = (await selectedCard(page))?.id
  await page.locator(EDITOR + ' input').fill(name)
  if (notes !== undefined) notes.afterRename = (await selectedCard(page))?.id
  await page.waitForTimeout(500)
  if (notes !== undefined) notes.afterSettle = (await selectedCard(page))?.id
  await page.keyboard.press('Escape')
}

async function upload(page) {
  await page.evaluate(async () => {
    const make = (colour) => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const context = canvas.getContext('2d')
      context.fillStyle = colour
      context.fillRect(0, 0, 32, 32)
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    }
    const light = await make('#ffffff')
    const dark = await make('#000000')
    const put = async (slot, body, type) => {
      const response = await fetch('/dsh-claude-style/branding/asset?id=company-primary&slot=' + slot, { method: 'PUT', headers: { 'content-type': type }, body })
      if (!response.ok) throw new Error('preset upload failed: ' + response.status)
    }
    await put('mark-light', light, 'image/png')
    await put('mark-dark', dark, 'image/png')
    await put('wordmark-light', new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100"/></svg>'], { type: 'image/svg+xml' }), 'image/svg+xml')
  })
}

function brandingPresetsScenario({ check }) {
  const notes = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    patch: PATCH,
    async beforeSend({ page }) {
      await upload(page)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForSkin(page)
      await dismissOverlays(page)
      notes.palette = await page.evaluate(([accent, canvas, mark]) => ({
        accent: document.body.style.getPropertyValue(accent),
        canvas: document.body.style.getPropertyValue(canvas),
        mark: document.body.style.getPropertyValue(mark),
      }), [ACCENT, CANVAS, MARK])
      await page.evaluate(attribute => document.body.setAttribute(attribute, ''), DARK)
      await page.waitForFunction(property => document.body.style.getPropertyValue(property).includes('mark-dark'), MARK)
      notes.dark = await page.evaluate(property => document.body.style.getPropertyValue(property), MARK)
      await page.evaluate(attribute => document.body.removeAttribute(attribute), DARK)
      await openAppearance(page)
      notes.initial = (await selectedCard(page))?.id
      await duplicateAndRename(page, 'Renamed preset', notes)
      const duplicated = await selectedCard(page)
      notes.duplicate = duplicated?.id
      notes.renamedBeforeReload = duplicated?.name
      await reloadAndOpenAppearance(page)
      const reloaded = await selectedCard(page)
      notes.afterReload = reloaded?.id
      notes.renamed = reloaded?.name
      notes.error = await page.locator(ERROR).count()
    },
    async assert({ session }) {
      const problems = session.problems.filter(line => !line.includes('branding/asset') && !line.includes('custom mark image') && !line.includes('custom wordmark image') && !/Failed to load resource: the server responded with a status of 404/.test(line))
      return [
        check('结构化 YAML 直接选中并画出公司配色', notes.palette?.accent === '#2855d9' && notes.palette?.canvas === '#f7f9ff', JSON.stringify(notes.palette)),
        check('YAML 选中的标志预设按浅色图片渲染', notes.palette?.mark.includes('company-primary') && notes.palette?.mark.includes('mark-light'), notes.palette?.mark ?? ''),
        check('切换深色外观读取深色变体', notes.dark?.includes('mark-dark'), notes.dark ?? ''),
        check('设置页打开时选中 YAML 预设', notes.initial === 'company-primary', String(notes.initial)),
        check('复制和重命名使用稳定 id', notes.duplicate === 'preset-1' && notes.renamedBeforeReload === 'Renamed preset' && notes.afterSettle === 'preset-1', JSON.stringify({ afterDuplicate: notes.afterDuplicate, afterRename: notes.afterRename, afterSettle: notes.afterSettle, id: notes.duplicate, name: notes.renamedBeforeReload })),
        check('UI 覆盖在重载后仍保留选择和名称', notes.afterReload === 'preset-1' && notes.renamed === 'Renamed preset', JSON.stringify({ id: notes.afterReload, name: notes.renamed })),
        check('预设操作没有错误行', notes.error === 0, String(notes.error)),
        check('控制台没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

function brandingPresetUiScenario({ check }) {
  const notes = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page, out }) {
      notes.out = out
      await openAppearance(page)
      notes.initial = (await selectedCard(page))?.id
      await duplicateAndRename(page, 'UI preset')
      await reloadAndOpenAppearance(page)
      const reloaded = await selectedCard(page)
      notes.afterReload = reloaded?.id
      notes.name = reloaded?.name
      await page.waitForTimeout(400)
      await sanitizePage(expression => page.evaluate(expression))
      await page.screenshot({ path: notes.out + '/branding-presets-settings-light.png' })
      await page.evaluate(attribute => document.body.setAttribute(attribute, ''), DARK)
      await page.waitForTimeout(100)
      await sanitizePage(expression => page.evaluate(expression))
      await page.screenshot({ path: notes.out + '/branding-presets-settings-dark.png' })
      await page.evaluate(attribute => document.body.removeAttribute(attribute), DARK)
      await openBrandManager(page)
      await page.locator(EDITOR).getByRole('button', { name: '删除', exact: true }).click()
      await page.locator(EDITOR).getByRole('button', { name: '确认删除', exact: true }).click()
      await waitForSelected(page, '')
      notes.afterDelete = (await selectedCard(page))?.id
      await page.keyboard.press('Escape')
      notes.error = await page.locator(ERROR).count()
      notes.errorText = await page.locator(ERROR).allTextContents()
    },
    async assert({ session }) {
      return [
        check('没有预设时设置页显示跟随主题', notes.initial === '', String(notes.initial)),
        check('UI 创建的预设重载后仍保留 id 和名称', notes.afterReload === 'preset-1' && notes.name === 'UI preset', JSON.stringify({ id: notes.afterReload, name: notes.name })),
        check('删除预设后回到跟随主题', notes.afterDelete === '', String(notes.afterDelete)),
        check('预设管理没有错误行', notes.error === 0, JSON.stringify(notes.errorText)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { brandingPresetsScenario, brandingPresetUiScenario }
