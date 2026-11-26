import type { FeatureManifest } from '../../core/feature'

export default {
  id: 'effort',
  order: 90,
  reads: ['model'],
  contracts: [],
  /**
   * The slider's own switch: turning it off hands the composer's model slot
   * back to the host's own seat, so a third-party effort control injected there
   * stays reachable (features/model/model-picker.ts).
   */
  pref: 'effortSlider',
  stylesheets: [{ file: 'effort-picker.css', rank: 270 }],
  settingsRows: [{
    // The slider's own on/off switch; it hands the host's own seat back while off.
    tab: 'composer',
    // Directly under the model picker's switch: the slider sits inside that picker.
    rank: 31,
    pref: 'effortSlider',
    parent: 'modelPicker',
    title: 'effortSliderTitle',
    desc: 'effortSliderDesc',
  }, {
    // The colour speaks on the slider's own trigger, so the row stands directly
    // under the switch that draws it and folds with it (D76).
    tab: 'composer',
    rank: 32,
    pref: 'effortAccent',
    parent: 'effortSlider',
    title: 'effortAccentTitle',
  }],
  cases: []
} satisfies FeatureManifest
