/**
 * The browser half's declared logic surface (D77): the functions the logic layer
 * of the specs (packages/testing/specs/logic/) may call below the page, and the
 * one stylesheet a placement function measures against.
 *
 * An entry here answers from its arguments alone — numbers, strings, snapshots
 * the host hands over, or DOM nodes passed in — and keeps nothing between calls
 * beyond what it returns. Everything else a feature does is reached through
 * `apply(ctx)` on the built page (packages/testing/specs/behaviour/). A spec
 * names an entry, never a module path, so moving or splitting a module changes
 * this file and no spec.
 *
 * The bundle never carries this module: entry.ts does not import it, and the
 * build's source check stands it aside the way it stands the manifests aside
 * (scripts/build-checks.mjs).
 */

export { resolveMascot } from './core/prefs'
export { accentInk, cssString } from './features/brand/brand'
export { createFooterMirror } from './features/account/footer-mirror'
export { chatFileOperationTitle, chatFileReadCard, chatFileReadEnvelope, chatFileReadMeta } from './features/chat-files/file-row-model'
export type { FileHunk, FileReadCard, FileRowState } from './features/chat-files/file-row-model'
export { byDocumentOrder, createFileMerge, mergeViews, rowCarrier } from './features/chat-files/file-row-merge'
export type { FileMergeRow } from './features/chat-files/file-row-merge'
export { foldExpandedBody } from './features/chat-fold/fold-glide-parts'
export { countProcessItems, summaryForm, summaryParts, summarySeparator, summaryText } from './features/chat-fold/process-summary'
export {
  CHAT_DRAFT_HANDOFF_AT, CHAT_FLIGHT_MS, CHAT_LANDING_MS, CHAT_MAX_TEXT_LAYERS, CHAT_MORPH_END, CHAT_RISE_DAMPING, CHAT_RISE_OMEGA, CHAT_SHAPE_SAMPLES,
  chatSendCornerRadius, chatSendMorphProgress, chatSendRiseProgress, chatSendShadowSpread, chatSendSpringProgress,
  chatSendStepOpacity, chatSendTextWindows,
} from './features/chat-send/send-shape'
export type { ShapeSample } from './features/chat-send/send-shape'
export { chatSendOpaque } from './features/chat-send/send-snapshot'
export { foreignRunningLineOwns } from './features/chat-wait/running-owner'
export { WORD_LOCK_MS, openTurn, waitStart, wordForPass } from './features/chat-wait/wait-state'
export { callTokens } from './features/context-stats/call-tokens'
export { contextBandAt, ringDash } from './features/context-stats/context-meter-face'
export { contextPieImage } from './features/context-stats/context-meter-pie'
export { estimateScale, recordSettlement } from './features/context-stats/estimate-scale'
export { CACHE_HIT_STOPS, CONTEXT_STOPS, RAMP_SPAN_HIGH, RAMP_SPAN_LOW, rampPosition } from './features/context-stats/stats-ramp'
export { textTokens } from './features/context-stats/text-tokens'
export { effortSteps, effortTint, isRankedEffort, orderEffortIds } from './features/effort/ladder'
export type { EffortLadder, EffortStep } from './features/effort/ladder'
export { HEAT_CELL_SELECTOR, HEAT_HINT_CLASS, HEAT_HINT_SHOWN_ATTR, HEAT_HINT_SIDE_ATTR, HEAT_HINT_TEXT_CLASS, HEAT_TIP_ATTR, HEAT_TIP_GAP, hideHeatTip, placeHeatTip, showHeatTip } from './features/home/heat-tip'
export type { HeatTipPlacement } from './features/home/heat-tip'
export { HOME_CHART_LABEL_GAP, homeChartTicks } from './features/home/chart-axis'
export type { HomeChartTick } from './features/home/chart-axis'
export { default as HOME_OVERVIEW_SHEET } from './features/home/home-overview.css?raw'
export { HOME_REFRESH_FLOOR_MS, HOME_REFRESH_MS, homeRefreshDue } from './features/home/usage-refresh'
export type { HomeRefreshReason, HomeUsageAge } from './features/home/usage-refresh'
export { readColour } from './features/home-ripple/ripple-field'
export type { Rgb } from './features/home-ripple/ripple-field'
export { createWaveField } from './features/home-ripple/ripple-wave'
export { mascotLevel } from './features/mascot/mascot-signals'
export type { MascotLevel, MascotReading } from './features/mascot/mascot-signals'
export { EXTRA_MIN_MS, EXTRA_SPAN_MS, MIN_SHOW_MS, MOMENTS, REACTION_PRIORITY, SLEEP_AFTER_MS, decideStage, finishStage, freshStage, nextDecisionAt, switchSettles, takeMoment } from './features/mascot/mascot-stage'
export type { MascotStage, StageSurroundings } from './features/mascot/mascot-stage'
export { indexModelCopy, modelIdentity, resolveModelBrand, resolveModelCopy } from './features/model/model-copy'
export type { ModelCopyIndex } from './features/model/model-copy'
export { levelOneSections } from './features/model/level-one'
export { buildRateBadge, rateDetail, rateName } from './features/peakrate/badge'
export { matchProfile } from './features/peakrate/match'
export { currentRate, forgetRates, formatCountdown } from './features/peakrate/schedule'
export { keepFlowChildMark } from './features/sodium/flow-items'
export { SODIUM_MEMBERS } from './features/sodium/members'
export { versionAtLeast } from './features/sodium/version'
export { PHRASE_TAIL_CHARS, activityPhrase } from './shared/activity-phrase'
export { callDescription } from './shared/turn-activity'
export { captureComposerCaret, composerComposing, focusKeepingComposerCaret } from './shared/composer-caret'
export { fileName, fileToolCall, fileToolOperation } from './shared/file-tool'
export type { FileToolOperation } from './shared/file-tool'
export { clampToViewport, createHoverIntent, resolveAnchoredPosition, setMenuPopoverOpen } from './shared/popover'
export { createSlidingPill } from './shared/sliding-pill'
export { default as SLIDING_PILL_SHEET } from './shared/sliding-pill.css?raw'
export { ACTIVITY_THINKING, activityWords, waitingWord } from './shared/turn-activity'
export { inPageColumns, inPageLength, installFrameColumns } from './shared/page-scale-columns'
export { install as installRowSkip } from './features/row-skip/row-skip'
