import { CHAT_FLOW_SLOT_SELECTOR, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_RESPONSE, CHAT_NODE_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_STEERING_BATCH_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, PENDING_STEERING_SELECTOR, SUBMISSION_ECHO_SELECTOR, TURN_PROCESS_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { keepFlowChildMark } from './flow-items'
import type { SelectorRewrite } from '@dsh-claude-style/engine/sheet-rewrite'
import { firstShape, selectorShape } from './selector-shape'

/**
 * The sodium table (D78): who ships the costly rules, from which release the
 * shapes below were checked, and how each is rewritten.
 *
 * The host itself is a member like any plugin: its interface is the built-in
 * plugins, which ship with the host and share its release. A member whose
 * release cannot be read takes no part.
 */
export interface SodiumMember {
  /** The name the settings tooltip shows the member under: the host's, or the package's. */
  readonly id: string
  /** Where the member's release is read: the host's boot graph, or the profile's bundle list for a plugin. */
  readonly release: 'host' | 'bundle'
  /** The lowest release the shapes were checked on; every later one is included. */
  readonly since: string
  readonly adapters: readonly SodiumAdapter[]
}

/** The rules of one sheet the table rewrites, and what keeps their replacements true. */
export interface SodiumAdapter extends SelectorRewrite {
  /** Stable name, for the specs. */
  readonly id: string
  /** The sheet as the loader tags it: the owning package, and the sheet's own path in that package. */
  readonly owner: string
  readonly sheet: string
  /**
   * Keep the attributes the rewritten rules read true, for the owner's classes
   * their selectors named, by role.
   * @returns stop: the attributes come off the page.
   */
  maintain(captured: ReadonlyMap<string, readonly string[]>): () => void
}

/** The mark the rewritten flow rules read (flow-items.ts). */
const FLOW_CHILD_ATTR = 'data-dsh-claude-flow-child'

/*
 * The host chat module's gap rules, as the browser serializes them. Their
 * subject is "a visible item that is not empty", a compound with no class, tag
 * or attribute for the browser to bucket the rule under, so every change has to
 * try the whole page against them. The replacement spreads that subject over
 * the flow's children by what the host puts on each one when it creates it — a
 * flow block, the running line, a submission's echo, a steering bubble, the
 * flow slot — so only those are tried, and a child is tried from the moment it
 * exists: the host inserts one and reads the layout in the same task (D78). The
 * flow-child mark the keeper writes catches a child of any other kind, from its
 * observer on.
 *
 * Each branch weighs what the subject weighed: `[hidden]` joins the empty test
 * in one `:not()`, which counts only the heavier of the two, and the key takes
 * the place that frees. Every key stands on a child of the column or the flow
 * slot, so the branches together select what the subject selected there.
 *
 * A rule is rewritten by the shape that matches the sheet on the page, and a
 * sheet that matches none keeps its own rules.
 */
const FLOW = CHAT_FLOW_SLOT_SELECTOR
const EMPTY = `.{item}:is(:empty, :has(> ${CHAT_NODE_SELECTOR}:empty))`
/** The visible item as the flow's rules name it: not hidden, and not an empty seat. */
const VISIBLE = `:not([hidden]):not(${EMPTY})`
/**
 * The visible item as the column's rule names it: the host's text-interaction
 * surface stands in the column beside the flow, and that rule leaves it out.
 */
const SURFACE_VISIBLE = `:not([hidden]):not(.{textInteraction}):not(${EMPTY})`
/** The running line is not the row the gap follows. */
const NOT_RUNNING = ':not(.{running})'
/** A steering batch the host admits under one claim is not the row the gap follows. */
const NOT_BATCH = `:not(:has(> ${CHAT_NODE_SELECTOR} > ${CHAT_STEERING_BATCH_SELECTOR}))`
/** An opening input of the turn keeps its own spacing. */
const NOT_OPENING = `:not(${SUBMISSION_ECHO_SELECTOR}, ${PENDING_STEERING_SELECTOR})`
const SCOPE = `:is(.{column}, ${FLOW})`
const SUBJECT_KEYS = [FLOW_BLOCK_SELECTOR, CHAT_RUNNING_SELECTOR, SUBMISSION_ECHO_SELECTOR, PENDING_STEERING_SELECTOR, FLOW, `[${FLOW_CHILD_ATTR}]`]

/**
 * The clauses a subject carries after the visible test, longest first: the
 * spread has to carry the same clauses over, and a subject whose clauses are
 * none of these is not one of the host's.
 */
const TAILS: readonly string[] = [
  `${NOT_RUNNING}${NOT_OPENING}${NOT_BATCH}`,
  `${NOT_RUNNING}${NOT_BATCH}`,
  NOT_RUNNING,
  '',
]

/** The visible subjects the host's rules end in, longest first. */
const SUBJECTS: readonly string[] = [SURFACE_VISIBLE, VISIBLE]

/**
 * One gap rule, given as its complex selectors: each that ends in the visible
 * subject is spread over the subject keys, the rest stand as written.
 *
 * The spread has to weigh what the subject weighed. The subject's own weight
 * is a class per clause it stands in, and the key that replaces it gives one
 * back: the empty test and the hidden test share one `:not()`, which counts
 * only the heavier of the two. The column's rule stands one clause more — the
 * text-interaction surface — and that clause keeps its own `:not()`, for a
 * second `:not()` of its own would count no more than the one it shares.
 */
function gapRule(complexes: readonly string[]) {
  const spread = complexes.flatMap((complex) => {
    for (const subject of SUBJECTS) {
      const at = complex.lastIndexOf(subject)
      if (at < 0) continue
      const tail = complex.slice(at + subject.length)
      if (!TAILS.includes(tail)) continue
      const head = complex.slice(0, at)
      // The surface the column's rule leaves out is left out of the spread's
      // own subject as well: the flow-child mark stands on that surface too.
      const skip = subject === SURFACE_VISIBLE ? ':not(.{textInteraction})' : ''
      return SUBJECT_KEYS.map((key) => `${head}${key}:not([hidden], ${EMPTY})${skip}${tail}`)
    }
    return [complex]
  })
  return selectorShape(complexes.join(', '), spread.join(', '))
}

/** The gap above every visible item after the first, and above the first one after older turns. */
const GAP = gapRule([`${SCOPE} > ${SURFACE_VISIBLE} ~ ${SURFACE_VISIBLE}`, `.{column} > .{older} + ${FLOW} > ${SURFACE_VISIBLE}`])
/** The wider gap after a step's output. */
const GAP_AFTER_RESPONSE = gapRule([`.{item}[${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"]`, `${SCOPE} > [${CHAT_GROUP_PART_ATTRIBUTE}="${CHAT_GROUP_PART_RESPONSE}"]:not([hidden]):not(:empty) + ${VISIBLE}${NOT_RUNNING}${NOT_BATCH}`])
/** The widest gap, after a turn's process group. */
const GAP_AFTER_PROCESS = gapRule([
  `.{item}[${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"]`,
  `${SCOPE} > [${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"]:not(:empty, :has(> ${CHAT_NODE_SELECTOR}:empty)) + ${VISIBLE}${NOT_RUNNING}${NOT_BATCH}`,
  `${SCOPE} > [${FLOW_KIND_ATTRIBUTE}="${TURN_PROCESS_ROW_KIND}"] + ${VISIBLE}${NOT_RUNNING}${NOT_OPENING}${NOT_BATCH}`,
])

const CHAT_FLOW: SodiumAdapter = {
  id: 'chat-flow',
  owner: '@deepseek-ai/dsh-client-ui-chat',
  sheet: '@deepseek-ai/dsh-client-ui-chat/ChatView.module.css',
  rewrite: firstShape([GAP, GAP_AFTER_RESPONSE, GAP_AFTER_PROCESS]),
  maintain: (captured) => keepFlowChildMark(captured.get('column') ?? [], FLOW_CHILD_ATTR),
}

export const SODIUM_MEMBERS: readonly SodiumMember[] = [
  { id: 'DeepSeek Harness', release: 'host', since: '0.2.2-alpha.3', adapters: [CHAT_FLOW] },
]
