/** privacy.mjs — replace private page data and fail screenshot writes on a leak match (D87). */
const PROJECT_NAMES = ['demo-project', 'sample-app', 'docs-site', 'theme-lab', 'notes-app', 'e-comm-demo']
const SESSION_NAMES = [
  'Fix flaky onboarding test',
  'Add CSV export',
  'Refactor auth flow',
  'Polish settings page',
  'Update README screenshots',
  'Investigate scroll jitter',
  'Migrate build script',
  'Trim bundle size',
  'Markdown rendering tour',
]
const USERNAME = 'Ada'


const USERNAME_RE_SOURCE = 'Nwflower'
const PATH_RE_SOURCE = '[A-Z]:[\\\\/][^\\s"\']*'
const BALANCE_RE_SOURCE = '\u00a5\\s?[0-9][0-9.,]*'

/**
 * Replace private labels with unused stand-ins. Username nodes lose the class whose
 * footer synchronization would restore the inferred real name.
 */
const SANITIZE_JS = `(() => {
  const blank = ((document.querySelector('button[class*="newSession"]') || {}).innerText || '').trim().split('\\n')[0]
  const swap = (elements, names) => {
    const standIn = (text) => names.find((name) => text === name || text.endsWith(' · ' + name))
    const used = new Set(elements.map((el) => standIn((el.textContent || '').trim())).filter(Boolean))
    const spare = names.filter((name) => !used.has(name))
    let swapped = 0
    elements.forEach((el, i) => {
      const text = (el.textContent || '').trim()
      if (!text || text === blank || standIn(text)) return
      el.textContent = spare.length > 0 ? spare.shift() : names[i % names.length]
      swapped++
    })
    return swapped
  }
  let swapped = 0
  swapped += swap([...document.querySelectorAll('[class*="projectRow"] [class*="projectText"]')], ${JSON.stringify(PROJECT_NAMES)})
  swapped += swap([...document.querySelectorAll('[class*="sessionRow"] [class*="title"]')], ${JSON.stringify(SESSION_NAMES)})
  const shown = ((document.querySelector('.dsh-claude-account-user') || {}).textContent || '').trim()
  if (shown.length >= 2 && shown !== ${JSON.stringify(USERNAME)}) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if ((node.nodeValue || '').includes(shown) && !node.parentElement.closest('.dsh-claude-account-user')) {
        node.nodeValue = node.nodeValue.split(shown).join(${JSON.stringify(USERNAME)})
        swapped++
      }
    }
  }
  document.querySelectorAll('.dsh-claude-account-user').forEach((el) => {
    const rep = document.createElement('span')
    rep.className = 'dsh-claude-account-you'
    rep.style.cssText = 'font-weight:500;color:var(--dsw-alias-label-primary);'
    rep.textContent = ${JSON.stringify(USERNAME)}
    el.replaceWith(rep)
    swapped++
  })
  document.querySelectorAll('.dsh-claude-account-popover-name').forEach((el) => {
    const rep = document.createElement('div')
    rep.className = 'dsh-claude-account-popover-name-static'
    rep.style.cssText = 'font-size:14px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary);'
    rep.textContent = ${JSON.stringify(USERNAME)}
    el.replaceWith(rep)
    swapped++
  })
  return swapped
})()`

/** Rewrite any surviving username / drive-path / quota text; report what was caught. */
const SWEEP_JS = `(() => {
  const userRe = new RegExp(${JSON.stringify(USERNAME_RE_SOURCE)}, 'gi')
  const pathRe = new RegExp(${JSON.stringify(PATH_RE_SOURCE)}, 'g')
  const balRe = new RegExp(${JSON.stringify(BALANCE_RE_SOURCE)}, 'g')
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const caught = []
  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = node.nodeValue || ''
    userRe.lastIndex = 0; pathRe.lastIndex = 0; balRe.lastIndex = 0
    if (userRe.test(text) || pathRe.test(text) || balRe.test(text)) {
      caught.push(text.trim().slice(0, 80))
      node.nodeValue = text
        .replace(userRe, ${JSON.stringify(USERNAME)})
        .replace(pathRe, '…')
        .replace(balRe, '\u00a5\u2022\u2022')
    }
  }
  return caught
})()`

/** The palette must not contain personal data anywhere in its visible text. */
function assertClean(visibleText) {
  const leak = new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}|${BALANCE_RE_SOURCE}`, 'i')
  const found = leak.exec(visibleText)
  if (found !== null) throw new Error(`sensitive text still visible after sanitize: ${JSON.stringify(found[0].slice(0, 60))}\n${visibleText}`)
}

/** Sanitize the page behind `run` and prove the result carries no personal data. */
async function sanitizePage(run) {
  const swapped = await run(SANITIZE_JS)
  const caught = []
  // The account label can arrive or be rewritten after the first sweep; give that
  // sync three bounded chances to settle and never keep a leaky capture.
  for (let attempt = 0; attempt < 3; attempt++) {
    caught.push(...await run(SWEEP_JS))
    const visibleText = await run('document.body.innerText')
    if (!new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}|${BALANCE_RE_SOURCE}`, 'i').test(visibleText)) return { swapped, caught, visibleText }
    await run('new Promise(resolve => setTimeout(resolve, 100))')
  }
  const visibleText = await run('document.body.innerText')
  assertClean(visibleText)
  return { swapped, caught, visibleText }
}

if (!new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}`, 'i').test('C:\\Users\\Nwflower\\tmp')) {
  throw new Error('leak regex failed self-test')
}

export {
  PROJECT_NAMES,
  SESSION_NAMES,
  USERNAME,
  USERNAME_RE_SOURCE,
  PATH_RE_SOURCE,
  BALANCE_RE_SOURCE,
  SANITIZE_JS,
  SWEEP_JS,
  assertClean,
  sanitizePage,
}
