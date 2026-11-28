import { localized } from '../core/i18n'
import { MODEL_ACCOUNT_GROUP } from './model-labels'

const ACCOUNT_LABEL = { zh: 'DeepSeek 账号', en: 'DeepSeek Account' } as const

/** The account route's English display name is replaced with localized copy. */
export function modelGroupName(id: string, name?: string): string {
  if (id === MODEL_ACCOUNT_GROUP) return localized(ACCOUNT_LABEL)
  return name || id
}
