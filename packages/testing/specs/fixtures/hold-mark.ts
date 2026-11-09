/**
 * The pieces the part-marking specs share for reading a hold: the relation a
 * stylesheet reads by name, the hold words an element carries, and a chat flow
 * to mount rows in.
 */
import { holdRelations } from '@dsh-claude-style/engine/parts-table'
import type { HoldRelation } from '@dsh-claude-style/engine/parts-table'
import { CHAT_FLOW_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { HOLDS_ATTR } from './vocabulary'

export { pageCleanups } from './page'
export { HOLDS_ATTR, TEST_PARTS } from './vocabulary'
export type { PartsVocabulary } from '@dsh-claude-style/engine/parts'

/** One turn of the event loop, in which the marking pass runs. */
export const settle = () => new Promise((resolve) => { setTimeout(resolve, 0) })

/**
 * The relation a stylesheet reads under this name.
 * @param vocabulary - the vocabulary the specs hand the engine.
 */
export function holdRelation(vocabulary: Parameters<typeof holdRelations>[0], name: string): HoldRelation {
  const relation = holdRelations(vocabulary).find((candidate) => candidate.name === name)
  if (relation === undefined) throw new Error(`no hold relation "${name}"`)
  return relation
}

/** The hold words an element carries, or null when it carries no hold attribute. */
export function holdsOf(element: Element) {
  const value = element.getAttribute(HOLDS_ATTR)
  return value === null ? null : value.split(/\s+/).filter((word) => word !== '')
}

/** Mount the given rows as one box's children inside a chat flow. */
export function rowInFlow(rows: Element[]) {
  const flow = document.createElement('div')
  flow.setAttribute(CHAT_FLOW_SELECTOR.slice(1, -1), '')
  flow.append(...rows)
  document.body.append(flow)
  return flow
}
