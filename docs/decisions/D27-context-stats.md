# D27. 会话数字收进上下文弹层

- **状态**：已实施
- **分组**：功能
- **关联**：D16、D29

## 决定

- 宿主画在输入卡片下方的统计行（轮次与步数 · tok/s、总 tokens · 缓存命中）与它的两张明细面板一起隐藏（`features/composer/inline-bar.css`）：输入行只剩右端的上下文计量环，数字进它自己的那个弹层。统计行仍留在文档里，只为读出「性能与用量」这一档（详细 / 简洁）的结构：详细档给出宿主那两组所有的行，简洁档只给四个数字——总用时（模型用时加工具调用用时，宿主没有这个合计，用皮肤自己的文案）、首 token 平均、输出速度与缓存命中，排成无标题的 2×2 网格。
- 这是独立的功能 `contextStats`（`src/features/context-stats/`），与权限控件共用 `permissionsControl` 开关（D29）。宿主的两张明细对话框只在它安装期间隐藏（`<body>` 上的 `SESSION_STATS_ATTR`），关掉即交还宿主。计量环按结构认：输入区底部那一行里画着圆环（`svg > circle`）的对话框触发按钮。
- 数字按数据读：`sessionStats` 与 `tokenUsage` 是宿主在整份日志上折出来的会话投影，经会话的按键读取面 `session.projections.faceOf`（宿主自己 `useProjection` 走的同一处，`features/context-stats/session-stats.ts` 经 `sessions.binding(id)` 取）。面板打开时按当前值填，订阅到新帧就地重写。
- 文字与格式与宿主一致：标签、时长模板与分词符取自宿主的 `chat` 语言命名空间（`locale.bind('chat')`）；宿主的四条格式规则（`formatDuration`、`formatTokensPerSecond`、`formatExactTokens`、`formatCacheHitPercent`）在皮肤里各写一份，函数名对着来源，输出逐字符相同。
- 面板靠结构辨认：`[role="dialog"]`、非模态、行网格 `dl` 是它自己的直接子节点，且内部不带宿主三张统计对话框的标记（`data-session-stats-details`、`data-session-stats-usage`、`data-turn-usage-details`）。别的插件挂在同一个 `<body>` 上的弹层因此不被认成面板：dsh-better-sidebar 的子智能体节点详情小窗把 `dl` 放在画底色的卡片里面，外层那个只管定位、不画底色，数字落进那一层就会压在对话内容上。安装时清掉上一代留在别的节点上的数字块与面板标记（客户端热更新不执行上一代的拆除）。开合靠按宿主的触发按钮（`aria-expanded` 为准）；悬停进出走共用的停留与宽限，并跟随「悬停打开弹层」偏好。皮肤给它打 `data-dsh-claude-context-panel`，取卡片那套一次性入场（4px、0.15 秒）。
- 左右位置由皮肤重写：宿主从定位点左缘放下弹层（`useStatDialog` 的 `align: 'start'`），离计量环很远。皮肤量出计量环的右缘与弹层的布局宽度（入场动画把盒子缩到 0.98，所以读 `offsetWidth`），写成 `--dsh-claude-context-panel-left` 并打上 `data-dsh-claude-context-aligned`，样式表以 `!important` 读取。盒子或视口变化时重新量。
- 追加的块带 `data-dsh-claude-context-stats`；投影还没应答时按真实结构占住高度（占位条按真实行的 37px 排），宿主重绘面板抹掉它时下一轮重画。占位只保留 `STATS_SKELETON_MS`（2 秒）。

## 理由

- 会话的所有数字只留一个去处；面板本体与开合仍是宿主的。读投影让插件画的是数据，既不重复渲染，也随会话实时更新。

## 代价

- 依赖两个投影单元的键名与值形状、`chat` 命名空间的键、`projections.faceOf`、统计行的结构，以及宿主的放置方式与计量环的现状。宿主不装这两个投影单元时，面板里没有这两组数字。辨认另依赖行网格挂在面板自己的直接子节点这一层结构，以及宿主三张统计对话框各自的标记；宿主把这些行包一层、或改掉那三个标记时，这段辨认要跟着核对，否则两段数字静默不出现（不抛错、不提示）。

## 重审条件

- 宿主把这些数字放进它自己的面板，或给统计行一个可悬挂的插槽时，改回宿主的。
