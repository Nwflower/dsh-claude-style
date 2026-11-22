import * as React from 'react'

/** Shared classes own interaction styling; feature classes and attributes own preview content (D76). */

/** The row's group: settings-cards.css lays its cards out as one grid. */
export const PREVIEW_PICKER_CLASS = 'dsh-claude-preview-picker'
/** One card of the row: the shell every preview card wears. */
export const PREVIEW_CARD_CLASS = 'dsh-claude-preview-card'

/** One option a preview row offers. */
export interface PreviewOption<V extends string> {
  /** The value the card stores when it is pressed. */
  value: V
  /** The card's accessible name. */
  label: string
  /** What the card paints. */
  content: React.ReactNode
  /** Attributes the card reads its paint off (`data-face`, `data-fade`, the brand's own). */
  attributes?: Record<string, string | undefined>
}

export interface PreviewCardsProps<V extends string> {
  /** The class naming this row's cards, beside the shell's own. */
  cardClass: string
  options: readonly PreviewOption<V>[]
  /** The value on show, which a press compares itself against. */
  value: V
  /** The press's answer: the value the reader asked for. */
  write(value: V): void
  disabled?: boolean
  /** Whether a card stands picked, for rows whose press is a rule of their own; the row's `value` by default. */
  pickedBy?(option: PreviewOption<V>): boolean
  /** Whether each card writes its answer above the sample, for a row whose two cards would otherwise differ only in motion. */
  showLabels?: boolean
  /** The group's accessible name. */
  label?: string
  /** The group element, for a row that writes its samples' own measure on it. */
  element?: React.RefObject<HTMLDivElement | null>
  /** What a card does when it is pressed, for a row whose press also says something else. */
  press?(option: PreviewOption<V>): void
}

/**
 * The row's cards, as one `role="group"` holding a card per option.
 *
 * @param props - the row's options, the stored value and the press's answer.
 * @returns the group element holding one card per option.
 */
export function PreviewCards<V extends string>(props: PreviewCardsProps<V>) {
  const { cardClass, options, value, write, disabled, pickedBy, showLabels, label, element, press } = props
  return React.createElement(
    'div',
    { className: PREVIEW_PICKER_CLASS, role: 'group', 'aria-label': label, ref: element },
    options.map(option => {
      const selected = pickedBy === undefined ? option.value === value : pickedBy(option)
      // A card that names nothing holds its sample alone, so a reader's walk of
      // the tree finds one child where the sample is.
      const children = showLabels === true
        ? [React.createElement('span', { key: 'label', className: 'dsh-claude-settings-card-label' }, option.label), option.content]
        : [option.content]
      return React.createElement(
        'button',
        {
          key: option.value,
          type: 'button',
          className: `${PREVIEW_CARD_CLASS} ${cardClass}`,
          disabled,
          ...option.attributes,
          'data-active': selected ? '' : undefined,
          'aria-pressed': selected ? 'true' : 'false',
          'aria-label': option.label,
          onClick: () => {
            // A press on the card already standing changes nothing.
            if (option.value === value) return
            if (press === undefined) write(option.value)
            else press(option)
          },
        },
        ...children,
      )
    }),
  )
}
