/* Descriptions are fetched from MODEL_COPY_ROUTE so catalog copy can change without a rebuild.
   The English constants are fallbacks before that document arrives or when its fetch fails. */
/** The account group becomes the default when the API-key route advertises no official models. */
export { ACCOUNT_MODEL_GROUP as MODEL_ACCOUNT_GROUP, OFFICIAL_MODEL_GROUP as MODEL_OFFICIAL_GROUP } from '@dsh-claude-style/contracts/services'
export const MODEL_COPY_ROUTE = '/dsh-claude-style/model-descriptions.json'
export const MODEL_COPY_FALLBACK_LOCALE = 'en'
export const MODEL_FALLBACK_LABEL = 'Select model'
export const MODEL_LOADING_LABEL = 'Loading models…'
export const MODEL_EMPTY_LABEL = 'No models available.'
export const MODEL_EFFORT_LABEL = 'Reasoning effort'
export const MODEL_EFFORT_DEFAULT = 'Default'
/** Axis labels stay English in every locale; the localized level name appears beside them. */
export const MODEL_EFFORT_FASTER = 'Faster'
export const MODEL_EFFORT_SMARTER = 'Smarter'
export const MODEL_EFFORT_NONE = '—'
export const MODEL_MORE_LABEL = 'More models'
export const MODEL_TRIGGER_LABEL = 'Select model, currently {model}'
