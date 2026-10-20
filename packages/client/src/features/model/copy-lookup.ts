import type { HostContext } from '@dsh-claude-style/engine/host'
import type { HostModelEntry } from '@dsh-claude-style/contracts/services'
import { localized } from '../../core/i18n'
import { modelCopy, resolveModelCopy } from './model-copy'

/**
 * The description line for one catalog model, in the shell's language, out of
 * the copy document the host half serves (D5). Resolution descends family rule →
 * tier rule → the catalog's own text; family rules are ordered and anchored, so
 * one product line's rule never claims another's model, and a model the table
 * has never seen answers with the catalog's own line: a name-only row beats an
 * invented one.
 *
 * The identity a rule reads is the model's id and then the display name beside
 * it (D79): a gateway's id is often an opaque alias while the name is the
 * model's own. model-copy.ts::resolveModelCopy owns that order.
 *
 * `ctx` is the caller's context, used only to read the shell's locale.
 */
export function modelDescription(ctx: HostContext | null, groupId: unknown, model: HostModelEntry): string {
  const pair = resolveModelCopy(modelCopy, groupId, model.id, model.name)
  const text = localized(pair, ctx, modelCopy === null ? undefined : modelCopy.fallback)
  if (text) return text
  return typeof model.description === 'string' ? model.description : ''
}
