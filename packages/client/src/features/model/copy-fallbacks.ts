/**
 * Model picker copy.
 *
 * The copy itself is NOT here. It ships as `model-descriptions.json` beside
 * the bundle, and the browser half fetches it at runtime (the host half
 * serves it under MODEL_COPY_ROUTE), so the model table grows without a
 * rebuild and no copy enters the bundle. The language comes from the shell's
 * own `locale` service — one line per row, in the language the rest of the
 * UI is in — never two languages stacked.
 *
 * The constants below are the neutral fallbacks painted before that document
 * arrives, and kept if it never does. They are English because a failed
 * fetch has no locale to honour.
 */
export const MODEL_OFFICIAL_GROUP = 'deepseek-official'
export const MODEL_COPY_ROUTE = '/dsh-claude-style/model-descriptions.json'
export const MODEL_COPY_FALLBACK_LOCALE = 'en'
export const MODEL_FALLBACK_LABEL = 'Select model'
export const MODEL_LOADING_LABEL = 'Loading models…'
export const MODEL_EMPTY_LABEL = 'No models available.'
export const MODEL_EFFORT_LABEL = 'Reasoning effort'
export const MODEL_EFFORT_DEFAULT = 'Default'
/** The effort slider's two ends. Kept in English in every locale: they name
 *  the axis, not a level, and the level's own name rides beside the label. */
export const MODEL_EFFORT_FASTER = 'Faster'
export const MODEL_EFFORT_SMARTER = 'Smarter'
/** What the slider reads when the model offers no levels at all. */
export const MODEL_EFFORT_NONE = '—'
export const MODEL_MORE_LABEL = 'More models'
export const MODEL_TRIGGER_LABEL = 'Select model, currently {model}'
