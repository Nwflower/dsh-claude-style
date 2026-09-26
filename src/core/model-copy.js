    /**
     * Model & settings localized copy.
     *
     * The copy document ships as `model-descriptions.json` beside the bundle.
     * Both the model picker (src/features/model/model-picker.js) and the settings section
     * (src/features/settings/settings.js) consume this copy, so the state lives in the shared context.
     * where both zones can reach it.
     */
    let modelCopy = null
    let modelCopyRequested = false
    const modelCopyListeners = []

    function onModelCopyLoaded(listener) {
      modelCopyListeners.push(listener)
      return () => {
        const index = modelCopyListeners.indexOf(listener)
        if (index !== -1) modelCopyListeners.splice(index, 1)
      }
    }

    /**
     * Fetch the model copy document the host half serves.
     */
    function loadModelCopy() {
      if (modelCopyRequested) return
      modelCopyRequested = true
      fetch(MODEL_COPY_ROUTE, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.json()
        })
        .then(doc => {
          modelCopy = indexModelCopy(doc)
          if (modelCopy !== null) notifyAll(modelCopyListeners, modelCopy)
        }, () => { /* the host half did not answer: the bundle's English constants stay */ })
    }

    /**
     * Compile a copy document into the shape lookups want: a folded id index,
     * the alias table, and the rule lists with their regexps built once.
     * @param doc - parsed document, as validated by the build.
     * @returns the index, or null when the document is unusable.
     */
    function indexModelCopy(doc) {
      if (!doc || typeof doc !== 'object') return null
      const exact = doc.exact && typeof doc.exact === 'object' ? doc.exact : {}
      const brands = doc.brands && typeof doc.brands === 'object' ? doc.brands : {}
      const index = {
        ui: doc.ui && typeof doc.ui === 'object' ? doc.ui : {},
        settings: doc.settings && typeof doc.settings === 'object' ? doc.settings : {},
        // The account-hold easter egg's page copy rides the same document
        // (src/features/ban-screen/ban-screen.js). Every block the document carries has to
        // be listed here: this index IS what lookups read, so an unlisted block
        // would silently fall back to the bundle's English constants.
        ban: doc.ban && typeof doc.ban === 'object' ? doc.ban : {},
        exact,
        aliases: doc.aliases && typeof doc.aliases === 'object' ? doc.aliases : {},
        fallback: typeof doc.fallback === 'string' && doc.fallback ? doc.fallback : MODEL_COPY_FALLBACK_LOCALE,
        folded: {},
        foldedAliases: {},
        families: [],
        tiers: [],
        providerBrands: brands.providers && typeof brands.providers === 'object' ? brands.providers : {},
        brandRules: [],
      }
      for (const id in exact) index.folded[normalizeModelId(id)] = exact[id]
      for (const a in index.aliases) {
        index.foldedAliases[normalizeModelId(a)] = index.aliases[a]
        index.foldedAliases[a.toLowerCase()] = index.aliases[a]
      }
      const compile = rules => {
        const out = []
        for (let i = 0; i < (rules || []).length; i++) {
          const rule = rules[i]
          if (!rule || typeof rule.match !== 'string') continue
          // The build compiles every rule before it ships the document.
          out.push({ re: new RegExp(rule.match, 'i'), key: rule.key, text: rule.text })
        }
        return out
      }
      index.families = compile(doc.families)
      index.tiers = compile(doc.tiers)
      // Brand rules carry no copy, only the mark's id; the build has already
      // checked every id against the vendored marks.
      const brandRules = []
      for (let b = 0; b < (brands.models || []).length; b++) {
        const brandRule = brands.models[b]
        if (!brandRule || typeof brandRule.match !== 'string' || typeof brandRule.brand !== 'string') continue
        brandRules.push({ re: new RegExp(brandRule.match, 'i'), brand: brandRule.brand })
      }
      index.brandRules = brandRules
      return index
    }

    /** Fold case and separators so `glm-5.3-flash` and `glm-5-3-flash` agree. */
    function normalizeModelId(id) {
      return String(id === void 0 || id === null ? '' : id).toLowerCase().replace(/[^a-z0-9]/g, '')
    }
