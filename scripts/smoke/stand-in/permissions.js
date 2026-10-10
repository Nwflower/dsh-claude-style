/**
 * The host's permission catalog: the configured presets, plus the live Auto
 * review preset only while the auto-review integration is registered. Each
 * auto-mode case carries the third-party tier its page has to show.
 */
(function () {
  var host = window.__dshSmokeHost
  var CASE = host.CASE

  var configuredPresetOptions = [
    { value: 'read-only', name: 'Read Only', description: 'read only' },
    { value: 'workspace-write', name: 'Workspace Write', description: 'workspace write' },
    { value: 'danger-full-access', name: 'Full access', description: 'full access' },
  ]
  // What each case's catalog carries on top of the configured presets, and the
  // preset its session runs. Every case not listed keeps the live Auto review
  // preset, which is the shipped shape; the auto mode cases model the
  // third-party tier being installed (alone, and together with the built-in one
  // in the hero case, where the slot has to choose). The conversation cases
  // drive the popover, the hero case the segment group.
  var PERMISSION_FIXTURES = {
    'no-auto-review': { extras: [], current: null },
    automode: { extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }], current: 'workspace-write' },
    'automode-current': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified', icon: 'M9 3 5 9h2l-1 5 4-6H8l1-5Z' }],
      current: 'auto-mode',
    },
    'automode-hero': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }, { value: 'auto', name: 'Auto review' }],
      current: 'auto-mode',
    },
    'automode-roundtrip': {
      extras: [{ value: 'auto-mode', name: 'Auto mode', description: 'classified' }],
      current: 'workspace-write',
    },
    // The language case runs the full-access tier, so its trigger carries a
    // name of its own to repaint when the interface language switches.
    'permissions-locale': { extras: [], current: 'danger-full-access' },
  }
  var permissionFixture = PERMISSION_FIXTURES[CASE]
  var catalogExtras = permissionFixture === undefined ? [{ value: 'auto', name: 'Auto review' }] : permissionFixture.extras
  var permissionPresets = {
    catalog: function () {
      return Promise.resolve({
        ok: true,
        value: {
          options: configuredPresetOptions.concat(catalogExtras),
          defaultOptions: configuredPresetOptions,
          defaultPreset: 'workspace-write',
        },
      })
    },
  }
  host.permissionFixture = permissionFixture
  host.permissionPresets = permissionPresets
})()
