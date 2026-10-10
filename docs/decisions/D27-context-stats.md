# D27. 会话数字收进上下文弹层，或写在输入卡片下面自己一行

- **状态**：已实施
- **分组**：功能
- **关联**：D16、D29

## 决定

- 宿主画在输入卡片下方的统计行（轮次与步数 · tok/s、总 tokens · 缓存命中）与它的两张明细面板一起隐藏（`features/composer/inline-bar.css`）：统计行仍留在文档里，只为读出「性能与用量」这一档（详细 / 简洁）的结构。`context` 那一档在弹层里给出的内容按这一档分：详细档给出宿主那两组所有的行，简洁档只给四个数字——总用时（模型用时加工具调用用时，宿主没有这个合计，用皮肤自己的文案）、首 token 平均、输出速度与缓存命中，排成无标题的 2×2 网格。
- 数字的落点是一个选择项 `statsPosition`（设置页「对话」页的「对话统计信息位置」）：`context`（默认）只把这批数字写进计量环的弹层；`inline` 把同一批数字写在输入卡片下面单独一行，末尾就是宿主画的计量环，这一行本身就是那张弹层的第二个触发口。两种取值下宿主的统计行都隐藏，弹层里的两段（宿主自己的上下文行加上这一段会话的数字明细）两种取值下都在，都由同一份数据填：这一项只决定 `inline` 那一行在不在，所以中途改选不刷新页面；取值随 `<body>` 的 `STATS_POSITION_ATTR` 上屏，隐藏统计行、把 dock 覆盖到输入行、给计量环留位置的规则都按它分档。覆盖到输入行的这一层照抄输入行自己的盒子：行高与它距容器的距离由 composer 的每次经过量出，写成 `--dsh-claude-meter-row-offset` / `--dsh-claude-meter-row-height`（`features/composer/composer.ts`），样式表读这两个值——卡片在那一行下方留的空隙与行高都属于宿主，写死会让计量环离开那一行；量在行或容器尺寸变化时做，不挂在每一帧上。给行尾留出的宽度（`--dsh-claude-meter-room`）同理按盒子算：宿主停放计量环的那个节点与它里面的触发按钮两个盒子并起来再加 8px，触发按钮比停放节点宽时行尾文字也不会被药丸底色压住。这一项不再归 `permissionsControl` 管（D29）。
- 那一行是宿主自己的话包住宿主自己的数（`features/context-stats/inline-stats.ts`）：轮数与步数、输出速度、读入的 tokens、写回的 tokens、缓存命中率，模板取自宿主 `chat` 命名空间（`stats.counts`、`message.tokensPerSecond`、`message.turnUsage.count`、`stats.cacheHit`，分词符 `number.groupSeparator`），宿主统计行上那些图标一个都不出现；各段之间只有这一行自己的间距（10px），不插 `·` 之类的分隔符。这一行也是计量环那张弹层的第二个触发口（`stats-binding.ts` 的 `bindLine`）：按一下它弹层打开、再按一下收起，回车与空格同样开合、Esc 收起，展开状态写在它自己的 `aria-expanded` 上（值取自宿主那个触发按钮）。悬停开合只归计量环那条路径：指针停在数字上不展开弹层，也不接管弹层的收起。
- 那一行宽过它所在的输入卡片时按台阶让位（`inline-stats.ts` 的 `fit`），顺序固定：先去掉缓存那一截的字样，再去掉轮数与步数，再去掉计量环旁的数字（环留下），然后把读入与写回两个数合成一个合计并去掉上下箭头，最后把数字折叠成 k / M / B。每上一个台阶都重新量一次「行 + 计量环」的宽度与卡片的可用宽度，宽回来时按同一顺序退回一个台阶。量宽只在数字真的变了、或视口与卡片尺寸变化时做。让位只让出宽度：第三个台阶让出计量环旁的数字时，宿主那个触发按钮保持它自己一行的高度（`features/composer/inline-bar.css`），输入区底部这一行的高度不随台阶起落变化——上方的对话按这一行排、并把末尾钉在它上面，行高一变，整屏内容就跟着上下跳。
- 每个数写成逐字符的 digit 组（`stats-digits.ts`）：数一变就换掉它的字符 span，新 span 播 transitions.dev 的 Number pop-in（末两位延后一次；THIRD_PARTY_NOTICES.md），没变的数一个字节都不写。重画挂在投影帧上，所以每经历一个 step、流式输出的每一帧到达时动的就是那几个数。动画归皮肤自己的动效偏好管（D26），不另设开关。入场是每个字符从自己位置下方 8px 滑上来（`--dsh-claude-digit-distance`）：这一行与对话共用宿主的同一个滚动容器，滑上来那几像素会越过输入区底边、把容器的可滚动高度顶大几个像素，末尾跟随随即补偿，整屏内容跟着起落；那一行因此把自己裁掉（`features/composer/inline-bar.css` 的 `overflow: clip`），入场留在行内，容器高度不受它影响。
- 缓存命中率与上下文占用各有一条无极色阶（`stats-ramp.ts`，取自 dsh-chat-ux 的设计）：把读数落成「段标记 + 段内位置」，颜色由浏览器的 `color-mix(in oklch, …)` 在两个色标之间插出来。命中率 90%~99%（90 之前红、99 起深绿），占用 20%~40%（20 之前绿、40 起红）。计量环的填充弧（宿主那个带 `stroke-dasharray` 的圆，`composer.meter-fill`）与占用读数用同一个颜色，读数与环不会各说各话。
- 这是独立的功能 `contextStats`（`packages/client/src/features/context-stats/`），两种取值下都安装；宿主的两张明细对话框只在它安装期间隐藏（`<body>` 上的 `SESSION_STATS_ATTR`）。计量环按结构认：输入区底部那一行里画着圆环（`svg > circle`）的对话框触发按钮；环上的占用读数从它自己的那串文字里取（`stats-panel.ts` 的 `meterOccupancy`，composer 的留位判断读的是同一处）。
- 数字按数据读：`sessionStats` 与 `tokenUsage` 是宿主在整份日志上折出来的会话投影，经会话的按键读取面 `session.projections.faceOf`（宿主自己 `useProjection` 走的同一处，`features/context-stats/session-stats.ts` 经 `sessions.binding(id)` 取）。面板打开时、那一行每次重画时都按当前值填，订阅到新帧就地重写。
- 文字与格式与宿主一致：标签、时长模板与分词符取自宿主的 `chat` 语言命名空间（`locale.bind('chat')`）；宿主的四条格式规则（`formatDuration`、`formatTokensPerSecond`、`formatExactTokens`、`formatCacheHitPercent`）在皮肤里各写一份，函数名对着来源，输出逐字符相同。
- 面板靠结构辨认：`[role="dialog"]`、非模态、行网格 `dl` 是它自己的直接子节点，且内部不带宿主三张统计对话框的标记（`data-session-stats-details`、`data-session-stats-usage`、`data-turn-usage-details`）。别的插件挂在同一个 `<body>` 上的弹层因此不被认成面板：dsh-better-sidebar 的子智能体节点详情小窗把 `dl` 放在画底色的卡片里面，外层那个只管定位、不画底色，数字落进那一层就会压在对话内容上。安装时清掉上一代留在别的节点上的数字块与面板标记（客户端热更新不执行上一代的拆除）。开合靠按宿主的触发按钮（`aria-expanded` 为准）；悬停进出走共用的停留与宽限，并跟随「悬停打开弹层」偏好。皮肤给它打 `data-dsh-claude-context-panel`，取卡片那套一次性入场（4px、0.15 秒）。
- 左右位置由皮肤重写：宿主从定位点左缘放下弹层（`useStatDialog` 的 `align: 'start'`），离计量环很远。皮肤量出计量环的右缘与弹层的布局宽度（入场动画把盒子缩到 0.98，所以读 `offsetWidth`），写成 `--dsh-claude-context-panel-left` 并打上 `data-dsh-claude-context-aligned`，样式表以 `!important` 读取。盒子或视口变化时重新量。
- 追加的块带 `data-dsh-claude-context-stats`；投影还没应答时按真实结构占住高度（占位条按真实行的 37px 排），宿主重绘面板抹掉它时下一轮重画。占位只保留 `STATS_SKELETON_MS`（2 秒）。

## 理由

- 会话的所有数字只留一个去处；面板本体与开合仍是宿主的。读投影让插件画的是数据，既不重复渲染，也随会话实时更新。
- 看数字的时机因人而异：有人只在打开弹层时看，有人想一眼看到。这一行就是给后者的，用宿主自己的措辞与数值，读起来和宿主原来那一行是同一份东西。
- 每经历一个 step、流式输出的每一帧都有数字在动，静止地换字读起来像跳动；逐字符入场把这一次变化说成一个动作，而没变的数字保持不动。

## 代价

- 依赖两个投影单元的键名与值形状、`chat` 命名空间的键、`projections.faceOf`、统计行的结构，以及宿主的放置方式与计量环的现状。宿主不装这两个投影单元时，面板里没有这两组数字。辨认另依赖行网格挂在面板自己的直接子节点这一层结构，以及宿主三张统计对话框各自的标记；宿主把这些行包一层、或改掉那三个标记时，这段辨认要跟着核对，否则两段数字静默不出现（不抛错、不提示）。
- 环的颜色另依赖计量环的填充弧是那个带 `stroke-dasharray` 的圆（`composer.meter-fill`）：宿主换一种画法时环不再上色，读数与那一行仍照旧。逐字符入场把行上的节点数从几段文字变成每个数字一个 span，只在数字真的变了时才重写。

## 重审条件

- 宿主把这些数字放进它自己的面板、给统计行一个可悬挂的插槽、或直接给出本地化的档位与读数色阶时，改回宿主的。
