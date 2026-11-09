import { MODEL_ACCOUNT_GROUP } from './model-labels'
import { copy } from './copy'

/** The account route's English display name is replaced with localized copy. */
export function modelGroupName(id: string, name?: string): string {
  if (id === MODEL_ACCOUNT_GROUP) return copy('accountLabel')
  return name || id
}
