import type { HostModelEntry } from '@dsh-claude-style/contracts/services'

/** The host catalog has no release-tag field; match ids so a display-name change does not drop the tag. */
export function releaseTag(provider: string, model: HostModelEntry): string | null {
  if (provider !== 'deepseek-official' && provider !== 'deepseek-account') return null
  return model.id === 'deepseek-flash' ? '1017' : null
}
