/* The copy document is fetched from MODEL_COPY_ROUTE so catalog copy can change without a rebuild;
   MODEL_COPY_FALLBACK_LOCALE is the locale read when the document names none of its own. */
/** The account group becomes the default when the API-key route advertises no official models. */
export { ACCOUNT_MODEL_GROUP as MODEL_ACCOUNT_GROUP, OFFICIAL_MODEL_GROUP as MODEL_OFFICIAL_GROUP } from '@dsh-claude-style/contracts/services'
import { ROUTE_PREFIX } from '@dsh-claude-style/contracts/routes'
export const MODEL_COPY_ROUTE = `${ROUTE_PREFIX}/model-descriptions.json`
export const MODEL_COPY_FALLBACK_LOCALE = 'en'
export const MODEL_EFFORT_DEFAULT = 'Default'
export const MODEL_EFFORT_NONE = '—'
