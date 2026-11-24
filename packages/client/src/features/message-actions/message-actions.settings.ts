import * as React from 'react'
import { REWIND_STORAGE_DIR_MAX } from '../../constants'
import { copy } from './message-actions-copy'
import type { SettingsControlsOf, SettingsRowView } from '../../core/feature'
import type manifest from './message-actions.manifest'

export const controls: SettingsControlsOf<typeof manifest> = {
  'rewind-storage-dir': RewindStorageDirInput,
}

function RewindStorageDirInput({ prefs, write, disabled }: SettingsRowView) {
  const [draft, setDraft] = React.useState(prefs.rewindStorageDir)
  const composing = React.useRef(false)

  React.useEffect(() => {
    setDraft(prefs.rewindStorageDir)
  }, [prefs.rewindStorageDir])

  const commit = (raw: string) => {
    const trimmed = raw.trim().slice(0, REWIND_STORAGE_DIR_MAX).trim()
    setDraft(trimmed)
    if (trimmed !== prefs.rewindStorageDir) write({ rewindStorageDir: trimmed })
  }

  return React.createElement('input', {
    type: 'text',
    className: 'dsh-claude-settings-input',
    value: draft,
    maxLength: REWIND_STORAGE_DIR_MAX,
    placeholder: copy('rewindStorageDirPlaceholder'),
    disabled,
    spellCheck: false,
    autoComplete: 'off',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value)
    },
    onCompositionStart: () => {
      composing.current = true
    },
    onCompositionEnd: (event: React.CompositionEvent<HTMLInputElement>) => {
      composing.current = false
      setDraft(event.currentTarget.value)
    },
    onBlur: () => {
      if (!composing.current) commit(draft)
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !composing.current) {
        event.preventDefault()
        commit(draft)
      } else if (event.key === 'Escape') {
        setDraft(prefs.rewindStorageDir)
      }
    },
  })
}
