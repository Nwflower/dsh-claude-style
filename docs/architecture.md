# 架构决策记录

本文件记录本仓库**为什么**是现在这个样子：每条决策写背景、决定、代价，以及什么情况下允许重审。
操作手册看 README，硬性规则看 AGENTS.md，视觉令牌看 docs/STYLE.md；本文件只管「权衡」。

执行约束：

- 任何重构/拆分方案若与本文件已记录的决策冲突，必须先修改对应条目、说明旧决策为何失效，再动手。禁止静默推翻。
- 新决策追加在文末，编号递增，不删旧条目；被推翻的条目改为「已废弃 + 指向新决策」。

---

## D1. 零构建工具链，构建期逐字拼接

- **背景**：DSH Web 的模块加载器没有相对 require、没有资产 URL 机制，常规打包器（esbuild/rollup）产出的 chunk 拆分与资产引用无处安放。
- **决定**：`scripts/build.mjs` 把 `src/` 碎片按固定顺序逐字拼接成单个 `lib/client.js`；所有碎片共享一个工厂作用域，禁止 import/export，React 只能经加载器 `require('react')` 取得；资产（SVG/字体）构建期内联为 data URI 或走宿主路由。
- **代价**：碎片写法受限（ES5 风格、4 空格基础缩进、`%%TOKEN%%` 占位）；没有 tree-shaking，bundle 体积靠自律控制。
- **重审条件**：DSH 加载器原生支持 ES module 相对导入与资产 URL 之时。

## D2. 纯浏览器半边实现，不动宿主

- **背景**：主题是皮肤，不应 fork DSH；宿主升级要快跟随。
- **决定**：一切效果通过 CSS 覆盖与客户端 DOM override 实现；宿主半边（`lib/index.js`）只提供静态路由（模型文案 JSON、位图图标）。（后来宿主半边还承担了字体、设置读写与系统用户名路由；私有路由的安全约束见 D11。）
- **代价**：依赖宿主带哈希的 CSS-module 类名，宿主改版可能击穿选择器——用 D3 的纪律和 probe 回归对冲。
- **重审条件**：DSH 官方开放主题 API / 插槽覆盖所 target 的区域时，逐步迁移过去。

## D3. 宿主选择器纪律：最长稳定片段

- **背景**：宿主类名带哈希（`_54WpYG_imageItem`），短子串（`[class*="row"]`）极易误伤不相关组件，曾出过事故。
- **决定**：子串匹配只用最长稳定片段（`[class*="_row"]`）；不得覆盖 `[class*="viewArea"]` 的活跃期布局契约；新增子串选择器必须检查误伤面。
- **代价**：选择器冗长；需要人肉维护「哪些片段稳定」的经验。
- **重审条件**：宿主提供稳定的 data-* 契约后全面迁移。

## D4. composer 样式构建期门控（composer-gate）

- **背景**：composer 是性能与正确性最敏感的区域；皮肤规则若在未启用皮肤时泄漏到宿主 DOM 会造成事故。
- **决定**：composer 相关规则必须位于 `/* @composer-gate */` 标记之下，构建把 `[%%COMPOSER_ATTR%%]` 门控盖到标记以下每条规则，漏盖即构建失败。
- **代价**：写 composer 样式多一道心智负担；构建脚本要维护门控逻辑。
- **重审条件**：无（这是安全网，不是权衡）。

## D5. 模型文案是数据，不进 bundle

- **背景**：模型目录日新月异，文案更新不应要求改 JS 发版。
- **决定**：`src/model-descriptions.json` 构建期校验后复制到 `lib/`，浏览器首次绘制选择器时经宿主路由 fetch；查找按 精确条目 → 家族规则 → 档位规则 → 目录自带文本 逐级降级；不写「最强/旗舰」等最高级（钉住版本的精确条目除外）。两条附加纪律：**文案是「线」的文案，不是「版本」的文案**——同一条产品线（如 DeepSeek 的 Flash / Pro）按名字模式映射到同一句，版本迭代与退场都不改这句话，因为过时版本会命中同一条规则，给某个版本写的描述最终会挂在别的版本上；**不写我们自己加的档位前缀**（「旗舰档：」「顶级档位：」），文案要么是厂商自己的定位句，要么直接说它做什么——前缀是我们的定位话术，会随产品线换代变成假话；**描述也不重复模型名**——行里已经写着模型名，文案再以「X 系列：」「X 档：」开头就是重复，只写后半句（Kimi K3 那条就是官网模型页标题去掉「Kimi K3：」之后的部分）。
- **代价**：首次绘制选择器有一次异步 fetch；文案体系有学习成本。
- **重审条件**：宿主模型目录 API 直接提供本地化文案时。

## D6. 单一 scheduler 统一所有 override 的生命周期

- **背景**：多个 override 各自挂 observer/listener 会互相踩踏、泄漏、重复扫树。
- **决定**：`overrides/scheduler.js` 持有唯一的 MutationObserver（body 子树、attributes 过滤到 aria-label/aria-selected），用 requestAnimationFrame 合并为每帧一次 pass，统一驱动各 `ui.*.sync()`；teardown 统一清理。
- **代价**：每个 sync 必须有廉价的 early-out；新增 override 要接入同一调度器而不是自立门户。
- **已知代价与对策**：流式输出期间每帧一次全量 pass 是性能热点，见 D9。

## D7. UI 行为优化内置在本插件，不拆独立插件

- **背景**：模型选择器、权限分段、账户抽屉等「UI 优化」与皮肤共享同一套宿主锚点（选择器纪律）、同一调度器（D6）、同一 popover 工具与 teardown。
- **决定**：行为层（`src/overrides/`）与皮肤层（`src/styles/`、tokens、品牌资产）在源码内保持分离，但发布为同一个包。不想要 Claude 皮肤的用户用设置里的品牌切换回到接近宿主的观感。
- **代价**：包名与主题绑定，「只用 UI 优化不要皮」的诉求没有独立入口。
- **重审条件**：出现第二个真实消费者（另一个主题包或宿主官方）需要复用 overrides 层时，把 overrides 抽成独立包，皮肤包依赖它。

## D8. 多主题走「单仓库构建期分包」

- **背景与决定**：做第二个主题时，多合一会让包名（claude）名不副实，分仓库会让共享机制（build.mjs、scheduler、popover-utils、选择器纪律）多处漂移，抽 npm 运行时公共包则违反 D1。所以届时把本仓库改为单仓库多主题：共享碎片留仓库级 `src/`，主题私有碎片（tokens、品牌资产、copy、主题特有 overrides）收进 `themes/<name>/`，`build.mjs` 参数化 `--theme`，每个主题产出自包含单文件、各自发 npm 包；`dsh-claude-style` 包名不动。具体改造步骤到立项时再写。
- **触发条件**：仅当新主题有**行为分叉**（不同的 DOM override、不同的 composer 结构）才动手。若只是换色板与 logo，先用现有品牌切换机制（settings.js）在包内消化，不提前改造。
- **代价**：改造时 build.mjs 与目录布局有一次性手术；两个主题之后共享碎片的改动需要双主题回归。

## D9. composer 的 :has() 分支改 JS 写属性

- **背景**：皮肤在流式输出期间的渲染压力主要来自两处：D6 的每帧全量 pass，以及 CSS 中约 70 处对 DOM 结构敏感的 `:has()`（绝大多数是 `[class*="composerStack"]` 上的 hero/inline 分支）——每次 DOM 变更都触发昂贵的选择器重算。
- **决定**：把「结构感知」从 CSS 移到 JS：`composer.js` 的 pass（每轮第一个同步）为卡片与 composerStack 祖先写 `data-composer-variant="hero|inline"` 属性（hero 以宿主会话根上的 `data-phase="hero"` 为准；observer 的 attributeFilter 不含 data-*，不会反触发；写前比较旧值防抖动；同轮去重避免多卡命中同一 stack 反复写），CSS 改为读属性。附件同理：同一个 pass 找出输入栏里的附件缩略图并标上 `data-dsh-claude-attachment`，缩略图样式只读这个属性，不再在 CSS 里用 `:has(img)` 逐次判定。交互敏感的 `:has()`（`:hover`、`:focus-within`）与低频的 dialog `:has()` 保留。
- **落地**：已执行完毕。仍未消除的结构感知 `:has()` 还有两处：placeholder 那几条（`card` 与 inline 规则上的 `:has([data-composer-placeholder])`）——`copy.js` 本就管理 placeholder，可在它的 sync 里同步写 `data-has-placeholder` 再改 CSS；以及 hero 分支上的 `*:has([data-composer-card])`。两处都属可选的后续优化。
- **重审条件**：实测证明 :has() 不再是热点，或宿主提供 hero/inline 的稳定属性契约。

## D10. 设置传输只走官方 Config 表单

- **背景**：0.1.7 删掉了 `settings.register(ns, schema)` 的旧契约——命名空间是 profile entry id，schema 就是插件导出的 `Config`，只有 `.volatile()` 字段进表单，值写进 profile 的 Cordis patch；客户端服务 `settingsScope` 改名 `configForms`，插件设置席位从 `settings.plugin.item` 变成 `plugins.bundle.config`（键 = 包名）。没有 `configForms` 的旧宿主曾让客户端保留一条自建 `/prefs` 路由作为第二传输。
- **决定**：客户端只有 `configForms` 一条传输——`ctx.configForms.get(entryId)` 绑定官方表单，读、写都走控制器（值 + 写队列 + revision 栅栏），插件自建的 `/prefs` 路由与其回退分支一并删除。
  - 宿主半边导出 `Config` 作为命名空间的 schema：八个偏好字段，`volatileField()` 逐字段探测 `.volatile()` 存在才加标记；schemastery 用顶层 await 守卫导入，解析不到就让 `Config` 为 `undefined`，皮肤照常加载。命名空间取成 `ctx.fiber.entry.id`（读不到回落 patch 里的常量），并调 `settings.configure({ auto: false }, ctx.fiber)` 声明自带页面。`configForms` 只服务宿主已注册的命名空间，所以这个导出是偏好可用的前提。宿主仍拥有旧的命令式注册表时，保留 `settings.register('claude-style', schema)` 分支，当前宿主不走它。
  - 设置席位：当前宿主注册成 `plugins.bundle.config`（键 = 包名，渲染在插件页上）；`settings.section` 整页席位保留，但只在宿主没有 `configForms` 时注册。
- **代价**：`Config` 的顶层 await 让宿主半边模块求值晚一步（loader 本就 await 导入，无实际影响）；schemastery 的守卫导入是 AGENTS 记录在案的那条例外，它要在解析不到时保住皮肤，不让整包失败。
- **重审条件**：宿主重新提供不需要 `Config` 的设置注册方式时，或 `configForms` 契约再变时，重写这一层。

## D11. 插件自有路由借宿主的请求栅栏；宿主/用户来源的字符串只以文本上屏

- **背景**：`webServer.register()` 交给插件的是裸请求。宿主自己的 `/api` 挂在 Host/Origin 栅栏与浏览器会话 cookie 之后（`connection.requestRejection()`），插件路由不在其内。本插件的 `/username`（读系统用户名）因此曾经完全无鉴权：`dsh web` 绑定 `0.0.0.0` 时局域网里任何人都能直接读。读到的用户名又被客户端拼进 `innerHTML`——实测在 GUI 页面里执行了脚本，而这个页面能驱动执行 shell 命令的智能体。
- **决定**：宿主半边 `/username` 处理前先调 `ctx.get('connection').requestRejection(req)`，拒绝即回 401/403。宿主没有该服务时，插件自带的替身只服务回环（回环 Host、无跨站标记、Origin 与 Host 一致）。模型文案与字体等静态资产保持公开。删除会话的私有路由 `POST /dsh-claude-style/session-delete` 同样先过栅栏，另加四道：只接受 POST，id 必须匹配宿主自身的会话 id 形状，正在打开的会话拒绝，目录解析后必须留在会话根目录内（删除发生在宿主半边，浏览器半边只提交一个 id）。首页用量汇总路由 `GET /dsh-claude-style/usage` 与用户名路由同级：它回的是本机会话历史的聚合结果（每日 token 用量、调用次数、活跃天数），属于用户数据，因此同样先过栅栏，并且只读——第三方插件的账本（`dsh-cost-meter` 的 `ledger.json`）只读不写，自己的汇总落在 `$DSH_HOME/cache/dsh-claude-style/`。客户端：一切来自设置、账号服务、系统或第三方插件的字符串只用 `textContent` / 元素属性写入，图标复制节点而非重新解析 markup。
- **代价**：路由依赖宿主的 connection 服务。已核对两种壳都能通过：浏览器同源请求带会话 cookie；0.1.7 桌面壳经 `forwardWebRequest` 转发到回环 Host、剥掉页面 Origin 并自带 cookie（宿主真实的 `isTrustedApiRequest` 对这两种请求放行，对跨站与 DNS 重绑定请求拒绝）。
- **重审条件**：宿主为插件提供自带鉴权的路由注册（如 `connection.fetch.register`）时，迁移过去并删掉本地替身。

## D12. 特性级失败隔离：一个特性出错只关掉它自己

- **背景**：`apply()` 依次安装全部特性，teardown 却在最后才交给 `ctx.effect`；每轮 pass 里各 `sync()` 也没有逐个兜底——一个抛错，排在它后面的全部跳过，而且每轮如此。实测：宿主 `remote.account.getProfile()` 返回非 Promise 时 `apply()` 中途抛错，样式表与 body 属性留在页面上、调度器没装上、teardown 没注册（关掉插件也清不掉），前面装好的特性的监听器一并泄漏。effort-picker 那次「Loading plugins…」卡死是同一类问题。
- **决定**：
  - teardown 最先经 `ctx.effect` 注册且幂等；每个特性单独 try/catch 安装，装不上的报一次 `console.error` 并退役。调度器本身装不上时整体回滚到宿主原样——没有调度器，其余特性都不会同步，留着只是一张半套的皮。
  - 每轮 pass 里每个特性的 `sync()` 单独 try/catch，连续失败 3 轮即报一次并退役（`ui.retire`）。
  - 退役 = 跑该特性自己的 teardown，并把它接管的宿主界面还回去。页脚接管（`FOOTER_ATTR`，由偏好写）与 composer 重绘（`COMPOSER_ATTR`，由 composer 的 pass 写）都会隐藏宿主控件，所以退役 `footer` / `composer` 时对应的闸门强制关闭、不再随偏好打开。权限控件替换掉的宿主控件（访问模式按钮、统计弹窗、详细统计行）另由它自己的标记把守——body 上的 `PERMISSIONS_ATTR` 与统计行上的模式标记，两者都由它的 teardown 摘掉——所以权限控件或会话统计出错时，只有它们交还宿主，composer 重绘照常。特性的 teardown 因此必须撤干净自己的 DOM 与标记（模型选择器此前只清变量，已补上）；调度器拆除时不替任何特性清扫，每个特性的 teardown 就是它 DOM 与标记的唯一清理，smoke 的「拆除后不留节点」检查因此直接覆盖到每个特性。只做装饰的 pass 用自己的句柄名（`ui.settingsNav`），退役它不会卸掉设置页。
- **代价**：特性失效时界面上没有提示，只有控制台一行；依赖它的特性（例如都读 `ui.composer.isActive()`）会各自连续失败、依次退役——降级而非崩溃。
- **重审条件**：宿主提供插件级的错误上报 / 健康面板时，把报告接过去。

## D13. 特性碎片的拆分布局与调度契约

- **背景**：重构开始时，三个特性碎片都越过 750 行上限——`account-footer.js` 1357 行（账户资料、宿主账号菜单桥接、其他插件页脚条目的镜像、抽屉壳、行构建五份工作挤在一个闭包里）、`model-picker.js` 900 行（模型目录订阅与行构建也塞在里面）、`permissions.js` 868 行（会话统计卡也在里面）；`composer/inline.css` 847 行与 `components/model-picker.css` 767 行两条 CSS 同样超限。调度器同时把每个特性的触发调用硬编码在手写清单里：`PASS_FEATURES` 按名列 pass 序、与 entry.js 的安装序分开维护，另有 21 处特性专属调用散在各触发分支里，而且已经与特性漂移——`ui.heroMenu.close` 是被守卫着的死调用（heroMenu 的句柄只有 `{ sync, reposition }`）。`ui` 是跨特性共享的服务注册表，却没有任何文档说明句柄有哪些方法、谁可以读谁。
- **决定**（重构 Phase 0–3 已落地）：
  - **辅助碎片导出顶层 `createX(...)` 工厂**，仿 popover-utils 的 `createHoverIntent`：状态收在工厂自己的闭包里，返回一个小对象；访问器与回调经参数传入（如 `{ isOpen: fn, onChange: fn }`），绝不伸手进别的闭包。特性的 `installX` 负责把工厂接起来（现有十个：`createAccountProfile`、`createHostAccountMenu`、`createAccountRows`、`createFooterMirror`、`createAccountSurface`、`createModelCatalog`、`createModelRows`、`createEffortControl`、`createEffortMatrix`、`createSessionStats`；`createEffortMatrix` 由 `createEffortControl` 接起来）。
  - **拆出多个碎片的特性建一个子目录**（`overrides/account/`、`overrides/model/`、`overrides/effort/`）；只拆出一个辅助碎片的特性把它放在特性旁边（`overrides/session-stats.js`）——单文件目录是噪音。FRAGMENTS 里列在特性碎片紧前面；顶层名对整个 bundle 全局唯一、以特性起名（`createAccountProfile`，不是 `createProfile`）。移动就是移动：注释随行、风格与名字不变，只有闭包变量必须变成参数时才改签名。
  - **特性契约**：entry.js 的 FEATURES 表（`{ name, handle?, install }`）统一安装序与 pass 序——pass 序就是安装序过滤出句柄带 `sync` 的特性（`settings` 安装到 `ui.settingsNav`）。scheduler 只认 FeatureHandle 的可选钩子（typedef 在 scheduler.js 头部）：`sync` / `owns` + `close('outside')` / `onPointerDown` / `close('escape')` / `close('composer')` / `onInput` / `reposition('viewport' | 'composer')` / `onCopyChange` / `onKey`；没实现的钩子直接跳过，每个特性保住自己原有的关闭路线（permissions 没有外部点击关闭，quickProviders 只在 composer 聚焦时关）。调度器自己的触发源同样不点名特性：时钟每分钟跑一轮整体 pass（hero 问候语这类跟着时钟变的文案靠它翻页），composer 卡片的尺寸变化经 `reposition('composer')` 派发，卡片上的点击聚焦与消息列表跟随都是 composer 特性的钩子。`retire` 按 name 或 handle 匹配：纯 handle 命中只停 sync、不拆安装（settingsNav 的显式分支——失败计数器已拒绝后续 pass，安装继续跑、设置页不卸）；退役 `footer` / `composer` 仍强制归还 body 属性（FOOTER_ATTR / COMPOSER_ATTR）。
- **理由**：拆分前「加一个特性」要改两处清单（entry.js 安装序列 + scheduler 的 PASS_FEATURES）再往各触发分支加调用；现在变成往 FEATURES 表加一行、在句柄上实现钩子——scheduler 不再认识任何具体特性，手写清单无从漂移。拆分把千行闭包变成状态自持的工厂加薄编排，750 行上限重新可守。移动就是移动（注释随行、闭包变量变参数才改签名），搬运提交的 diff 因此可审：搬运里不该出现逻辑改动。本决策不推翻 D1/D6/D12：仍是单文件逐字拼接（D1）、仍是单一调度器统一驱动（D6，钩子只是把硬编码调用变成句柄方法）、特性级失败隔离与 retire 语义原样保留（D12）——它在三者之内工作。
- **代价**：多一层间接——特性内部状态要经工厂参数表交接，动状态时多过一遍参数；「加一个特性」前要先读这条决策与 scheduler.js 的 typedef。
- **重审条件**：钩子表继续膨胀（例如第二类键盘事件或第二种观察源进场）时，重审契约粒度——按事件域分组，或让特性自己声明要订阅的触发器。

## D14. 账号表面：一套行模型，两个挂载点

- **背景**：DSH 0.1.7 的桌面端自带账号区——侧栏页脚里的账号行，以及它自己的账号弹层。此前的做法是隐藏宿主账号行、由插件自建抽屉，并把宿主菜单里的条目读出来镜像进抽屉：隐形点开宿主菜单、等它的 portal 出现、复制文案与图标、再把点击转发回去。这套驱动依赖宿主菜单的渲染时序与双语标签，先后出过图标逃逸、文案过期、行重复等问题。
- **决定**：插件的行（账号头部、其它插件的页脚条目、设置行）只在弹层里出现，弹层有两个挂载点，由 `overrides/account/surface.js` 每轮判定。宿主有账号区时，宿主账号行就是入口（插件只给它打标记，供样式表重绘），插件把容器追加到宿主账号菜单列表的首位，宿主自己渲染它那几行；宿主没有账号区（Web）时，插件自建账号行与弹层，容器就是弹层主体。宿主的行不复制、不移动、不转发点击；插件的行被点击后需要收起菜单时，派发一次 Escape 交给宿主的菜单处理。卡片与行的外观由插件的样式表按标记重绘，两条路径共用同一套样式。
- **理由**：宿主的菜单自带定位、动画、键盘遍历、Esc 与外部点击关闭，追加进去的行会加入同一套键盘遍历；删除驱动与镜像之后，账号区不再依赖宿主菜单的渲染时序与标签文案。
- **代价**：宿主菜单关闭即卸载，容器每轮重新确认并追加；宿主的列表是 React 管理的子树，追加位置固定在列表首位，宿主重渲染后由每轮同步自愈。
- **重审条件**：宿主为账号菜单提供追加行的插槽时，改用插槽注册，去掉 DOM 追加。

## D15. HDSL 账号契约：宿主半边转发，浏览器半边只认一条回退顺序

- **背景**：HDSL 启动器用 `HDSL_` 前缀的环境变量向实例公布「这是谁」：账号显示名、供应商、账号种类、头像来源，以及玩家头像贴图的绝对路径；`HDSL_ACCOUNT_CONTRACT` 是唯一必需键，读不到它整组作废。浏览器半边读不到进程环境，贴图又只有绝对路径，两者都只能由宿主半边转发。启动器的皮肤是一张 64×64（或整数倍）的贴图集，不是成品头像：脸只是其中 (8,8) 起的 8×8 贴图块，帽子层在 (40,8)。
- **决定**：
  - 宿主半边读 harness 启动时填好的启动环境快照（`ctx.launchEnvironment`，也就是 `launchEnvironmentOf(ctx)` 内部读的那个槽位），只信 `process` 与 `user-env` 两层（项目目录的 `.env` 会随仓库被克隆，没有资格声明玩家是谁），契约版本不等于 `1` 时回 `{ contract: false }`，其余字段一律不看。**不 import** harness 自带的启动环境包：`link:` 安装的插件解析不到它（与 `resolveSchemaFactory` 同一类问题），而那个包要读的正是这个槽位；宿主没填槽位就是没有契约。
  - 新增两条私有路由，与 `/username` 同级过 `refusalOf` 栅栏：`GET /dsh-claude-style/hdsl` 回账号元数据，**不含**头像文件的绝对路径；`GET /dsh-claude-style/hdsl-skin.png` 回贴图字节——路径只来自环境，永远不来自请求，读不到就回 404 让浏览器回退。契约在进程生命周期内不变，宿主半边读一次并记住。
  - 浏览器半边把昵称与头像各收敛成一条回退顺序：昵称 = 自定义昵称 → 官方账号昵称 → HDSL 昵称 → 探测昵称缓存 → 探测昵称 → `User`；头像 = 官方账号头像 → HDSL 头像 → Claude 徽标（样式表里的底色标记）。官方账号资料与 HDSL 契约各自推给 `src/context/host.js` 的身份存储，两个消费点（欢迎语、账号行）只读这一处。
  - 头像不是直接贴上去的：启动器给的是贴图集，浏览器按启动器账号列表同样的裁法取头部（脸的 8×8 贴图块按盒子 1/18 内缩、帽子层铺满整盒）画进 64×64 画布再缩到账号位的尺寸，方形绘制不被圆角裁切；贴图只以裁出的头部出现，加载完成前、图取不到、契约没带图、文件被删时都显示徽标。画完主动叫一次 pass：贴图加载不改 DOM，没有 pass 会自己来。
- **理由**：契约读一次就够，所以路由只转发、不轮询；把两条链收在一处，欢迎语、账号行、封号彩蛋不会各自漂移；缓存探测到的系统用户名，是为了刷新页面时欢迎语不再从 `User` 跳一次；裁脸几何与启动器账号列表一致，同一个玩家在启动器与皮肤里长得一样。
- **代价**：桌面端宿主的账号行由宿主自己渲染，插件只在自建账号行上画头像，所以 HDSL 头像在桌面端只作用于插件自己的表面；只有玩家自选的本地图片能画，启动器内置的默认形象（steve/alex 等）没有像素可用，回退到徽标；契约在进程生命周期内不变，玩家中途换皮肤要下次启动才生效。
- **重审条件**：HDSL 契约递增版本（其 v2 计划里有按指纹取图的媒体通道与账号 UUID）时，取图改为优先走该通道、以指纹作缓存键，按玩家存储的数据改用 UUID 作键；宿主提供「显示名 / 头像」的统一服务时，改接那一处，删掉本插件的转发路由。

## D16. 弹层共用两条基准：一个停留时长，一次只开一张卡

- **背景**：皮肤的弹层从六处各自长出来（模型选择器、推理强度、权限、账户、会话统计、hero 行的宿主菜单，另加设置页的快捷供应商），每处自己写停留时长与收起宽限。停留原本是 50ms，指针以平常速度扫过就已经超过它，于是位于指针必经之路上的触发器（工作台版面把上下文行贴在输入卡片正上方）看上去没有停留；同时「同时只开一张卡」此前只在模型与推理这一对上硬编码（两侧各自调用对方的 close），换一对弹层就会两张卡叠在一起。
- **决定**：
  - 停留与宽限收到 `overrides/popover-utils.js` 的 `POPOVER_OPEN_DELAY`（100ms）与 `POPOVER_CLOSE_DELAY`（100ms）。100ms 是指针以平常速度扫过 28px 触发器所需的时间量级，路过不再展开，停在上面照常立即展开。两处例外连同理由写在使用处：模型选择器的两级卡片收起宽限 150ms（指针要横穿一级卡片才能到二级），会话统计卡片展开停留 300ms（统计句位于输入行中部，路过容易误触）。
  - 同一文件里维护一张弹层登记表：`registerPopover(name, close)` 登记每张弹层的关闭路径，`closeOtherPopovers(name)` 在打开前关掉其余弹层。一个弹层的多层卡片按一项登记（模型选择器的一级与二级同名 `model`），宿主的菜单由驱动它的特性登记（hero 菜单、账户菜单），关闭动作各自复用既有路径——皮肤自己的卡片直接收，宿主的菜单再次点击其触发位或派发 Escape。
  - hero 行的一项登记对应两个宿主菜单（工作文件夹与预设模式），所以 `hero-menu.js` 自己再分一次：打开前先收起行内另一个已展开的触发位，悬停离开时只收悬停打开的那一个，每轮同步里若发现行内两个触发位同时展开也收掉多余的一个。判定按「已展开的触发位」而不是「body 下的菜单卡片」——后者数得到宿主别处的菜单，前者才是这一行的选择器。
  - 登记表只存关闭函数，不记「谁开着」：每个关闭函数在弹层未开时是空操作，所以用户用 Escape 或外部按下关掉的卡片不会留下过期状态。按名字覆盖登记，使客户端热重载后残留的旧一代闭包被新一代覆盖。
- **理由**：停留时长是同一个交互问题（路过还是停留），分处写必然漂移；互斥此前成对硬编码，新增弹层时要记得改 N 处，登记表把它变成一次登记。
- **代价**：登记表是模块级状态，特性卸载必须 `unregisterPopover`，否则旧一代的关闭函数留在表里。
- **重审条件**：宿主提供统一的弹层管理（全局互斥或焦点陷阱）时，改接宿主的机制，删掉本插件的登记表。

## D17. 权限档位以宿主目录为准，皮肤只做表现层

- **背景**：权限控件（输入框分段控件与它的弹层）此前把四档写死在两张常量表里，只对内置 `auto`（Auto review）做一次目录判定。于是第三方插件注册的权限档位看不见也点不到——例如 auto mode 插件的 `auto-mode`（宿主 `permissionPresets` 目录里的一等条目：确定性规则 + 两阶段分类器），而且会话已经处于该档位时，触发键上会显示机器值 `auto-mode`。宿主的目录是「当前可选档位」的权威：`PermissionCatalog.options` 由宿主按贡献顺序给出，`PresetOption` 只有 `value` / `name` / `description`（部署打上 automode 提供的补丁或宿主将来原生支持时另有 `icon`）。
- **决定**：段位与弹层行都按宿主目录构建——目录里有的档位才画，宿主没提供的整条不出现（不再有「画出来再隐藏」）；`PERMISSION_SEGMENTS` 只描述**格子**，每格列出可绑定的档位、按先后取第一个宿主提供的（部署自己的自动档优先于宿主内置的 Auto review），一格都绑不上就不画。档位名与说明来自皮肤的 `PERMISSION_PRESETS`，皮肤不认识的档位用目录自带的 `name`/`description`，永不把机器值上屏（宿主的 `custom` 用宿主自己的词）。行的内容是纯文字：档位声明的 `icon`（部署方写在预设上的 SVG 路径，宿主原生会忽略、由第三方补丁开启）**不画**——同一条列表里只有第三方档位带图标会读成两种东西，档位之间的区别交给名字与说明。切换仍走宿主的 `/permission <preset>`（与 automode 的 `/auto` 是同一条写入路径）。
- **理由**：目录变化时皮肤不再漏档位；第三方档位成为一等公民而皮肤不需要认识它；名字由皮肤给、档位由宿主提供，两件事各自独立，接入新档位不用改皮肤代码，也不必让第三方为图标去打宿主 `node_modules` 的补丁。
- **代价**：档位集合变化时要重建行与段位（此前只改显隐）；皮肤的表现表是一张白名单，不认识的档位会以宿主给的名字出现（可能不够 Claude 风味）但不会消失。
- **重审条件**：宿主原生支持预设 `icon`、且界面上有了统一的档位图形语言时，再考虑把图标画回来。
