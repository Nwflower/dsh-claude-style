# D57. 重绘档是插件自己的会话视图

- **状态**：待实施
- **分组**：功能
- **关联**：取代 D55、D56；D12、D26、D29、D32、D36、D39、D41、D42、D43、D44、D45、D51
- **现状**：「重绘」档仍是 `packages/client/src/features/chat-process/` 的覆盖层，按被取代的两条写法在宿主写出的 DOM 上改属性；阅读视图落地的同一提交里移除这个目录、它的冒烟探针、端到端场景 `process` 与契约表里只为它而设的条目

## 决定

- 「重绘」档改由新功能 `chat-reader` 承担（`packages/client/src/features/chat-reader/`，清单 id `chatReader`，`load: 'deferred'`，挂在 `chatAnimations` 的 `redraw` 档）：它向宿主公开的 `conversation.view` 列表槽位注册一项视图（id `dsh-claude-reader`），从会话投影直接渲染这一会话——`useChat` 的 `order` 与 `nodes`、`useSession` 的运行与加载状态、`useProjection('inbox')` 的待发消息。「关闭」与「增强」两档照旧覆盖宿主的 Chat 视图，增强档的 chat-* 功能在阅读视图里不安装。
- 视图的选中：注册之后经宿主会话外壳的原生 store（`conversation.session` 槽位上的那份，`setView`）选中阅读视图，宿主 store 的 `view` 为 `null` 时也选它；读者自己点到别的标签，本页内不再抢回。宿主的 Chat 标签留着：宿主按 `openView` 把请求（搜索跳转、查看工具调用）发给 Chat 时，读者能看到自己落在哪个视图。档位离开「重绘」时注销视图，`view` 还停在阅读视图上就写回 `null`，宿主据此回到 Chat。
- 渲染照搬 dsh-better-display 0.3.6 的阅读视图（MIT），逐模块移植并按本仓库的约定重写：
  - 折叠规则取它的两条：轮次进行中，新出现的一段思考把同一条链上此前的思考、正文与工具收成一行（`思考×N · 输出×M · 工具×K · 记录×J`），用户插话重置这条链；轮次以 `completed` 关闭时，过程与中间叙述收起、只留最终回答，失败、中断、未知终态与等待批准保持展开；读者选中文字期间推迟折叠，历史轮次随时可以重新展开。
  - 推理卡片、逐词出现、数字跳变、折叠时序（收缩、计数、停顿、展开）与工具行（目标、diff 行数、计时）都是视图自己的组件，时长与曲线沿用它的数值；「动画」为「减弱」时一律直接落位（D26）。
  - 正文的逐词出现需要在 Markdown 渲染之前分配每个词的出现时刻，所以正文走它的 Markdown 管线分叉（它自己由宿主 `dsh-client-ui-primitives` 的 Markdown 改出）；micromark、mdast 与 KaTeX 作为开发依赖打进 `chat-reader` 的块里，包的运行时依赖仍为零（D36）。KaTeX 的样式与字体用宿主页面随 `MarkdownText` 已经加载的那一份。
  - 宿主的官方控件经槽位渲染，不复制官方渲染器：工具详情走 `tool.call.toolview`，回答操作走 `conversation.chat.assistant-actions`，产物卡片走轮次尾部的槽位；子槽位只能有一个声明者，所以按它的 `official-slots` 映射在本插件的名字空间里重新登记。
  - 样式改写成普通 CSS（D51），类名 `dsh-claude-reader-*`，色值、字号与圆角取 `tokens.json`；它 918 行的 `Reader.tsx` 按职责拆开（停止线 750 行）；它吞掉错误的 `catch` 按 D12 去掉。
  - 组件写成 TSX：`tsconfig.json` 打开 `jsx: react-jsx`，esbuild 按同一设置以自动运行时编译，`react/jsx-runtime` 与 `react` 一样由宿主的加载器提供、不进产物（D36）；构建的「每个源文件都被导入」检查、lint 的停止线与功能模块检查、单元测试都把 `.tsx` 当作源文件。功能的主模块仍是 `<main>.ts`（D42）。
- 与其它功能和插件的接口：视图在自己的行上写出宿主 ChatView 的同名属性（`data-chat-flow`、`data-chat-flow-kind`、`data-chat-flow-key`、`data-chat-anchor-key`、`data-chat-node-key` 与 `data-pending-steering`），三档都运行的功能（turn-nav、turn-status、mascot、composer、chat-send）与第三方插件（rewind 读回退锚点）按原契约读到它；契约表里这些条目注明阅读视图同样写出，契约场景在阅读视图下再核对一遍（D44、D45）。滚动位置仍经滚动主人写（D41）。
- 让位：对 dsh-chat-ux 让位（D32）；页面上 `conversation.view` 已有 dsh-better-display 的视图（id `reader`）时不注册，两份阅读视图不并存。
- 宿主版本：视图读的投影类型来自宿主内部包（`dsh-client-ui-chat`、`dsh-client-ui-conversation`、`dsh-session`、`dsh-client-store`），以开发依赖固定到已验证的宿主版本（现为 `0.2.1-alpha.1`），`engines.dsh` 收窄到同一范围；视图依赖的投影字段——节点种类、块种类、回合的状态与终态、轮次尾部的收束步——写进契约模块（D44），契约场景在真实宿主上核对。
- 不移植：MCP Apps 内嵌框架、在文件夹中显示文件的私有路由、它自己的设置页与产物打开方式偏好。移植的源文件头注明出处，它的 MIT 许可全文随包放在 `THIRD_PARTY_NOTICES.md`（加入 `package.json` 的 `files`）。

## 理由

- 覆盖层改写不了宿主的文本节点与 Markdown 解析，也拿不到工具块里的数据：逐词出现、按回合终态判断的折叠、带 diff 行数的工具行都做不到，被取代的两条决策已经自认这些缺口。视图自己渲染才能全部做到。
- `conversation.view` 是宿主公开的扩展点（D43 认可的正式入口）：宿主的 Chat 视图原样保留，「关闭」「增强」两档完全不受影响，「重绘」随时可以退回。
- 照搬一份读者已经在用的实现，比按数值在宿主的 DOM 上仿写更接近它的手感，也省去重新推导每条时序。

## 代价

- 投影类型来自宿主的内部包，宿主升级可能改结构；固定版本与契约场景只能提前报出失配，修复仍要人工跟进。
- 一份数千行的渲染器归本仓库维护，dsh-better-display 之后的修复需要逐条判断是否搬过来。
- 阅读视图里没有增强档的跟随、自动开合与文件变更行，由视图自己的跟随与折叠代替；三档共用的功能要靠视图写出同名属性维持，漏写一条就表现为那项功能在「重绘」档失效。

## 重审条件

- 宿主把 Chat 视图拆成可组合的公开组件，或给出逐词渲染的注入点时，改为组合宿主组件。
- dsh-better-display 拆出可依赖的库并公开稳定接口时，改为依赖它而不是搬运。
