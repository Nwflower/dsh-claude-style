import * as React from 'react'
import { DARK_THEME_ATTRIBUTE } from '@dsh-claude-style/contracts/dom'
import {
  CONTEXT_RAMP_MAX_STOPS,
  CONTEXT_RAMP_MIN_STOPS,
  clampRampPercent,
  resolveContextRampStops,
  serializeContextRamp,
} from '@dsh-claude-style/contracts/context-ramp'
import { subscribeMutations } from '@dsh-claude-style/engine/bus'
import { CONTEXT_DISPLAY_PIE } from '../../constants'
import { motionReduced } from '../../core/prefs'
import { motionMs } from '../../shared/motion'
import { contextPieImage } from './context-meter-pie'
import { METER_RING_RADIUS, METER_RING_SIZE, ringDash } from './context-meter-face'
import {
  contextRampColorAt,
  contextRampGradientCss,
  hexToCssRgb,
  isContextDarkTheme,
  readableContextInk,
} from './context-ramp'
import { copy } from './copy'
import type { ContextRampStop } from '@dsh-claude-style/contracts/context-ramp'
import type { Prefs } from '../../constants'

const HEX_COLOR_RE = /^#?[0-9a-f]{6}$/i
const STATIC_PREVIEW_PERCENT = 68

/** Subscribe to `data-ds-dark-theme` on `<body>` so ramp samples repaint on theme flips. */
export function useContextDarkTheme(): boolean {
  const [dark, setDark] = React.useState(isContextDarkTheme)
  React.useEffect(
    () => subscribeMutations(
      document.body,
      { attributes: true, attributeFilter: [DARK_THEME_ATTRIBUTE] },
      () => setDark(isContextDarkTheme()),
    ),
    [],
  )
  return dark
}

/** Animate preview occupancy smoothly from 1% up to 100% and back to 1%. */
export function useAnimatedMeterPercent(disabled: boolean | undefined, motionPref: Prefs['motion']): number {
  const [percent, setPercent] = React.useState(() => (
    disabled === true || motionReduced() ? STATIC_PREVIEW_PERCENT : 1
  ))
  React.useEffect(() => {
    if (disabled === true || motionReduced()) {
      setPercent(STATIC_PREVIEW_PERCENT)
      return
    }
    const period = motionMs('--dsh-claude-period-preview-meter')
    const startedAt = performance.now()
    let lastShown = 1
    setPercent(1)
    let frameId = 0
    const tick = (now: number) => {
      if (!document.hidden) {
        const phase = (((now - startedAt) % period) + period) % period / period
        const wave = (1 - Math.cos(2 * Math.PI * phase)) / 2
        const next = Math.min(100, Math.max(1, Math.round(1 + 99 * wave)))
        if (next !== lastShown) {
          lastShown = next
          setPercent(next)
        }
      }
      frameId = window.requestAnimationFrame(tick)
    }
    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [disabled, motionPref])
  return percent
}

/** Paint a pie sample, reading `--dsh-claude-pie-rest` only on mount and theme flips (D40). */
function PieSampleFace(props: { percent: number, graphicRgb: string, dark: boolean }) {
  const fallbackRest = props.dark ? 'rgba(250, 249, 245, 0.18)' : 'rgba(20, 20, 19, 0.14)'
  const [restColor, setRestColor] = React.useState(fallbackRest)
  const face = React.useRef<HTMLSpanElement | null>(null)
  React.useEffect(() => {
    const element = face.current
    if (element === null) {
      setRestColor(fallbackRest)
      return
    }
    const tokenRest = getComputedStyle(element).getPropertyValue('--dsh-claude-pie-rest').trim()
    setRestColor(tokenRest === '' ? fallbackRest : tokenRest)
  }, [props.dark, fallbackRest])
  return React.createElement('span', {
    ref: face,
    className: 'dsh-claude-context-sample-pie',
    style: { backgroundImage: contextPieImage(props.percent, props.graphicRgb, restColor) },
  })
}

/** Shared context-meter sample rendered in the two shape cards and in the stats-bar miniature toolbar. */
export function ContextMeterSample(props: {
  face: Prefs['contextDisplay']
  percent: number
  stops: readonly ContextRampStop[]
  showNumber: boolean
  dark: boolean
  compact?: boolean
}) {
  const { graphic } = contextRampColorAt(props.percent, props.stops)
  const graphicRgb = hexToCssRgb(graphic)
  const ink = readableContextInk(graphic, props.dark)
  return React.createElement(
    'span',
    {
      className: props.compact === true
        ? 'dsh-claude-context-sample dsh-claude-context-sample-compact'
        : 'dsh-claude-context-sample',
      'data-face': props.face,
      'aria-hidden': 'true',
    },
    React.createElement(
      'span',
      { className: 'dsh-claude-context-sample-face' },
      props.face === CONTEXT_DISPLAY_PIE
        ? React.createElement(PieSampleFace, { percent: props.percent, graphicRgb, dark: props.dark })
        : React.createElement(
          'svg',
          { viewBox: `0 0 ${METER_RING_SIZE} ${METER_RING_SIZE}`, 'aria-hidden': 'true' },
          React.createElement('circle', {
            className: 'dsh-claude-context-sample-track',
            cx: METER_RING_SIZE / 2,
            cy: METER_RING_SIZE / 2,
            r: METER_RING_RADIUS,
          }),
          React.createElement('circle', {
            className: 'dsh-claude-context-sample-arc',
            cx: METER_RING_SIZE / 2,
            cy: METER_RING_SIZE / 2,
            r: METER_RING_RADIUS,
            transform: `rotate(-90 ${METER_RING_SIZE / 2} ${METER_RING_SIZE / 2})`,
            strokeDasharray: ringDash(props.percent),
            style: { stroke: graphicRgb },
          }),
        ),
    ),
    props.showNumber
      ? React.createElement(
        'span',
        { className: 'dsh-claude-context-sample-value', style: { color: ink } },
        `${props.percent}%`,
      )
      : null,
  )
}

/** Shared sub-row inside a settings block, matching settings-row title and description metrics. */
export function SettingsSubField(props: {
  title: string
  desc: string
  className?: string
  footer?: React.ReactNode
  children?: React.ReactNode
}) {
  const className = props.className === undefined
    ? 'dsh-claude-stats-bar-field'
    : `dsh-claude-stats-bar-field ${props.className}`
  return React.createElement(
    'div',
    { className },
    React.createElement(
      'div',
      { className: 'dsh-claude-stats-bar-field-text' },
      React.createElement('div', { className: 'dsh-claude-settings-row-title' }, props.title),
      React.createElement('div', { className: 'dsh-claude-settings-row-desc' }, props.desc),
    ),
    props.children,
    props.footer ?? null,
  )
}

/** Update one stop's threshold, re-sort ascending, and return its new sorted index. */
function moveStopAt(
  stops: readonly ContextRampStop[],
  targetIndex: number,
  nextAt: number,
): { stops: ContextRampStop[], index: number } {
  const clamped = clampRampPercent(nextAt)
  const tagged = stops.map((stop, index) => ({
    at: index === targetIndex ? clamped : stop.at,
    color: stop.color,
    picked: index === targetIndex,
    order: index,
  }))
  tagged.sort((left, right) => left.at - right.at || left.order - right.order)
  return {
    stops: tagged.map(({ at, color }) => ({ at, color })),
    index: Math.max(0, tagged.findIndex(item => item.picked)),
  }
}

/** Insert a stop and return the sorted list alongside the new stop's index. */
function insertStop(
  stops: readonly ContextRampStop[],
  added: ContextRampStop,
): { stops: ContextRampStop[], index: number } {
  const tagged = [
    ...stops.map((stop, index) => ({ ...stop, picked: false, order: index })),
    { at: clampRampPercent(added.at), color: added.color.toLowerCase(), picked: true, order: stops.length },
  ]
  tagged.sort((left, right) => left.at - right.at || left.order - right.order)
  return {
    stops: tagged.slice(0, CONTEXT_RAMP_MAX_STOPS).map(({ at, color }) => ({ at, color })),
    index: Math.max(0, tagged.findIndex(item => item.picked)),
  }
}

interface DragState {
  pointerId: number
  moved: boolean
  stops: ContextRampStop[]
  index: number
}

/** Custom 0–100 % OKLCH gradient strip with draggable stop handles and active-stop inspector. */
export function ContextRampEditor(props: {
  activeStops: readonly ContextRampStop[]
  disabled: boolean
  onDraftStops(stops: ContextRampStop[] | null): void
  onCommitRamp(rawRamp: string): void
}) {
  const { activeStops, disabled, onDraftStops, onCommitRamp } = props
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const safeIndex = Math.min(selectedIndex, activeStops.length - 1)
  const selectedStop = activeStops[safeIndex]

  const [hexText, setHexText] = React.useState(selectedStop.color)
  const [percentText, setPercentText] = React.useState(String(selectedStop.at))
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const dragRef = React.useRef<DragState | null>(null)

  React.useEffect(() => {
    setHexText(selectedStop.color)
  }, [selectedStop.color, safeIndex])

  React.useEffect(() => {
    setPercentText(String(selectedStop.at))
  }, [selectedStop.at, safeIndex])

  function percentFromPointer(clientX: number): number {
    const track = trackRef.current
    if (track === null) return selectedStop.at
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return selectedStop.at
    return clampRampPercent(((clientX - rect.left) / rect.width) * 100)
  }

  function commitStops(stops: readonly ContextRampStop[]) {
    onCommitRamp(serializeContextRamp(stops))
  }

  function updateSelectedColor(nextHex: string) {
    const normalized = (nextHex.startsWith('#') ? nextHex : `#${nextHex}`).toLowerCase()
    const nextStops = activeStops.map((stop, index) => (
      index === safeIndex ? { ...stop, color: normalized } : stop
    ))
    commitStops(nextStops)
  }

  function commitHexInput() {
    if (!HEX_COLOR_RE.test(hexText.trim())) {
      setHexText(selectedStop.color)
      return
    }
    const trimmed = hexText.trim()
    const normalized = (trimmed.startsWith('#') ? trimmed : `#${trimmed}`).toLowerCase()
    setHexText(normalized)
    if (normalized !== selectedStop.color) updateSelectedColor(normalized)
  }

  function commitPercentInput() {
    const parsed = Number.parseInt(percentText.trim(), 10)
    if (!Number.isFinite(parsed)) {
      setPercentText(String(selectedStop.at))
      return
    }
    const moved = moveStopAt(activeStops, safeIndex, parsed)
    setSelectedIndex(moved.index)
    setPercentText(String(moved.stops[moved.index].at))
    if (moved.stops[moved.index].at !== selectedStop.at) commitStops(moved.stops)
  }

  function removeStopAt(targetIndex: number) {
    if (activeStops.length <= CONTEXT_RAMP_MIN_STOPS) return
    const nextStops = activeStops.filter((_, index) => index !== targetIndex)
    setSelectedIndex(Math.min(targetIndex, nextStops.length - 1))
    commitStops(nextStops)
  }

  function finishPointerDrag(event: React.PointerEvent<HTMLButtonElement>, shouldCommit: boolean) {
    const drag = dragRef.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onDraftStops(null)
    if (shouldCommit && drag.moved) commitStops(drag.stops)
  }

  const canAdd = activeStops.length < CONTEXT_RAMP_MAX_STOPS && !disabled
  const canRemove = activeStops.length > CONTEXT_RAMP_MIN_STOPS
  const addHint = copy('contextRampAddHint').replace('{max}', String(CONTEXT_RAMP_MAX_STOPS))

  return React.createElement(
    'div',
    { className: 'dsh-claude-context-ramp-stage' },
    React.createElement(
      'div',
      {
        ref: trackRef,
        className: 'dsh-claude-context-ramp-track',
        'data-can-add': canAdd ? '' : undefined,
        title: canAdd ? addHint : undefined,
        style: { backgroundImage: contextRampGradientCss(activeStops) },
        onClick(event: React.MouseEvent<HTMLDivElement>) {
          if (!canAdd || event.target !== event.currentTarget) return
          const at = percentFromPointer(event.clientX)
          const color = contextRampColorAt(at, activeStops).graphic
          const inserted = insertStop(activeStops, { at, color })
          setSelectedIndex(inserted.index)
          commitStops(inserted.stops)
        },
      },
      activeStops.map((stop, index) => {
        const active = index === safeIndex
        const label = copy('contextRampStopLabel')
          .replace('{index}', String(index + 1))
          .replace('{percent}', String(stop.at))
        return React.createElement('button', {
          key: `${index}-${stop.color}`,
          type: 'button',
          className: 'dsh-claude-context-ramp-stop',
          disabled,
          'data-stop-index': String(index),
          'data-active': active ? '' : undefined,
          'aria-label': `${label} ${stop.color}`,
          'aria-pressed': active ? 'true' : 'false',
          style: { left: `${stop.at}%`, backgroundColor: stop.color },
          onClick(event: React.MouseEvent<HTMLButtonElement>) {
            event.stopPropagation()
            setSelectedIndex(index)
          },
          onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
            if (disabled || event.button !== 0) return
            event.stopPropagation()
            setSelectedIndex(index)
            event.currentTarget.setPointerCapture(event.pointerId)
            dragRef.current = {
              pointerId: event.pointerId,
              moved: false,
              stops: [...activeStops],
              index,
            }
          },
          onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
            const drag = dragRef.current
            if (drag === null || drag.pointerId !== event.pointerId) return
            const nextAt = percentFromPointer(event.clientX)
            if (nextAt === drag.stops[drag.index].at) return
            const moved = moveStopAt(drag.stops, drag.index, nextAt)
            dragRef.current = {
              pointerId: drag.pointerId,
              moved: true,
              stops: moved.stops,
              index: moved.index,
            }
            setSelectedIndex(moved.index)
            onDraftStops(moved.stops)
          },
          onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
            finishPointerDrag(event, true)
          },
          onPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
            finishPointerDrag(event, false)
          },
          onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
            if (disabled) return
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault()
              const delta = (event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1) * (event.shiftKey ? 5 : 1)
              const moved = moveStopAt(activeStops, index, stop.at + delta)
              setSelectedIndex(moved.index)
              commitStops(moved.stops)
              return
            }
            if ((event.key === 'Backspace' || event.key === 'Delete') && canRemove) {
              event.preventDefault()
              removeStopAt(index)
            }
          },
        })
      }),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-context-ramp-ticks', 'aria-hidden': 'true' },
      React.createElement('span', null, '0%'),
      React.createElement('span', null, canAdd ? addHint : '50%'),
      React.createElement('span', null, '100%'),
    ),
    React.createElement(
      'div',
      { className: 'dsh-claude-context-ramp-toolbar' },
      React.createElement(
        'div',
        { className: 'dsh-claude-context-ramp-controls' },
        React.createElement(
          'label',
          { className: 'dsh-claude-context-ramp-swatch', style: { backgroundColor: selectedStop.color } },
          React.createElement('input', {
            type: 'color',
            className: 'dsh-claude-context-ramp-color-input',
            value: selectedStop.color,
            disabled,
            'aria-label': copy('contextRampStopColor'),
            onChange(event: React.ChangeEvent<HTMLInputElement>) {
              setHexText(event.target.value.toLowerCase())
              updateSelectedColor(event.target.value)
            },
          }),
        ),
        React.createElement('input', {
          type: 'text',
          className: 'dsh-claude-context-ramp-field dsh-claude-context-ramp-hex',
          value: hexText,
          maxLength: 7,
          disabled,
          spellCheck: false,
          autoComplete: 'off',
          'aria-label': copy('contextRampStopHex'),
          onChange(event: React.ChangeEvent<HTMLInputElement>) {
            const next = event.target.value
            setHexText(next)
            if (/^#[0-9a-f]{6}$/i.test(next.trim())) updateSelectedColor(next.trim())
          },
          onBlur: commitHexInput,
          onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitHexInput()
              event.currentTarget.blur()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setHexText(selectedStop.color)
              event.currentTarget.blur()
            }
          },
        }),
        React.createElement(
          'label',
          { className: 'dsh-claude-context-ramp-field dsh-claude-context-ramp-percent-box' },
          React.createElement('input', {
            type: 'text',
            inputMode: 'numeric',
            className: 'dsh-claude-context-ramp-percent',
            value: percentText,
            maxLength: 3,
            disabled,
            'aria-label': copy('contextRampStopPercent'),
            onChange(event: React.ChangeEvent<HTMLInputElement>) {
              setPercentText(event.target.value)
            },
            onBlur: commitPercentInput,
            onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitPercentInput()
                event.currentTarget.blur()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                setPercentText(String(selectedStop.at))
                event.currentTarget.blur()
              }
            },
          }),
          React.createElement('span', { className: 'dsh-claude-context-ramp-unit' }, '%'),
        ),
      ),
      canRemove
        ? React.createElement(
          'button',
          {
            type: 'button',
            className: 'dsh-claude-context-ramp-remove',
            disabled,
            onClick() {
              removeStopAt(safeIndex)
            },
          },
          copy('contextRampStopRemove'),
        )
        : null,
    ),
  )
}

export { resolveContextRampStops, serializeContextRamp }
