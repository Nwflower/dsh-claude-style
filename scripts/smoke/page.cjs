/**
 * One page's stand-in markup: the host's footer and composer markup, then the
 * stand-in host, the built bundle and the probe. Both page scripts are plain
 * browser scripts, each read as the parts below in this order; what they need
 * from Node — the page name, the cases this load runs, the run's tier, the
 * markup payload, the launcher's pixel — is set on `window` before them.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { MARKUP, PNG_1PX } = require('./shared.cjs')
/**
 * The stand-in host's parts, in the order they run: the counters, then the host
 * faces the bundle reads.
 */
const STAND_IN_PARTS = [
  'prelude.js',
  'host-palette.js',
  'account-menu.js',
  'hero-menus.js',
  'composer-keys.js',
  'settings-form.js',
  'account-stream.js',
  'host-fetch.js',
  'account-service.js',
  'permissions.js',
  'turn-fixture.js',
  'locale-fixture.js',
  'turn-nav.js',
  'mascot.js',
  'stats-projections.js',
  'workspaces.js',
  'sessions.js',
  'model-directory.js',
  'config-forms.js',
  'slots.js',
  'ctx.js',
  'stats-dialogs.js',
  'context-panel.js',
  'react.js',
  'sibling-sheet.js',
]
/**
 * The probe's parts, in the order they run: the skin and the step registry, then
 * each step in the order the probe takes them.
 */
const PROBE_PARTS = [
  'prelude.js',
  'shell-startup.js',
  'agent-desktop.js',
  'settle.js',
  'shell-pages.js',
  'shell-band.js',
  'shell-context.js',
  'account-reads.js',
  'shell-studio.js',
  'agent-permissions.js',
  'agent-turns.js',
  'shell-switches.js',
  'agent-turn-nav.js',
  'shell-palette.js',
  'mascot.js',
  'chat-motion.js',
  'chat-files.js',
  'chat-send.js',
  'chat-reader.js',
  'dock-cards.js',
  'model-meter.js',
  'peer.js',
  'teardown.js',
]
/**
 * The page scripts, read once: the stand-in host runs before the bundle, the
 * probe after it. Every part is an IIFE and the parts are injected as one
 * script, so each boundary carries the statement's own terminator (a part
 * opening with `(function` would otherwise be read as a call of the one before).
 */
const readParts = (dir, parts) =>
  parts.map((part) => fs.readFileSync(path.join(__dirname, dir, part), 'utf8')).join(';\n')
const STAND_IN = readParts('stand-in', STAND_IN_PARTS)
const PROBE = readParts('probe', PROBE_PARTS)

/** The stand-in page for one load: host footer, host composer, then the bundle. */
function page(name, tier, cases) {
  // The desktop footer mirrors 0.1.7's: the account menu lives in the
  // `settings.launcher` slot inside the host's `triggerRow`, and the settings
  // button the web-style footer has is gone. Every other case keeps the
  // web-style footer unchanged.
  var footerActions = '<div class="_x_footerActions_1"><div data-slot="sidebar.footer.action"><button id="plugin-action" aria-label="Cost meter" data-cordis-badge="3"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg></button><div class="_p_balance_1" role="group"><span>Balance 10.07</span><div role="progressbar" aria-valuenow="40"></div></div></div></div>'
  var footer = name === 'desktop'
    ? '<div class="_x_footArea_1">' + footerActions +
        '<div class="_x_settingsArea_1"><div data-slot="sidebar.settings"><div class="_s_triggerRow_1">' +
          '<div data-slot="settings.launcher"><div class="_a_root_1"><span>' +
            // data-signed-out is the host's own mark on the account trigger (ui-shell's
            // AccountMenu), read off a live desktop instance.
            '<button id="host-account" data-signed-out="false" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">Ada</button>' +
          '</span></div></div>' +
          '<button aria-label="Retry update">Retry update</button>' +
        '</div></div></div>' +
      '</div>'
    : '<div class="_x_footArea_1">\n' +
        '  <div class="_x_settingsArea_1"><button aria-haspopup="dialog">Settings</button></div>\n' +
        '  ' + footerActions + '\n' +
      '</div>'
  // The host's statistics in the composer stack (ui-chat StatsPills), which the
  // host marks per figure. Detailed wraps each figure in
  // an anchor span and makes the dialog-carrying ones buttons; compact renders
  // bare reading spans with no trigger. The skin hides both marks outright and
  // reads the two dialogs into the context popover, so the row is the dock's
  // first child here, the way the host parks it, with the context meter beside it.
  var stats = name === 'stats-compact'
    ? '<span class="_p_pill_1" data-composer-stat="time"><svg viewBox="0 0 16 16" width="14" height="14"></svg>20 tok/s</span>' +
        '<span class="_p_pill_1" data-composer-stat="usage"><svg viewBox="0 0 16 16" width="14" height="14"></svg>Cache hit 90%</span>'
    : '<span class="_a_anchor_1" data-composer-stat="time"><button type="button" class="_p_pill_1" aria-haspopup="dialog" aria-expanded="false" aria-label="1 turns 1 steps">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_l_label_1">1 turns 1 steps</span></button></span>' +
        '<span class="_a_anchor_1" data-composer-stat="usage"><button type="button" class="_p_pill_1" aria-haspopup="dialog" aria-expanded="false" aria-label="105 tok · Cache hit 90%">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_l_label_1">105 tok · Cache hit 90%</span></button></span>'
  // The host's dock line: the stats row plus the context meter (ui-conversation
  // ContextMeter), whose trigger draws a ring of two circles beside the
  // occupancy reading — that ring is what identifies the meter
  // (features/composer/composer.ts); the stats pills draw none.
  var dock = '<div class="_x_dock_1">' + stats +
      '<span class="_m_meter_1"><button type="button" id="context-meter" class="_m_trigger_1" aria-haspopup="dialog" aria-expanded="false" aria-label="Context used 42%">' +
        '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5"></circle><circle cx="7" cy="7" r="5.5"></circle></svg><span>42%</span></button></span>' +
    '</div>'
  // The hero row's two pickers, only where the popovers case drives them: each is
  // its own host menu, opened and closed by pressing its own trigger.
  var heroRow = name === 'popovers'
    ? '<div class="_x_heroWorkspaceRow_1">' +
        '<button type="button" id="hero-workspace" aria-haspopup="menu" aria-expanded="false"><span class="_x_workspaceLabel_1">workspace</span></button>' +
        '<button type="button" id="hero-preset" aria-haspopup="menu" aria-expanded="false">preset</button>' +
      '</div>'
    : ''
  // Two of the host's own controls, painted the way the host paints them: the
  // chat's "load earlier" chip (secondary ink on the solid hover fill) and a
  // filled anchor button (AccountSection's "充值", `_linkButton _primary`). The
  // skin supplies the tokens both read; the host supplies the foreground token
  // for a filled control, which the skin leaves alone.
  // The popovers case drives the hero row's own host menus. In the real page the
  // host portals them to <body> as fixed-position cards and places them from the
  // trigger's geometry, and the row itself sits above the composer with the
  // hero's empty space over it. Both are what the skin's placement pass reads.
  var heroLayout = name === 'popovers'
    ? '<style>' +
        '._x_heroWorkspaceRow_1 { position: fixed; left: 45%; bottom: 120px; display: flex; gap: 8px; }' +
        'body > [role="menu"] { position: fixed; }' +
      '</style>'
    : ''
  var hostControls = '<style>' +
      'body { --dsw-alias-label-primary-foreground: #ffffff; }' +
      'body[data-ds-dark-theme] { --dsw-alias-label-primary-foreground: #0f1115; }' +
      '._h_older_1 button { border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px;' +
        ' color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover-solid); }' +
      '._h_linkButton_1 { color: var(--dsw-alias-label-primary); background: transparent; }' +
      '._h_primary_1 { color: var(--dsw-alias-label-primary-foreground);' +
        ' background: var(--dsw-alias-button-primary-fill); }' +
    '</style>' +
    '<div class="_h_older_1"><button type="button">Load earlier</button></div>' +
    '<div class="_h_balance_1"><a class="_h_linkButton_1 _h_primary_1" href="#">Top up</a></div>'
  // The chat area the chat-follow case drives: the host's scroll frame around a
  // scrollable column, the "back to the end" slot beside that frame, and one
  // capped process group next to one that is fully expanded.
  var chatArea = name === 'chat-follow'
    ? '<style>' +
        '#debugScroller { height: 240px; overflow-y: auto; }' +
        '[data-step-process-body] { max-height: 120px; overflow-y: auto; }' +
      '</style>' +
      '<div id="debugFrame"><div id="debugScroller" data-conversation-scroll><div data-chat-flow>' +
        '<div data-chat-flow-key="a" style="height:600px">a</div>' +
        '<div data-chat-flow-key="b" style="height:600px">b</div>' +
      '</div></div></div>' +
      // The host renders its own button beside the frame that holds the scroll
      // frame, which is the shape handBackFollow in shared/scroll-owner.ts reads.
      '<div id="debugTail"><button type="button">Back to the end</button></div>' +
      '<div data-step-process><div data-step-process-body><div data-step-process-content style="height:400px">capped</div></div></div>' +
      '<div data-step-process data-group-expanded-mode="detailed"><div data-step-process-body><div data-step-process-content style="height:400px">expanded</div></div></div>'
    : ''
  // The caret case drives both editable surfaces: the shared contenteditable
  // composer input, and a plain textarea under a composer seat — the shape a
  // question card's answer box has.
  var caretArea = name === 'caret'
    ? '<div data-composer-seat><textarea id="debugAnswer" rows="3">hello world</textarea></div>'
    : ''
  // The right sidebar the dock-cards case drives: the column's own empty host,
  // one docked pane and a split of two columns, each with the host's own
  // divider line under it. The panes carry no styling of their own, so what the
  // case reads is what the skin's card rules add and what the flush choice
  // leaves; the elevation token is the host's, as it is on the real page.
  var dockArea = name === 'dock-cards'
    ? '<style>' +
        '._r_rightbarCol_1 { width: 320px; }' +
        'body { --dsw-elevation-prominent: 0 0 0 .5px rgba(0, 0, 0, .16), 0 3px 8px rgba(0, 0, 0, .06); }' +
        '._r_divider_1 { position: relative; height: 8px; }' +
        '._r_divider_1::before { content: ""; position: absolute; inset: 0; background: rgb(0, 0, 255); }' +
      '</style>' +
      '<div class="_r_rightbarCol_1">' +
        '<div data-dockkit-empty id="debugDockEmpty">empty host</div>' +
        '<div data-dockkit-host="dock"><div data-dockkit-pane id="debugDockPane">docked pane</div></div>' +
        '<div data-dockkit-split>' +
          '<div data-dockkit-column="0" data-dockkit-host="dock"><div data-dockkit-pane id="debugSplitLeft">left pane</div></div>' +
          '<div data-dockkit-column="1" data-dockkit-host="dock"><div data-dockkit-pane id="debugSplitRight">right pane</div></div>' +
          '<div class="_r_divider_1"></div>' +
        '</div>' +
      '</div>'
    : ''
  // The fold case drives the two surfaces the ported folding acts on: a thinking
  // row (opened and folded back by its own control) and process groups — one
  // running and capped, one in a tier that does not cap its body. The host's own
  // behaviour is modelled in the script: the row's control flips data-expanded,
  // a group's header flips its body's hidden.
  var foldArea = name === 'chat-fold'
    ? '<style>[data-step-process-body][hidden] { display: none; }</style>' +
      '<div data-variant="think" data-state="running" id="debugThink"><button type="button">Thinking</button></div>' +
      '<div data-step-process id="debugGroup">' +
        '<button type="button" data-process-activity id="debugGroupHeader"><span data-shimmer>Working</span> · building</button>' +
        '<div data-step-process-body hidden="until-found" id="debugGroupBody"><div data-step-process-content>body</div></div>' +
      '</div>' +
      '<div data-chat-flow id="debugFlow">' +
        '<button type="button" data-disclosure-row id="debugDisclosure">Row</button>' +
        '<div id="debugDisclosureBody" style="height:600px">row body</div>' +
      '</div>' +
      '<div data-step-process data-group-expanded-mode="detailed" id="debugExpanded">' +
        '<button type="button" data-process-activity id="debugExpandedHeader"><span data-shimmer>Expanded</span></button>' +
        '<div data-step-process-body id="debugExpandedBody"><div data-step-process-content>open</div></div>' +
      '</div>' +
      '<script>' +
      '(function () {' +
      '  window.__foldClicks = { think: 0, group: 0, expanded: 0 };' +
      '  window.__disclosureClicks = 0;' +
      '  var think = document.getElementById("debugThink");' +
      '  think.querySelector("button").addEventListener("click", function () {' +
      '    window.__foldClicks.think += 1;' +
      '    if (think.hasAttribute("data-expanded")) think.removeAttribute("data-expanded");' +
      '    else think.setAttribute("data-expanded", "");' +
      '  });' +
      '  var body = document.getElementById("debugGroupBody");' +
      '  document.getElementById("debugGroupHeader").addEventListener("click", function () {' +
      '    window.__foldClicks.group += 1;' +
      '    if (body.hasAttribute("hidden")) body.removeAttribute("hidden");' +
      '    else body.setAttribute("hidden", "until-found");' +
      '  });' +
      '  var flow = document.getElementById("debugFlow");' +
      '  document.addEventListener("click", function (event) {' +
      '    if (!(event.target instanceof Element)) return;' +
      '    if (event.target.closest("#debugDisclosure") === null) return;' +
      '    window.__disclosureClicks += 1;' +
      '    var current = document.getElementById("debugDisclosureBody");' +
      '    if (current !== null) { current.remove(); return; }' +
      '    var restored = document.createElement("div");' +
      '    restored.id = "debugDisclosureBody";' +
      '    restored.style.height = "600px";' +
      '    restored.textContent = "row body";' +
      '    flow.appendChild(restored);' +
      '  });' +
      '  var expandedBody = document.getElementById("debugExpandedBody");' +
      '  document.getElementById("debugExpandedHeader").addEventListener("click", function () {' +
      '    window.__foldClicks.expanded += 1;' +
      '    if (expandedBody.hasAttribute("hidden")) expandedBody.removeAttribute("hidden");' +
      '    else expandedBody.setAttribute("hidden", "until-found");' +
      '  });' +
      '})();' +
      '</script>'
    : ''
  // The other chat-behaviour plugin, installed: the host's own startup picture
  // names every client entry before any of them runs, which is the signal
  // packages/client/src/shared/peer-plugin.ts reads first (the style element is the other one).
  var boot = name === 'peer-chat-ux'
    ? '<script>window.__DSH_BOOT__ = { entries: [{ id: "ui-skin-claude-style", rev: "smoke" }, { id: "@alm-allen/dsh-chat-ux", rev: "smoke" }] }</script>'
    : ''
  // A skin owns the page from the first frame: the skin center injects this
  // attribute into the served document, before any bundle is evaluated, which
  // is what lets the theme answer before it paints (D49).
  var skinOwner = name === 'skin-center-handoff'
    ? '<script>document.documentElement.setAttribute("data-dsh-skin", "blue-fantasy")</script>'
    : ''
  // The system's reduced-motion setting, driven by hand: the reveal case flips it
  // while the animation choice is "follow the system", which is the one path that
  // reaches the features through the resolved attribute alone (packages/client/src/core/prefs.ts,
  // refreshMotionAttribute). Only that case gets the stub; every other case keeps
  // the browser's real answer.
  var motionStub = name === 'chat-reveal'
    ? '<script>(function () {' +
        'var listeners = [];' +
        'var query = {' +
          'media: "(prefers-reduced-motion: reduce)",' +
          'matches: false,' +
          'addEventListener: function (type, listener) { if (type === "change") listeners.push(listener) },' +
          'removeEventListener: function (type, listener) {' +
            'var at = listeners.indexOf(listener);' +
            'if (at >= 0) listeners.splice(at, 1);' +
          '},' +
        '};' +
        'var real = window.matchMedia.bind(window);' +
        'window.matchMedia = function (text) { return String(text).indexOf("prefers-reduced-motion") >= 0 ? query : real(text) };' +
        'window.__setSystemReduced = function (value) {' +
          'query.matches = value;' +
          'for (var i = 0; i < listeners.length; i++) listeners[i]({ matches: value, media: query.media });' +
        '};' +
      '})();</script>'
    : ''
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>dsh-claude-style smoke: ${name}</title></head>
<body>
${boot}
${skinOwner}
${motionStub}
${footer}
<div class="_x_treeBody_1" role="tree">
  <div class="_x_sessionRow_1" role="treeitem"><span class="_x_slot_1"><div data-slot="sidebar.session.row.leading" style="display:contents"></div></span><span class="_x_title_1">idle session</span></div>
  <div class="_x_sessionRow_1" role="treeitem"><span class="_x_slot_1"><svg data-state="ongoing" viewBox="0 0 16 16" width="10" height="10"></svg></span><span class="_x_title_1">running session</span></div>
</div>
<div data-composer-card${name === 'automode-hero' ? ' data-phase="hero"' : ''}>
${heroRow}
  ${name === 'chat-send' ? '<div data-input-scroll style="overflow:auto;max-height:120px">' : ''}
  <div data-composer-input contenteditable="true" id="editor">/comp</div>
  ${name === 'chat-send' ? '</div>' : ''}
  <div class="_x_row_1">
    <div class="_x_tools_1">
      <button class="_x_add_1" aria-label="Add files or run commands" aria-haspopup="listbox" id="commands"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2v12M2 8h12"/></svg></button>
      <div class="_x_modes_1"><div data-slot="conversation.input.permission" style="display:contents"><button aria-label="Access mode, current: Edit">Edit</button></div></div>
    </div>
    <div class="_x_trailing_1"><button class="_x_primary_1" aria-label="Send message" id="send"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1v14"/></svg></button></div>
  </div>
</div>
${dock}
${heroLayout}
${hostControls}
${chatArea}
${caretArea}
${dockArea}
${foldArea}
<script>window.SMOKE_CASE = ${JSON.stringify(name)}; window.SMOKE_GROUPS = ${JSON.stringify(cases)}; window.SMOKE_TIER = ${JSON.stringify(tier)}; window.SMOKE_MARKUP = ${JSON.stringify(MARKUP)}; window.SMOKE_PNG = ${JSON.stringify(PNG_1PX)}</script>
<script>${STAND_IN}</script>
<script src="/client.js"></script>
<script>${PROBE}</script>
</body></html>`
}

module.exports = { page }
