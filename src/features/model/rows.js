    /**
     * Model picker rows: the row/cell builders and the two level-1 list
     * selectors.
     *
     * Split out of installModelPicker (src/features/model/model-picker.js); this
     * fragment is the row half of that feature. createModelRows reaches the
     * feature's closure only through its options: ctx (the copy lookup),
     * pickModel(provider, modelId) (commit a row), subHoverIntent (the
     * More-models dwell/grace), and isSubOpen() / closeSub() / openSub() (the
     * second level's state). The two SVG strings and byModelId are pure and
     * stay at the fragment's top level.
     */
    const MODEL_CHECK_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"/></svg>'
    const MODEL_CHEVRON_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>'

    /** Catalog order is whatever the provider happened to send; id order is scannable. */
    function byModelId(a, b) {
        const left = String(a.id)
        const right = String(b.id)
        return left < right ? -1 : left > right ? 1 : 0
    }

    function createModelRows(options) {
        const ctx = options.ctx
        const pickModel = options.pickModel
        const subHoverIntent = options.subHoverIntent
        const isSubOpen = options.isSubOpen
        const closeSub = options.closeSub
        const openSub = options.openSub

        /**
         * The rule that separates one provider's models from the next. The provider
         * name rides the rule itself rather than trailing the model in parentheses:
         * one quiet line above the group says who serves it, and the model names
         * stay clean.
         */
        function buildProviderRule(name) {
            const rule = modelEl('div', 'dsh-claude-model-rule')
            if (name) rule.appendChild(modelEl('span', 'dsh-claude-model-rule-name', name))
            return rule
        }

        /** One selectable model row: brand mark, name, optional description line and a check when current. */
        function buildModelOption(group, model, selected, withDescription) {
            const item = modelEl('button', 'dsh-claude-model-option')
            item.type = 'button'
            item.setAttribute('role', 'menuitemradio')
            item.setAttribute('aria-checked', selected ? 'true' : 'false')
            const brand = modelBrand(model.id)
            // The brand id is the row's styling hook — it is what gives a vendor's rows
            // their own typography (see .dsh-claude-model-name in
            // features/model/model-picker.css). The vendor's mark is no longer drawn
            // here: it rides inside the label's lockup. The scheduler's attributeFilter
            // does not watch data-*, so this write cannot re-trigger a pass.
            if (brand) item.setAttribute('data-brand', brand)
            const copy = modelEl('span', 'dsh-claude-model-copy')
            copy.appendChild(buildModelLabel(model.name, brand))
            // The description belongs to level 1 only: that list is the official
            // catalog, short enough that the line is what tells the models apart,
            // while "More models" is every provider's full catalog and reads better
            // as names alone. One line, in the shell's language — the copy document is
            // localized rather than stacked, so a row never carries two languages.
            const desc = withDescription ? modelDescription(ctx, group.id, model) : ''
            if (desc) copy.appendChild(modelEl('span', 'dsh-claude-model-desc', desc))
            item.appendChild(copy)
            const check = modelEl('span', 'dsh-claude-model-check')
            check.innerHTML = selected ? MODEL_CHECK_SVG : ''
            item.appendChild(check)
            item.addEventListener('click', ((g, m) => e => {
                e.stopPropagation()
                pickModel(g, m)
            })(group.id, model.id))
            return item
        }

        /** The More-models row: label + chevron, hover opens the second level. */
        function buildModelCell(label) {
            const cell = modelEl('button', 'dsh-claude-model-cell')
            cell.type = 'button'
            cell.setAttribute('role', 'menuitem')
            cell.appendChild(modelEl('span', 'dsh-claude-model-cell-label', label))
            const chevron = modelEl('span', 'dsh-claude-model-cell-chevron')
            chevron.innerHTML = MODEL_CHEVRON_SVG
            cell.appendChild(chevron)
            cell.addEventListener('mouseenter', () => {
                if (readPrefs().autoPopover === AUTO_POPOVER_ALL) subHoverIntent.scheduleOpen()
            })
            cell.addEventListener('mouseleave', () => {
                // A pointer that only crossed the cell must not drill in behind it.
                subHoverIntent.cancel()
            })
            cell.addEventListener('click', e => {
                e.stopPropagation()
                if (isSubOpen()) closeSub()
                else openSub()
            })
            return cell
        }

        /**
         * The providers level 1 lists: the official service first, then the quick
         * providers the settings page picked. Only when the catalog has no
         * (non-empty) official service at all does the list fall back to the
         * picked providers, and with none picked to every provider.
         */
        function levelOneSections(groups) {
            const sections = []
            const chosen = readPrefs().quickProviders
            for (let g0 = 0; g0 < groups.length; g0++) {
                if (groups[g0].id === MODEL_OFFICIAL_GROUP && groups[g0].models.length > 0) {
                    sections.push(groups[g0])
                    break
                }
            }
            for (let g2 = 0; g2 < groups.length; g2++) {
                if (!chosen.includes(groups[g2].id) || groups[g2].id === MODEL_OFFICIAL_GROUP || groups[g2].models.length === 0) continue
                sections.push(groups[g2])
            }
            if (sections.length === 0) {
                for (let g4 = 0; g4 < groups.length; g4++) {
                    if (groups[g4].models.length > 0) sections.push(groups[g4])
                }
            }
            return sections
        }

        /**
         * The provider groups level 1 does NOT show — which is exactly what level 2
         * is for. Repeating a provider across the two cards made the same models
         * appear twice, one card apart.
         *
         * Only a GROUP counts as shown. The seat level 1 surfaces as a row of its
         * own does not: that row carries one model, not the provider, so hiding the
         * provider's remaining models behind it would strand them.
         */
        function remainingGroups(groups, sections) {
            const shown = {}
            for (let i = 0; i < sections.length; i++) shown[sections[i].id] = true
            const out = []
            for (let g = 0; g < groups.length; g++) {
                if (groups[g].models.length === 0 || shown[groups[g].id] === true) continue
                out.push(groups[g])
            }
            return out
        }

        return {
            buildProviderRule,
            buildModelOption,
            buildModelCell,
            levelOneSections,
            remainingGroups
        }
    }
