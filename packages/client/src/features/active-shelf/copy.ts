import COPY from './active-shelf.copy.json'
import { createCopy } from '../../core/i18n'

export type CopyKey = keyof typeof COPY

/**
 * 本功能自己的界面文字（packages/client/src/features/active-shelf/active-shelf.copy.json）：
 * 只有两枚按钮的无障碍名字，文案跟着 bundle 走，第一帧就有。
 */
export const copy = createCopy(COPY)
