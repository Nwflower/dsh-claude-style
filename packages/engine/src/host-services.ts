/**
 * The host's client services, each read here once (D3): a feature asks for what
 * it does with a service, not for the service's name, so a host that renames one
 * is answered here. The ones the contract does not type come back as HostValue.
 */

import type { HostAccountService } from '@dsh-claude-style/contracts/account'
import type { HostAgentTeamsRemote, HostBundleListAnswer, HostChatTarget, HostConfigFormsService, HostConversationService, HostInventoryAnswer, HostLocaleService, HostModelDirectoriesService, HostPluginBundle, HostServiceLookup, HostSession, HostSessionRenameAnswer, HostSessionsService, HostSessionStatusService, HostShortcutsService, HostSidebarPins, HostSlotOptions, HostSlotsService, HostSnapshotSource, HostUiConversationService, HostUiSessionService, HostUiWorkspaceService, HostWorkspacesService, HostWorkspaceViewStore } from '@dsh-claude-style/contracts/services'
// The engine's only runtime import from a host npm package: the host process
// provides it at runtime and the plugin ships no copy (D36).
import { fileAddressFor } from '@deepseek-ai/dsh-util-workspace-path'
import type { HostContext, HostFiber, HostValue } from './host-types'

/** The selected session id, as the host's `uiSession` service publishes it; null while the shell shows none. */
export function currentSessionId(ctx: HostContext): string | null {
  const key = hostUiSession(ctx)?.current?.value?.key
  return typeof key === 'string' ? key : null
}

export function currentSession(ctx: HostContext): HostSession | null {
  const id = currentSessionId(ctx)
  if (id === null) return null
  return sessionById(ctx, id)
}

/** The session the host binds to one id, or null while it binds none. */
export function sessionById(ctx: HostContext, sessionId: string): HostSession | null {
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (sessions === undefined || sessions === null) return null
  const binding = sessions.binding(sessionId)
  if (binding === undefined || binding === null) return null
  return binding.session === undefined ? null : binding.session
}

/**
 * One session's chat target (ui-chat's `chat` target of uiConversation): the loaded window's nodes, turns and turn navigation, as the host's own chat view reads them. The host builds the target only for a subscriber or while the shell shows that session's chat view.
 */
export function findChatTarget(ctx: HostContext, sessionId: string): HostChatTarget | null {
  const conversation = ctx.get('uiConversation') as HostUiConversationService | undefined
  const sessions = ctx.get('sessions') as HostSessionsService | undefined
  if (!conversation || !sessions?.binding(sessionId)) return null
  return conversation.binding(sessionId).target('chat') ?? null
}

/** A source's snapshot, or null while the service or its method is absent. */
export function hostSnapshot<Snapshot>(source: HostSnapshotSource<Snapshot> | undefined | null): Snapshot | null {
  return typeof source?.getSnapshot === 'function' ? source.getSnapshot() : null
}

/** The session list, and the binding each session's chat is read through. */
export function hostSessions(lookup: HostServiceLookup | null | undefined): HostSessionsService | null {
  const sessions = lookup?.get('sessions') as HostSessionsService | undefined
  return sessions ?? null
}

/** The shown session's own state: which session it is, and how its turn is going. */
export function hostUiSession(lookup: HostServiceLookup | null | undefined): HostUiSessionService | null {
  const uiSession = lookup?.get('uiSession') as HostUiSessionService | undefined
  return uiSession ?? null
}

/**
 * Live per-session status: the per-session map every status reader follows. The
 * host offers it either as the standalone `uiSession.sessionStatus` service or
 * as a property of the `uiSession` service (the desktop app ships the property,
 * not the dotted service), so the property is read when the dotted lookup misses.
 */
export function hostSessionStatus(lookup: HostServiceLookup | null | undefined): HostSessionStatusService | null {
  const direct = lookup?.get('uiSession.sessionStatus') as HostSessionStatusService | undefined
  if (direct !== undefined && direct !== null) return direct
  return hostUiSession(lookup)?.sessionStatus ?? null
}

/** One session's model directory: the catalog, its load and the pick. */
export function hostModelDirectories(lookup: HostServiceLookup | null | undefined): HostModelDirectoriesService | null {
  const directories = lookup?.get('modelDirectories') as HostModelDirectoriesService | undefined
  return directories ?? null
}

/** The shell's language, and the namespaces it translates. */
export function hostLocale(lookup: HostServiceLookup | null | undefined): HostLocaleService | null {
  const locale = lookup?.get('locale') as HostLocaleService | undefined
  return locale ?? null
}

/** One session's conversation service, the chat target's own reader. */
export function hostConversation(lookup: HostServiceLookup | null | undefined): HostConversationService | null {
  const conversation = lookup?.get('conversation') as HostConversationService | undefined
  return conversation ?? null
}

/** The reader's own keyboard shortcuts. */
export function hostShortcuts(lookup: HostServiceLookup | null | undefined): HostShortcutsService | null {
  const shortcuts = lookup?.get('shortcuts') as HostShortcutsService | undefined
  return shortcuts ?? null
}

/** The slot registry, read from the scope that injected it (D75). */
export function hostSlots(lookup: HostServiceLookup): HostSlotsService | null {
  const slots = lookup.get('slots') as HostSlotsService | undefined
  return slots ?? null
}

/** One component handed to a host slot, under the declaration it is registered with. */
export interface SlotEntry {
  options: HostSlotOptions & { name: string }
  component: unknown
}

/**
 * Run `use` with the slot registry once the host serves it, in the scope that injected it (D75): the plugin's own context does not hand the registry out. Disposing the returned scope runs the effects `use` registered; a host without late services has no registry and gets null.
 */
export function withSlots(ctx: HostContext, use: (slots: HostSlotsService, scope: HostContext) => void): HostFiber | null {
  if (typeof ctx.inject !== 'function') return null
  return ctx.inject(['slots'], scope => {
    const slots = hostSlots(scope)
    if (slots === null || typeof slots.inject !== 'function') return
    use(slots, scope)
  })
}

/** Hand components to host slots, each as soon as its slot is declared (D76); disposing the returned scope takes every entry back. */
export function registerSlotEntries(ctx: HostContext, entries: readonly SlotEntry[], label: string): HostFiber | null {
  return withSlots(ctx, (slots, scope) => {
    for (const entry of entries) {
      scope.effect(() => slots.inject(entry.options.name, () => slots.register(entry.options, entry.component)), label)
    }
  })
}

/**
 * The sidebar's pin list, read from the face its own registration injects: the
 * host keeps no service for it, and the list lives in the sidebar plugin's
 * memory, so the registration is the one seat that hands it out. The unpinned
 * source keeps its identity for as long as the sidebar plugin stands, which is
 * how a reload of that plugin shows. Null while no sidebar registers.
 */
export function hostSidebarPins(slots: HostSlotsService): HostSidebarPins | null {
  for (const entry of slots.entries('sidebar')) {
    if (typeof entry.inject !== 'function') continue
    const face = entry.inject()
    const unpinned = face.hooks?.entryPins as HostSidebarPins['unpinned'] | undefined
    const setPinned = face.setPinned as HostSidebarPins['setPinned'] | undefined
    if (unpinned !== undefined && typeof setPinned === 'function') return { unpinned, setPinned }
  }
  return null
}

/** The Agent Teams service behind the remote; null where the host mounts no team mode. */
export function hostRemoteAgentTeams(lookup: HostServiceLookup | null | undefined): HostAgentTeamsRemote | null {
  return lookup?.get('remote.agentTeams') as HostAgentTeamsRemote | undefined ?? null
}

/** The client remote: the endpoint every service behind it is reached through. */
export function hostRemote(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote')
}

/** The account service behind the remote. */
export function hostRemoteAccount(lookup: HostServiceLookup | null | undefined): HostAccountService | null {
  const account = lookup?.get('remote.account') as HostAccountService | undefined
  return account ?? null
}

/** The session service behind the remote: the list, and the shown session. */
export function hostRemoteSession(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.session')
}

/** One session's title, written through the host's own rename (`session.rename`, the call behind the host's rename dialog); null where the host carries no session remote or no rename on it. */
export function hostRenameSession(lookup: HostServiceLookup | null | undefined, sessionId: string, title: string): Promise<HostSessionRenameAnswer> | null {
  const session = hostRemoteSession(lookup)
  if (session === null || session === undefined || typeof session.rename !== 'function') return null
  return session.rename({ sessionId, title }) as Promise<HostSessionRenameAnswer>
}

/** The permission presets the host serves, behind the remote. */
export function hostRemotePermissionPresets(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.permissionPresets')
}

/** The workspace list, archived and live. */
export function hostWorkspaces(lookup: HostServiceLookup | null | undefined): HostWorkspacesService | null {
  const workspaces = lookup?.get('workspaces') as HostWorkspacesService | undefined
  return workspaces ?? null
}

/** The slot the workspace browser registers under, with the store it renders from. */
const WORKSPACE_VIEW_SLOT = 'sidebar.workspaces'

/**
 * The view store each slot registry last answered (or null for none), kept
 * until that registry announces a change to the browser's registration. A
 * registry that announces nothing is walked on every read. The key is the host's
 * registry object, so an entry goes with the registry it was read from.
 */
const workspaceViews = new WeakMap<HostSlotsService, HostWorkspaceViewStore | null>()

/** Walk the browser's registration for its store; null when that shape is absent. */
function findWorkspaceView(slots: HostSlotsService): HostWorkspaceViewStore | null {
  const entries = slots.entries(WORKSPACE_VIEW_SLOT)
  for (let i = 0; i < entries.length; i++) {
    const declaration = entries[i].store
    if (declaration === undefined) continue
    const view = declaration.create() as unknown as HostWorkspaceViewStore
    if (view === null || typeof view !== 'object') continue
    if (typeof view.getSnapshot !== 'function') continue
    if (typeof view.actions?.setArchivedFilter !== 'function' || typeof view.actions?.setGroupBy !== 'function') continue
    return view
  }
  return null
}

/**
 * The workspace browser's viewing store: the grouping and the archived filter behind the host's own view menu. The host registers its browser under `sidebar.workspaces` with a store whose `create` answers the rendered instance, so a write here is the menu's own. Null when that shape is absent, and the caller stays off rather than mounting a control that cannot drive the host (D12).
 *
 * The sidebar's passes read it every frame they run, so the walk is paid once per registration: the answer is kept until the registry says the browser's registration changed, and the subscription that says so ends with that one announcement.
 */
export function hostWorkspaceView(lookup: HostContext | null | undefined): HostWorkspaceViewStore | null {
  const slots = lookup === null || lookup === undefined ? null : hostSlots(lookup)
  if (slots === null) return null
  const kept = workspaceViews.get(slots)
  if (kept !== undefined) return kept
  const view = findWorkspaceView(slots)
  if (typeof slots.subscribe === 'function') {
    workspaceViews.set(slots, view)
    const stop = slots.subscribe(WORKSPACE_VIEW_SLOT, () => {
      workspaceViews.delete(slots)
      stop()
    })
  }
  return view
}

/**
 * The shell's workspace actions: open a session, start one. Null when the host
 * carries no such service; a caller that can run against one guards at the call
 * site and fails with a reason (D12).
 */
export function hostUiWorkspace(lookup: HostServiceLookup | null | undefined): HostUiWorkspaceService | null {
  return (lookup?.get('uiWorkspace') as HostUiWorkspaceService | undefined) ?? null
}

/** Open a file in the host's preview through its canonical resource address (D3, D113). */
export function openHostFile(lookup: HostServiceLookup, sessionId: string, directory: string | undefined, path: string): void {
  const sidebar = lookup.get('sidebarRight') as { openResource(address: string): unknown } | undefined
  if (typeof sidebar?.openResource !== 'function') throw new Error('the host has no file preview controller')
  sidebar.openResource(fileAddressFor(sessionId, directory, path))
}

/** The shell's plugin page navigation. */
export function hostPluginNavigation(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('pluginNavigation')
}

/** The shell's panel layout. */
export function hostLayout(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('layout')
}

/** The installed plugin inventory, behind the remote; read only by profileBundles, so it stays out of the access surface. */
function hostRemotePluginInventory(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.pluginInventory')
}

/** The plugin manager behind the remote; read only by profileBundles, so it stays out of the access surface. */
function hostRemotePluginManager(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.pluginManager')
}

/**
 * The bundles the profile carries, those that loaded: the inventory is read first because the manager Remote is mounted whether or not a profile is managed, and only the inventory says whether one is.
 * @returns null where the host carries neither service; otherwise a promise for the list, rejected when either service answers with an error.
 */
export function profileBundles(lookup: HostServiceLookup | null | undefined): Promise<HostPluginBundle[]> | null {
  const inventory = hostRemotePluginInventory(lookup)
  const manager = hostRemotePluginManager(lookup)
  if (!inventory || !manager) return null
  return inventory.list().then((answer: HostInventoryAnswer) => {
    if (!answer.ok) throw new Error(answer.error?.message ?? 'the plugin inventory answered without a reason')
    if (answer.value.managementAvailable !== true) return []
    return manager.listBundles().then((bundles: HostBundleListAnswer) => {
      if (!bundles.ok) throw new Error(bundles.error?.message ?? 'the plugin manager answered without a reason')
      return bundles.value.filter((bundle) => bundle.error === undefined)
    })
  })
}

/** The skill catalog behind the remote. */
export function hostRemoteSkills(lookup: HostServiceLookup | null | undefined): HostValue {
  return lookup?.get('remote.skills')
}

/** The host's settings-form service (`configForms`, D75); null where the host serves no namespaces to the browser. */
export function hostConfigForms(lookup: HostServiceLookup | null | undefined): HostConfigFormsService | null {
  const forms = lookup?.get('configForms') as HostConfigFormsService | undefined
  return typeof forms?.get === 'function' ? forms : null
}
