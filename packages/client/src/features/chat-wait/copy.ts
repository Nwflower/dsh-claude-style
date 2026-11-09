import COPY from './chat-wait.copy.json'
import { createCopy, featureCopy } from '../../core/i18n'
import type { CopyParams } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

export const copy = createCopy(COPY)

/** Shared state carries untyped keys; an unknown key remains visible to expose a stale copy table. */
export function copyState(key: string, params?: CopyParams) {
  return featureCopy(COPY, key, params)
}
