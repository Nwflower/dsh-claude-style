/**
 * Claude-flavored presentation of the permission presets, keyed by preset
 * id. The host's catalog decides WHICH presets a deployment offers — a
 * third-party plugin's ride in it, the auto mode plugin's `auto-mode` among
 * them — and this table decides how a known one reads. A preset the table
 * does not know falls back to the name and line the catalog carries, so
 * nothing the host offers is ever hidden and a machine id is never shown.
 */
export const PERMISSION_PRESETS: Record<string, { label: string, desc: Readonly<Record<string, string>> }> = {
  'read-only': {
    label: 'Read only',
    desc: { zh: '仅读取文件与分析，不修改代码', en: 'Read files and analyze them without changing code' }
  },
  'workspace-write': {
    label: 'Accept edits',
    desc: { zh: '允许编辑工作区文件', en: 'Allow edits to files in the workspace' }
  },
  'auto-mode': {
    label: 'Auto mode',
    desc: { zh: '规则放行常规操作，其余由分类器裁决', en: 'Allow routine operations; a classifier decides the rest' }
  },
  'auto': {
    label: 'Auto review',
    desc: { zh: '无沙箱运行，调用前由模型审查', en: 'Run without a sandbox; the model reviews each call first' }
  },
  'danger-full-access': {
    label: 'Full access',
    desc: { zh: '自动执行，无需反复确认', en: 'Run everything without repeated confirmation' }
  }
}

/**
 * The skin's own Chinese name for a tier the host's dictionary carries without
 * one: its `auto.label` reads "Auto review" in every language, so a Chinese
 * interface would otherwise show one English name among Chinese ones. A tier
 * the host translates is never overridden (D43).
 */
export const PERMISSION_CHINESE_LABELS: Record<string, string> = { 'auto': '自动审查' }

/**
 * The control's segments, in slot order. Each slot lists the presets it may
 * bind to, best first: the deployment's own auto tier wins the slot over the
 * host's built-in Auto review, and a slot none of whose presets the host
 * offers is not drawn at all.
 */
export const PERMISSION_SEGMENTS = [
  { label: 'Read', presets: ['read-only'] },
  { label: 'Edit', presets: ['workspace-write'] },
  { label: 'Auto', presets: ['auto-mode', 'auto'] },
  { label: 'Yolo', presets: ['danger-full-access'] }
]

/**
 * The host's own tier names, keyed by preset id: its `permission.access`
 * dictionary holds the original Chinese names a Chinese interface shows
 * instead of a translation of Claude's own (D43).
 */
export const PERMISSION_ACCESS_NAMESPACE = 'permission.access'
export const PERMISSION_HOST_LABEL_KEYS: Record<string, string> = {
  'read-only': 'preset.readOnly',
  'workspace-write': 'preset.workspaceWrite',
  'auto': 'auto.label',
  'danger-full-access': 'preset.fullAccess'
}
/** The interface languages whose tier names come from that dictionary. */
export const PERMISSION_HOST_LABEL_LOCALE = 'zh'

/** Popover row order; a preset the host offers but this list does not know follows in catalog order. */
export const PERMISSION_ORDER = ['read-only', 'workspace-write', 'auto-mode', 'auto', 'danger-full-access']

/**
 * What the control draws before the host's first catalog read settles: the
 * shipped built-ins, with the auto slot left out the way the shipped picker
 * renders nothing until its own catalog arrives.
 */
export const PERMISSION_SHIPPED_PRESETS = ['read-only', 'workspace-write', 'danger-full-access']

/**
 * Names for host values that are never switch targets. `custom` is the
 * host's own word for knob settings that match no preset, so the trigger
 * reads that rather than the machine value.
 */
export const PERMISSION_CURRENT_LABELS: Record<string, string> = { custom: 'Custom' }
