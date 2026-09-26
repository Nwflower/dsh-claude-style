    function installModelPicker(ctx, ui) {
      /**
       * The host's model seat is a click-triggered two-pane menu (Model /
       * Effort rows drilling into their own lists). The skin replaces it with
       * a Claude-style picker: hovering the trigger opens the first level —
       * the DeepSeek official provider's models, a divider, then the
       * reasoning-effort row (when the current model offers one) and a More
       * models row; both open their second level BESIDE the first level.
       *
       * Data and submission ride the host's own per-session ModelDirectory
       * (`ctx.modelDirectories`), the same store the host's menu and the
       * /model command read — so the current selection, catalog and errors
       * stay in sync without scraping the DOM. The host's seat is hidden and
       * marked; a React swap re-marks it on the next pass.
       */
      let modelBtn = null
      let modelPop = null
      let modelSubPop = null
      let modelBody = null
      let modelFooter = null
      let modelSubBody = null
      /** The host slot the seat lives in; the effort picker anchors there too. */
      let modelSlot = null
      /**
       * The picker is two cards wide, and the level-2 card only cancels a pending
       * close once the pointer is ON it — so the grace has to cover the journey
       * from a level-1 row, across the gap, onto the sub card. At the shared 100ms
       * a slow traverse ran it out and both cards folded up mid-journey.
       */
      const MODEL_CLOSE_DELAY = 150
      /** Pending fold of level 2 while the pointer is still crossing level 1. */
      let subFoldTimer = null
      const modelHoverIntent = createHoverIntent(openModelPopover, closeModelIfAway, POPOVER_OPEN_DELAY, MODEL_CLOSE_DELAY)
      /** The More-models cell drills in on the same dwell/grace as the trigger. */
      const modelSubHoverIntent = createHoverIntent(openModelSub, closeModelIfAway, POPOVER_OPEN_DELAY, MODEL_CLOSE_DELAY)
      let modelBodySig = ''
      let modelSubSig = ''
      /**
       * The catalog half of the picker (src/features/model/catalog.js):
       * directory, snapshot, warm-up and the provider listeners. `schedule` is
       * the scheduler wake-up the directory's store subscription calls.
       */
      const modelCatalog = createModelCatalog({
          ctx,
          schedule() { if (ui.schedule) ui.schedule() }
      })
      /**
       * The row half of the picker (src/features/model/rows.js): the level-1
       * and level-2 builders. `pickModel` is this closure's own commit function
       * (a hoisted declaration); the rest is the second level's state.
       */
      const modelRows = createModelRows({
          ctx,
          pickModel,
          subHoverIntent: modelSubHoverIntent,
          isSubOpen() { return modelSubPop !== null && modelSubPop.getAttribute('data-open') === 'true' },
          closeSub: closeModelPopovers,
          openSub: openModelSub
      })

      function cancelCloseModel() {
        modelHoverIntent.cancel()
        if (subFoldTimer !== null) {
          clearTimeout(subFoldTimer)
          subFoldTimer = null
        }
      }

      function scheduleCloseModel() {
        modelHoverIntent.scheduleClose()
      }

      /**
       * Where the pointer last was, tracked only while a card is up. The two cards
       * are separate boxes with a sliver of desktop between them, and a pointer
       * crossing that sliver has not left the picker — without this the grace
       * simply runs out mid-gap and both cards fold.
       */
      let pointer = null
      let pointerBound = false
      function trackPointer(event) {
        pointer = { x: event.clientX, y: event.clientY }
      }
      function trackPointerWhileOpen() {
        const wanted = modelPop !== null && modelPop.getAttribute('data-open') === 'true'
        if (wanted === pointerBound) return
        pointerBound = wanted
        if (wanted) {
          document.addEventListener('mousemove', trackPointer, true)
        } else {
          document.removeEventListener('mousemove', trackPointer, true)
          pointer = null
        }
      }

      /** True while the pointer sits in either card, or in the gap between them. */
      function pointerInPicker() {
        if (pointer === null) return false
        const cards = [modelPop, modelSubPop]
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i]
          if (card === null || card.getAttribute('data-open') !== 'true') continue
          const box = card.getBoundingClientRect()
          if (pointer.x >= box.left - 8 && pointer.x <= box.right + 8 &&
              pointer.y >= box.top - 8 && pointer.y <= box.bottom + 8) return true
        }
        return false
      }

      /** Close on leave, but treat the gap between the two cards as still inside. */
      function closeModelIfAway() {
        if (pointerInPicker()) {
          scheduleCloseModel()
          return
        }
        closeModelPopovers()
      }

      function closeModelPopovers() {
        cancelCloseModel()
        if (modelPop) modelPop.setAttribute('data-open', 'false')
        if (modelSubPop) modelSubPop.setAttribute('data-open', 'false')
      }

      function openModelPopover() {
        cancelCloseModel()
        // One card at a time: the second level is this same choice and stays,
        // every other popover folds (the effort trigger sits beside this one, so
        // leaving its card up would stack two panels over one corner).
        closeOtherPopovers('model')
        const dir = modelCatalog.directory()
        // load() is async — the host itself guards with .catch(() => {}); a bare
        // try/catch cannot see its rejection.
        if (dir && typeof dir.load === 'function') {
          const pending = dir.load()
          if (pending && typeof pending.catch === 'function') {
            pending.catch(() => { /* the store's error surface covers a failure */ })
          }
        }
        if (modelSubPop) modelSubPop.setAttribute('data-open', 'false')
        renderModelBody()
        positionModelPopovers()
        if (modelPop) modelPop.setAttribute('data-open', 'true')
      }

      function openModelSub() {
        cancelCloseModel()
        renderModelSub()
        positionModelPopovers()
        if (modelSubPop) modelSubPop.setAttribute('data-open', 'true')
      }

      function pickModel(provider, modelId) {
        const dir = modelCatalog.directory()
        if (dir === null) return
        // select() is async and rejects on a failed selection, which the host's
        // toast reports; the rejection is dropped the way the host's own seat
        // wrapper drops it.
        const pending = dir.select({ provider, model: modelId })
        if (pending && typeof pending.catch === 'function') pending.catch(() => {})
        closeModelPopovers()
      }

      /** Commit one reasoning level. The slider stays open for the next nudge. */
      function pickEffort(effort) {
        const dir = modelCatalog.directory()
        const snap = modelCatalog.snapshot()
        if (dir === null || !snap || snap.current === null) return
        const selection = { provider: snap.current.provider, model: snap.current.model }
        if (effort !== void 0) selection.reasoningEffort = effort
        // A rejected selection is reported by the host's toast (see pickModel).
        const pending = dir.select(selection)
        if (pending && typeof pending.catch === 'function') pending.catch(() => {})
      }

      /**
       * The footer holds the divider and the More-models row, and nothing else:
       * the effort slider moved to its own card (src/features/effort/effort-picker.js).
       * Rebuilt only when the row set changes — the divider exists to close the
       * list off from what follows it, so with no More-models row it is a stray
       * line and is not drawn either.
       */
      function layoutModelFooter(showMore) {
        if (!modelFooter) return
        const stale = []
        for (let child = modelFooter.firstChild; child !== null; child = child.nextSibling) stale.push(child)
        for (let i = 0; i < stale.length; i++) modelFooter.removeChild(stale[i])
        if (!showMore) return
        modelFooter.appendChild(buildElement('div', 'dsh-claude-model-divider'))
        modelFooter.appendChild(modelRows.buildModelCell(copyLabel('moreLabel', MODEL_MORE_LABEL)))
      }

      /** Level 1: the provider sections, the divider, More models. */
      function renderModelBody() {
        if (!modelBody) return
        const snap = modelCatalog.snapshot()
        const status = snap ? snap.status : 'idle'
        const groups = (snap && snap.groups) || []
        const current = modelCatalog.current(snap)
        let sig = [status, activeLocale(), current ? `${current.group.id}/${current.model.id}` : '', readPrefs().quickProviders.join(',')].join('|')
        for (let g = 0; g < groups.length; g++) sig += `;${groups[g].id}:${groups[g].models.length}`
        if (sig === modelBodySig) {
          return
        }
        modelBodySig = sig
        while (modelBody.firstChild) modelBody.removeChild(modelBody.firstChild)

        // A seat whose data is still in flight must not blank a picker that
        // already has a list. The host marks the directory `selecting` for the
        // WHOLE selectModel round-trip, and that round-trip runs for seconds on
        // providers whose adapters resolve over the network, so nudging the
        // effort used to empty the card for exactly as long as the host took to
        // answer. Only a directory with nothing to show yet falls back to the
        // loading line.
        const seated = groups.length > 0 && current !== null
        if (!seated && (status === 'idle' || status === 'loading' || status === 'selecting')) {
          modelBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copyLabel('loading', MODEL_LOADING_LABEL)))
          layoutModelFooter(false)
        } else {
          const sections = modelRows.levelOneSections(groups)
          if (sections.length === 0) {
            modelBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copyLabel('empty', MODEL_EMPTY_LABEL)))
          } else {
            for (let s = 0; s < sections.length; s++) {
              const section = sections[s]
              // The official source needs no naming, and the first section needs
              // no rule: a bare line above the list would be one line too many.
              const sectionLabel = section.id === MODEL_OFFICIAL_GROUP ? '' : (section.name || section.id)
              if (sectionLabel !== '' || s > 0) modelBody.appendChild(modelRows.buildProviderRule(sectionLabel))
              const sectionModels = section.models.slice().sort(byModelId)
              for (let m = 0; m < sectionModels.length; m++) {
                const selected = current !== null && current.group.id === section.id && current.model.id === sectionModels[m].id
                modelBody.appendChild(modelRows.buildModelOption(section, sectionModels[m], selected, true))
              }
            }
          }
          // The current seat is surfaced under the list when none of the sections
          // above already carries it, so the row the seat is read from is always
          // on screen. Its provider rides a rule of its own rather than trailing
          // the model in parentheses — the same idiom the sections use. It stays
          // above the divider: the divider closes the model list, so anything
          // that belongs to the list has to sit on its side of it.
          let currentListed = false
          for (let c = 0; c < sections.length; c++) {
            if (current !== null && sections[c].id === current.group.id) currentListed = true
          }
          if (current !== null && !currentListed) {
            // The divider above already draws a line, so a provider that needs no
            // naming (the official source) adds nothing here.
            const currentRuleName = current.group.id === MODEL_OFFICIAL_GROUP ? '' : (current.group.name || current.group.id)
            if (currentRuleName !== '') modelBody.appendChild(modelRows.buildProviderRule(currentRuleName))
            const currentRow = buildElement('button', 'dsh-claude-model-option')
            currentRow.type = 'button'
            currentRow.setAttribute('role', 'menuitemradio')
            currentRow.setAttribute('aria-checked', 'true')
            const currentBrand = modelBrand(current.model.id)
            const currentName = current.model.name || current.model.id
            // The brand id is the row's styling hook here too, so this row wears
            // the same vendor lockup and face as the list entry it stands for.
            if (currentBrand) currentRow.setAttribute('data-brand', currentBrand)
            const currentCopy = buildElement('span', 'dsh-claude-model-copy')
            const currentLabel = buildModelLabel(currentName, currentBrand)
            currentCopy.appendChild(currentLabel)
            const currentDesc = modelDescription(ctx, current.group.id, current.model)
            if (currentDesc) currentCopy.appendChild(buildElement('span', 'dsh-claude-model-desc', currentDesc))
            currentRow.appendChild(currentCopy)
            const currentCheck = buildElement('span', 'dsh-claude-popover-check')
            currentCheck.innerHTML = MODEL_CHECK_SVG
            currentRow.appendChild(currentCheck)
            currentRow.addEventListener('click', e => {
              e.stopPropagation()
              closeModelPopovers()
            })
            modelBody.appendChild(currentRow)
          }
          // The divider closes the model list and the More-models row follows it;
          // both live in the footer, OUTSIDE the scroll area — the list above
          // scrolls under them while the row stays reachable. The effort slider
          // is not here any more: it has its own trigger and card.
          if (modelFooter) {
            // "More models" carries what level 1 does not. With every provider
            // already on screen the row would only open an empty card, so it goes
            // away with the last remaining provider.
            const showMore = modelRows.remainingGroups(groups, sections).length > 0
            // The divider exists to close the list off from what follows it. With
            // no More-models row there is nothing left to close off, and a bare
            // line under the list reads as a stray rule. layoutModelFooter owns
            // that judgement.
            layoutModelFooter(showMore)
          }
        }
      }

      /** Level 2: the providers level 1 does NOT show, each headed by its name. */
      function renderModelSub() {
        if (!modelSubBody) return
        const snap = modelCatalog.snapshot()
        const groups = (snap && snap.groups) || []
        const current = modelCatalog.current(snap)
        // What level 2 holds depends on what level 1 lists, so the signature has
        // to carry level 1's provider ids as well.
        const sections = modelRows.levelOneSections(groups)
        const listed = []
        for (let s0 = 0; s0 < sections.length; s0++) listed.push(sections[s0].id)
        let sig2 = `more|${listed.join(',')}`
        for (let g = 0; g < groups.length; g++) sig2 += `;${groups[g].id}:${groups[g].models.length}`
        if (current) sig2 += `#${current.group.id}/${current.model.id}`
        if (sig2 === modelSubSig) return
        modelSubSig = sig2
        while (modelSubBody.firstChild) modelSubBody.removeChild(modelSubBody.firstChild)
        const rest = modelRows.remainingGroups(groups, sections)
        for (let g2 = 0; g2 < rest.length; g2++) {
          const group = rest[g2]
          if (group.models.length === 0) continue
          const groupSection = buildElement('div', 'dsh-claude-model-group-section')
          const groupRow = buildElement('div', 'dsh-claude-model-group-row')
          const groupLabel = buildElement('div', 'dsh-claude-model-group')
          // The group label is the provider's name alone: a mark there would repeat
          // what the rows below already carry inside their lockups.
          groupLabel.appendChild(buildElement('span', 'dsh-claude-model-group-name', group.name))
          groupRow.appendChild(groupLabel)
          groupSection.appendChild(groupRow)
          // A provider's models read in id order, so the list is scannable and stays
          // put between visits; the catalog's own order is whatever the provider
          // happened to send. Sorted on a copy — the snapshot belongs to the store.
          const groupModels = group.models.slice().sort(byModelId)
          for (let m = 0; m < groupModels.length; m++) {
            const selected = current !== null && current.group.id === group.id && current.model.id === groupModels[m].id
            groupSection.appendChild(modelRows.buildModelOption(group, groupModels[m], selected, false))
          }
          modelSubBody.appendChild(groupSection)
        }
        if (modelSubBody.firstChild === null) {
            modelSubBody.appendChild(buildElement('div', 'dsh-claude-popover-status', copyLabel('empty', MODEL_EMPTY_LABEL)))
        }
      }

      function positionModelPopovers() {
        trackPointerWhileOpen()
        if (!modelBtn || !modelPop) return
        const pos = positionAnchoredPopover(modelBtn, modelPop, { side: 'above', gap: 6 })
        if (modelSubPop && modelSubPop.getAttribute('data-open') === 'true') {
          const w2 = modelSubPop.offsetWidth
          const h2 = modelSubPop.offsetHeight
          const h1 = modelPop.offsetHeight
          // Beside the first level; flip to its left when the viewport is tight.
          let x2 = pos.x + modelPop.offsetWidth + 2
          if (x2 + w2 > window.innerWidth - POPOVER_MARGIN) x2 = Math.max(POPOVER_MARGIN, pos.x - 4 - w2)
          // Bottom-aligned with the first level: a short level 2 used to hang from
          // the top, leaving dead space under it that the pointer had to cross to
          // reach the card from the More-models row. A level 2 TALLER than level 1
          // keeps its top instead, so it cannot push itself off the top edge.
          let y2 = pos.y + Math.max(0, h1 - h2)
          y2 = Math.max(POPOVER_MARGIN, Math.min(y2, window.innerHeight - h2 - POPOVER_MARGIN))
          modelSubPop.style.left = `${x2}px`
          modelSubPop.style.top = `${y2}px`
        }
      }

      function ensureModelChrome() {
        // Idempotence guard, not just a null check: the picker's own teardown
        // sweep, or a hot-reload generation's stray sweep, can REMOVE the
        // popover node while the closure still references it. With a null-only
        // check the reference stays non-null-but-detached and is never rebuilt
        // — the trigger then toggles a popover that is not in the document and
        // the picker silently loses its click effect. The account footer's
        // equivalent guard (footArea.contains) is the established pattern.
        // Rebuilding also re-points the body/footer children and resets the
        // render signatures so the next pass repaints into the fresh nodes.
        if (modelPop === null || modelPop.parentElement === null) {
          if (modelPop !== null && modelPop.parentElement !== null) modelPop.parentElement.removeChild(modelPop)
          modelPop = document.createElement('div')
          modelPop.className = 'dsh-claude-popover-card dsh-claude-model-popover'
          modelPop.setAttribute('role', 'menu')
          modelPop.setAttribute('data-open', 'false')
          modelBody = document.createElement('div')
          modelBody.className = 'dsh-claude-popover-body'
          modelPop.appendChild(modelBody)
          modelFooter = document.createElement('div')
          modelFooter.className = 'dsh-claude-model-footer'
          modelPop.appendChild(modelFooter)
          modelPop.addEventListener('mouseenter', cancelCloseModel)
          // The second level belongs to its More-models cell: while it is open,
          // the pointer landing anywhere else on the first level (a model row,
          // bare card) folds it — the first level itself stays open, it is the
          // hover-intent host. Delegated mouseover, not mouseenter: moving from
          // the cell to a model row never crosses the popover's boundary, so a
          // boundary event would never fire.
          modelPop.addEventListener('mouseover', e => {
            if (modelSubPop === null || modelSubPop.getAttribute('data-open') !== 'true') return
            const target = e.target
            if (target && typeof target.closest === 'function' && target.closest('.dsh-claude-model-cell')) return
            // Delayed, not immediate: the sub card sits BESIDE level 1, so a
            // pointer on its way from the cell to the sub crosses level 1's own
            // rows — folding on the spot made that journey impossible at any
            // speed. Folding now waits out the same grace, and stands down if the
            // pointer has meanwhile reached either card.
            if (subFoldTimer !== null) clearTimeout(subFoldTimer)
            subFoldTimer = setTimeout(() => {
              subFoldTimer = null
              if (pointerInPicker()) return
              if (modelSubPop !== null) modelSubPop.setAttribute('data-open', 'false')
            }, MODEL_CLOSE_DELAY)
          })
          modelPop.addEventListener('mouseleave', scheduleCloseModel)
          document.body.appendChild(modelPop)
          modelBodySig = ''
        }
        if (modelSubPop === null || modelSubPop.parentElement === null) {
          if (modelSubPop !== null && modelSubPop.parentElement !== null) modelSubPop.parentElement.removeChild(modelSubPop)
          modelSubPop = document.createElement('div')
          modelSubPop.className = 'dsh-claude-popover-card dsh-claude-model-popover dsh-claude-model-popover-sub'
          modelSubPop.setAttribute('role', 'menu')
          modelSubPop.setAttribute('data-open', 'false')
          modelSubBody = document.createElement('div')
          modelSubBody.className = 'dsh-claude-popover-body'
          modelSubPop.appendChild(modelSubBody)
          modelSubPop.addEventListener('mouseenter', cancelCloseModel)
          modelSubPop.addEventListener('mouseleave', scheduleCloseModel)
          document.body.appendChild(modelSubPop)
          modelSubSig = ''
        }
      }

      /**
       * Hand the host's own model seat and menu back: unmark the seat, remove the
       * skin's trigger and popovers, drop the catalog subscription.
       */
      function dropModelControl() {
        const allHosts = document.querySelectorAll('[data-dsh-claude-model-host]')
        for (let h = 0; h < allHosts.length; h++) {
          allHosts[h].removeAttribute('data-dsh-claude-model-host')
        }
        removeStrayNodes(document, '.dsh-claude-model-btn', [])
        modelBtn = null
        removeStrayNodes(document, '.dsh-claude-model-popover', [])
        modelPop = null
        modelSubPop = null
        modelBody = null
        modelFooter = null
        modelSubBody = null
        modelBodySig = ''
        modelSubSig = ''
        cancelCloseModel()
        modelCatalog.reset()
      }

      /** Build/refresh the trigger, its label and the popover rows. */
      function syncModelControl() {
        // Two ways to be off: the composer restyle does not apply to this page, or
        // the picker preference is off. Both hand the host's own model seat and
        // menu back, so both run the same sweep.
        if (!ui.composer.isActive() || !readPrefs().modelPicker) {
          dropModelControl()
          return
        }

        // The copy document is fetched on first paint of the picker rather than
        // at install, so a session that never opens it never pays for it.
        loadModelCopy()
        modelCatalog.directory()
        modelCatalog.warm()
        const slot = document.querySelector('[data-slot="conversation.input.model"]')
        modelSlot = slot
        if (slot === null) return
        // Hide the host's own seat (React owns the node; re-mark on swap).
        // Idempotent against a torn-down-less reload, like the account footer:
        // client HMR drops the old fiber's disposals, so a previous generation's
        // trigger and popovers are still in the DOM while this fresh scope starts
        // from null. Sweep the strays, or the seat renders twice.
        removeStrayNodes(slot, '.dsh-claude-model-btn', [modelBtn])
        removeStrayNodes(document, 'body > .dsh-claude-model-popover', [modelPop, modelSubPop])
        const hostRoot = slot.firstElementChild
        if (hostRoot !== null && !hostRoot.hasAttribute('data-dsh-claude-model-host')) {
          hostRoot.setAttribute('data-dsh-claude-model-host', '')
        }
        if (modelBtn === null || modelBtn.parentElement !== slot) {
          if (modelBtn !== null && modelBtn.parentElement !== null) modelBtn.parentElement.removeChild(modelBtn)
          modelBtn = document.createElement('button')
          modelBtn.type = 'button'
          modelBtn.className = 'dsh-claude-model-btn'
          modelBtn.setAttribute('aria-haspopup', 'menu')
          modelBtn.innerHTML = '<span class="dsh-claude-model-btn-label"></span>'
          // Same contract as the account trigger: hover under the "All" scope,
          // click-only otherwise.
          modelBtn.addEventListener('mouseenter', () => {
            if (readPrefs().autoPopover === AUTO_POPOVER_ALL) modelHoverIntent.scheduleOpen()
          })
          modelBtn.addEventListener('mouseleave', () => {
            if (readPrefs().autoPopover === AUTO_POPOVER_ALL) scheduleCloseModel()
          })
          modelBtn.addEventListener('click', e => {
            e.stopPropagation()
            if (modelPop && modelPop.getAttribute('data-open') === 'true') closeModelPopovers()
            else openModelPopover()
          })
          slot.appendChild(modelBtn)
        }
        ensureModelChrome()

        const snap = modelCatalog.snapshot()
        const current = modelCatalog.current(snap)
        const groupsNow = (snap && snap.groups) || []
        const label = current ? current.model.name : copyLabel('fallbackLabel', MODEL_FALLBACK_LABEL)
        const labelEl = modelBtn.querySelector('.dsh-claude-model-btn-label')
        if (labelEl) {
          // Same-value guards: syncModelControl runs on every scheduler pass,
          // and an identical write still mutates the DOM (textContent replaces
          // the text node; setAttribute queues an attribute record — and
          // aria-label is in the observer's attributeFilter). Unguarded, each
          // pass feeds the observer that schedules the next pass, keeping one
          // full pass running every frame even at idle.
          if (labelEl.textContent !== label) labelEl.textContent = label
          // The dimmed tone means "no seat to name yet". A selection in flight
          // still names the model in force, so it keeps the normal tone — the
          // host can hold `selecting` for seconds (the effort slider commits
          // through that same RPC), and a greyed-out trigger for that long
          // reads as broken rather than busy.
          const unsettled = !!(snap && (snap.status === 'loading' || snap.status === 'idle' || snap.status === 'selecting')) && !(groupsNow.length > 0 && current !== null)
          labelEl.classList.toggle('dsh-claude-model-btn-loading', unsettled)
        }
        // The level is NOT part of this trigger any more: it has its own button
        // beside it (src/features/effort/effort-picker.js). A stale "· High" span from
        // an older generation is swept rather than reused.
        const staleEffortEl = modelBtn.querySelector('.dsh-claude-model-btn-effort')
        if (staleEffortEl !== null) staleEffortEl.parentElement.removeChild(staleEffortEl)
        const triggerAria = copyLabel('triggerLabel', MODEL_TRIGGER_LABEL, { model: label })
        if (modelBtn.getAttribute('aria-label') !== triggerAria) modelBtn.setAttribute('aria-label', triggerAria)
        modelBtn.disabled = false

        renderModelBody()
        if (modelSubPop && modelSubPop.getAttribute('data-open') === 'true') {
          renderModelSub()
          positionModelPopovers()
        } else if (modelPop && modelPop.getAttribute('data-open') === 'true') {
          positionModelPopovers()
        }
      }


      // The picker takes part in the shared popover rule (shared/popover.js): one
      // entry for BOTH levels, so opening the More-models card never folds the
      // card that carries it.
      registerPopover('model', closeModelPopovers)

      ui.model = {
        sync: syncModelControl,
        /**
         * Close both levels of the picker. The scheduler calls this for every
         * dismiss reason ('outside', 'escape', 'composer') and the picker acts
         * on all of them, so the reason is ignored; other features (the effort
         * picker) call it with none.
         */
        close() { closeModelPopovers() },
        /**
         * What the effort picker (a separate fragment that owns the level's
         * trigger and card) reads from this one: the seat slot, the model
         * trigger it sits beside, the effort descriptor and the commit call.
         * `effort()` re-reads the catalog every call, so a level the host echoes
         * back lands on the knob without either fragment pushing it.
         */
        seat() { return modelSlot },
        /** The skin's model trigger while it is in the document, else null. */
        trigger() { return modelBtn !== null && modelBtn.isConnected ? modelBtn : null },
        effort() { return modelCatalog.effort(modelCatalog.snapshot()) },
        /**
         * Whether the catalog can match the current selection to a group and
         * model. FALSE is "cannot name the seat" (the snapshot is still arriving,
         * or the provider group is not in it), which is not the same as "the seat
         * has no levels".
         */
        named() { return modelCatalog.current(modelCatalog.snapshot()) !== null },
        /**
         * Whether the catalog is currently able to name the seat. FALSE means
         * "in flight": the host re-enumerates the whole directory for seconds
         * after every selection, and during that window the snapshot can have no
         * groups, no current seat and no reasoning metadata. Readers must not
         * read that as "this model has no levels" — the model card learned this
         * the hard way (it blanked its list on every pick), and the effort card
         * would take its trigger away mid-selection.
         */
        settled() {
          const snap = modelCatalog.snapshot()
          if (!snap) return true
          const inFlight = snap.status === 'loading' || snap.status === 'idle' || snap.status === 'selecting'
          const groups = snap.groups || []
          return !inFlight || (groups.length > 0 && modelCatalog.current(snap) !== null)
        },
        pickEffort,
        owns(target) {
          if (!target) return false
          return (modelBtn !== null && modelBtn.contains(target)) ||
                 (modelPop !== null && modelPop.contains(target)) ||
                 (modelSubPop !== null && modelSubPop.contains(target))
        },
        reposition: positionModelPopovers,
        providers: modelCatalog.providers,
        onProviders: modelCatalog.onProviders,
        /**
         * A copy source changed: drop the render signatures so the next pass
         * repaints the rows in the new language.
         */
        onCopyChange() {
          modelBodySig = ''
          modelSubSig = ''
        },
        // Removes the skin's DOM too: a feature switched off mid-session (see
        // src/entry.js) keeps the stylesheet around it, so the seat has to be
        // handed back here rather than by the stylesheet going away.
        teardown() {
          dropModelControl()
          modelCatalog.resetWarm()
          modelSlot = null
          unregisterPopover('model')
        }
      }

      return ui.model.teardown
    }
