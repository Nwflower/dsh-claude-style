/**
 * One case's stand-in page: the host's footer and composer markup, then the
 * stand-in host (stand-in.js), the built bundle and the probe (probe.js).
 * Both page scripts are plain browser scripts; what they need from Node — the
 * case name, the markup payload, the launcher's pixel — is set on `window`
 * before them.
 */
'use strict'
const fs = require('fs')
const path = require('path')
const { MARKUP, PNG_1PX } = require('./shared.cjs')
/** The page scripts, read once: the stand-in host runs before the bundle, the probe after it. */
const STAND_IN = fs.readFileSync(path.join(__dirname, 'stand-in.js'), 'utf8')
const PROBE = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8')

/** The stand-in page for one case: host footer, host composer, then the bundle. */
function page(name) {
  // The desktop footer mirrors 0.1.7's: the account menu lives in the
  // `settings.launcher` slot inside the host's `triggerRow`, and the settings
  // button the web-style footer has is gone. Every other case keeps the
  // web-style footer unchanged.
  var footerActions = '<div class="_x_footerActions_1"><div data-slot="sidebar.footer.action"><button id="plugin-action" aria-label="Cost meter" data-cordis-badge="3"><svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"></circle></svg></button><div class="_p_balance_1" role="group"><span>Balance 10.07</span><div role="progressbar" aria-valuenow="40"></div></div></div></div>'
  var footer = name === 'desktop'
    ? '<div class="_x_footArea_1">' + footerActions +
        '<div class="_x_settingsArea_1"><div data-slot="sidebar.settings"><div class="_s_triggerRow_1">' +
          '<div data-slot="settings.launcher"><div class="_a_root_1"><span>' +
            '<button id="host-account" aria-label="Account menu" aria-haspopup="menu" aria-expanded="false">Ada</button>' +
          '</span></div></div>' +
          '<button aria-label="Retry update">Retry update</button>' +
        '</div></div></div>' +
      '</div>'
    : '<div class="_x_footArea_1">\n' +
        '  <div class="_x_settingsArea_1"><button aria-haspopup="dialog">Settings</button></div>\n' +
        '  ' + footerActions + '\n' +
      '</div>'
  // The host's statistics row (ui-chat StatsPills) in each of its two shapes.
  // Detailed wraps each pill in an anchor span and makes the dialog-carrying
  // ones buttons; compact renders bare icon+reading spans with no trigger. The
  // skin must leave compact's icons and spacing alone and keep its own merged
  // sentence for detailed.
  var stats = name === 'stats-compact'
    ? '<div data-composer-stats>' +
        '<span class="_p_pill_1"><svg viewBox="0 0 16 16" width="14" height="14"></svg>20 tok/s</span>' +
        '<span class="_p_pill_1"><svg viewBox="0 0 16 16" width="14" height="14"></svg>Cache hit 90%</span>' +
      '</div>'
    : '<div data-composer-stats>' +
        '<span class="_a_anchor_1"><button type="button" class="_p_pill_1" aria-haspopup="dialog" aria-expanded="false" aria-label="1 turns 1 steps">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_l_label_1">1 turns 1 steps</span></button></span>' +
        '<span class="_a_anchor_1"><button type="button" class="_p_pill_1" aria-haspopup="dialog" aria-expanded="false" aria-label="105 tok · Cache hit 90%">' +
          '<svg viewBox="0 0 16 16" width="14" height="14"></svg><span class="_l_label_1">105 tok · Cache hit 90%</span></button></span>' +
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
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>dsh-claude-style smoke: ${name}</title></head>
<body>
${footer}
<div class="_x_treeBody_1" role="tree">
  <div class="_x_sessionRow_1" role="treeitem"><span class="_x_slot_1"><div data-slot="sidebar.session.row.leading" style="display:contents"></div></span><span class="_x_title_1">idle session</span></div>
  <div class="_x_sessionRow_1" role="treeitem"><span class="_x_slot_1"><svg data-state="ongoing" viewBox="0 0 16 16" width="10" height="10"></svg></span><span class="_x_title_1">running session</span></div>
</div>
<div data-composer-card${name === 'automode-hero' ? ' data-phase="hero"' : ''}>
${heroRow}
  <div data-composer-input contenteditable="true" id="editor">/comp</div>
  <div class="_x_row_1">
    <div class="_x_tools_1">
      <button class="_x_add_1" aria-label="Add files or run commands" aria-haspopup="listbox" id="commands"><svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2v12M2 8h12"/></svg></button>
      <div class="_x_modes_1"><div data-slot="conversation.input.permission" style="display:contents"><button aria-label="Access mode, current: Edit">Edit</button></div></div>
    </div>
    <div class="_x_trailing_1"><button class="_x_primary_1" aria-label="Send message" id="send"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 1v14"/></svg></button></div>
  </div>
</div>
${stats}
${hostControls}
<script>window.SMOKE_CASE = ${JSON.stringify(name)}; window.SMOKE_MARKUP = ${JSON.stringify(MARKUP)}; window.SMOKE_PNG = ${JSON.stringify(PNG_1PX)}</script>
<script>${STAND_IN}</script>
<script src="/client.js"></script>
<script>${PROBE}</script>
</body></html>`
}

module.exports = { page }
