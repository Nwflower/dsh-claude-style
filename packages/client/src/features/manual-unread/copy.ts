import { featureCopy } from '../../core/i18n'
import entries from './manual-unread.copy.json'

export const copy = (key: keyof typeof entries) => featureCopy(entries, key)
