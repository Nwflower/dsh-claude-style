import { SESSION_ROW_KEY_ATTRIBUTE, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { readPrefs, subscribePrefs } from '../../core/prefs'
import { observeMatches, subscribeMutations } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { watchSidebar } from '../../shared/sidebar-watch'
import { requestFrame } from '@dsh-claude-style/engine/frame'
import { hostSessions, hostWorkspaces, hostWorkspaceView } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostSessionGroupBy } from '@dsh-claude-style/contracts/services'
import { copy } from './copy'
import type { CopyKey } from './copy'

/**
 * 侧栏的会话列表按日期排列：今天、昨天、星期几，一周以前收进「更早」，
 * 每一段里最近的排在最上面，行右手标出它属于哪个工作区。
 *
 * 宿主自己没有「按日期」这一档 — 它的视图 store 只认按工作区、工作区树和扁平
 * 三种分组 — 而工作区分组里每一段各是一张列表，日期没法跨过去。所以这里做两件事：
 * 一是把宿主的视图 store 切到扁平，让所有会话落在同一张列表上；二是在这张列表里
 * 按更新时间重排座位、并在每段开头插一条自己的标题。
 *
 * 行本身不动，动的是宿主给每行包的那个盒子（与「正在运行的会话排在开头」同一个
 * 手法）：盒子里只有一个行，挪盒子不影响 React 的账。所有写入都先比对现状，
 * 站对了就一个字不写 — 我们自己的写入也会让观测回调再跑一遍，不比对会自激。
 */

/** 行右手那排行内按钮：工作区标签插在它前面。 */
const ROW_ACTIONS_SELECTOR = '[data-dsh-claude-part~="row-actions"]'
/** 我们自己插的日期标题。 */
const HEADER_ATTRIBUTE = 'data-dsh-claude-date-header'
/** 我们自己插在行里的工作区标签。 */
const CHIP_CLASS = 'dsh-claude-date-chip'
/** 我们自己的写入打上静音标记：宽观测听见它们时不再算一次页面变化，免得自激。 */
function quiet(node: HTMLElement) {
  node.setAttribute(QUIET_ATTR, '')
}
/** 模式标记落在 body 上，样式表靠它决定哪几条规则算数。 */
const MODE_ATTRIBUTE = 'data-dsh-claude-date-groups'
/** 读者正在翻已归档：那一档不按日期分，样式表靠这个标记把日期视图的样式让开。 */
const ARCHIVED_ATTRIBUTE = 'data-dsh-claude-date-archived'
/**
 * 切到扁平之前的分组记在这里。宿主的视图 store 会把这档写进它自己的存储，
 * 所以只在内存里记不够：读者在日期视图里退出应用，下次开机列表就是扁平的。
 */
const GROUP_BACKUP_KEY = 'dsh-claude-group-before-date-view'
/** 一周以内的日子用星期几当标题，再早的收进一段。 */
const WEEKDAY_LIMIT = 7
/**
 * 切换视图的事件名：铃铛按下时派发，本特性接住它，在「宿主的按工作区」与
 * 「我们的按日期」之间来回切。默认是前者 —— 读者不按铃铛，列表就是他原来的样子。
 */
export const DATE_VIEW_TOGGLE_EVENT = 'dsh-claude-toggle-date-view'

/** 一天所属段落的标题键（顺序与 Date#getDay 一致）。 */
const WEEKDAY_KEYS: CopyKey[] = ['weekday0', 'weekday1', 'weekday2', 'weekday3', 'weekday4', 'weekday5', 'weekday6']

/** 一条列表里的一个座位：宿主给每行包的那个盒子，加上我们读到的会话。 */
interface Seat {
  /** 宿主的盒子：列表里挪动的是它，不是行。 */
  box: HTMLElement
  /** 盒子里那一行，读 key、插标签都落在它上面。 */
  row: HTMLElement
  /** 会话 id（行 key 去掉 `session:` 前缀）。 */
  id: string
  /** 最后更新时间，段落与先后都按它排。 */
  updatedAt: number
  /** 离今天几天：0 是今天，1 是昨天，越大越早。 */
  day: number
}

/** 当地那一天的零点。 */
function startOfDay(time: number) {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * 两个零点之间隔了几天。
 *
 * 按年月日折算成天序号再相减，而不是拿毫秒差除以一天：夏令时那天只有 23 小时，
 * 毫秒差会把同一天的凌晨和深夜算成隔了一天（或反过来）。
 */
function daysBetween(earlier: number, later: number) {
  const index = (stamp: number) => {
    const date = new Date(stamp)
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  }
  return index(later) - index(earlier)
}

/** 记下读者原来的分组（localStorage 不可用时就算了，退化成只记在内存里）。 */
function rememberGroup(group: HostSessionGroupBy) {
  try {
    globalThis.localStorage?.setItem(GROUP_BACKUP_KEY, group)
  } catch {
    // 隐私模式或存储被禁：内存里的 previousGroup 仍然管这一趟。
  }
}

/** 读回上次记下的分组；没有或不是合法值时返回 null。 */
function rememberedGroup(): HostSessionGroupBy | null {
  try {
    const value = globalThis.localStorage?.getItem(GROUP_BACKUP_KEY)
    return value === 'workspace' || value === 'workspace-tree' || value === 'flat' ? value : null
  } catch {
    return null
  }
}

/** 还完就删：这份备份只该存在读者待在日期视图里的那段时间。 */
function forgetGroup() {
  try {
    globalThis.localStorage?.removeItem(GROUP_BACKUP_KEY)
  } catch {
    // 同上，删不掉也不影响本次会话。
  }
}

/** 一个座位所属段落的标题：今天、昨天、星期几；一周以前一律「更早」。 */
function labelOf(seat: Seat) {
  if (seat.day <= 0) return copy('today')
  if (seat.day === 1) return copy('yesterday')
  if (seat.day < WEEKDAY_LIMIT) {
    const key = WEEKDAY_KEYS[new Date(seat.updatedAt).getDay()]
    if (key !== undefined) return copy(key)
  }
  return copy('earlier')
}

/* ---------- 工作区名字：给设置页那一栏用 ---------- */
/* date-groups 手上有宿主的 workspaces 句柄，设置页没有：这里把标题收成一个小
   仓库，谁要知道「有哪些工作区可以被排除」就问它，变了会收到通知。 */
let publishedNames: string[] = []
const nameListeners = new Set<() => void>()

/** 现在的工作区标题，按宿主给的顺序。 */
export function workspaceNames(): string[] {
  return publishedNames
}

/** 名字变了就叫一声；返回退订。 */
export function subscribeWorkspaceNames(listener: () => void) {
  nameListeners.add(listener)
  return () => { nameListeners.delete(listener) }
}

/** 换一批名字；一样就不叫。 */
function publishWorkspaceNames(next: string[]) {
  const same = next.length === publishedNames.length && next.every((name, at) => name === publishedNames[at])
  if (same) return
  publishedNames = next
  for (const listener of nameListeners) listener()
}

export function install(ctx: HostContext) {
  /** 宿主的会话列表：每行的更新时间从这儿来（行上只有标题与时间文字）。 */
  const sessions = hostSessions(ctx)
  /** 工作区列表：行右手标签读它 — 归属在工作区那一行上，会话行自己不带着。 */
  const workspaces = hostWorkspaces(ctx)
  /** 宿主的视图 store：切成扁平列表，日期段落才有同一张列表可站。 */
  const view = hostWorkspaceView(ctx)

  /** 我们自己插进页面的节点，卸载时按这份清单收走（不去 document 里回查）。 */
  const mine = new Set<HTMLElement>()
  /** 我们把宿主的视图 store 切成扁平之前的分组，卸载时还回去。 */
  let previousGroup: HostSessionGroupBy | null = null
  /** 日期视图开着吗：默认关着，读者按下铃铛才打开。 */
  let dateMode = false
  /** 等这一帧写。 */
  let cancelFrame: (() => void) | null = null
  let disposed = false

  /** 会话 id → 工作区标题。 */
  function workspacesById() {
    const titles = new Map<string, string>()
    const list = workspaces?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return titles
    // 页面没有工作区列表时 `items` 可能整个不在：那一档当作「谁也认不出来」。
    if (!Array.isArray(snapshot.items)) return titles
    for (const row of snapshot.items) {
      for (const id of row.sessionIds) if (!titles.has(id)) titles.set(id, row.title)
    }
    return titles
  }

  /** 会话 id → 最后更新时间。 */
  function timesById() {
    const times = new Map<string, number>()
    const list = sessions?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return times
    for (const id of snapshot.ids) {
      const summary = snapshot.byId?.[id]
      if (summary !== undefined && summary !== null) times.set(id, summary.updatedAt ?? 0)
    }
    return times
  }

  /**
   * 把宿主的列表切成扁平一条。
   *
   * 工作区分组里每一段各是一张列表，日期要跨工作区，只能落在一张列表上；这个
   * 写入是读者的首选项换来的（关掉本功能就还回原来的分组），不是偷偷改他的视图。
   */
  function flatten() {
    const store = view
    if (store === null || store === undefined) return
    if (typeof store.getSnapshot !== 'function' || typeof store.actions?.setGroupBy !== 'function') return
    const group = store.getSnapshot().groupBy
    if (group === 'flat') return
    previousGroup = group
    rememberGroup(group)
    store.actions.setGroupBy('flat')
  }

  /**
   * 行内按钮区：宿主悬停时才让它参与布局，一出现就把标题和标签向左挤 60px。
   * 宽度由样式表钉死，这里只把它的布局写成行内样式 —— 宿主的 display 是它自己
   * 的样式表给的，我们不带 !important 也能改过它（行内样式永远排在样式表前面）。
   */
  function reserveActions(row: HTMLElement) {
    const actions = row.querySelector<HTMLElement>(`:scope > ${ROW_ACTIONS_SELECTOR}`)
    if (actions === null) return
    if (actions.style.display !== 'flex') actions.style.display = 'flex'
  }

  /** 工作区标签：插在行内按钮前面，太长由样式表省略。 */
  function dress(seat: Seat, title: string) {
    const row = seat.row
    reserveActions(row)
    let chip = row.querySelector<HTMLElement>(`:scope > .${CHIP_CLASS}`)
    if (title === '') {
      if (chip !== null) {
        chip.remove()
        mine.delete(chip)
      }
      return
    }
    if (chip === null) {
      chip = buildElement('span', CHIP_CLASS)
      quiet(chip)
      const actions = row.querySelector(ROW_ACTIONS_SELECTOR)
      if (actions !== null && actions.parentElement === row) row.insertBefore(chip, actions)
      else row.appendChild(chip)
      mine.add(chip)
    }
    if (chip.textContent !== title) chip.textContent = title
  }

  /**
   * 排一条列表：座位按日期倒序站好，每段开头一条自己的标题。
   * @param list - 座位们共同的父节点。
   * @param seats - 这条列表的座位，按宿主当前画出来的顺序。
   */
  function place(list: Element, seats: Seat[]) {
    // 站好的顺序：离今天越近越前，同一天里更新时间新的在前（sort 是稳定的，
    // 时间一样的两个座位保持宿主给的先后）。
    const ordered = seats.slice().sort((left, right) => left.day - right.day || right.updatedAt - left.updatedAt)
    // 现在的顺序按 DOM 读，而不是按总线的匹配清单读：清单是增量维护的，节点被挪过
    // 之后它的先后就不再是页面上的先后，拿它比对会每一遍都判「没站好」，把整条
    // 列表反复重排 —— 读者看到的就是列表在抖。
    const byBox = new Map<Element, Seat>()
    for (const seat of seats) byBox.set(seat.box, seat)
    const current: Seat[] = []
    for (const child of Array.from(list.children)) {
      const seat = byBox.get(child)
      if (seat !== undefined) current.push(seat)
    }
    const standing = current.length === ordered.length && current.every((seat, at) => seat === ordered[at])
    if (!standing) {
      // 挨个追加到末尾：一轮之后列表里的座位就是 ordered 的顺序；标题节点先不管，
      // 下面统一重建（这一步只在这一条列表上写过非座位子节点时才需要）。
      for (const seat of ordered) list.appendChild(seat.box)
    }
    // 段落边界：相邻两个座位的标题不一样的第一行。
    const boundaries: { before: Element, label: string }[] = []
    let lastLabel: string | null = null
    for (const seat of ordered) {
      const label = labelOf(seat)
      if (label !== lastLabel) {
        boundaries.push({ before: seat.box, label })
        lastLabel = label
      }
    }
    // 这条列表里现有的标题，按文档顺序。
    const headers: HTMLElement[] = []
    for (const child of Array.from(list.children)) {
      if (child instanceof HTMLElement && child.getAttribute(HEADER_ATTRIBUTE) !== null) headers.push(child)
    }
    const settled = headers.length === boundaries.length && boundaries.every((item, at) => {
      const header = headers[at]
      return header !== undefined && header.nextElementSibling === item.before && header.textContent === item.label
    })
    if (settled) return
    for (const header of headers) {
      header.remove()
      mine.delete(header)
    }
    for (const item of boundaries) {
      const header = buildElement('div', 'dsh-claude-date-header')
      quiet(header)
      header.setAttribute(HEADER_ATTRIBUTE, '')
      header.textContent = item.label
      list.insertBefore(header, item.before)
      mine.add(header)
    }
  }

  /** 一遍写入：先把宿主的列表压平，再按日期重排每条列表、给行加标签。 */
  function arrange() {
    if (disposed || !dateMode) return
    // 已归档的会话不按日期分：那是读者回头翻旧账的地方，日期段落只属于进行中。
    if (archivedView()) {
      calm()
      return
    }
    document.body.removeAttribute(ARCHIVED_ATTRIBUTE)
    flatten()
    const titles = workspacesById()
    // 读者在设置页挑过的工作区不参与日期排列（默认「闲聊」）。
    const skip = new Set(readPrefs().dateSkipWorkspaces)
    const times = timesById()
    const today = startOfDay(Date.now())
    // 座位按它们所在的列表归堆：一条列表一次排完，段落不会跨列表。
    const lists = new Map<Element, Seat[]>()
    for (const row of rows.all()) {
      const key = row.getAttribute(SESSION_ROW_KEY_ATTRIBUTE) ?? ''
      if (!key.startsWith('session:')) continue
      const box = row.parentElement
      const list = box === null ? null : box.parentElement
      if (box === null || list === null) continue
      const id = key.slice('session:'.length)
      // 被屏蔽的工作区（「闲聊」）不走日期排列：它的会话在日期视图里让开，
      // 留在工作区视图里由宿主自己那份分组去说。不属于任何工作区的会话
      // （工作区视图里的「未分组」）同样让开：日期段落说的是哪天聊过哪件事，
      // 一条没有归属的会话落进来只是噪音。
      const workspace = titles.get(id) ?? ''
      if (workspace === '' || skip.has(workspace)) {
        if (box.style.display !== 'none') box.style.display = 'none'
        continue
      }
      // 其余跑着的会话照常排进「今天」那一块。
      if (box.style.display === 'none') box.style.display = ''
      const updatedAt = times.get(id) ?? 0
      const seat: Seat = { box, row, id, updatedAt, day: daysBetween(startOfDay(updatedAt), today) }
      const seats = lists.get(list)
      if (seats === undefined) lists.set(list, [seat])
      else if (!seats.some(other => other.box === box)) seats.push(seat)
      dress(seat, workspace)
    }
    for (const [list, seats] of lists) place(list, seats)
  }

  /** 读者现在翻的是已归档吗：宿主的筛选是「只看已归档」或「混着显示」都算。 */
  function archivedView() {
    const store = view
    if (store === null || store === undefined || typeof store.getSnapshot !== 'function') return false
    const snapshot = store.getSnapshot()
    return snapshot.archivedFilter === 'only' || snapshot.archivedFilter === 'show'
  }

  /**
   * 把日期视图写过的东西收走，列表交回宿主原来的排法。
   * 用在读者切到已归档的时候：那一档不分日期，也不该留着日期视图的痕迹。
   */
  function calm() {
    document.body.setAttribute(ARCHIVED_ATTRIBUTE, '')
    for (const node of mine) node.remove()
    mine.clear()
    restoreSeats()
  }

  /**
   * 把行上写过的东西还回去：让开的行恢复显示，标签摘掉，行内按钮区那笔
   * 行内 display 也还掉。两处收尾（切到已归档、关掉日期视图）共用这一份。
   */
  function restoreSeats() {
    for (const row of rows.all()) {
      const box = row.parentElement
      if (box !== null && box.style.display === 'none') box.style.display = ''
      const chip = row.querySelector('.dsh-claude-date-chip')
      if (chip !== null) chip.remove()
      const actions = row.querySelector<HTMLElement>(`:scope > ${ROW_ACTIONS_SELECTOR}`)
      if (actions !== null && actions.style.display === 'flex') actions.style.display = ''
    }
  }

  /** 打开日期视图：切扁平、重排、加标签，标记落到 body 上供样式表和铃铛读。 */
  function enable() {
    if (dateMode || disposed) return
    dateMode = true
    document.body.setAttribute(MODE_ATTRIBUTE, '')
    flatten()
    arrange()
  }

  /** 关掉日期视图：还回宿主的分组，收走我们写过的每一个像素。 */
  function disable() {
    if (!dateMode) return
    document.body.removeAttribute(ARCHIVED_ATTRIBUTE)
    dateMode = false
    document.body.removeAttribute(MODE_ATTRIBUTE)
    // 我们插的标题与标签全部收走，行上改过的显示状态还回去。
    for (const node of mine) node.remove()
    mine.clear()
    restoreSeats()
    // 分组还成读者原来的那一档（工作区 / 工作区树 / 扁平都照原样）。
    const store = view
    const restore = previousGroup ?? rememberedGroup()
    if (restore !== null && typeof store?.actions?.setGroupBy === 'function') store.actions.setGroupBy(restore)
    previousGroup = null
    forgetGroup()
  }

  /** 页面要走了：还在日期视图里就把分组还回去，宿主的存储里不留我们的痕迹。 */
  function onPageHide() {
    if (dateMode) disable()
  }

  /** 铃铛按下：在两种视图之间切一次。 */
  function onToggle() {
    if (dateMode) disable()
    else enable()
  }

  /** 把工作区标题收给设置页：那一栏要列出「哪些工作区不进日期排列」。 */
  function shareNames() {
    const list = workspaces?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return
    if (!Array.isArray(snapshot.items)) return
    const names: string[] = []
    for (const row of snapshot.items) if (!names.includes(row.title)) names.push(row.title)
    publishWorkspaceNames(names)
  }

  function schedule() {
    if (cancelFrame !== null || disposed) return
    cancelFrame = requestFrame({
      write() {
        cancelFrame = null
        shareNames()
        arrange()
      },
    })
  }

  /** 侧栏里的每一行会话，宿主随时可能整批重画。 */
  const rows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, schedule)
  /** 行被换掉、列表被重画、段落被宿主挤掉：都只算侧栏里的变化，跟着重排一遍。 */
  const stopWatch = watchSidebar(schedule)
  /** 会话的更新时间变了，段落边界可能跟着变（跨零点的那一帧）。 */
  let unsubscribe: (() => void) | null = null
  if (typeof sessions?.list?.subscribe === 'function') unsubscribe = sessions.list.subscribe(() => schedule())
  /** 工作区列表变了（新建、改名）：设置页那一栏跟着换。 */
  let unsubscribeWorkspaces: (() => void) | null = null
  if (typeof workspaces?.list?.subscribe === 'function') unsubscribeWorkspaces = workspaces.list.subscribe(() => schedule())
  /** 读者在设置页里改了「不进入日期布局的工作区」：立刻重排。 */
  const stopPrefs = subscribePrefs(() => schedule())

  // 自愈：上次若是在日期视图里关掉应用的，宿主记下的是扁平，这里还成读者原来的分组，
  // 否则「默认还是工作区 + 会话」在重启之后就不成立。
  const leftover = rememberedGroup()
  if (leftover !== null) {
    const store = view
    const group = typeof store?.getSnapshot === 'function' ? store.getSnapshot().groupBy : null
    if (group === 'flat' && typeof store?.actions?.setGroupBy === 'function') store.actions.setGroupBy(leftover)
    forgetGroup()
  }

  shareNames()

  // 默认什么都不做：读者看到的就是宿主原来那张「工作区 + 会话」。
  document.addEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
  // 页面关掉时还在日期视图里：先把分组还回去，别把扁平留在宿主的存储里。
  globalThis.addEventListener('pagehide', onPageHide)

  return () => {
    // 关掉视图再拆：分组还回去，我们插的节点收走。
    disable()
    document.removeEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
    globalThis.removeEventListener('pagehide', onPageHide)
    disposed = true
    if (cancelFrame !== null) {
      cancelFrame()
      cancelFrame = null
    }
    stopWatch()
    rows.release()
    if (unsubscribe !== null) unsubscribe()
    if (unsubscribeWorkspaces !== null) unsubscribeWorkspaces()
    if (typeof stopPrefs === 'function') stopPrefs()
    document.body.removeAttribute(MODE_ATTRIBUTE)
    for (const node of mine) if (node.isConnected) node.remove()
    mine.clear()
    const store = view
    if (previousGroup !== null && store !== null && store !== undefined && typeof store.actions?.setGroupBy === 'function') {
      store.actions.setGroupBy(previousGroup)
    }
  }
}
