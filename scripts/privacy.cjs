/**
 * privacy.cjs — the replacements and the sweep every screenshot path runs before
 * anything reaches disk (D45).
 *
 * A screenshot is taken from a page that carries the machine's own data: sidebar
 * workspace and session titles, the account row's inferred username, absolute
 * drive paths, quota amounts. `sanitizePage` rewrites them to neutral stand-ins
 * in the live page and then sweeps the visible text; a surviving match throws
 * instead of shipping. The regex sources stay strings so the page sweep and the
 * final assertion rebuild from one copy.
 */
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

/**
 * LEAK covers the local username, drive paths and quota amounts; PATH and
 * BALANCE cover the two rewrites.
 */
const USERNAME_RE_SOURCE = 'Nwflower'
const PATH_RE_SOURCE = '[A-Z]:[\\\\/][^\\s"\']*'
const BALANCE_RE_SOURCE = '\u00a5\\s?[0-9][0-9.,]*'

/**
 * Replace sidebar titles with stand-ins; swap the username nodes for static
 * ones under a different class — the theme's footer sync re-writes any node
 * still carrying `.dsh-claude-account-user` with the inferred real name, so
 * the stand-in must be invisible to that query. The name the account row
 * shows is replaced everywhere else too (the studio greeting says it).
 *
 * A title that already is a stand-in — bare, or after a source label such as
 * "Claude · " — stays, and so does a blank session's, which is the host's own
 * label for one (the same words as its New session button); the others take
 * the stand-ins no row uses yet.
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
  if (found !== null) throw new Error(`sensitive text still visible after sanitize: ${JSON.stringify(found[0].slice(0, 60))}`)
}

/**
 * Sanitize the page behind `run` — an expression evaluator for the driver in
 * use — and prove the result carries no personal data.
 *
 * @param run - `(expression) => Promise<value>` in the live page.
 * @returns the replaced node count, what the sweep caught, and the visible text.
 */
async function sanitizePage(run) {
  const swapped = await run(SANITIZE_JS)
  const caught = await run(SWEEP_JS)
  const visibleText = await run('document.body.innerText')
  assertClean(visibleText)
  return { swapped, caught, visibleText }
}

if (!new RegExp(`${USERNAME_RE_SOURCE}|${PATH_RE_SOURCE}`, 'i').test('C:\\Users\\Nwflower\\tmp')) {
  throw new Error('leak regex failed self-test')
}

module.exports = {
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
