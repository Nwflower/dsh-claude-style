import { afterEach, expect, test } from 'vitest'
import { FADE_LEVELS, WordFade } from './word-fade'

const created: { fade: WordFade, root: HTMLElement }[] = []
afterEach(async () => {
  for (const { fade, root } of created.splice(0)) {
    fade.dispose()
    root.remove()
  }
  await frame()
})

const frame = () => new Promise<number>(resolve => requestAnimationFrame(resolve))

/** The text of every range painted at any fade level, in level order. */
function painted(): string[] {
  const texts: string[] = []
  for (let level = 0; level < FADE_LEVELS; level += 1) {
    const highlight = CSS.highlights.get(`dsh-claude-reader-fade-${level}`)
    if (highlight === undefined) continue
    for (const range of highlight) texts.push((range as Range).toString())
  }
  return texts
}

function mount(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.append(root)
  const fade = new WordFade(root)
  created.push({ fade, root })
  return { root, fade }
}

test('text already in the container never fades; text added after it does', async () => {
  const { root, fade } = mount('<p>已有的文字</p>')
  fade.observe(true)
  await frame()
  expect(painted()).toEqual([])
  root.querySelector('p')!.append(' and new words')
  fade.observe(true)
  await frame()
  expect(painted().join('')).toBe('and new words')
})

test('a word split across elements is one range, and each element carries its own ink', async () => {
  const { root, fade } = mount('<p>start</p>')
  fade.observe(true)
  await frame()
  const strong = document.createElement('strong')
  strong.style.color = 'rgb(217, 119, 87)'
  strong.textContent = 'bold'
  root.querySelector('p')!.append(' half', strong)
  fade.observe(true)
  await frame()
  expect(painted().join('')).toBe('halfbold')
  expect(strong.style.getPropertyValue('--dsh-claude-reader-ink')).toBe('rgb(217, 119, 87)')
  expect(root.querySelector('p')!.style.getPropertyValue('--dsh-claude-reader-ink')).not.toBe('')
})

test('with the fade off nothing is painted', async () => {
  const { root, fade } = mount('<p>start</p>')
  fade.observe(false)
  await frame()
  root.querySelector('p')!.append(' more words')
  fade.observe(false)
  await frame()
  expect(painted()).toEqual([])
})

test('the fade finishes on its own and leaves no highlight behind', async () => {
  const { root, fade } = mount('<p>start</p>')
  fade.observe(true)
  await frame()
  root.querySelector('p')!.append(' quick')
  fade.observe(true)
  await new Promise(resolve => setTimeout(resolve, 700))
  await frame()
  expect(painted()).toEqual([])
})
