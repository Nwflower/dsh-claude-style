import COPY from './date-groups.copy.json'
import { createCopy } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

/**
 * 本功能自己的界面文字（packages/client/src/features/date-groups/date-groups.copy.json）：
 * 文案跟着 bundle 走，第一帧就有，键名只在这份文件里成立。
 */
export const copy = createCopy(COPY)
