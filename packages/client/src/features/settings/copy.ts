import COPY from './settings.copy.json'
import { createCopy, featureCopy } from '../../core/i18n'
import type { CopyParams } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

export const copy = createCopy(COPY)

/** Shared settings copy stays in this feature's bundle (D72). */
export function sharedLine(key: string, params?: CopyParams) {
  return featureCopy(COPY, key, params)
}
