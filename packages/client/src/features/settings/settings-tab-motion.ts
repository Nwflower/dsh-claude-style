import * as React from 'react'
import { MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM, ONGOING_INDICATOR_BREATHE, ONGOING_INDICATOR_RING, ONGOING_INDICATOR_SHIMMER } from '../../constants'
import { PreviewCards } from '../../shared/preview-cards'
import type { PreviewOption } from '../../shared/preview-cards'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The Motion tab owns the global animation choice and sidebar ongoing effects;
 * features contribute their own rows through the settings contract (D76).
 */
export function createSettingsMotionTab(): SettingsTab {
  function ongoingPicker(prefs: Prefs, write: SettingsView['write']) {
    // Each sample previews an unselected conversation using its own look;
    // choosing a card changes only the control's pressed state.
    const option = (indicator: Prefs['ongoingIndicator'], label: string): PreviewOption<Prefs['ongoingIndicator']> => ({
      value: indicator,
      label,
      content: React.createElement(
        React.Fragment,
        null,
        React.createElement('span', { className: 'dsh-claude-settings-ongoing-label' }, label),
        React.createElement(
          'span',
          { className: 'dsh-claude-ongoing-sample dsh-claude-ongoing-preview', 'data-look': indicator, 'aria-hidden': 'true' },
          React.createElement('span', { className: 'dsh-claude-ongoing-sample-title dsh-claude-ongoing-title', 'data-look': indicator }, copy('ongoingSample')),
          React.createElement('span', { className: 'dsh-claude-ongoing-mark', 'data-look': indicator }),
        ),
      ),
    })
    const options: PreviewOption<Prefs['ongoingIndicator']>[] = [
      option(ONGOING_INDICATOR_BREATHE, copy('ongoingBreathe')),
      option(ONGOING_INDICATOR_RING, copy('ongoingRing')),
      option(ONGOING_INDICATOR_SHIMMER, copy('ongoingShimmer')),
    ]
    return React.createElement(PreviewCards<Prefs['ongoingIndicator']>, {
      cardClass: 'dsh-claude-ongoing-card',
      label: copy('ongoingTitle'),
      options,
      value: prefs.ongoingIndicator,
      write: (value: Prefs['ongoingIndicator']) => write({ ongoingIndicator: value }),
    })
  }

  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const motionOptions: SegmentOption<Prefs['motion']>[] = [
      { value: MOTION_SYSTEM, label: copy('motionSystem') },
      { value: MOTION_REDUCED, label: copy('motionReduced') },
      { value: MOTION_FULL, label: copy('motionFull') },
    ]
    return [
      {
        rank: 5,
        node: view.controls.row(
          'motion',
          copy('motionTitle'),
          null,
          view.controls.segment(motionOptions, prefs.motion, value => { write({ motion: value }) }),
        ),
      },
      {
        rank: 40,
        node: view.controls.row(
          'ongoingIndicator',
          copy('ongoingTitle'),
          copy('ongoingDesc'),
          ongoingPicker(prefs, write),
          { block: true, aside: view.aside('ongoingIndicator') },
        ),
      },
    ]
  }
  return { id: 'motion', label: () => copy('tabMotion'), rows }
}
