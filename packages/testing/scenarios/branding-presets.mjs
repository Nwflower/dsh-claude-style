#!/usr/bin/env node
/** Structured YAML colour schemes and named logo presets on the real host. */
import { openSkinSettings } from './settings-route.mjs'
import { waitForSkin, dismissOverlays } from '../dsh-web.mjs'
import { sanitizePage } from '../../../scripts/shared/privacy.mjs'
import { host, surface } from '../specs/fixtures/behaviour.mjs'

const SELECT = surface('settings.brand-preset-select')
const RENAME = surface('settings.brand-preset-rename')
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

async function duplicateAndRename(page, name, notes) {
  await openAppearance(page)
  await page.getByRole('button', { name: '存为副本', exact: true }).click()
  await page.waitForFunction(selector => document.querySelector(selector)?.value === 'preset-1', SELECT)
  await page.waitForFunction(() => !document.querySelector('.dsh-claude-brand-presets')?.hasAttribute('data-busy'))
  if (notes !== undefined) notes.afterDuplicate = await page.locator(SELECT).inputValue()
  await page.getByRole('button', { name: '重命名', exact: true }).click()
  await page.locator(RENAME).fill(name)
  await page.getByRole('button', { name: '保存名称', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('.dsh-claude-brand-presets')?.hasAttribute('data-busy'))
  if (notes !== undefined) notes.afterRename = await page.locator(SELECT).inputValue()
  await page.waitForTimeout(500)
  if (notes !== undefined) notes.afterSettle = await page.locator(SELECT).inputValue()
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
      notes.initial = await page.locator(SELECT).inputValue()
      await duplicateAndRename(page, 'Renamed preset', notes)
      notes.duplicate = await page.locator(SELECT).inputValue()
      notes.renamedBeforeReload = await page.locator(SELECT + ' option:checked').textContent()
      await reloadAndOpenAppearance(page)
      notes.afterReload = await page.locator(SELECT).inputValue()
      notes.renamed = await page.locator(SELECT + ' option:checked').textContent()
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
      await page.evaluate(async () => {
        const canvas = document.createElement('canvas')
        canvas.width = 32
        canvas.height = 32
        canvas.getContext('2d').fillRect(0, 0, 32, 32)
        const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        await fetch('/dsh-claude-style/brand/mark', { method: 'PUT', headers: { 'content-type': 'image/png' }, body: png })
      })
      await reloadAndOpenAppearance(page)
      await duplicateAndRename(page, 'UI preset')
      await reloadAndOpenAppearance(page)
      notes.afterReload = await page.locator(SELECT).inputValue()
      notes.name = await page.locator(SELECT + ' option:checked').textContent()
      await page.waitForTimeout(400)
      await sanitizePage(expression => page.evaluate(expression))
      await page.screenshot({ path: notes.out + '/branding-presets-settings-light.png' })
      await page.evaluate(attribute => document.body.setAttribute(attribute, ''), DARK)
      await page.waitForTimeout(100)
      await sanitizePage(expression => page.evaluate(expression))
      await page.screenshot({ path: notes.out + '/branding-presets-settings-dark.png' })
      await page.evaluate(attribute => document.body.removeAttribute(attribute), DARK)
      await page.getByRole('button', { name: '删除', exact: true }).click()
      await page.getByRole('button', { name: '确认删除', exact: true }).click()
      await page.waitForFunction(selector => document.querySelector(selector)?.value === '', SELECT)
      notes.afterDelete = await page.locator(SELECT).inputValue()
      notes.error = await page.locator(ERROR).count()
      notes.errorText = await page.locator(ERROR).allTextContents()
    },
    async assert({ session }) {
      return [
        check('UI 创建的预设重载后仍保留 id 和名称', notes.afterReload === 'preset-1' && notes.name === 'UI preset', JSON.stringify({ id: notes.afterReload, name: notes.name })),
        check('删除预设后回到未命名图片路径', notes.afterDelete === '', String(notes.afterDelete)),
        check('预设管理没有错误行', notes.error === 0, JSON.stringify(notes.errorText)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

export { brandingPresetsScenario, brandingPresetUiScenario }
