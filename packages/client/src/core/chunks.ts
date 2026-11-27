import { CHUNK_MODULES, importChunk } from 'virtual:dsh-claude-style/chunk-modules'
import { createChunkLoader } from '@dsh-claude-style/engine/chunks'
import { PACKAGE_NAME } from '../constants'
import type { FeatureInstall } from './feature'

const chunks = createChunkLoader<FeatureInstall>({ packageName: PACKAGE_NAME, modules: CHUNK_MODULES, importChunk })

/** Reject with the chunk's file name when loading or its body fails (D76). */
export function loadFeatureChunk(fileName: string): Promise<FeatureInstall> {
  return chunks.load(fileName)
}
