    /**
     * Model catalog: the per-session ModelDirectory and its reactive store.
     *
     * Split out of installModelPicker (src/features/model/model-picker.js); this
     * fragment is the catalog half of that feature. It reaches outside its own
     * closure only through its options — `ctx` (the host context, for
     * `sessions` / `modelDirectories`) and `schedule()` (the scheduler
     * wake-up the directory's store subscription calls). The directory
     * instance, the session id, the warm-up flag and the provider listeners
     * stay in this closure and are handed back through the returned handle.
     *
     * @param options - { ctx, schedule }.
     */
    function createModelCatalog(options) {
        const ctx = options.ctx
        const schedule = options.schedule
        let modelSub = null
        let modelDir = null
        let modelSessionId = null
        let modelWarmRequested = false
        /** Settings-page listeners waiting on the provider list. */
        const providerListeners = []

        /**
         * The current session id. The Session Controller dropped
         * `list.current` in dsh 0.2 (the main-view selection now comes from the
         * `uiSession` projection), so this MUST go through the shared
         * currentSessionId() in context.js — reading the legacy field directly
         * resolves to null on current hosts and the picker never loads.
         */
        function currentModelSessionId() {
            try {
                const sessions = ctx.get('sessions')
                if (sessions === void 0 || sessions === null) return null
                const id = currentSessionId(ctx, sessions)
                return id === void 0 || id === null ? null : id
            } catch (error) {
                return null
            }
        }

        function dropSubscription() {
            if (modelSub) {
                try { modelSub() } catch (error) { /* already disposed */ }
            }
            modelSub = null
        }

        /** Resolve the session's directory (and observe it) once per session. */
        function directory() {
            const id = currentModelSessionId()
            if (id === null) {
                dropSubscription()
                modelDir = null
                modelSessionId = null
                return null
            }
            if (modelSessionId === id && modelDir !== null) return modelDir
            dropSubscription()
            modelDir = null
            modelSessionId = null
            try {
                const dirs = ctx.get('modelDirectories')
                if (dirs && typeof dirs.directoryFor === 'function') {
                    modelDir = dirs.directoryFor(id)
                }
            } catch (error) {
                modelDir = null
            }
            modelSessionId = id
            // The directory INSTANCE only carries load/select — its reactive state
            // hangs off the `.store` snapshot store (the host hands that same store
            // to its own menu as `directory`). Subscribe to the store, never to the
            // instance, and never let a subscribe failure discard the directory.
            if (modelDir !== null) {
                const store = modelDir.store
                if (store && typeof store.subscribe === 'function') {
                    try {
                        modelSub = store.subscribe(() => { notifyProviders(); if (schedule) schedule() })
                    } catch (error) {
                        modelSub = null
                    }
                }
            }
            return modelDir
        }

        function snapshot() {
            if (modelDir === null || !modelDir.store) return null
            try { return modelDir.store.getSnapshot() } catch (error) { return null }
        }

        /**
         * The catalog's providers, in catalog order, each with its model count.
         *
         * The settings page's quick-provider picker is the other consumer, and it
         * may be opened before the picker itself ever was — so this resolves the
         * directory and starts the shared catalog load rather than requiring a
         * first popover open.
         */
        function providers() {
            directory()
            warm()
            const snap = snapshot()
            const groups = (snap && snap.groups) || []
            const out = []
            for (let i = 0; i < groups.length; i++) {
                if (groups[i].models.length === 0) continue
                out.push({ id: groups[i].id, name: groups[i].name || groups[i].id, count: groups[i].models.length })
            }
            return out
        }

        /** Tell the settings picker the provider list moved (catalog arrived, changed). */
        function notifyProviders() {
            if (providerListeners.length === 0) return
            const list = providers()
            const listeners = providerListeners.slice()
            for (let i = 0; i < listeners.length; i++) {
                try { listeners[i](list) } catch (error) { /* one listener must not block the rest */ }
            }
        }

        /**
         * Start the host's model catalog load as soon as a session resolves, rather
         * than waiting for the first popover open.
         *
         * The catalog is one RPC per Host generation (`remote.session.modelCatalog`)
         * and nothing else fetches it: the host kicks it off from its own menu's
         * `show()`, and this skin hides that seat — so the first open used to pay the
         * whole round-trip, which is seconds on a cold start. Starting it here moves
         * that wait into the startup the user is already sitting through, and the
         * trigger's label needs the same catalog anyway: the current model's name
         * comes out of it. The load is shared and cached host-side, so the popover's
         * own `load()` becomes a no-op instead of a second request.
         *
         * Failures are the store's to report — the popover shows the error and the
         * host offers a retry — so this only has to avoid throwing into a pass.
         */
        function warm() {
            if (modelWarmRequested || modelDir === null || typeof modelDir.load !== 'function') return
            modelWarmRequested = true
            try {
                const pending = modelDir.load()
                if (pending && typeof pending.catch === 'function') {
                    pending.catch(() => { /* surfaced by the store, not here */ })
                }
            } catch (error) { /* synchronous failure — the store's error surface covers it */ }
        }

        /** The current selection resolved to its group + model entries. */
        function current(snap) {
            if (!snap || snap.current === null) return null
            for (let g = 0; g < snap.groups.length; g++) {
                const group = snap.groups[g]
                if (group.id !== snap.current.provider) continue
                for (let m = 0; m < group.models.length; m++) {
                    if (group.models[m].id === snap.current.model) return { group, model: group.models[m] }
                }
            }
            return null
        }

        /** Reasoning metadata + the effective effort for the current model. */
        function effort(snap) {
            const active = current(snap)
            if (active === null || !active.model.reasoning) return null
            const reasoning = active.model.reasoning
            const effective = snap.current.reasoningEffort !== void 0 ? snap.current.reasoningEffort : reasoning.defaultEffort
            let label = MODEL_EFFORT_DEFAULT
            if (effective !== void 0) {
                label = effective
                for (let i = 0; i < reasoning.efforts.length; i++) {
                    if (reasoning.efforts[i].id === effective) {
                        label = reasoning.efforts[i].name
                        break
                    }
                }
            }
            return { reasoning, effective, label }
        }

        /** Register a provider-list listener; the returned call removes it again. */
        function onProviders(listener) {
            providerListeners.push(listener)
            return () => {
                const at = providerListeners.indexOf(listener)
                if (at !== -1) providerListeners.splice(at, 1)
            }
        }

        /** Drop the directory and its subscription (a feature switch-off). */
        function reset() {
            dropSubscription()
            modelDir = null
            modelSessionId = null
        }

        /** Let a fresh install warm the catalog again (teardown). */
        function resetWarm() {
            modelWarmRequested = false
        }

        return {
            directory,
            snapshot,
            providers,
            notifyProviders,
            warm,
            current,
            effort,
            onProviders,
            reset,
            resetWarm
        }
    }
