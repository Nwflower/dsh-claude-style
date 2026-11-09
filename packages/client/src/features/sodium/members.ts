import { CHAT_FLOW_SLOT_SELECTOR, CHAT_GROUP_PART_ATTRIBUTE, CHAT_GROUP_PART_RESPONSE, CHAT_NODE_SELECTOR, CHAT_RUNNING_SELECTOR, CHAT_STEERING_BATCH_SELECTOR, FLOW_BLOCK_SELECTOR, FLOW_KIND_ATTRIBUTE, PENDING_STEERING_SELECTOR, SUBMISSION_ECHO_SELECTOR, TURN_PROCESS_ROW_KIND } from '@dsh-claude-style/contracts/dom'
import { keepFlowChildMark } from './flow-items'
import type { SelectorRewrite } from '@dsh-claude-style/engine/sheet-rewrite'
import { firstShape, selectorShape } from './selector-shape'

/** Sodium rewrite table (D78): members, checked releases and their adapters. */
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
  /** Keep the rewritten rules' attributes true; the returned function removes them. */
  maintain(captured: ReadonlyMap<string, readonly string[]>): () => void
}

/** The mark the rewritten flow rules read (flow-items.ts). */
const FLOW_CHILD_ATTR = 'data-dsh-claude-flow-child'

/*
 * Replace the host chat gap rule's unfilterable subject with a key per flow
 * child, starting when each child is created (D78). Coverage includes a
 * flow-child mark for later children. Specificity is preserved by combining the
 * hidden and empty tests in one `:not()`. Unmatched sheets keep their rules.
 */
const FLOW = CHAT_FLOW_SLOT_SELECTOR
const EMPTY = `.{item}:is(:empty, :has(> ${CHAT_NODE_SELECTOR}:empty))`
/** The visible item as the flow's rules name it: not hidden, and not an empty seat. */
const VISIBLE = `:not([hidden]):not(${EMPTY})`
/** Column's visible subject, excluding the text-interaction surface beside the flow. */
const SURFACE_VISIBLE = `:not([hidden]):not(.{textInteraction}):not(${EMPTY})`
/** The running line is not the row the gap follows. */
const NOT_RUNNING = ':not(.{running})'
/** A steering batch the host admits under one claim is not the row the gap follows. */
const NOT_BATCH = `:not(:has(> ${CHAT_NODE_SELECTOR} > ${CHAT_STEERING_BATCH_SELECTOR}))`
/** An opening input of the turn keeps its own spacing. */
const NOT_OPENING = `:not(${SUBMISSION_ECHO_SELECTOR}, ${PENDING_STEERING_SELECTOR})`
const SCOPE = `:is(.{column}, ${FLOW})`
const SUBJECT_KEYS = [FLOW_BLOCK_SELECTOR, CHAT_RUNNING_SELECTOR, SUBMISSION_ECHO_SELECTOR, PENDING_STEERING_SELECTOR, FLOW, `[${FLOW_CHILD_ATTR}]`]

/** Recognised trailing clauses, longest first; others are not the host's subject. */
const TAILS: readonly string[] = [
  `${NOT_RUNNING}${NOT_OPENING}${NOT_BATCH}`,
  `${NOT_RUNNING}${NOT_BATCH}`,
  NOT_RUNNING,
  '',
]

/** The visible subjects the host's rules end in, longest first. */
const SUBJECTS: readonly string[] = [SURFACE_VISIBLE, VISIBLE]

/**
 * Spread a gap rule over the subject keys while preserving its specificity;
 * unmatched selectors stay as written.
 */
function gapRule(complexes: readonly string[]) {
  const spread = complexes.flatMap((complex) => {
    for (const subject of SUBJECTS) {
      const at = complex.lastIndexOf(subject)
      if (at < 0) continue
      const tail = complex.slice(at + subject.length)
      if (!TAILS.includes(tail)) continue
      const head = complex.slice(0, at)
      // The flow-child mark also stands on the excluded text-interaction surface.
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
