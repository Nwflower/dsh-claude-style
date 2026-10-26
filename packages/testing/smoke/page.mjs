/**
 * One page's stand-in markup: the host's footer and composer markup, then the
 * stand-in host, the built bundle and the probe. Both page scripts are plain
 * browser scripts, each read as the parts below in this order; what they need
 * from Node — the page name, the cases this load runs, the run's tier, the
 * markup payload, the launcher's pixel — is set on `window` before them.
 */
import fs from 'fs'
import path from 'path'
import { MARKUP, PNG_1PX } from './shared.mjs'
import { MODEL_SEAT_NAME } from '../specs/fixtures/model-seat.mjs'
/**
 * The rail ui-attachment draws a draft's files into, and its scrolling row: the
 * local names the host's stylesheet gives them. No part of the host's tables
 * carries them, so the page assembles the class from its prefix (lint reads the
 * table's names, not one built at runtime).
 */
const RAIL_CLASS = '_' + '54WpYG_rail'
const RAIL_ROW_CLASS = 'JVDQca_rail'
const TILE_BUTTON_CLASS = '54WpYG_thumbnail'
/** The host's hint node on the page, named so the cases that read it find one element. */
const HOST_HINT_ID = 'hosted' + 'Hint'
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
  'empty-sessions.js',
  'turn-nav.js',
  'mascot.js',
  'stats-projections.js',
  'workspaces.js',
  'sessions.js',
  'session-title.js',
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
  'shell-switches.js',
  'agent-turn-nav.js',
  'shell-palette.js',
  'brand.js',
  'mascot.js',
  'chat-follow.js',
  'chat-caret.js',
  'chat-fold.js',
  'chat-reveal.js',
  'chat-files.js',
  'chat-send.js',
  'chat-wait.js',
  'dock-cards.js',
  'sidebar-layout.js',
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
  parts.map((part) => fs.readFileSync(path.join(import.meta.dirname, dir, part), 'utf8')).join(';\n')
const STAND_IN = readParts('stand-in', STAND_IN_PARTS)
const PROBE = readParts('probe', PROBE_PARTS)
/**
 * The probe's own prelude alone: the skin applied and the readers a step uses,
 * with no step of the smoke's. The behaviour layer drives such a page from
 * outside, through Playwright (packages/testing/behaviour.mjs, D77).
 */
const PRELUDE = readParts('probe', ['prelude.js'])

/**
 * The stand-in page for one load: host footer, host composer, then the bundle,
 * then `probe` — the smoke's steps unless the caller drives the page itself.
 */
function page(name, tier, cases, probe = PROBE) {
  // The desktop footer mirrors 0.1.7's: the account menu lives in the
  // `settings.launcher` slot inside the host's `triggerRow`, and the settings
  // button the web-style footer has is gone. Every other case keeps the
  // web-style footer unchanged.
  //
  // Two shapes a real footer carries are reproduced here. The action slot's
  // first entry writes its own box inline (the chat-import plugin's footer
  // button does), which is what the takeover's weight has to stand over. And a
  // plugin mounts a card of its own straight into the foot area above the
  // settings area (the usage plugin's `data-dsh-usage-foot-card`), outside the
  // slot: the takeover collects whatever the footer holds.
  //
  // A third shape is the one a plugin's own dialog makes: cost-meter mounts its
  // update notice — a native `<dialog>` it opens with `showModal` — into the
  // same foot area, and the takeover must leave it whole (issue #97).
  //
  // The sidebar is the column the host builds: the session tree scrolls in the
  // room above and the footer stands at the column's bottom end. Its two sizes
  // are pinned here, because a host's footer sits at the window's bottom and the
  // account menu cases read where the host's portal lands against it.
  var footerActions = '<div class="_footerActions_x_1"><div data-slot="sidebar.footer.action"><button id="plugin-action" aria-label="Cost meter" data-cordis-badge="3" style="box-sizing:border-box;display:flex;align-items:center;width:100%;height:42px;padding:0 10px;background:transparent;border:none"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg></button><div class="_balance_p_1" role="group"><span>Balance 10.07</span><div role="progressbar" aria-valuenow="40"></div></div></div></div>'
  var footCard = '<div data-dsh-usage-foot-card=""><div class="_usageCard_u_1"><button type="button" aria-label="Open usage settings"><svg viewBox="0 0 16 16"><path d="M2.5 12.5h11"></path></svg><span>Today 3.49M tokens</span></button></div></div>'
  var footDialog = '<dialog id="plugin-foot-dialog" class="_notice_n_1" aria-label="New version notice"><header class="_noticeHead_n_1"><strong>New version</strong><button type="button" aria-label="Close">×</button></header><div class="_noticeBody_n_1"><p>Combined sidebar card</p></div></dialog>'
  var footer = name === 'desktop'
    ? '<div class="_footArea_x_1">' + footerActions + footCard + footDialog +
        '<div class="_settingsArea_x_1"><div data-slot="sidebar.settings"><div class="_triggerRow_s_1">' +
          '<div data-slot="settings.launcher"><div class="_root_a_1"><span>' +
            // data-signed-out is the host's own mark on the account trigger (ui-shell's
            // AccountMenu), read off a live desktop instance.
            '<button id="host-account" data-signed-out="false" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">Ada</button>' +
          '</span></div></div>' +
          '<button aria-label="Retry update">Retry update</button>' +
        '</div></div></div>' +
      '</div>'
    : '<div class="_footArea_x_1">\n' +
        '  ' + footCard + '\n' +
        '  <div class="_settingsArea_x_1"><button aria-haspopup="dialog">Settings</button></div>\n' +
        '  ' + footerActions + '\n' +
      '</div>'
  // The host's statistics in the composer stack (ui-chat StatsPills), which the
  // host marks per figure. Detailed wraps each figure in
  // an anchor span and makes the dialog-carrying ones buttons; compact renders
  // bare reading spans with no trigger. The skin hides both marks outright and
  // reads the two dialogs into the context popover, so the row is the dock's
  // first child here, the way the host parks it, with the context meter beside it.
  var stats = name === 'stats-compact'
    ? '<span class="_pill_p_1" data-composer-stat="time"><svg viewBox="0 0 16 16" width="14" height="14"></svg>20 tok/s</span>' +
        '<span class="_pill_p_1" data-composer-stat="usage"><svg viewBox="0 0 16 16" width="14" height="14"></svg>Cache hit 90%</span>'
    : '<span class="_anchor_a_1" data-composer-stat="time"><button type="button" class="_pill_p_1" aria-haspopup="dialog" aria-expanded="false" aria-label="1 turns 1 steps">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_label_l_1">1 turns 1 steps</span></button></span>' +
        '<span class="_anchor_a_1" data-composer-stat="usage"><button type="button" class="_pill_p_1" aria-haspopup="dialog" aria-expanded="false" aria-label="105 tok · Cache hit 90%">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_label_l_1">105 tok · Cache hit 90%</span></button></span>'
  // The host's dock line: the stats row plus the context meter (ui-conversation
  // ContextMeter), whose trigger draws a ring of two circles beside the
  // occupancy reading — that ring is what identifies the meter
  // (features/composer/composer.ts); the stats pills draw none.
  // Where the position is the context popover's, another plugin's statistics
  // strip rides in the same dock: dsh-pocket marks its own strip
  // `data-mobile-nav="stats"`, sizes it 28px and pins it to the dock's bottom,
  // which is the band the skin's overlay is pinned to as well (issue #47). The
  // composer pass measures it and lifts the overlay's line above it.
  var mobileStats = name === 'context-stats' || name === 'stats-compact'
    ? '<span class="_mobileStats_q_1" data-mobile-nav="stats"><span>12 轮</span><span>34 步</span><span>56 tok/s</span></span>'
    : ''
  var dock = '<div class="_dock_x_1">' + stats + mobileStats +
      '<span class="_meter_m_1"><button type="button" id="context-meter" class="_trigger_m_1" aria-haspopup="dialog" aria-expanded="false" aria-label="Context used 84%">' +
        // The host gives the filled arc a dash array and leaves its track bare
        // (packages/contracts/src/dom.ts, composer.meter-fill), which is how the skin
        // tells the two apart when it paints the reading's colour onto it.
        '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5"></circle><circle cx="7" cy="7" r="5.5" stroke-dasharray="29 5.56"></circle></svg><span>84%</span></button></span>' +
    '</div>'
  // The hero row's two pickers, only where the popovers case drives them: each is
  // its own host menu, opened and closed by pressing its own trigger.
  var heroRow = name === 'popovers'
    ? '<div class="_heroWorkspaceRow_x_1">' +
        '<button type="button" id="hero-workspace" aria-haspopup="menu" aria-expanded="false"><span class="_workspaceLabel_x_1">workspace</span></button>' +
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
        '._heroWorkspaceRow_x_1 { position: fixed; left: 45%; bottom: 120px; display: flex; gap: 8px; }' +
        'body > [role="menu"] { position: fixed; }' +
      '</style>'
    : ''
  var hostControls = '<style>' +
      'body { --dsw-alias-label-primary-foreground: #ffffff; }' +
      'body[data-ds-dark-theme] { --dsw-alias-label-primary-foreground: #0f1115; }' +
      // The plugin's own strip: absolutely positioned in the dock's band, its
      // height fixed, as dsh-pocket's own sheet pins it.
      '._mobileStats_q_1 { position: absolute; left: 0; right: 0; bottom: 0; height: 28px;' +
        ' display: flex; align-items: center; gap: 8px; font-size: 12px; }' +
      '._older_h_1 button { border: none; border-radius: 4px; padding: 4px 12px; font-size: 12px;' +
        ' color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover-solid); }' +
      '._linkButton_h_1 { color: var(--dsw-alias-label-primary); background: transparent; }' +
      '._primary_h_1 { color: var(--dsw-alias-label-primary-foreground);' +
        ' background: var(--dsw-alias-button-primary-fill); }' +
    '</style>' +
    '<div class="_older_h_1"><button type="button">Load earlier</button></div>' +
    '<div class="_balance_h_1"><a class="_linkButton_h_1 _primary_h_1" href="#">Top up</a></div>'
  // The chat area the chat-follow case drives: the host's scroll frame around a
  // scrollable column, the "back to the end" slot beside that frame, and one
  // capped process group next to one that is fully expanded.
  var chatArea = name === 'chat-follow'
    ? '<style>' +
        '#debugScroller { height: 240px; overflow-y: auto; }' +
        '[data-step-process-body] { max-height: 120px; overflow-y: auto; }' +
        // The host's own wrapper around the column, which carries its follow
        // mark and clips: an offset on the column never reaches the scroll height.
        '#debugFollowing { overflow: clip; }' +
      '</style>' +
      '<div id="debugFrame"><div id="debugScroller" data-conversation-scroll><div id="debugFollowing"><div data-chat-flow>' +
        '<div data-chat-flow-key="a" style="height:600px">a</div>' +
        '<div data-chat-flow-key="b" style="height:600px">b</div>' +
      '</div></div></div>' +
      // The host renders its own button beside the frame two levels above the
      // column, which is the shape handBackFollow in
      // packages/engine/src/scroll-owner.ts reads.
      '<div id="debugTail"><button type="button">Back to the end</button></div></div>' +
      '<div data-step-process><div data-step-process-body><div data-step-process-content style="height:400px">capped</div></div></div>' +
      '<div data-step-process data-group-expanded-mode="detailed"><div data-step-process-body><div data-step-process-content style="height:400px">expanded</div></div></div>'
    : ''
  // The conversation header the session-title spec presses: the host's own
  // title row carrying a breadcrumb of one parent segment that opens its own
  // session and the segment of the session the header shows. The skin reads the
  // row's parts from these class names (D3).
  var sessionTitleArea = name === 'session-title'
    ? '<header class="_header_s_1" data-slot="conversation.header" style="position:relative;padding:10px">' +
        '<div class="_titleRow_s_1" style="display:flex;align-items:center;height:30px">' +
        '<div class="_titleCluster_s_1" style="display:flex;align-items:center;flex:1 1 0%">' +
        '<nav class="_crumbs_s_1" style="display:flex;align-items:center;height:28px">' +
        '<span class="_crumbSeg_s_1" style="display:inline-flex;padding-right:8px">' +
        '<button type="button" class="_crumb_s_1" style="background:none;border:0;padding:4px 8px;font:inherit;font-size:14px;color:inherit">parent session</button></span>' +
        '<span class="_crumbSeg_s_1" style="display:inline-flex">' +
        '<span class="_crumb_s_1 _crumbCurrent_s_1" style="padding:4px 8px;font-size:14px;font-weight:500">smoke session</span></span>' +
        '</nav></div></div></header>'
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
        '._rightbarCol_r_1 { width: 320px; }' +
        'body { --dsw-elevation-prominent: 0 0 0 .5px rgba(0, 0, 0, .16), 0 3px 8px rgba(0, 0, 0, .06); }' +
        '._divider_r_1 { position: relative; height: 8px; }' +
        '._divider_r_1::before { content: ""; position: absolute; inset: 0; background: rgb(0, 0, 255); }' +
      '</style>' +
      '<div class="_rightbarCol_r_1" data-rightbar-col>' +
        '<div data-dockkit-empty id="debugDockEmpty">empty host</div>' +
        '<div data-dockkit-host="dock"><div data-dockkit-pane id="debugDockPane">docked pane</div></div>' +
        '<div data-dockkit-split>' +
          '<div data-dockkit-column="0" data-dockkit-host="dock"><div data-dockkit-pane id="debugSplitLeft">left pane</div></div>' +
          '<div data-dockkit-column="1" data-dockkit-host="dock"><div data-dockkit-pane id="debugSplitRight">right pane</div></div>' +
          '<div class="_divider_r_1"></div>' +
        '</div>' +
      '</div>'
    : ''
  // The fold case drives the two surfaces the ported folding acts on: a thinking
  // row (opened and folded back by its own control) and process groups — one
  // running and capped, holding a thought and a tool call, and one in a tier
  // that does not cap its body. The host's own behaviour is modelled in the
  // script: the row's control flips data-expanded, a group's header flips its
  // body's hidden. A header is the host's: a decorative icon span, then its words.
  // A thinking row carries its reasoning body the way the pinned host renders it:
  // a wrapper with the Markdown inside, no slot of its own. The chat flow holds a
  // DisclosureRow in both of the host's shapes: the row with its body beside it,
  // and — first in the flow, so the other's body stays the flow's last child —
  // the row wrapped in a header beside its accessory, the expanded content inside
  // that same wrapper.
  var foldReasoning = ''
  for (var line = 1; line <= 12; line += 1) foldReasoning += '思考第 ' + line + ' 行。' + (line < 12 ? '<br>' : '')
  // The reasoning's window takes the text's height up to the cap reasoning may
  // reach (reasoning-stream.ts). Both rows mirror the host's own capped body in
  // the Standard tier — the same 400px the window stops at — and the probe grows
  // the first past that cap so the window is read on both sides of it.
  var longReasoning = ''
  for (var long = 1; long <= 36; long += 1) longReasoning += '想得久一点第 ' + long + ' 行。' + (long < 36 ? '<br>' : '')
  var foldArea = name === 'chat-fold'
    ? '<style>[data-step-process-body][hidden] { display: none; } #debugGroupHeader { display: flex; gap: 6px; padding: 0; max-width: 100%; } #debugThinkText, #debugGrowText { line-height: 24px; } #debugThinkBody, #debugGrowBody { max-height: 400px; overflow: hidden; }</style>' +
      '<div data-variant="think" data-state="running" id="debugThink"><button type="button" id="debugThinkRow">Thinking</button>' +
        '<div id="debugThinkBody">' +
          '<div data-markdown-variant="compact" id="debugThinkText">' + foldReasoning + '</div>' +
        '</div>' +
      '</div>' +
      '<div data-variant="think" data-state="running" data-expanded id="debugGrow"><button type="button" id="debugGrowRow">Thinking</button>' +
        '<div id="debugGrowBody">' +
          '<div data-markdown-variant="compact" id="debugGrowText">' + longReasoning + '</div>' +
        '</div>' +
      '</div>' +
      '<div data-step-process id="debugGroup">' +
        '<button type="button" data-process-activity id="debugGroupHeader"><span aria-hidden="true">icon</span><span data-shimmer id="debugGroupWords">Working · building</span></button>' +
        '<div data-step-process-body hidden="until-found" id="debugGroupBody"><div data-step-process-content id="debugGroupContent">' +
          '<div data-chat-flow-kind="assistant-step" data-chat-group-part="reasoning">thought</div>' +
          '<div data-chat-flow-kind="tool-call">call</div>' +
        '</div></div>' +
      '</div>' +
      '<div data-chat-flow id="debugFlow">' +
        '<div id="debugWrapped" data-open>' +
          '<div data-disclosure-header>' +
            '<div data-disclosure-row role="button" tabindex="0" aria-expanded="true" id="debugWrappedRow">Wrapped row</div>' +
            '<span id="debugWrappedAccessory">accessory</span>' +
          '</div>' +
          '<div id="debugWrappedBody" style="height:120px">wrapped body</div>' +
        '</div>' +
        '<button type="button" data-disclosure-row id="debugDisclosure">Row</button>' +
        '<div id="debugDisclosureBody" style="height:600px">row body</div>' +
      '</div>' +
      '<div data-step-process data-group-expanded-mode="detailed" id="debugExpanded">' +
        '<button type="button" data-process-activity id="debugExpandedHeader"><span data-shimmer>Expanded</span></button>' +
        '<div data-step-process-body id="debugExpandedBody"><div data-step-process-content>open</div></div>' +
      '</div>' +
      '<div data-chat-flow id="debugTurnFlow">' +
        '<div data-step-process id="debugAnsweredGroup" data-chat-turn="1">' +
          '<button type="button" data-process-activity id="debugAnsweredHeader"><span>Worked</span></button>' +
          '<div data-step-process-body id="debugAnsweredBody"><div data-step-process-content>answered work</div></div>' +
        '</div>' +
        // The answer of an ended turn under either collapse timing: out of the
        // turn's process, and without the answer mark, which the host writes
        // only while the turn stands folded.
        '<div data-chat-flow-kind="assistant-step" data-chat-turn="1">answer</div>' +
        '<div data-step-process id="debugStoppedGroup" data-chat-turn="2">' +
          '<button type="button" data-process-activity id="debugStoppedHeader"><span>Stopped</span></button>' +
          '<div data-step-process-body hidden="until-found" id="debugStoppedBody"><div data-step-process-content><div data-chat-flow-kind="assistant-step" data-turn-process-member data-chat-turn="2">stopped work</div></div></div>' +
        '</div>' +
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
      '  window.__wrappedClicks = 0;' +
      '  var wrapped = document.getElementById("debugWrapped");' +
      '  var wrappedRow = document.getElementById("debugWrappedRow");' +
      '  wrappedRow.addEventListener("click", function () {' +
      '    window.__wrappedClicks += 1;' +
      '    var current = document.getElementById("debugWrappedBody");' +
      '    wrappedRow.setAttribute("aria-expanded", current === null ? "true" : "false");' +
      '    if (current !== null) { current.remove(); return; }' +
      '    var restored = document.createElement("div");' +
      '    restored.id = "debugWrappedBody";' +
      '    restored.style.height = "120px";' +
      '    restored.textContent = "wrapped body";' +
      '    wrapped.appendChild(restored);' +
      '  });' +
      '  var expandedBody = document.getElementById("debugExpandedBody");' +
      '  document.getElementById("debugExpandedHeader").addEventListener("click", function () {' +
      '    window.__foldClicks.expanded += 1;' +
      '    if (expandedBody.hasAttribute("hidden")) expandedBody.removeAttribute("hidden");' +
      '    else expandedBody.setAttribute("hidden", "until-found");' +
      '  });' +
      '  var wireGroup = function (headerId, bodyId) {' +
      '    var groupBody = document.getElementById(bodyId);' +
      '    document.getElementById(headerId).addEventListener("click", function () {' +
      '      window.__foldClicks.group += 1;' +
      '      if (groupBody.hasAttribute("hidden")) groupBody.removeAttribute("hidden");' +
      '      else groupBody.setAttribute("hidden", "until-found");' +
      '    });' +
      '  };' +
      '  wireGroup("debugAnsweredHeader", "debugAnsweredBody");' +
      '  wireGroup("debugStoppedHeader", "debugStoppedBody");' +
      '  window.__foldStoppedBody = function () {' +
      '    document.getElementById("debugStoppedBody").setAttribute("hidden", "until-found");' +
      '  };' +
      '})();' +
      '</script>'
    : ''
  // The composer as the host wires it: Enter in the editor submits, which the
  // skin's send feature watches for its own origin, and the host answers the
  // submission with its echo. The chat area's own case drives this.
  var chatSubmit = name === 'chat-follow'
    ? '<div data-echo-holder id="debugEchoHolder"></div>'
    : ''
  // The other chat-behaviour plugin, installed: the host's own startup picture
  // names every client entry before any of them runs, which is the signal
  // packages/client/src/shared/peer-plugin.ts reads first (the style element is the other one).
  var boot = name === 'peer-chat-ux'
    ? '<script>window.__DSH_BOOT__ = { entries: [{ id: "ui-skin-claude-style", rev: "smoke" }, { id: "@alm-allen/dsh-chat-ux", rev: "smoke" }] }</script>'
    : ''
  // A skin owns the page from the first frame: the skin center injects this
  // attribute into the served document, before any bundle is evaluated, which
  // is what lets the theme answer before it paints (D74).
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
  // The host's model seat inside the composer row, the way ui-conversation
  // renders it, for the pages that read the controls standing beside it: a long
  // model name, so the row has to share its width between the name and them.
  // The context meter's own ring stands after that seat
  // (features/context-stats/meter-ring.ts), so the cases that read that row
  // carry the slot too.
  var modelSeat = name === 'model-meter' || name === 'effort' || name === 'context-stats' || name === 'stats-compact' || name === 'stats-inline'
    ? '<div data-slot="conversation.input.model" style="display:contents"><div class="_root_m_1"><button type="button" class="_trigger_m_1">' + MODEL_SEAT_NAME + '</button></div></div>'
    : ''
  // The hint the host's editor draws on an empty draft, inside the grow wrapper
  // beside the field, which is where the host renders it; and the rail
  // ui-attachment draws the draft's files and images into before it. The
  // composer page is the one the behaviour lane reads its hint on.
  var hintFixture = name === 'permissions-locale' || name === 'composer'
    ? `<div data-composer-placeholder id="${HOST_HINT_ID}">How can I help you today?</div>`
    : ''
  // The draft's attachments, as ui-attachment's `conversation.input.attachments`
  // slot draws them in the card before the field: one image tile in the rail's
  // scrolling row, inside the rail the card wraps it in.
  var composerAttachmentRail = `<div class="${RAIL_CLASS}"><div class="${RAIL_ROW_CLASS}">` +
    `<div class="${RAIL_ROW_CLASS}_item ${RAIL_CLASS}_imageItem"><button type="button" class="${TILE_BUTTON_CLASS}">` +
    '<img alt="Attached image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">' +
    '</button></div></div></div>'
  // The sidebar column as the host builds it: the session tree scrolls in the
  // column's room and the footer stands below it, at the column's bottom end.
  // The column's width and height are pinned so the account menu cases read
  // where the host's portal lands against a footer that stands at the window's
  // bottom, in the column a reader's sidebar has.
  var sidebarStyle = name === 'desktop'
    ? '<style>' +
        '[data-slot="sidebar"] { width: 280px; height: 800px; display: flex; flex-direction: column; }' +
        '._root_x_1 { flex: 1; min-height: 0; display: flex; flex-direction: column; }' +
        '._regionArea_x_1 { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: flex-end; }' +
        '._treeBody_x_1 { flex: 1 1 auto; min-height: 0; overflow-y: auto; }' +
      '</style>'
    : ''
  var tree = name === 'desktop'
    ? '<div class="_treeBody_x_1" role="tree">' +
        '<div class="_sessionRow_x_1" role="treeitem"><span class="_slot_x_1"><div data-slot="sidebar.session.row.leading" style="display:contents"></div></span><span class="_title_x_1">idle session</span></div>' +
        '<div class="_sessionRow_x_1" role="treeitem"><span class="_slot_x_1"><svg data-state="ongoing" viewBox="0 0 16 16" width="10" height="10"></svg></span><span class="_title_x_1">running session</span></div>' +
      '</div>'
    : '<div class="_treeBody_x_1" role="tree">' +
        '<div class="_sessionRow_x_1" role="treeitem"><span class="_slot_x_1"><div data-slot="sidebar.session.row.leading" style="display:contents"></div></span><span class="_title_x_1">idle session</span></div>' +
        '<div class="_sessionRow_x_1" role="treeitem"><span class="_slot_x_1"><svg data-state="ongoing" viewBox="0 0 16 16" width="10" height="10"></svg></span><span class="_title_x_1">running session</span></div>' +
      '</div>'
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>dsh-claude-style smoke: ${name}</title></head>
<body>
${boot}
${skinOwner}
${motionStub}
${sidebarStyle}
<div data-slot="root">
<div data-slot="sidebar">
  <div class="_root_x_1">
    <div class="_regionArea_x_1">
${tree}
${footer}
    </div>
  </div>
</div>
${chatArea}
<!-- The host keeps the composer inside its conversation scroller (the conversation's parts are marked within it, packages/engine/src/parts-table.ts), and the scroller's box reaches above the card: the transcript stands there. The stand-in has no transcript, so the padding stands for the room it takes. Without it the scroller's overflow clips the crab perched on the card's top edge, and a real press cannot reach it. -->
<div data-conversation-scroll style="padding-top: 80px">
<div class="_composerStack_h_1">
<div data-composer-card${name === 'automode-hero' ? ' data-phase="hero"' : ''}>
${heroRow}
  ${name === 'composer' ? composerAttachmentRail : ''}
  ${name === 'chat-send' ? '<div data-input-scroll style="overflow:auto;max-height:120px">' : ''}
  ${name === 'composer' ? '<div data-dsh-claude-part="input-grow" class="_grow_x_1">' : ''}
  <div data-composer-input contenteditable="true" id="editor">/comp</div>
  ${hintFixture}
  ${name === 'composer' ? '</div>' : ''}
  ${name === 'chat-send' ? '</div>' : ''}
  <div class="_row_x_1">
    <div class="_tools_x_1">
      <button class="_add_x_1" aria-label="Add files or run commands" aria-haspopup="listbox" id="commands"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2v12M2 8h12"/></svg></button>
      <div class="_modes_x_1"><div data-slot="conversation.input.permission" style="display:contents"><button aria-label="Access mode, current: Edit">Edit</button></div></div>
    </div>
    <div class="_trailing_x_1">${modelSeat}<div class="_activity_x_1"><div data-slot="conversation.input.activity" style="display:contents"></div></div><button class="_primary_x_1" aria-label="Send message" id="send"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1v14"/></svg></button></div>
  </div>
</div>
${dock}
</div>
</div>
${heroLayout}
${hostControls}
${caretArea}
${sessionTitleArea}
${chatSubmit}
${dockArea}
${foldArea}
</div>
<script>window.SMOKE_CASE = ${JSON.stringify(name)}; window.SMOKE_GROUPS = ${JSON.stringify(cases)}; window.SMOKE_TIER = ${JSON.stringify(tier)}; window.SMOKE_MARKUP = ${JSON.stringify(MARKUP)}; window.SMOKE_PNG = ${JSON.stringify(PNG_1PX)}</script>
<script>${STAND_IN}</script>
<script src="/client.js"></script>
<script>${probe}</script>
</body></html>`
}

export { page, PRELUDE }
