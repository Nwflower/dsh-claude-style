import * as React from 'react'
import { copy } from './copy'
import { openPanelFile } from './session-panel-host'
import { usePanelReading } from './session-panel-data'
import { Chip, FoldedList, Row, detailsCard, panelEntry } from './panel-rows'
import { PictureMark, SheetMark } from './session-panel-marks'
import type { PanelOutput } from '@dsh-claude-style/contracts/session-panel'

const h = React.createElement

/** The folder a `/` or `\` separated path lies in; empty for a path of one segment. */
function parentPath(path: string) {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

/** What an output row wears: the frame of a picture, the sheet of everything else. */
function outputMark(kind: PanelOutput['kind']) {
  return kind === 'image' ? h(PictureMark) : h(SheetMark)
}

/**
 * The files the session presented or wrote in its latest turn (D113).
 *
 * A row names the file and the folder it lies in; its hover card carries the
 * whole path. Writing is what nearly every row would say, so only a file the
 * model presented carries its word. With no file the section renders nothing,
 * and the host's panel hides it.
 */
export const OutputsSection = panelEntry(function OutputsBody({ sessionId, factories }) {
  const { value } = usePanelReading(sessionId)
  if (value === null || value.outputs.length === 0) return null
  const directory = value.directory ?? undefined
  return h(FoldedList, {
    list: copy('outputs'),
    factories,
    rows: value.outputs.map(output => h(Row, {
      key: output.path,
      kind: 'dsh-claude-panel-quiet-mark',
      mark: outputMark(output.kind),
      title: output.name,
      detail: parentPath(output.display),
      card: detailsCard(factories, { title: output.name, lines: [output.path] }),
      side: output.origin === 'presented' ? h(Chip, { text: copy('presented') }) : undefined,
      onClick: () => openPanelFile(sessionId, directory, output.path),
    })),
  })
})
