import COPY from './surface.copy.json'
import { createCopy } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

export const copy = createCopy(COPY)
