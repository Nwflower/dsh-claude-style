    // At module scope on purpose: the sweep runs right after this factory
    // returns, so an `apply()` body would be too late. The head watch
    // (shared/peer-plugin.js) covers the sheets that arrive later.
    parkForeignSheets()

    function apply(ctx) {
      const body = document.body
      const ui = {}
      /** Installed features in install order, as `{ name, stop }`. */
      let installed = []
      /** Features retired after failing: a preference flip never brings one back this generation. */
      const failed = new Set()
      /** Unsubscribes the feature switches from the preferences; set once the features install. */
      let offSwitches = null
      /** Keeps the other chat plugin's presence watch alive; set once the features install. */
      let offPeerWatch = null
      /** Unmounts this generation's stylesheet; set once the sheet is mounted. */
      let stopStylesheet = null
      let disposed = false

      /**
       * Undo everything this generation installed. Idempotent: the host runs it
       * on dispose (the effect below), and apply() runs it itself when the
       * scheduler cannot be installed.
       */
      function teardown() {
        if (disposed) return
        disposed = true
        // First, so no preference flip installs a feature mid-teardown.
        if (offSwitches !== null) {
          offSwitches()
          offSwitches = null
        }
        if (offPeerWatch !== null) {
          offPeerWatch()
          offPeerWatch = null
        }
        for (let i = installed.length - 1; i >= 0; i--) {
          // One teardown must not block the rest (D12); a failing one is reported.
          try { installed[i].stop() } catch (error) { reportError(error) }
        }
        installed = []
        setHostContext(null)
        disposePrefsBinding()
        body.removeAttribute('data-dsh-claude-style')
        body.removeAttribute(BRAND_ATTR)
        body.removeAttribute(PALETTE_ATTR)
        body.removeAttribute(TYPEFACE_ATTR)
        body.removeAttribute(MASCOT_ATTR)
        body.removeAttribute(MOTION_ATTR)
        body.removeAttribute(FOOTER_ATTR)
        body.removeAttribute(COMPOSER_ATTR)
        body.removeAttribute(HOME_LAYOUT_ATTR)
        body.removeAttribute(HOME_HERO_ATTR)
        body.removeAttribute(WINDOW_BLUR_ATTR)
        // This generation's own sheet, handed over rather than taken away when a
        // newer generation has mounted after it (mountStylesheet).
        if (stopStylesheet !== null) stopStylesheet()
      }

      // Registered before anything is installed: registered last, a feature that
      // threw half-way through left the stylesheet and every listener installed
      // so far on the page with no teardown the host could ever run.
      ctx.effect(() => teardown, 'dsh-claude-style: Claude Code desktop theme')

      /**
       * Switch one feature off for the rest of this generation: run its own
       * teardown, and give back the host surface it had taken over. The footer
       * takeover and the composer restyle HIDE host controls (their gates are
       * body attributes the preferences and the composer pass write), so with
       * the feature gone they must stop hiding them. The permission control's
       * own hiding rules key on the attribute its teardown removes, so it needs
       * no branch here. The scheduler calls this for a sync that keeps failing.
       *
       * `name` may be the install name or the handle name. The scheduler retires
       * a failing sync through the handle; a handle that differs from the install
       * name (settings → settingsNav) stops the sync alone — the failure counter
       * already refuses the next pass, and the install keeps running so the
       * settings page stays.
       */
      function retire(name) {
        failed.add(name)
        const index = installed.findIndex(entry => entry.name === name || entry.handle === name)
        // A handle-only match does not tear the install down.
        if (index !== -1 && installed[index].name === name) {
          const stop = installed[index].stop
          installed.splice(index, 1)
          // Retiring goes through even when the feature's own teardown fails too.
          try { stop() } catch (error) { reportError(error) }
        }
        if (name === 'footer') retireFooterTakeover()
        if (name === 'composer') retireComposerRestyle()
      }
      ui.retire = retire

      /**
       * Install one feature in isolation. One that throws is reported and
       * retired, and the rest of the skin carries on without it.
       * @returns whether the feature installed.
       */
      function install(feature) {
        const name = feature.name
        const handle = feature.handle || feature.name
        try {
          const stop = feature.install()
          if (typeof stop === 'function') installed.push({ name, handle, stop })
          return true
        } catch (error) {
          reportFeatureFailure(name, error)
          retire(name)
          return false
        }
      }

      /**
       * Bring a switched feature in line with its preference (a key of
       * FEATURE_PREF_DEFAULTS): on installs it, off runs its teardown and drops
       * its handle, which hands its surface back to the host. Runs at startup
       * and on every preference adoption, so a flip needs no reload. A feature
       * retired after failing stays retired.
       */
      function applySwitch(feature) {
        const handle = feature.handle || feature.name
        const wanted = readPrefs()[feature.pref] !== false
        const index = installed.findIndex(entry => entry.name === feature.name)
        if (wanted && index === -1 && !failed.has(feature.name)) {
          install(feature)
          return
        }
        if (wanted || index === -1) return
        const stop = installed[index].stop
        installed.splice(index, 1)
        delete ui[handle]
        // Isolation (D12): a teardown that throws is reported, and the feature
        // stays off for the rest of the generation.
        try {
          stop()
        } catch (error) {
          reportFeatureFailure(feature.name, error)
          failed.add(feature.name)
        }
      }

      // The value is the build id (scripts/build.mjs): the stylesheet keys on
      // the attribute alone, and a live page reads which lib/client.js it runs.
      body.setAttribute('data-dsh-claude-style', BUILD_ID)
      setHostContext(ctx)
      // Bind the official settings form before anything reads a preference:
      // the host serves namespaces through `ctx.configForms`. Bound once here,
      // and retried when the settings page installs.
      adoptSettingsForm(ctx)
      // The service can mount after this plugin: wait for it declaratively and
      // bind then, so the first settings change never meets an unbound store.
      if (typeof ctx.inject === 'function') ctx.inject(['configForms'], () => { adoptSettingsForm(ctx) })
      loadModelCopy()
      loadUsername()
      loadHdsl()
      // Preferences are read asynchronously from the host settings namespace;
      // applying the defaults first keeps every gated rule in a defined state
      // for the frames before that read settles, and is exactly the shipped
      // behaviour when it never does.
      adoptPrefs(prefs)

      // The sheet carries this package's own tags and is unmounted by the
      // teardown below; the features install onto a page that already wears it.
      stopStylesheet = mountStylesheet()

      /**
       * Every feature the skin installs, in install order. `name` is the label
       * the failure report and the teardown use; `handle` is the name it
       * registers on `ui` when the two differ (settings → settingsNav). The
       * scheduler's pass order is this order, skipping handles that do not exist
       * or have no `sync` at the moment of the pass.
       *
       * Every entry declares exactly one of `pref` — the preference that decides
       * whether the reader gets it — or `ungated` — why it has no switch
       * (scripts/build.mjs refuses an entry with neither). A `pref` that is a key
       * of FEATURE_PREF_DEFAULTS is applied here, live: off is the feature's own
       * teardown, which hands its surface back to the host. Any other `pref` is
       * read by the feature itself.
       */
      const FEATURES = [
        { name: 'selection', ungated: '修宿主失焦时的选区颜色，不改变功能', install: installSelectionFocus },
        { name: 'composer', pref: 'composerScope', install() { return installComposer(ctx, ui) } }, // 输入区的布局：每轮先读 hero / 重绘状态，写形态、闸门、附件与上下文圆环
        { name: 'homeLayout', pref: 'homeLayout', install() { return installHomeLayout(ctx, ui) } }, // 首页版面：打版面属性 + 注册用量面板（数据来自宿主半边的汇总路由）
        { name: 'mascot', pref: 'mascot', install() { return installMascot(ctx, ui) } }, // 工作台首页输入卡片上沿的像素螃蟹：点它、指针离开它时（也会偶尔自己）钓一次鱼；DeepSeek 品牌下换成小鲸鱼 Deepy，首页与对话页都在，随智能体的工作状态换动画
        { name: 'copy', ungated: '提示语跟随输入框改造的范围，问候语跟随首页版面', install() { return installCopy(ctx, ui) } },
        { name: 'permissions', pref: 'permissionsControl', install() { return installPermissions(ctx, ui) } },
        { name: 'contextStats', pref: 'permissionsControl', install() { return installContextStats(ctx, ui) } }, // 会话数字收进上下文弹层，随权限控件一起开关：宿主的两个统计对话框由它接管
        { name: 'model', pref: 'modelPicker', install() { return installModelPicker(ctx, ui) } },
        { name: 'effort', pref: 'modelPicker', install() { return installEffortPicker(ctx, ui) } }, // 工作强度滑杆随模型选择器：宿主的工作强度在宿主自己的模型菜单里
        { name: 'heroMenu', ungated: '跟随输入框改造的首页范围', install() { return installHeroMenu(ctx, ui) } }, // hero 行的目录/预设弹层：打标记给样式表用
        { name: 'quickProviders', ungated: '模型选择器的设置项，不在界面上出现', install() { return installQuickProviders(ctx, ui) } }, // 设置页的「快捷供应商」多选弹层
        { name: 'footer', pref: 'collapseFooter', install() { return installAccountFooter(ctx, ui) } },
        { name: 'ban', ungated: '彩蛋页只在点击账号行时出现', install() { return installBanScreen(ctx, ui) } }, // 账户横条的封号彩蛋（账户弹层把点击交给 ui.ban）
        { name: 'themeFlip', ungated: '修主题切换瞬间的颜色跳变，不改变功能', install: installThemeFlip }, // 主题翻转瞬间抑制过渡，修掉「先色后样」
        { name: 'workspace', pref: 'workspaceView', install() { return installWorkspaceView(ctx, ui) } }, // 侧栏工作区：进行中 / 已归档 分段 + 归档行删除
        { name: 'search', pref: 'sidebarSearch', install() { return installSearch(ctx, ui) } }, // 侧栏品牌行的搜索框 + 搜索面板（会话、项目、插件、Skill、快捷键）
        { name: 'turnStatus', pref: 'turnStatus', install() { return installTurnStatus(ctx, ui) } }, // 进行中、已停止与失败轮次的状态行：移到这一轮工作的末尾，火花 + 用时 · 输出 tokens · 当前动作（或已停止 / 处理失败）
        { name: 'turnNav', pref: 'turnNav', install() { return installTurnNav(ctx, ui) } }, // 对话导航：宿主的轮次导航条在指针停留时展开成整列提问，Alt+↑ / Alt+↓ 跳到上一轮或下一轮，跳到的那一轮开头闪一条横线
        { name: 'chatFollow', pref: 'chatAnimations', install() { return installChatFollow(ctx, ui) } }, // 聊天区跟随：结构时刻把滚动交还给宿主跟随，封顶过程组里不让最新两行悬着
        { name: 'chatFold', pref: 'chatAnimations', install() { return installChatFold(ctx, ui) } }, // 思考行与过程组自动开合，读者点击一行时的卷帘门过渡
        { name: 'chatReveal', pref: 'chatAnimations', install() { return installChatReveal(ctx, ui) } }, // token 淡入：新到的字先淡后实，按到达次序错开相位
        { name: 'chatFiles', pref: 'chatAnimations', install() { return installChatFiles(ctx, ui) } }, // 文件变更行：run_code 里派发的 write / edit 按直接调用的样子显示改动
        { name: 'chatSend', pref: 'chatAnimations', install() { return installChatSend(ctx, ui) } }, // 聊天气泡动效：提交时输入卡片浮起、一路收成那条气泡
        { name: 'caret', pref: 'caretMotion', install() { return installCaret(ctx, ui) } }, // 输入框插入符动效：把原生插入符按下去，自己画一根，位移走过渡
        { name: 'viewTabs', pref: 'viewTabs', install() { return installViewTabs(ctx, ui) } }, // 对话区视图标签条：按实测把标签条放到标题那一行（放得下才放）
        { name: 'settings', handle: 'settingsNav', ungated: '设置页本身', install() { return installSettingsSection(ctx, ui) } }
      ]

      const switched = FEATURES.filter(feature => Object.hasOwn(FEATURE_PREF_DEFAULTS, feature.pref ?? ''))
      for (const feature of FEATURES) {
        if (switched.includes(feature)) applySwitch(feature)
        else install(feature)
      }
      offSwitches = subscribePrefs(() => {
        for (const feature of switched) applySwitch(feature)
        if (typeof ui.schedule === 'function') ui.schedule()
      })
      // Keep the presence watch alive for the page's lifetime, whether or not a
      // feature subscribes on its own: the ported chat features decide on it, and
      // another plugin arriving or leaving re-runs the preference stream
      // (src/shared/peer-plugin.js). The subscription itself carries no logic.
      offPeerWatch = subscribePeerPresence(() => {})

      // Last: its passes read the `ui` handles lazily. Without it nothing syncs,
      // and a live stylesheet over overrides that never run is worse than no
      // skin at all — so if it cannot install, the whole skin rolls back.
      const handleNames = FEATURES.map(feature => feature.handle || feature.name)
      if (!install({ name: 'scheduler', install() { return installScheduler(ctx, ui, handleNames) } })) teardown()
    }

    exports.apply = apply
    return module.exports
