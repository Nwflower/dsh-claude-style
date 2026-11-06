import { installScheduler as installEngineScheduler } from '@dsh-claude-style/engine/scheduler'
import type { FeatureHandle, SchedulerCalls } from '@dsh-claude-style/engine/scheduler'
import { onHdslLoaded, onUsernameLoaded } from '../shared/identity'
import { onModelCopyLoaded } from '../features/model/model-copy'
import { loadPrefs, refreshMotionAttribute, subscribePrefs } from './prefs'
import type { HostContext } from '@dsh-claude-style/engine/host'
import type { FooterHandle } from '../features/account/account-footer'
import type { BanHandle } from '../features/ban-screen/ban-screen'
import type { ChatFoldHandle } from '../features/chat-fold/chat-fold'
import type { ComposerHandle } from '../features/composer/composer'
import type { ChatSendHandle } from '../features/chat-send/send-flight'
import type { MeterRingHandle } from '../features/context-stats/meter-ring'
import type { ModelHandle } from '../features/model/model-picker'
import type { PeakRateHandle } from '../features/peakrate/peakrate'
import type { QuickProvidersHandle } from '../features/settings/quick-providers'

/**
 * Every feature's handle, under the name it registers on `ui` (its manifest's
 * `handle`, or its `id`). A feature that other features read publishes a
 * handle type of its own; the others are plain scheduler hooks.
 */
export interface Handles {
  brand: FeatureHandle
  composer: ComposerHandle
  homeLayout: FeatureHandle
  homeRipple: FeatureHandle
  mascot: FeatureHandle
  permissions: FeatureHandle
  contextStats: FeatureHandle
  meterRing: MeterRingHandle
  model: ModelHandle
  peakrate: PeakRateHandle
  effort: FeatureHandle
  heroMenu: FeatureHandle
  quickProviders: QuickProvidersHandle
  footer: FooterHandle
  ban: BanHandle
  workspace: FeatureHandle
  search: FeatureHandle
  sidebarPeek: FeatureHandle
  sidebarStatus: FeatureHandle
  sessionActions: FeatureHandle
  manualUnread: FeatureHandle
  sidebarEntries: FeatureHandle
  turnNav: FeatureHandle
  chatFollow: FeatureHandle
  chatFold: ChatFoldHandle
  processColumn: FeatureHandle
  chatWait: FeatureHandle
  chatReveal: FeatureHandle
  chatAnchor: FeatureHandle
  chatFiles: FeatureHandle
  chatSend: ChatSendHandle
  caret: FeatureHandle
  viewTabs: FeatureHandle
  headerBand: FeatureHandle
  rightbarFit: FeatureHandle
  bottomPanelFit: FeatureHandle
  conversationWidth: FeatureHandle
  rowSkip: FeatureHandle
  sessionTitle: FeatureHandle
  settingsNav: FeatureHandle
  sodium: FeatureHandle
  surface: FeatureHandle
  activeFirst: FeatureHandle
  activeShelf: FeatureHandle
  dateGroups: FeatureHandle
}

export type HandleName = keyof Handles

/**
 * The whole registry, as entry.ts and the scheduler hold it: each installed
 * feature's handle under its handle name. A feature sees only its own part of
 * it (FeatureUi in core/feature.ts): its handle and the ones its manifest
 * `reads`.
 */
export type Ui = SchedulerCalls & { [K in HandleName]?: Handles[K] }

/** Run the engine's scheduler over this skin's features, listening to the sources that change what they show. */
export function installScheduler(ctx: HostContext, ui: Ui, features: HandleName[]) {
  return installEngineScheduler<HandleName>(ctx, ui, features, {
    copyChange: [subscribePrefs, onModelCopyLoaded],
    refresh: [onUsernameLoaded, onHdslLoaded],
    start: loadPrefs,
    systemMotionChanged: refreshMotionAttribute,
  })
}
