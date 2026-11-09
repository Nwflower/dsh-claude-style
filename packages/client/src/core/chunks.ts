import { CHUNK_MODULES } from 'virtual:dsh-claude-style/chunk-modules'
import { createChunkLoader } from '@dsh-claude-style/engine/chunks'
import { PACKAGE_NAME } from '../constants'
import type { FeatureInstall } from './feature'

const chunks = createChunkLoader<FeatureInstall>({ packageName: PACKAGE_NAME, modules: CHUNK_MODULES })

/** Reject with the chunk address when loading or its factory fails (D72). */
export function loadFeatureChunk(url: string): Promise<FeatureInstall> {
  return chunks.load(url)
}
