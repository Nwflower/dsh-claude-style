/**
 * The 已归档 segment is the skin's own page of the archive, not the host's tree:
 * one page of thirty conversations stands first and the reader's scroll to the
 * foot appends the next, so a workspace whose archive holds hundreds keeps the
 * sidebar fast and every row still opens, unarchives and deletes through the
 * host's own actions.
 *
 * @capability workspace-archive
 * @features workspace
 * @risk The archived view mounts every stored conversation at once: an archive of hundreds slows the sidebar to a crawl, and deleting or unarchiving a conversation stutters the whole list.
 */
import { spec } from '../../fixtures/behaviour.mjs'
import { boxOf } from '../../fixtures/boxes.mjs'

/**
 * The stand-in host's workspace section, stood the way the smoke's own block
 * stands it: the host's class names are assembled at runtime so this file
 * spells no mark (the same escape the engine uses). The page carries the
 * switches case's services, so the view store the segment drives is the
 * stand-in's own. The root is the host's own box — a bounded column whose
 * region clips what overflows — because the archived page's scroll port is the
 * box the skin seats in it, and a root left to grow would hide that.
 */
const HOST_CLASS = {
  root: '_root_n_' + '1',
  section: '_sectionHeader_' + 'w1_1',
  label: '_sectionLabel_' + 'w1_1',
  wide: '_wide_' + 'w1_1',
  area: '_listArea_' + 'w1_1',
  project: '_projectRow_' + 'w1_1',
}

/**
 * Give the host a workspace section and an archive of `count` conversations,
 * each titled 归档会话 N with N counting up as the conversations age: 归档会话
 * (count - 1) is the newest. The stand-in's services answer the fixture's
 * state, and unarchiveSession takes the conversation out of the archive set
 * the way the host does.
 */
async function setup(t, count) {
  await t.page.evaluate(({ classes, count }) => {
    const ids = []
    const byId = {}
    for (let i = 0; i < count; i += 1) {
      const id = 'arch-' + String(i).padStart(4, '0')
      ids.push(id)
      byId[id] = { id, displayTitle: '归档会话 ' + i, updatedAt: 1700000000000 + i * 1000 }
    }
    const state = { archived: ids.slice(), removed: [], opened: [] }
    window.__archiveFixture = state
    const get = window.__ctx.get.bind(window.__ctx)
    window.__ctx.get = (name) => name === 'uiWorkspace' ? { openSession: (id) => { state.opened.push(id) } } : get(name)
    const workspaces = window.__ctx.get('workspaces')
    workspaces.list.getSnapshot = () => ({ phase: 'ready', archivedSessionIds: state.archived.filter((id) => !state.removed.includes(id)) })
    workspaces.unarchiveSession = (id) => { state.removed.push(id); return Promise.resolve() }
    const sessions = window.__ctx.get('sessions')
    sessions.list.getSnapshot = () => ({ current: undefined, phase: 'ready', ids: state.archived, byId, projectionsBySession: {} })
    sessions.refresh = () => Promise.resolve()
    const sidebar = document.createElement('div')
    sidebar.setAttribute('data-' + 'slot', 'sidebar')
    sidebar.innerHTML = '<div class="' + classes.root + '" style="display:flex;flex-direction:column;height:320px;overflow:hidden">' +
      '<div class="' + classes.section + '" style="display:flex;align-items:center;justify-content:space-between;width:100%"><span class="' + classes.label + ' ' + classes.wide + '">Workspaces</span></div>' +
      '<div role="tree" class="' + classes.area + '"><div ' + 'data-' + 'row-key="w1" class="' + classes.project + '">project</div></div></div>'
    document.body.appendChild(sidebar)
  }, { classes: HOST_CLASS, count })
  await t.settle()
}

/**
 * The 已归档 segment: the second radio of the section's own switch. While 进行中
 * stands the control rests: it comes back under the pointer, so the heading's
 * hover is the reader's way to it (workspace.css).
 */
async function pickArchived(t) {
  // The label takes no pointer of its own (workspace.css): the header under it is the hover's target.
  await t.page.getByText('Workspaces', { exact: true }).locator('..').hover()
  await t.page.getByRole('radiogroup').getByRole('radio').nth(1).click()
  await t.settle()
}

/** The 进行中 segment. */
async function pickActive(t) {
  await t.page.getByRole('radiogroup').getByRole('radio').nth(0).click()
  await t.settle()
}

/** How many archived rows the page carries (a fixture title names one row). */
function rowCount(t) {
  return t.page.locator(`[${t.surface.attribute('workspace.archived-row')}]`).count()
}

/** One archived row, named by its fixture title: the row carries the title's own words in its tooltip anchor. */
function row(t, title) {
  return t.page.locator(`[${t.surface.attribute('workspace.archived-row')}]`)
    .filter({ has: t.page.getByText(title, { exact: true }) })
}

/** The archived page's own list: the box the section's room seats, and its scroll port. */
function archivedList(t) {
  return t.surface('workspace.archived-list')
}

/** The reader's scroll to the foot of the archived list. */
async function scrollToFoot(t) {
  await t.page.evaluate((listSelector) => {
    const list = document.querySelector(listSelector)
    list.scrollTop = list.scrollHeight
    window.dispatchEvent(new Event('scroll'))
  }, archivedList(t))
  await t.settle()
}

export default spec({ page: 'switches' }, ({ test }) => {
  test('the archived list is the section\'s scroll port', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    const listSelector = archivedList(t)
    t.expectThat.equal(await t.read.computed(listSelector, 'overflow-y'), 'auto', 'the list is the box the reader scrolls')
    const standing = await t.read.overflow(listSelector)
    t.expectThat.equal(standing.scrollHeight > standing.clientHeight, true, 'a page of rows runs past the section')
    const listBox = await t.read.box(listSelector)
    const rootBox = await t.read.box('.' + HOST_CLASS.root)
    t.expectThat.equal(listBox.bottom <= rootBox.bottom + 0.5, true, 'the list ends at the section\'s own foot')
    await scrollToFoot(t)
    const moved = await t.page.evaluate((listSelector) => document.querySelector(listSelector).scrollTop, listSelector)
    t.expectThat.equal(moved > 0, true, 'the reader reaches the rows below the section')
    t.expectThat.equal(await rowCount(t), 60, 'the foot of the port asks for the next page')
  })

  test('one page of thirty conversations stands first, and the foot appends the next', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    t.expectThat.equal(await rowCount(t), 30, 'the first page is thirty rows')
    await scrollToFoot(t)
    t.expectThat.equal(await rowCount(t), 60, 'reaching the foot appends the next thirty')
    await t.page.evaluate(() => {
      for (let event = 0; event < 8; event += 1) window.dispatchEvent(new Event('scroll'))
    })
    await t.settle()
    t.expectThat.equal(await rowCount(t), 60, 'a scroll storm in one frame adds one page, not many')
    for (let page = 0; page < 20 && await rowCount(t) < 420; page += 1) await scrollToFoot(t)
    t.expectThat.equal(await rowCount(t), 420, 'the archive of four hundred and twenty is all there')
    await scrollToFoot(t)
    t.expectThat.equal(await rowCount(t), 420, 'the exhausted archive appends nothing')
  })

  test('an archive of exactly the page size asks for nothing more', async (t) => {
    await setup(t, 30)
    await pickArchived(t)
    t.expectThat.equal(await rowCount(t), 30, 'the whole archive stands at once')
    await scrollToFoot(t)
    t.expectThat.equal(await rowCount(t), 30, 'no second page exists to append')
  })

  test('an empty archive says so in the section', async (t) => {
    await setup(t, 0)
    await pickArchived(t)
    t.expectThat.absent(await rowCount(t), 'no rows stand')
    const line = t.page.getByText(/No archived conversations|没有已归档的会话/)
    t.expectThat.equal(await line.count(), 1, 'the empty archive names itself')
  })

  test('the newest conversation stands first', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    const newest = await boxOf(row(t, '归档会话 419'))
    const next = await boxOf(row(t, '归档会话 418'))
    t.expectThat.visible(newest, 'the newest row is drawn')
    t.expectThat.visible(next, 'the next row is drawn')
    t.expectThat.equal(newest.top < next.top, true, 'the newest conversation stands above the next')
  })

  test('both row actions draw their own glyphs', async (t) => {
    await setup(t, 3)
    await pickArchived(t)
    const drawn = await t.page.evaluate((rowAttribute) => {
      const row = document.querySelector('[' + rowAttribute + ']')
      return [...row.querySelectorAll('button')].map((button) => {
        const svg = button.querySelector('svg')
        return {
          use: svg === null ? null : svg.querySelectorAll('use').length,
          paths: svg === null ? 0 : svg.querySelectorAll('path').length,
          stroke: svg === null ? null : svg.getAttribute('stroke'),
          width: svg === null ? null : svg.getAttribute('width'),
          height: svg === null ? null : svg.getAttribute('height'),
          inkMatches: svg === null ? null : getComputedStyle(svg).color === getComputedStyle(button).color,
        }
      })
    }, t.surface.attribute('workspace.archived-row'))
    t.expectThat.equal(drawn.map((icon) => [icon.use, icon.paths > 0, icon.stroke, icon.width, icon.height, icon.inkMatches]), [[0, true, 'currentColor', '14', '14', true], [0, true, 'currentColor', '14', '14', true]], 'both row actions draw the skin\'s own glyph at 14px, stroked in the button\'s own ink, with no sprite to name')
    const unarchive = await boxOf(row(t, '归档会话 1').locator('button').first())
    t.expectThat.equal([unarchive.width, unarchive.height], [16, 16], 'the glyph stands in the host\'s 16px row-action box')
  })

  test('unarchive hands the conversation back to the host and its row leaves', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    await row(t, '归档会话 419').locator('button').first().click()
    await t.settle()
    t.expectThat.absent(await row(t, '归档会话 419').count(), 'the unarchived conversation leaves the list')
    const next = await boxOf(row(t, '归档会话 418'))
    t.expectThat.visible(next, 'the next conversation takes its place')
    t.expectThat.equal(await rowCount(t), 30, 'the page keeps its size')
  })

  test('delete keeps the row while the host half refuses it', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    // The stand-in answers no delete route: the refusal carries its own words,
    // and the row is the route's to take, not the list's.
    await row(t, '归档会话 419').locator('button').last().click()
    await t.settle()
    t.expectThat.equal(await row(t, '归档会话 419').count(), 1, 'the refused row stands where it was')
    t.expectThat.equal(await rowCount(t), 30, 'the page keeps its size')
  })

  test('pressing a conversation asks the host to open it', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    await row(t, '归档会话 419').click()
    await t.settle()
    const opened = await t.page.evaluate(() => window.__archiveFixture.opened)
    t.expectThat.equal(opened, ['arch-0419'], 'the host opens the pressed archived session')
    t.expectThat.equal(await rowCount(t), 30, 'the list stands as it was')
    t.expectThat.equal(await t.page.getByRole('radiogroup').getByRole('radio', { checked: true }).count(), 1, 'the segment still names one view')
  })

  test('leaving 已归档 hands the room back and returning restarts at the top', async (t) => {
    await setup(t, 420)
    await pickArchived(t)
    await scrollToFoot(t)
    t.expectThat.equal(await rowCount(t), 60, 'the second page stands before the leave')
    await pickActive(t)
    t.expectThat.absent(await rowCount(t), 'the archived rows leave with the segment')
    const hostTree = await boxOf(t.page.getByText('project', { exact: true }))
    t.expectThat.visible(hostTree, 'the host own tree is back where it stood')
    await pickArchived(t)
    t.expectThat.equal(await rowCount(t), 30, 'the archive starts over at its first page')
    const top = await t.page.evaluate((listSelector) => document.querySelector(listSelector).scrollTop, archivedList(t))
    t.expectThat.equal(top, 0, 'the page starts at the top of the archive')
  })
})
