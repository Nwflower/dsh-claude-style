/** Live configuration reader for host-side workspace checkpoints (D73). */
import { isAbsolute, resolve } from 'node:path'
import {
  PREFS,
  REWIND_STORAGE_DIR_MAX,
  rewindStorageLimitBytes,
} from '@dsh-claude-style/contracts/prefs'
import type { DshContext } from '@dsh-claude-style/engine/node/dsh'
import { pluginPath } from './harness-home.js'

export type HostConfigSource = Record<string, unknown> | undefined

export interface RewindRuntimeConfig {
  /** Whether new turn checkpoints should be recorded at all. */
  checkpointsEnabled: boolean
  /** Maximum total bytes retained across objects/ and captures/. */
  storageLimitBytes: number
  /** Active storage directory for objects/, captures/ and temporary indexes. */
  storageDir: string
}

function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && typeof (value as { get?: unknown }).get === 'function') {
    return (value as { get(): unknown }).get()
  }
  return value
}

function configRecord(ctx: DshContext, config: HostConfigSource): Record<string, unknown> | null {
  if (config !== null && config !== undefined && typeof config === 'object') return config
  const options = ctx.fiber?.entry?.options
  if (options !== null && options !== undefined && typeof options === 'object') {
    const nested = (options as { config?: unknown }).config
    if (nested !== null && nested !== undefined && typeof nested === 'object') {
      return nested as Record<string, unknown>
    }
  }
  return null
}

function readField(ctx: DshContext, config: HostConfigSource, key: string): unknown {
  const source = configRecord(ctx, config)
  if (source === null || !(key in source)) return undefined
  return unwrap(source[key])
}

export function readRewindConfig(ctx: DshContext, config: HostConfigSource, fallbackStorage?: string): RewindRuntimeConfig {
  const defaultStorage = fallbackStorage ?? pluginPath(ctx, 'rewind')
  const rawMessageActions = readField(ctx, config, 'messageActions')
  const messageActions = typeof rawMessageActions === 'boolean' ? rawMessageActions : PREFS.messageActions.default
  const rawCheckpoints = readField(ctx, config, 'rewindCheckpoints')
  const rewindCheckpoints = typeof rawCheckpoints === 'boolean' ? rawCheckpoints : PREFS.rewindCheckpoints.default
  const rawLimit = readField(ctx, config, 'rewindStorageLimit')
  const limitValue = typeof rawLimit === 'string' ? rawLimit : PREFS.rewindStorageLimit.default
  const rawDir = readField(ctx, config, 'rewindStorageDir')
  const trimmedDir = typeof rawDir === 'string' ? rawDir.trim().slice(0, REWIND_STORAGE_DIR_MAX).trim() : ''
  const storageDir = trimmedDir !== '' && isAbsolute(trimmedDir) ? resolve(trimmedDir) : defaultStorage
  return {
    checkpointsEnabled: messageActions && rewindCheckpoints,
    storageLimitBytes: rewindStorageLimitBytes(limitValue),
    storageDir,
  }
}
