import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostModelDirectory } from '@dsh-claude-style/contracts/services'
import type { FeatureUi } from '../../core/feature'
import { install as installModel } from './model-picker'
import type modelManifest from './model-picker.manifest'
import { install as installEffort } from '../effort/effort-picker'
import type effortManifest from '../effort/effort-picker.manifest'

declare module '../../core/external-controls' {
  interface ClaudeControlMountMap {
    'model-picker': { slot: HTMLElement, directory: HostModelDirectory, disabled?: boolean }
  }
}

type ExternalUi = FeatureUi<typeof modelManifest> & FeatureUi<typeof effortManifest>
let nextOwner = 0

/** Mount the model and effort controls as one independent selection without taking over the composer's seat. */
export function mountModelPicker(ctx: HostContext, options: { slot: HTMLElement, directory: HostModelDirectory, disabled?: boolean }): () => void {
  const { slot, directory, disabled } = options
  slot.setAttribute('data-dsh-claude-external-control', 'model-picker')
  const owner = `external-${++nextOwner}`
  const ui: ExternalUi = {
    schedule: sync,
    retire(name) { throw new Error(`external model picker has no scheduler feature to retire: ${name}`) },
  }
  let disposed = false
  function sync() {
    if (disposed) return
    ui.model?.sync?.()
    ui.effort?.measure?.()
    ui.effort?.sync?.()
  }
  const stopModel = installModel(ctx, ui, { slot, directory, popoverKey: `model-${owner}`, owner, disabled })
  let stopEffort: (() => void) | void
  try {
    stopEffort = installEffort(ctx, ui, { popoverKey: `effort-${owner}`, owner, disabled })
  } catch (error) {
    stopModel()
    throw error
  }
  sync()
  return () => {
    if (disposed) return
    disposed = true
    if (typeof stopEffort === 'function') stopEffort()
    stopModel()
    slot.removeAttribute('data-dsh-claude-external-control')
  }
}
