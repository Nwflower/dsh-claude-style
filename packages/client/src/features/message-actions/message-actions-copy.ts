import { createCopy } from '../../core/i18n'
import COPY from './message-actions.copy.json'

/** One copy reader shared by the action row, confirmation and revision history. */
export const copy = createCopy(COPY)
