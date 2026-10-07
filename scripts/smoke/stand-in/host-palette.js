/**
 * The host-palette case: the host's own palette and frame, and a theme plugin
 * that rewrites the host's tokens for a wallpaper the way
 * dsh-wallpaper-engine does (canvas and sidebar cleared, overlays and the
 * input turned to glass). Both load before the skin, as the host's do.
 */
(function () {
  var CASE = window.__dshSmokeHost.CASE

  if (CASE === 'host-palette') {
    var hostSheet = document.createElement('style')
    hostSheet.textContent = [
      'body { --dsw-alias-bg-base: rgb(250, 250, 252); --dsw-alias-bg-overlay: rgb(240, 241, 250); --dsw-alias-bg-layer-2: rgb(245, 246, 250);',
      '  --dsw-specific-sidebar-fill: rgb(244, 245, 250); --dsw-specific-input-major: rgb(251, 252, 253); --dsw-specific-selector: rgb(230, 231, 240);',
      '  --dsw-alias-interactive-bg-hover: rgba(10, 20, 30, 0.08); --dsw-alias-label-primary: rgb(17, 18, 19); --dsw-alias-label-secondary: rgb(80, 81, 90);',
      '  --dsw-alias-border-l1: rgb(220, 221, 230); --dsw-alias-link: rgb(30, 90, 200); --dsw-alias-markdown-inline-code: rgb(235, 236, 245);',
      '  --dsw-font-family: "Host Sans", sans-serif; --ds-font-family-code: "Host Mono", monospace; }',
      'body[data-ds-dark-theme] { --dsw-alias-bg-base: rgb(20, 22, 30); --dsw-alias-bg-overlay: rgb(36, 38, 48); --dsw-specific-sidebar-fill: rgb(24, 26, 34);',
      '  --dsw-specific-input-major: rgb(14, 15, 20); --dsw-alias-interactive-bg-hover: rgba(240, 240, 255, 0.08); --dsw-alias-label-primary: rgb(236, 238, 245); }',
      '[data-pane="sidebar"] { background: var(--dsw-specific-sidebar-fill); }',
      'body[data-we-wallpaper] { --dsw-alias-bg-base: transparent; --dsw-specific-sidebar-fill: transparent;',
      '  --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.6); --dsw-specific-input-major: rgba(255, 255, 255, 0.5); }',
    ].join('\n')
    document.head.appendChild(hostSheet)
  }
})()
