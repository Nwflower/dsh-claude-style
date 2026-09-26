    /** The shell's active locale id, or the document fallback when it cannot be read. */
    function activeLocale(ctx) {
      const c = ctx || hostCtx
      try {
        if (c && typeof c.get === 'function') {
          const locale = c.get('locale')
          if (locale && typeof locale.getSnapshot === 'function') {
            const active = locale.getSnapshot().active
            if (typeof active === 'string' && active) return active
          }
        }
      } catch (error) { /* no locale service: keep the fallback language */ }
      return modelCopy === null ? MODEL_COPY_FALLBACK_LOCALE : modelCopy.fallback
    }

    /** One localized string out of a `{ locale: text }` pair, fallback locale last. */
    function localized(pair, ctx) {
      if (!pair || typeof pair !== 'object') return ''
      const loc = activeLocale(ctx)
      const text = pair[loc]
      if (typeof text === 'string' && text) return text
      const prefix = typeof loc === 'string' && loc.includes('-') ? loc.split('-')[0] : (typeof loc === 'string' && loc.includes('_') ? loc.split('_')[0] : '')
      if (prefix && typeof pair[prefix] === 'string' && pair[prefix]) return pair[prefix]
      const fallback = modelCopy === null ? MODEL_COPY_FALLBACK_LOCALE : modelCopy.fallback
      const backstop = pair[fallback]
      if (typeof backstop === 'string' && backstop) return backstop
      const fallbackPrefix = typeof fallback === 'string' && fallback.includes('-') ? fallback.split('-')[0] : ''
      if (fallbackPrefix && typeof pair[fallbackPrefix] === 'string' && pair[fallbackPrefix]) return pair[fallbackPrefix]
      return ''
    }

    /**
     * One picker label: the document's localized string, else the neutral
     * English constant the bundle carries. `{name}` placeholders are filled
     * from `params`, so a label with a slot stays translatable.
     */
    function copyLabel(key, fallback, params) {
      let text = modelCopy === null || !modelCopy.ui ? '' : localized(modelCopy.ui[key])
      if (!text) text = fallback
      if (!params) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
    }

    /**
     * One settings-page string. The settings copy rides the same document as
     * the picker copy, so the page follows the shell language too — and the
     * English constants stay as the fallback for a failed fetch.
     */
    function settingsCopy(key, fallback, params) {
      let text = modelCopy === null || !modelCopy.settings ? '' : localized(modelCopy.settings[key])
      if (!text) text = fallback
      if (!params) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
    }

    /**
     * One account-hold easter-egg string, in the language the `banLocale`
     * preference names — NOT the shell's language. The page reproduces a real
     * Claude screen, so it is read in the language Claude wrote it in whatever
     * the rest of the UI is set to; `localized` is bypassed on purpose rather
     * than fed a fake locale, so a missing translation still falls through the
     * document's own fallback locale.
     */
    function banCopy(key, fallback, params) {
      const pair = modelCopy === null || !modelCopy.ban ? null : modelCopy.ban[key]
      const want = readPrefs().banLocale
      let text = pair && typeof pair === 'object' && typeof pair[want] === 'string' ? pair[want] : ''
      if (!text) text = localized(pair)
      if (!text) text = fallback
      if (!params) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match)
    }

