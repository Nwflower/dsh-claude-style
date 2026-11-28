import { SETTINGS_BUTTON_SELECTOR } from '@dsh-claude-style/contracts/dom'
import { findFootArea, findHostMenuOf } from '@dsh-claude-style/engine/host'
import { hasSkinClass } from '@dsh-claude-style/engine/dom'

/** Rhythm and give-up point of the poll for the host's account menu after the trigger's own click. */
const MENU_LOOK_INTERVAL_MS = 40
const MENU_LOOK_TRIES = 20

/**
 * The host's account trigger, its settings entry, and its open account menu.
 *
 * The account surface (account/surface.ts) injects our rows into the menu while
 * it is open, and the host renders its own rows. This factory therefore keeps
 * only what the remaining callers need — the trigger (which is both the entry
 * on a host that has one and the "is there an account area?" probe), the
 * menu's list element to inject into, and the settings drive that Ctrl+, and
 * the synthetic path's settings row still use.
 */
export function createHostAccountMenu(options: { close(): void }) {
  /** The wait between two looks for the host's menu, while one is in flight. */
  let lookTimer: ReturnType<typeof setTimeout> | null = null

  /** A click the host's React handlers actually see (pointerdown + click). */
  function realClick(el: HTMLElement | null | undefined) {
    if (el === null || el === undefined) return
    const rect = el.getBoundingClientRect()
    const init = {
      bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height / 2)
    }
    el.dispatchEvent(new PointerEvent('pointerdown', init))
    el.dispatchEvent(new MouseEvent('mousedown', init))
    el.dispatchEvent(new PointerEvent('pointerup', init))
    el.dispatchEvent(new MouseEvent('mouseup', init))
    el.click()
  }

  /**
   * The host's account trigger: the menu anchor the host itself marks with
   * the sign-in state (`data-signed-out`). No other element carries that
   * mark, so no label text is read. The footer scope comes first — that is
   * where the account row lives — and the document is the fallback for a
   * host that seats it elsewhere.
   *
   * No structural fallback beyond the mark: "the first non-ours anchor in
   * the footer" picked the open-in-app menu instead, filling the drawer
   * with Cursor / VS Code / … Returning null is the honest answer: the
   * surface self-builds instead.
   */
  function hostAccountTrigger() {
    const foot = findFootArea()
    const scopes: (ParentNode | null)[] = [foot, document]
    for (const scope of scopes) {
      if (scope === null) continue
      const el = scope.querySelector<HTMLElement>('[aria-haspopup="menu"][data-signed-out]')
      if (el !== null && !hasSkinClass(el)) return el
    }
    return null
  }

  /**
   * The host's settings button, a dialog trigger in the footer, or null. The
   * desktop has none: its account menu took that slot and carries 设置
   * itself, and "any button that is not a menu anchor" there is the update
   * pill beside it — the settings row read "Retry update" and clicked it. The
   * account trigger matches the settings area's own shape, so it is turned
   * away here: pressing it opens that menu, never the dialog.
   */
  function hostSettingsTrigger() {
    const foot = findFootArea()
    if (foot === null) return null
    const trigger = foot.querySelector<HTMLElement>(SETTINGS_BUTTON_SELECTOR)
    return trigger !== null && trigger === hostAccountTrigger() ? null : trigger
  }

  /**
   * The host's open account menu, or null while it is closed.
   *
   * Identified through the trigger, never through the menu's text: the
   * account trigger reports `aria-expanded` while its menu is up, and the
   * card is the one the host anchored to that trigger (findHostMenuOf). Other
   * host menus can stand in the document at the same time, so the first menu
   * in the document is not the account menu; the hover keep-alive, the row
   * injection and the Escape that closes the menu all act on this card.
   */
  function findAccountMenu() {
    const trigger = hostAccountTrigger()
    if (trigger === null || trigger.getAttribute('aria-expanded') !== 'true') return null
    return findHostMenuOf(trigger)
  }

  /**
   * The settings row of an open account menu: the only row the host marks
   * with its keyboard shortcut. The visible label follows the interface
   * language; `aria-keyshortcuts` does not.
   */
  function settingsRowOf(menu: Element) {
    return menu.querySelector<HTMLElement>('[role="menuitem"][aria-keyshortcuts]')
  }

  /**
   * The menu's list element — the host's own keyboard walk and our injected
   * rows both live inside it — or null when the host's list markup differs
   * from the one this skin was built against.
   */
  function menuViewport(menu: Element) {
    return menu.querySelector('[role="presentation"]')
  }

  /**
   * Open the host's settings: its settings button where it has one, or else
   * the settings row of its account menu — the desktop, where that menu is
   * the settings launcher. The row is found by the shortcut mark the host
   * puts on it, never by its label, which follows the interface language.
   * The drive is hidden in place while it runs: the menu is a means to the
   * dialog, never the answer.
   */
  function openHostSettings() {
    options.close()
    const trigger = hostSettingsTrigger()
    if (trigger !== null) {
      trigger.click()
      return
    }
    const account = hostAccountTrigger()
    if (account === null) return
    realClick(account)
    let tries = 0
    function look() {
      lookTimer = null
      const menu = findAccountMenu()
      if (menu !== null) {
        const row = settingsRowOf(menu)
        if (row === null) {
          // No settings row in this menu: fold it back, the drive is over.
          realClick(account)
          return
        }
        const previous = menu.style.visibility
        menu.style.visibility = 'hidden'
        realClick(row)
        menu.style.visibility = previous
        return
      }
      if (tries++ > MENU_LOOK_TRIES) return
      lookTimer = setTimeout(look, MENU_LOOK_INTERVAL_MS)
    }
    lookTimer = setTimeout(look, MENU_LOOK_INTERVAL_MS)
  }

  /**
   * Drop the poll for the host's menu. The poll presses the host's own row
   * after it starts, and the rows it drives are handed back when the footer
   * is, so the footer's teardown stops it here.
   */
  function stopSettingsDrive() {
    if (lookTimer !== null) clearTimeout(lookTimer)
    lookTimer = null
  }

  /**
   * Open the host's account menu for the hover preference. The trigger opens
   * on its own onClick, so one click is the whole press: the extra
   * pointerdown/mouseup pair realClick adds reaches any host handler that
   * acts on a press, and the click that follows then toggles the just-opened
   * menu shut.
   */
  function openAccountMenu() {
    const trigger = hostAccountTrigger()
    if (trigger === null) return
    trigger.click()
  }

  return {
    trigger: hostAccountTrigger,
    settingsTrigger: hostSettingsTrigger,
    findMenu: findAccountMenu,
    menuViewport,
    openMenu: openAccountMenu,
    openSettings: openHostSettings,
    stopSettingsDrive
  }
}

/** The host account menu accessors (createHostAccountMenu). */
export type HostAccountMenu = ReturnType<typeof createHostAccountMenu>
