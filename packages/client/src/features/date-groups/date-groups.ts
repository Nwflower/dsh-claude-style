import { SESSION_ROW_KEY_ATTRIBUTE, SESSION_ROW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { observeMatches } from '@dsh-claude-style/engine/bus'
import { buildElement } from '@dsh-claude-style/engine/dom'
import { QUIET_ATTR } from '../../constants'
import { watchSidebar } from '../../shared/sidebar-watch'
import { hostSessions, hostWorkspaces, hostWorkspaceView } from '@dsh-claude-style/engine/host'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FeatureUi } from '../../core/feature'
import type { HostSessionGroupBy, HostSessionsService, HostWorkspacesService } from '@dsh-claude-style/contracts/services'
import { copy } from './copy'
import type { CopyKey } from './copy'
import type manifest from './date-groups.manifest'

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
 * 「我们的按日期」之间来回切。日期视图是默认的那一档，铃铛只是临时换回去。
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

export function install(ctx: HostContext, ui: FeatureUi<typeof manifest>) {
  /**
   * 宿主的服务按每一遍现取，不在安装时取一次：本特性随插件一起装上，而宿主是在那之后
   * 才注册 `sessions`、`workspaces` 和视图 store 的。安装时抓下来的值会整个世代都是
   * null —— 日期视图于是把每一段都画成「更早」、行上也没有工作区标签（#222）。
   */
  const sessionsNow = () => hostSessions(ctx)
  const workspacesNow = () => hostWorkspaces(ctx)
  const viewNow = () => hostWorkspaceView(ctx)

  /** 我们自己插进页面的节点，卸载时按这份清单收走（不去 document 里回查）。 */
  const mine = new Set<HTMLElement>()
  /** 我们把宿主的视图 store 切成扁平之前的分组，卸载时还回去。 */
  let previousGroup: HostSessionGroupBy | null = null
  /** 日期视图开着吗：默认开着，读者按下铃铛才换回宿主的分组。 */
  let dateMode = false
  let disposed = false

  /**
   * 会话 id → 它所在的工作区，以及这份归属是否已经答全。
   *
   * `ready` 只在宿主的工作区列表答出来之后才是真：在那之前谁属于哪个工作区还没有
   * 答案，页面不能据此判定「这条会话不属于任何工作区」而把它藏起来。
   */
  function workspacesById() {
    const titles = new Map<string, string>()
    const list = workspacesNow()?.list
    const snapshot = typeof list?.getSnapshot === 'function' ? list.getSnapshot() : undefined
    if (snapshot === undefined || snapshot === null || snapshot.phase === 'pending') return { titles, ready: false }
    // 页面没有工作区列表时 `items` 可能整个不在：那一档同样算还没有答案。
    if (!Array.isArray(snapshot.items)) return { titles, ready: false }
    for (const row of snapshot.items) {
      for (const id of row.sessionIds) if (!titles.has(id)) titles.set(id, row.title)
    }
    return { titles, ready: true }
  }

  /** 会话 id → 最后更新时间。 */
  function timesById() {
    const times = new Map<string, number>()
    const list = sessionsNow()?.list
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
   * 工作区分组里每一段各是一张列表，日期要跨工作区，只能落在一张列表上；铃铛
   * 换回宿主视图时把这档还回去。分组记在 previousGroup 里，应用被意外关掉时由
   * localStorage 里那份接着记。
   */
  function flatten() {
    const store = viewNow()
    if (store === null || store === undefined) return
    if (typeof store.getSnapshot !== 'function' || typeof store.actions?.setGroupBy !== 'function') return
    const group = store.getSnapshot().groupBy
    if (group === 'flat') return
    previousGroup = group
    rememberGroup(group)
    store.actions.setGroupBy('flat')
  }

  /** 工作区标签：插在行内按钮前面，太长由样式表省略。 */
  function dress(seat: Seat, title: string) {
    const row = seat.row
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
    if (disposed) return
    // 还原必须排在压平之前：应用上次在日期视图里被关掉时，宿主记下的是扁平，
    // 读者自己的分组只剩这份备份。反过来做会把刚压平的列表又展开。
    healLeftover()
    if (!dateMode) return
    // 已归档的会话不按日期分：那是读者回头翻旧账的地方，日期段落只属于进行中。
    if (archivedView()) {
      calm()
      return
    }
    document.body.removeAttribute(ARCHIVED_ATTRIBUTE)
    flatten()
    const { titles, ready } = workspacesById()
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
      // 归属答全之后仍不属于任何工作区的会话让开：日期段落说的是哪天聊过哪件事，
      // 一条没有归属的会话落进来只是噪音。归属还没答出来的时候一行都不藏 ——
      // 拿不到答案不等于没有归属。
      const workspace = titles.get(id)
      if (ready && workspace === undefined) {
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
      dress(seat, workspace === undefined ? '' : workspace)
    }
    for (const [list, seats] of lists) place(list, seats)
  }

  /** 读者现在翻的是已归档吗：宿主的筛选是「只看已归档」或「混着显示」都算。 */
  function archivedView() {
    const store = viewNow()
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
    }
  }

  /**
   * 打开日期视图：切扁平、重排、加标签，标记落到 body 上供样式表和铃铛读。
   * 排版的活留给下一帧：安装时同步读宿主的会话列表，一旦那份服务有问题，安装
   * 会整个抛出去，收尾函数都没能交回来，body 上的标记就留在页面上了。
   */
  function enable() {
    if (dateMode || disposed) return
    dateMode = true
    document.body.setAttribute(MODE_ATTRIBUTE, '')
    followLists()
    schedule()
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
    const store = viewNow()
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

  /**
   * 请调度器在下一帧跑一遍。排版读宿主的会话与工作区列表，那份服务出问题时应当
   * 算作本特性的一次失败：调度器把它的 sync 单独包住，重试到上限后把本特性摘掉、
   * 交回收尾，页面上的标记不会留在一个已经停下来的特性后面。
   */
  function schedule() {
    ui.schedule?.()
  }

  /**
   * 会话与工作区两张列表的出现晚于本特性的安装：第一遍读到它们时接上订阅。
   * 更新时间变了，段落边界可能跟着变（跨零点的那一帧）；会话换了归属、工作区改名，
   * 行右手的标签也要跟着换。
   */
  let sessionList: HostSessionsService['list'] | null = null
  let workspaceList: HostWorkspacesService['list'] | null = null
  let unsubscribe: (() => void) | null = null
  let unsubscribeWorkspaces: (() => void) | null = null
  function followLists() {
    const listing = sessionsNow()?.list
    if (listing !== undefined && listing !== sessionList) {
      unsubscribe?.()
      sessionList = listing
      unsubscribe = typeof listing.subscribe === 'function' ? listing.subscribe(() => schedule()) : null
    }
    const shelf = workspacesNow()?.list
    if (shelf !== undefined && shelf !== workspaceList) {
      unsubscribeWorkspaces?.()
      workspaceList = shelf
      unsubscribeWorkspaces = typeof shelf.subscribe === 'function' ? shelf.subscribe(() => schedule()) : null
    }
  }

  /** 侧栏里的每一行会话，宿主随时可能整批重画。 */
  const rows = observeMatches<HTMLElement>(SESSION_ROW_SELECTOR, schedule)
  /** 行被换掉、列表被重画、段落被宿主挤掉：都只算侧栏里的变化，跟着重排一遍。 */
  const stopWatch = watchSidebar(schedule)

  /**
   * 自愈：上次若是在日期视图里关掉应用的，宿主记下的是扁平，这里还成读者原来的分组，
   * 铃铛换回宿主视图时才有正确的目标可还。视图 store 晚于安装出现，所以在每一遍里等
   * 它出现后做一次，并且排在压平之前。
   */
  let healed = false
  function healLeftover() {
    if (healed) return
    const store = viewNow()
    if (store === null) return
    healed = true
    const leftover = rememberedGroup()
    if (leftover === null) return
    const group = typeof store.getSnapshot === 'function' ? store.getSnapshot().groupBy : null
    if (group === 'flat' && typeof store.actions?.setGroupBy === 'function') store.actions.setGroupBy(leftover)
    forgetGroup()
  }

  followLists()
  healLeftover()

  /** 关掉视图再拆：分组还回去，我们插的节点收走。两处调用（调度器摘掉本特性、页面卸载）共用这一份。 */
  function teardown() {
    if (disposed) return
    disable()
    document.removeEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
    globalThis.removeEventListener('pagehide', onPageHide)
    disposed = true
    stopWatch()
    rows.release()
    if (unsubscribe !== null) unsubscribe()
    if (unsubscribeWorkspaces !== null) unsubscribeWorkspaces()
    document.body.removeAttribute(MODE_ATTRIBUTE)
    for (const node of mine) if (node.isConnected) node.remove()
    mine.clear()
    const store = viewNow()
    if (previousGroup !== null && store !== null && store !== undefined && typeof store.actions?.setGroupBy === 'function') {
      store.actions.setGroupBy(previousGroup)
    }
  }

  ui.dateGroups = { sync: arrange, skipOnContentOnly: true, teardown }

  // 日期视图是默认的那一档：装上就排成日期段落，读者按下铃铛才换回宿主的视图。
  enable()
  document.addEventListener(DATE_VIEW_TOGGLE_EVENT, onToggle)
  // 页面关掉时还在日期视图里：先把分组还回去，别把扁平留在宿主的存储里。
  globalThis.addEventListener('pagehide', onPageHide)

  return teardown
}
