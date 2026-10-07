    /** Markdown list editing uses the host's insertion actions so draft, chips and undo stay owned by the editor. */
    function installComposerLists(ctx, ui) {
      function inputFor(root) {
        if (!ui.composer?.isActive() || !root.isContentEditable) return null
        const resolver = ctx.get('conversation')?.input
        if (typeof resolver?.for !== 'function') return null
        const sessions = ctx.get('sessions')
        if (!sessions) return null
        const id = currentSessionId(ctx, sessions)
        const binding = typeof id === 'string' ? sessions.binding(id) : null
        const input = binding?.ctx ? resolver.for(binding.ctx) : null
        if (input?.editor?.getRootElement() !== root || typeof input.actions?.captureInsertion !== 'function') return null
        return input
      }

      function lineAt(text, offset) {
        const start = text.slice(0, offset).lastIndexOf('\n') + 1
        const next = text.indexOf('\n', offset)
        const end = next === -1 ? text.length : next
        const line = text.slice(start, end)
        const marker = /^([\t ]*)(?:([-+*•])|(\d{1,9})([.)]))([\t ]+)(.*)$/.exec(line)
        return { start, end, line, marker }
      }

      function onKeyDown(event) {
        if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.altKey || event.repeat) return
        const root = event.target instanceof Element ? event.target.closest(COMPOSER_INPUT_SELECTOR) : null
        if (!root || root.hasAttribute('data-composer-composing')) return
        const listShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === 'Digit7' || event.code === 'Digit8')
        if (!listShortcut && (event.key !== 'Enter' || event.ctrlKey || event.metaKey)) return
        const input = inputFor(root)
        if (!input) return
        const span = input.actions.captureInsertion()
        const text = input.projection.detectText
        const current = lineAt(text, span.start)
        if (listShortcut) {
          const prefix = event.code === 'Digit7' ? '1. ' : '- '
          const markerLength = current.marker ? current.marker[0].length - current.marker[6].length : 0
          const sameKind = current.marker && (event.code === 'Digit7' ? current.marker[3] !== undefined : current.marker[2] !== undefined)
          const indentation = current.marker?.[1] ?? /^[\t ]*/.exec(current.line)[0]
          const replacement = sameKind ? indentation : indentation + prefix
          const end = current.start + (markerLength || indentation.length)
          if (!input.actions.insertText(replacement, { ...span, start: current.start, end })) return
        } else {
          if (span.start !== span.end || !current.marker) return
          const [, indent, bullet, number, delimiter, space, content] = current.marker
          const markerEnd = current.start + current.line.length - content.length
          if (span.start < markerEnd) return
          // The command picker gets Enter before list continuation, as it does in the host keymap.
          if (!event.shiftKey && input.arbitrate('enter', false) !== 'pass') {
            event.preventDefault()
            event.stopImmediatePropagation()
            return
          }
          const empty = content.trim() === ''
          const prefix = bullet ?? `${Number(number) + 1}${delimiter}`
          const edit = empty
            ? { ...span, start: current.start, end: current.end }
            : span
          const replacement = empty ? indent : `\n${indent}${prefix}${space}`
          if (!input.actions.insertText(replacement, edit)) return
        }
        event.preventDefault()
        event.stopImmediatePropagation()
      }

      function handleKeyDown(event) {
        // D12: retire only list editing when its host insertion service fails.
        try {
          onKeyDown(event)
        } catch (error) {
          reportFeatureFailure('composerLists', error)
          ui.retire('composerLists')
        }
      }

      document.addEventListener('keydown', handleKeyDown, true)
      ui.composerLists = {}
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true)
        delete ui.composerLists
      }
    }
