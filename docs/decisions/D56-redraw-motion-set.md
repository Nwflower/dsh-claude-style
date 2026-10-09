# D56. 重绘档的动效集：照搬 dsh-better-display 的动效设计

- **状态**：已实施
- **分组**：功能
- **关联**：D3、D9、D19、D26、D29、D32、D40、D41、D42、D44、D45、D55

## 决定

- 重绘档（`chatAnimations: redraw`）的动效以 dsh-better-display 的读者为参考实现，逐项照搬它的时序、曲线与关键帧，落在宿主自己写出的 DOM 上（D55）：皮肤仍然只改属性、只加自己的一类节点（摘要行），不接管视图槽位、不替换宿主的渲染。参考实现的常量记在该包自己的源码里（`fold-choreography.ts`、`motion.tsx`、`word-timeline.ts`、`stream-buffer.ts`、`reasoning-follow.ts`、`Reader.module.css`），本插件照抄数值，不引入它的代码。
- 过程折叠取它的 `FlowCell` 与相位编排：摘要行入场按 220 ms 动高度与不透明度（`cubic-bezier(.4,0,.2,1)`，`fill: both`）；退场的行按三段关键帧收缩（原高 → 一半高、不透明度 .85 → 0 与 0）；新露出的一行按 180 ms 从零高度长回来。相位按**渲染到的帧**计数（`elapsed += min(40, now − previous)`），另有 240 ms 的兜底，两者取先到的那一个；收缩期间这一列带 `data-dsh-claude-process-collapse`，样式表把它下面所有动画暂停（对应参考的 `.choreographedFlow[data-reader-transition=collapse] .flowCell * { animation-play-state: paused }`）。
- 摘要行常驻吸附：它停在对话顶部工具行之下（`position: sticky`），带画布底色与一段负向投影盖住身后内容，读者滚动时它自己让位（对应 `.flowCell[data-flow-summary]`）。第一次立起来时播一次 180 ms 的落位脉冲（参考的 `liveFoldPulse`：`translateY(-4px) scale(.98)` 起、中点过冲 1.02、落回 1）；一次折叠落定时播一次 180 ms 的弹性（参考的 `liveFoldElastic`：`scale(1) → 1.015 → 1`，曲线 `cubic-bezier(.2,0,0,1)`）。
- 动过的版面前后都发 `dsh-claude-layout-start` 与 `dsh-claude-layout-end`（冒泡），跟随据此在版面变动期间让位（对应参考的 `reader-layout-start`/`reader-layout-end`）。
- 还在写的思维行由皮肤自己打开：宿主把每个思考行渲染成收着的一行（一个预览，没有任何设置暴露它），参考实现的读者则把推理正文摆出来、按预览高裁切、再跟上文字；所以这一档必须在行的阶段为「进行中」时按它自己的展开控件把它打开，推理停下再按回去。控件取行内第一个 `[role="button"]` 或 `button`（宿主用哪一种都能命中），行自己的 `data-state`（`running` 即契约 `chat.phase`）与 `data-expanded`（契约 `fold.expanded`）说明它此刻的状态。读者自己在某一阶段按过这一行，皮肤在那个阶段里不碰它；按过一次没生效的也不再重复按。
- 思维行的滑动补全参考的整套：视口预览高 224 px（窄栏 192 px）、`overflow-anchor: none`、`overscroll-behavior-y: contain`、细滚动条；跟随时整块以 `transform: translateY(-已画偏移)` 走，视口缩到 `overflow: hidden`；两端各 28 px 的渐隐遮罩在跟随时按上下还剩多少文本切换 `data-edges`（none / top / bottom / both）；读者一滚轮就交还原生滚动（第一记滚轮由皮肤 `preventDefault` 接下并按 `deltaMode` 换单位），选中文字、页面被切到后台都当场停下。节奏仍是两行、停 840 ms、一步 500 ms（追积压最多 40 行、追的时候只停 40 ms），曲线 `cubic-bezier(.22,1,.36,1)`。
- 逐段的文字淡入按参考的逐词配方落成**逐块**版本：流式回答里新出现的块级节点由皮肤播一段 350 ms 的淡入（`opacity 0 → 1`、`filter: blur(1px) → 0`，曲线 `cubic-bezier(.22,1,.36,1)`，`fill: backwards`），出生时刻按参考的节奏表分配（一批新词压进 90 ms 的窗口、单词间隔 60 ms、最短 3 ms、最多等 240 ms），并挂在一个绝对时钟上（`animation.startTime = born`）。皮肤不切分宿主文本节点、不重写文本内容：参考的逐词粒度要拆词成行内盒子，宿主的 markdown 由宿主自己更新，拆了它下一笔更新会写错节点。
- 状态标签换字按参考的 `StatusText`：皮肤自己那一行状态文字变化时，旧字上移 8 px、模糊 2 px、淡出（150 ms），新字自下 8 px、模糊 2 px 升起（150 ms，晚 50 ms），曲线 `ease-in-out`。这一行的可见文字是皮肤自己的（`turn-status` 写在宿主控件上的属性，由样式表的 `content: attr()` 画出），所以整段换字都归皮肤管：一个元素、一份文字，读者看到的是这一行先走、下一行再起，与参考的两份文字交叉同一套时序。
- 这一轮的实时数字写两处：宿主挂上它自己的整轮控件之后写在那上面（已完成的一轮），还在跑的时候写在宿主自己那一行进行中状态行上（此刻它就在读者眼前，且随工作增长），两处都用同一个 `data-dsh-claude-process-counts` 与同一条计数口径。
- 进行中那一行本身按参考的状态行画：参考的 `StatusText` 用次级标签色写字、用主级标签色扫过（400% 渐变、`background-position` 100% → 0、2 s 线性无限、`background-clip: text`），字号 14 px、行高 24 px、一行到底。宿主那一行是 12/22 的深潜蓝、自带它自己的扫光，且它的行是纵向排布（数字因此会掉到第二行），所以这一行由皮肤接管：行改成横向可折行、宿主自己那条分隔线占满一整行、数字挂在行尾并以「· 」自带的间隔贴在标签后面，标签的涂色换成参考的两级标签色。宿主那只鲸鱼图标由它自己的字形动画画出来，选择器只覆盖标签那一支，图标照旧。
- 契约：这条状态行读的是 `chat.running`（已有），皮肤写的是同一个 `data-dsh-claude-process-counts`。
- 对话的跟随取参考的指数逼近：`scrollTop += 余量 × (1 − e^(−帧间隔 / 52))`，帧间隔上限 48 ms；离底部 25 px 内算在末尾；跟随时把宿主自己的那一记「钉到底部」在同一帧收回（订阅排在宿主的尺寸观察器之后），版面变动事件期间不写位置；读者离开末尾后按他的位置停下，回到末尾才接着跟。增强档的弹簧不动，两档各按各的曲线走。
- 运行中的工具行取参考的「活边」：行首一颗 6 px 圆点，光晕扩到 7 px 再收，1.4 s `ease-in-out` 无限（`readerRunningGlow` 的关键帧）；标签上那条流动高光带不叠——宿主已经给同一个标签挂了 `data-shimmer` 与它自己的扫光层，两条渐变文字会互相盖。
- 运行中的状态行取参考的微光：皮肤自己那一行的文字用 400% 的渐变扫过去（`background-position` 100% → 0，2 s 线性无限，`background-clip: text`），换字相位期间让给换字（一份文字只能有一个动画）。
- 压缩记录行取参考的三段入场：横线从中段扫开（520 ms，`scaleX(.6) → 1`）、拨盘转正（900 ms，晚 200 ms，`-140deg → 0`，落在不透明度 .7）。两条按宿主自己的流类型字面量选取：`compaction` 与 `manual-compaction`（契约 `chat.compaction-kind`、`chat.compaction-manual-kind`）。
- 摘要行上的数字各自按参考的元信息行入场：它先是 `grid-template-rows: 0fr` 且不透明度 0，下一帧放开成 `1fr` 与 1（260 ms / 160 ms），所以新出现的「记录×K」是长出来的。
- 逐词的文字淡入仍落在逐块版本上（见上一条的粒度说明）；这是本轮唯一没有做到参考粒度的动效。
- 契约：本决定读的宿主字面量在原有的 `chat.running`、`chat.call`、`chat.streaming`、`chat.scroller` 之外，新增 `chat.phase`（行自己的 `data-state` 属性）、`fold.disclosure`（行自己的控件）、`fold.expanded`（行自己的 `data-expanded`）、`chat.compaction-kind` 与 `chat.compaction-manual-kind`（压实记录的两种流类型）；皮肤自己写的属性是 `data-dsh-claude-process-collapse`、`data-dsh-claude-think-mode`、`data-dsh-claude-think-edges`、`data-dsh-claude-think-track`、`data-dsh-claude-stream-reveal`、`data-dsh-claude-part-in`、`data-dsh-claude-status-swap`。皮肤自己写出的标记一律 `data-dsh-claude-` 前缀。
- 摘要行的披露箭头按参考的 260 ms 旋转（`cubic-bezier(.22,1,.36,1)`，展开转 90 度）；行上的元信息（数字行）按 `grid-template-rows: 0fr → 1fr` 与不透明度 260 ms / 160 ms 展开。读者把「动画」设为「减弱」（D26）时以上全部直接落位：不加动画、不抖、不淡化。
- 测试：`stream-reveal.test.ts` 覆盖出生节奏与窗口压缩，`lane-motion.test.ts` 覆盖按帧计数的相位与兜底取先到者，`stream-follow.test.ts` 覆盖指数逼近的收敛与钳制，`number-roll.test.ts` 覆盖数字跳变的出场与落定；冒烟用例 `chat-process` 的替身页面持有跟随模式与边缘遮罩、滚轮交还与位置接管、逐块淡入的时长与曲线、状态换字的两相与落定、运行中工具行的呼吸点、压实行的扫出与拨盘、状态行的两秒微光、数字行从零高长出来、进行中的思考行被皮肤打开、读者自己收起的那一行不被抢，以及这一档的跟随确实走向新内容；端到端场景 `process` 在真实宿主上核对进行中的那一轮（思考行打开、皮肤自己的视口在、进行中状态行带着实时数字）与轮次结束后的摘要行、数字与分段收放，契约场景核对新读的 `chat.phase`、`fold.expanded` 与两条压实记录字面量。

## 理由

- 参考实现把「动得快、动得顺、动得停得住」写成了具体的数与曲线，照搬数值比另调一套更接近读者已经熟悉的手感；皮肤只要在同样的时刻做同样的事，观感就一致，不必复刻它的渲染结构。
- 逐词拆盒在宿主渲染的 markdown 上不安全：宿主按自己的节点引用更新文本，皮肤拆完它下一笔就写错位置。逐块淡入保住同一配方（同样的时长、曲线与模糊），代价是粒度粗一档。
- 收缩期间暂停列内动画、跟随在版面变动期间让位，是参考实现里两条防止「动画与滚动互相打架」的规定；没有它们，收放时读到的位置会跳。

## 代价

- 摘要行吸附到对话区顶端，宿主改版时表现为摘要行压住它自己的工具行或离得太远；吸附的底色读的是画布变量，另一个皮肤接管页面时可能对不上。
- 思维行的跟随时视口由皮肤接管 `overflow-y`，交还时按原值写回；页面被切到后台、读者选中文字或读到最后一行都走这条路径。
- 逐块淡入的粒度比参考粗，长段落一次淡入；参考的逐词观感只有在皮肤自己渲染文本时才可能完全一致。
- 工具行标签上的流动高光由宿主自己播放，手感随宿主的实现走，皮肤只保证不叠第二层。
- 跟随的指数逼近与增强档的弹簧是两套写法，两档各按各的曲线走，读者换档会感到手感差异。
- 参考里由它自己绘制的那几处（运行中工具行的扫光、状态行的微光、逐词淡入、压实行的三段入场）在宿主的 DOM 上已是宿主自己的动效或没有契约可依，皮肤只保证不与之打架。

## 重审条件

- dsh-better-display 把动效参数公开成可依赖的常量或样式变量时，改为引用它的数值而不复制。
- 宿主给出文本节点的稳定更新约定（例如公开流式块的粒度）时，把逐块淡入换回逐词。
