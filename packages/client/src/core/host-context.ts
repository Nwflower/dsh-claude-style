import type { HostContext } from '@dsh-claude-style/engine/host'
import { resetIdentity } from '../shared/identity'

export let hostCtx: HostContext | null = null

export function setHostContext(ctx: HostContext | null) {
  hostCtx = ctx
  resetIdentity()
}
