    /**
     * Resolving a catalog model to its description line.
     *
     * The copy document (src/model-descriptions.json) ships as data beside the
     * bundle and is fetched at runtime, so this is the only place that knows how
     * a model's id becomes a sentence. Resolution descends: exact entry (one
     * model resold by several providers folds to a single key) → family rule →
     * tier rule → the catalog's own text. Family rules are ordered and anchored
     * so another vendor's flash tier never borrows DeepSeek's copy; the tier
     * rules are the last resort, read out of the id itself. A model this table
     * has never seen and the catalog does not describe resolves to an empty
     * string on purpose: a name-only row beats an invented line.
     *
     * Split out of model-picker.js when the effort slider pushed that fragment
     * past the repository's size stop line; nothing here touches the picker's
     * closure, only the shared copy document.
     */
    /** Exact entry: `provider/model`, bare id, folded id, then the alias table. */
    function exactModelCopy(groupId, modelId) {
      if (modelCopy === null) return null
      var gid = String(groupId === void 0 || groupId === null ? '' : groupId).toLowerCase()
      var mid = String(modelId === void 0 || modelId === null ? '' : modelId)
      var midLower = mid.toLowerCase()
      var byProvider = modelCopy.exact[groupId + '/' + mid] || modelCopy.exact[gid + '/' + midLower]
      if (byProvider) return byProvider
      if (modelCopy.exact[mid]) return modelCopy.exact[mid]
      if (modelCopy.exact[midLower]) return modelCopy.exact[midLower]
      var folded = normalizeModelId(mid)
      if (modelCopy.folded[folded]) return modelCopy.folded[folded]
      var alias = modelCopy.aliases[mid] || modelCopy.aliases[midLower] || modelCopy.aliases[folded] || (modelCopy.foldedAliases && modelCopy.foldedAliases[folded])
      if (alias) {
        if (modelCopy.exact[alias]) return modelCopy.exact[alias]
        var foldedAlias = normalizeModelId(alias)
        if (modelCopy.folded[foldedAlias]) return modelCopy.folded[foldedAlias]
      }
      return null
    }

    /**
     * Family entry. The model id is tried alone first because it is the stronger
     * signal, then `provider/id` for ids that carry no brand of their own
     * (`abab6.5s-chat` under a provider called `minimax`).
     */
    function familyModelCopy(groupId, modelId) {
      if (modelCopy === null) return null
      var id = String(modelId === void 0 || modelId === null ? '' : modelId).toLowerCase()
      var haystacks = [id, String(groupId === void 0 || groupId === null ? '' : groupId).toLowerCase() + '/' + id]
      for (var h = 0; h < haystacks.length; h++) {
        for (var i = 0; i < modelCopy.families.length; i++) {
          var rule = modelCopy.families[i]
          if (!rule.re.test(haystacks[h])) continue
          if (rule.key) return modelCopy.exact[rule.key] || null
          return rule.text
        }
      }
      return null
    }

    /** Last-resort tier rule, read out of the id itself. */
    function tierModelCopy(modelId) {
      if (modelCopy === null) return null
      var id = String(modelId === void 0 || modelId === null ? '' : modelId).toLowerCase()
      for (var i = 0; i < modelCopy.tiers.length; i++) {
        if (modelCopy.tiers[i].re.test(id)) return modelCopy.tiers[i].text
      }
      return null
    }

    /**
     * The description line for one catalog model, in the shell's language.
     * `ctx` is the caller's context, used only to read the shell's locale.
     */
    function modelDescription(ctx, groupId, model) {
      var id = typeof model.id === 'string' ? model.id : ''
      var pair = exactModelCopy(groupId, id) || familyModelCopy(groupId, id) || tierModelCopy(id)
      var text = localized(pair, ctx)
      if (text) return text
      return typeof model.description === 'string' ? model.description : ''
    }
