# Changelog

All notable changes to `dsh-claude-style` are documented here, newest first.

## [Unreleased]

[中文](#cn-unreleased) | [English](#en-unreleased)

<h3 id="cn-unreleased">新增功能</h3>

- 「聊天区动画效果」的「重绘」档换上插件自己的会话视图：它直接占据宿主「对话」视图的位置，标签条上不再多出一个标签，宿主转到「对话」的跳转同样落到它；档位离开「重绘」时宿主的「对话」原样回来。轮次进行中，新出现的一段思考把同一条链上此前的思考、正文与工具收成一行（思考×N · 输出×M · 工具×K），数字随内容跳变，用户插话重新开一条链，收拢走收缩、计数、停顿、展开四段时序；轮次成功结束后过程与中间叙述收起、只留最终回答与它的复制、分叉、反馈操作，失败、中断与等待批准的轮次保持展开，读者选中文字期间推迟折叠，历史轮次随时可以点开。思考在卡片里按阅读节奏滑动跟随，卡片只放思考的文字，读者滚回末尾即重新跟随；收进折叠的思考每段只占一行，写作「思考 · 内容」并带着思考卡片的边框，与中间输出一眼分开，按一下边框随全文展开；正文由宿主的 Markdown 渲染，新出现的词逐个淡入；工具行写出目标、改动行数与慢调用的计时，展开后是宿主自己的工具详情、输入与原始记录。轮次进行中的每一种状态（等待模型、思考、输出、准备与使用工具、等你操作）都由最新一条消息下面同一行说出；等待模型时这一行计时，过 10 秒标出「暂未响应」，进行中的过程也从这一行展开与收起。页面上装有 dsh-better-display 的阅读视图时这一份不登记；桌面端随带的 0.2.0 宿主与 npm 上的 0.2.1 宿主都能读。「动画」设为「减弱」时一律直接落位。
- 模型选择器的每一行标出该模型此刻的倍率：峰价、谷价与限时活动三种状态各有自己的图标，颜色区分贵与便宜，倍数后面跟着距离切换还有多久，鼠标停在徽章上读到「此刻的判定 · 多久后转为哪个状态」的完整一句，距切换不足一分钟时读 `<1m`。判定按各家供应商自己发布的作息表与自己的时区做（工作日窗口之外、周末与法定节假日整日算谷价，跨零点的窗口归它开始的那一天，夏令时切换按真实时刻计算，落进夏令时空档的窗边落在跳变那一刻）；没有作息表的模型不显示徽章，把标准费率整天在走的供应商按其作息表显示。限时活动按文档声明的日期与时刻边界起止（结束时刻就是切换那一刻，已经结束的活动不会再生效）。作息表来自公开目录 offpeakclock.com 的一份快照：宿主半边取一次、在 `$DSH_HOME/cache/dsh-claude-style/peakrate.json` 留一份缓存、每 24 小时刷新一次，经 `/dsh-claude-style/peakrate` 下发（`POST` 强制重拉），连不上时按插件包里带的那份判定；浏览器半边只在功能装上时读一次，第三方地址不经过页面。构建核对匹配表里每一行点到的那条作息确实在包内快照里、且属于同一个供应方，对不上即构建失败。设置页「输入区」页新增「峰谷电表」子项，关闭后各行的徽章消失，模型选择器关闭时该项目变灰不可操作。

### 体验优化

- 设置页「对话」页的「聊天区动画效果」从开关改成三档分段控件：关闭、增强、重绘。「关闭」把聊天区交回宿主；「增强」是原来的全套动效（跟随、自动开合与卷帘门、新文字淡入、文件变更行、聊天气泡动效）；「重绘」交给另一套动效，接上的是聊天气泡动效与插件自己的阅读视图。旧版本存下的开关取值照旧生效（开 = 增强，关 = 关闭），不需要重新设置。
- 页面启动时插件占用的主线程时间减少：设置页、内容搜索、吉祥物、发送动效、对话导航、上下文弹层与封号彩蛋这七个首屏可以缺席的功能离开 `lib/client.js`，各自成为一个块，由插件已有的资产路由 `/dsh-claude-style/assets/` 提供，页面被接管后立即请求、到达后安装。在本地临时宿主上实测（两种产物各载入 20 次取中位数）：`lib/client.js` 从 776 KB 降到 712 KB，前 3 秒的主线程长任务从 713 ms 降到 648 ms，皮肤生效时刻从导航后 298 ms 提前到 280 ms；七个块经 brotli 压缩后共 33 KB，比主产物晚约 5 ms 到达。块与它的 source map 各自按自身内容的哈希命名，浏览器不会把旧的 map 当成新的那份；构建拒绝主产物与块同时携带同一个模块（构建期生成的模块也在其中，它经共享表读主产物里的那一份）。插件更新后页面换代时，块已经在磁盘上：构建把主产物写在最后，先写新资产、再写清单、最后删清单里没有的文件。
- 设置页「侧栏」页新增「面板悬浮卡片」开关：开启（默认）时右侧栏停靠的面板仍是悬浮卡片——四周留 8px、16px 圆角、1px 描边与投影；关闭后停靠的面板铺满整列、贴住四边，分栏时每栏铺满各自那一栏，两栏之间只留宿主的接缝线。切换不需要刷新页面。
- 模型选择器每一行的说明改由一张按名字模式认领的有序规则表得出：带上日期后缀、把官方点号写成连字符或下划线（`glm-5-3-flashx`）或换一个售卖方前缀，仍然读到同一句；`k3-256k`、`ernie-5`、`minimax-m3-1m`、`deepseek-v41-flash` 这类目录拼法各自落到所在产品线的规则上，不必再逐条登记。带版本数字或最高级的说明写成锚定该版本的规则（`glm-5.3`、`gpt-5.4`、`qwen3.8-max`、`step-3.7-flash`、`celeris-1` 等），同产品线的其他版本读到线级文案；目录里现有的 25 个模型 id 里，除 Grok 与 ERNIE 两行按另一条记录改写外，其余解析出的句子与改动前逐条相同。
- 「重绘」档里轮次进行中的那条状态行（「正在思考」「正在使用工具」这些）上下各收进 30px，贴着最新一条消息读，不再像独占一行。实测：该行与上方轮次之间原有的 26px 空隙收掉，行内文字与它的下一条内容之间的距离也少 30px；这一行仍按内容居中，高度不变。为了让它在压上去时不露出旧内容的接缝，这一行补了一圈底色投影，并抬到上方内容之上。
- 「重绘」档的思考卡片只留思考本身：参考实现搬来的「思考 · 第 N 步」抬头、「暂停跟随 / 跟随最新」与「完整阅读 / 收起」两个按钮，以及为展开态在会话里量出的阅读高度都不再出现，卡片的边框里就是思考的文字，高度由预览高度与内容决定。跟随仍按阅读节奏走，滚回卡片末尾就重新跟随，而上一版要靠按钮点回来的那一步现在由滚动自己完成；展开一段思考仍是从折叠里那行文字点开，于是每段思考在折叠里保持一行，读全文按一下即可。
- 「重绘」档的一轮过程现在按宿主「工作步骤展示」的当前档位成形，两侧设置不再各行其是：插件不新增自己的档位控件，只读宿主 `ui-chat` 命名空间的档位并在每次有轮次开始时重读，读不到时按网页端缺省档「详细」。「简洁」把整条链收成一行，中间输出的正文也进这一行的计数；「标准」收拢最后一段思考之前的全部步骤，中间输出随最后一段思考留在行外；「详细」把结尾的中间输出留成自己的一行、收拢它之前的全部步骤；「完全展开」与「详细」同形，另外把收进折叠的思考画成整张推理卡片（全文，而不是「思考 · 内容」一行），工具仍由读者自己按开。宿主自己的设置行仍是唯一控件，插件不代写。
- 模型选择器里 Grok 与 ERNIE 两行的说明改写：Grok 的规则从匹配 4.5 改成匹配 Grok 4 整条产品线，`grok-4`、`grok-4.5`、`grok-4-2026` 这些拼法读到同一句「全球最智能的模型之一，支持原生工具使用以及实时搜索功能。」；ERNIE 5 一行改成「2.4 万亿参数的原生全模态大模型。」，不再列激活比例与上下文长度。
- 插件的样式表以压缩后的文本随包发出：注释与排版只留在源文件里，整张样式表从 349 KB 降到 208 KB，`lib/client.js` 从 712 KB 降到 570 KB。页面画出的样子不变：端到端通道把压缩前后的两份样式表放到同一个页面上，22 个页面状态逐元素比对计算值，全部一致。压缩还把 `!important` 审计过去豁免的一部分规则变成可以逐条判定的（同一个属性写两遍的规则，压缩后只剩一条声明）：判定之后，输入区停止按钮、侧栏进行中指示与聊天区跟随尾部上页面并不需要的 46 处 `!important` 从源样式表里去掉了。审计也随之收紧：处在条件不成立的 `@media` / `@supports` 里的规则不再参与判定，它们的 `!important` 不会因为页面当时不在那个条件里就被判成多余。在本地临时宿主上实测（两种产物各载入 20 次、做两轮，取中位数）：插件包的求值时间从约 9.0 ms 降到约 8.3 ms；启动阶段的其余计时差别落在两轮之间的波动以内。

### 问题修复

- 长会话里流式输出期间的卡顿减少：跟随在每一批文字到达时都要问的几个问题不再落到整个文档上——会话的滚动容器与消息列读一次后保留（换会话、切「轨迹」页签时旧节点会从文档里移除，届时重新读取），流式标记改在消息列里查找，宿主「回到底部」按钮的存在本身就是「跟随已关闭」的判据，而同一帧里读到的高度只读一次，交给收回宿主写下的末尾、判断是否继续滑行这两处共用。在 120 轮、4286 个节点的临时会话上实测：插件发出的文档级查询从 3263 次降到 2762 次（−15%），整页最长的一次停顿从 270ms 降到 234ms；文档越大，省下的每次全页样式重算越多。
- 模型选择器里当前在用的模型、当它所属的供应商不在第一级列表里时，会单独占一级列表最下面一行——这一行过去绕过了其余各行共用的行构造，因此没有峰谷徽章，也没有厂商标志与说明；现在它与列表里的每一行走同一个构造，徽章、标志、说明和行高内边距都一致。
- 「重绘」档里收进折叠的一段思考，展开后再点它的文字没有反应，只能点右侧的折角按钮才能收起。文字上的点击此前只在收起时挂着，展开后整行文字只剩选择文字的作用。现在文字两态都可点：收起时点它展开，展开时点它收起；一次以选中文字收尾的落点不改开合，选中文字期间推迟折叠的行为照旧。
- 进行中的状态行不再随流式内容上下跳动。此前该行只在宿主自己的「跟随还开着」标记下钉住，而流式期间跟随的滑动会把滚动位置停在末尾之前，宿主把这次写入读成读者离开了末尾并摘掉标记，于是每一片内容到达时该行退回文档流、被内容底部推下去，滑动追上来再把它拉回：视口 1280×600 下实测，标记缺席的 115 帧里该行顶边在 447px 与 573px 之间移动，而钉住位是 426px。现在滑动持有位置期间在聊天列上写下自己的标记，该行按宿主标记或滑动标记任一钉住，内容突发的追加不再带动它：同一场景里标记缺席的 112 帧内顶边恒为 426px。往回翻看历史时两个标记都不在，该行照常留在文档位置，不会浮在读者正在读的内容上。
- 「重绘」档里轮次状态行的文字在长短之间切换时，被替换下去的那一段会暂时折成两行、溢出状态行的高度（视口 1280×900 实测：状态行高始终 32px，而退出中的文字片段为 84×48px）。原因是两层文字在替换的同一帧里用新文字的宽度排布了旧文字：状态行按隐藏的丈量层取宽，绝对定位的文字层虽然被同一层撑开，浏览器在这一帧仍把旧文字按它原来的窄宽度断行。现在丈量层与被替换的两层都不换行，文字生长期间各行始终单行，状态行高度不再跳变。
- 修复 **重新编译后设置页等延后功能从设置里消失、要重新开关插件才回来**：构建原先先写 `lib/client.js`、几秒之后才重写 `lib/assets/`，而客户端热重载只认主产物，页面在新块落盘之前就换代，按当时那份清单请求新块得到 404，延后的功能各报告一次并退役。现在资产按「先写新文件、再写清单、最后删清单里没有的文件」落盘，`lib/client.js` 写在最后：换代的那一代要的块已经在磁盘上、也已经在清单里。

### 其他变更

- 开发机上新增构建标记 `DSH_CLAUDE_STYLE_DEBUG=1`：链接安装的检出重建时，资产清单继续带着上一代仍然存在的条目并保留它们的文件，宿主在启动时读到旧主产物的页面不会因为一次重建丢掉延后的功能。发布构建与持续集成里这个标记不生效，清单就是这一次构建自己的资产；构建日志会说明当前处于哪一档。
- 构建把 Deepy 帧图的矢量化结果与资产的 brotli 压缩结果按输入哈希缓存在 `.debug/build-cache/`，只改 TypeScript 后的重建从约 14 秒降到约 1.7 秒，`lib/` 与不带缓存时逐字节相同；新增 `npm run dev`，监听构建读取的目录，每次保存后重新构建（带 `DSH_CLAUDE_STYLE_DEBUG=1`），构建失败时保留上一次的 `lib/` 并继续监听。

<h3 id="en-unreleased">New Features</h3>

- The Redraw tier of Chat-area animations swaps in the plugin's own conversation view: it takes the place of the host's Chat view itself, no extra tab appears in the strip, and whatever the host sends to Chat lands on it; leaving the Redraw tier brings the host's Chat back as it was. While a turn runs, a new thought folds the thinking, output and tools before it in the same chain into one row (Thinking×N · Output×M · Tools×K) whose figures roll as the work grows, a message from the reader starts a new chain, and each fold runs a shrink, count, pause, reveal sequence. Once a turn completes, its process and interim narration fold away and the final answer stays with its copy, branch and feedback actions; a failed, stopped or waiting turn stays open, a text selection holds the fold, and any past turn opens again. Thinking glides inside its card at reading pace, the card holds the thought's text alone, and scrolling it back to its end resumes the follow; a thought inside a fold takes one line, reading "Thinking · …" inside the thinking card's frame so it never passes for interim output, and a press grows the frame to its whole text; the answer is the host's own Markdown with each new word fading in; a tool row names its target, the lines it changed and how long a slow call has run, and opens onto the host's own tool view, its input and the raw record. Every live state of a running turn (waiting on the model, thinking, writing, preparing and using a tool, waiting for you) is said by one line under the newest message; while the model is silent the line times the wait and marks it "No response yet" past 10 seconds, and the running process opens and closes from it. With dsh-better-display's reading view on the page this one does not register; it reads both the 0.2.0 host the desktop ships and the 0.2.1 host on npm. With Animation set to Reduced everything lands at once.
- Every row of the model picker now carries the rate in force for that model: peak, off-peak and a dated promotion each get their own mark, the colour separates expensive from cheap, the multiplier is followed by how long it lasts, hovering the badge reads one line — the judgement now, and what it becomes and when — and a switch under a minute away reads `<1m`. The judgement is made from each provider's own published schedule in that provider's own time zone (outside the weekday windows, and on weekends and public holidays in full, the rate is off-peak; a window crossing midnight belongs to the day it starts; a daylight-saving change is resolved against real instants, so a window edge inside a skipped hour falls at the transition), and a model with no schedule published carries no badge while a provider billing a flat standard rate all day keeps the badge its schedule describes. A dated promotion runs between the day and instant bounds the document states (its closing instant is the switch itself, so an expired promotion never applies again). The schedules come from one snapshot in the public offpeakclock.com catalog: the host half fetches it, keeps a copy in `$DSH_HOME/cache/dsh-claude-style/peakrate.json`, refreshes every 24 hours and serves it over `/dsh-claude-style/peakrate` (`POST` fetches again first), and falls back to the copy shipped in the package when it cannot be reached; the browser half reads it once when the feature installs, and the third-party address never goes through the page. The build checks that every row of the mapping table names a profile the shipped snapshot yields and belongs to the same provider, and fails on a row that does not. The Composer settings tab gains a Peak rate meter sub-row under the model picker: off removes the badges, and turning the picker off greys the row out.

### Improvements

- The Conversation tab's Chat-area animations row is a three-way segmented control now — Off, Enhanced and Redraw — in place of its switch. Off hands the conversation back to the host; Enhanced is the set that was there before (the follow, the automatic folding with its rolling door, the text fade, the file change rows and the send flight); Redraw hands the area to a second set, whose members are the send flight and the plugin's own reading view. A switch value stored by an earlier build keeps its meaning (on reads as Enhanced, off as Off), so nothing has to be set again.
- Less main-thread time at page start: seven features the first frames can do without — the settings page, content search, the mascot, the send animation, the conversation navigator, the context popover and the account-hold easter egg — leave `lib/client.js` for chunks of their own, served by the plugin's existing asset route `/dsh-claude-style/assets/`, requested as soon as the page is taken and installed on arrival. Measured on a local scratch host (20 page loads of each build, medians): `lib/client.js` falls from 776 KB to 712 KB, main-thread long tasks in the first 3 s from 713 ms to 648 ms, and the skin takes the page 280 ms after navigation instead of 298 ms; the seven chunks are 33 KB brotli-compressed and arrive about 5 ms after the bundle. A chunk and its source map are each named by their own content, so the browser never reads an older map as the current one; the build refuses a module the bundle and a chunk would both carry, generated modules included — those are read from the bundle's own copy through the shared table. After an update the chunks are already on disk when a page swaps to the new bundle, because the build writes the new assets first, the manifest next, the files it does not name last, and the main bundle after all of them.
- The Sidebar tab gains a Float docked panels switch: on (the default) keeps the right sidebar's docked panels as floating cards — 8px inside the column, a 16px radius, a hairline and an elevation; off fills the column and hugs its edges, each pane filling its own column when the dock is split, with only the dock's own resting line left on the seam. Switching needs no reload.
- Every model row's description now comes from one ordered table of name-pattern rules: a dated suffix, a separator spelled differently (`glm-5-3-flashx`) or another reseller's prefix still reads the line's own sentence, and catalog spellings such as `k3-256k`, `ernie-5`, `minimax-m3-1m` and `deepseek-v41-flash` land on their product line's rule without an entry of their own. Copy carrying a version's numbers or a superlative sits on a rule anchored to that version (`glm-5.3`, `gpt-5.4`, `qwen3.8-max`, `step-3.7-flash`, `celeris-1` and the rest), while another version of the same line reads the line-level copy; of the 25 model ids the catalog names, every one but the Grok and ERNIE rows another record rewrites resolves to the same sentence as before.
- In the Redraw tier the live status line ("Thinking", "Using a tool" and the rest) comes in by 30px above and below, so it reads with the newest message instead of as a row of its own. Measured: the 26px gap it used to leave to the turn above is gone, and the distance from its text to whatever follows it drops by 30px as well; the line stays centred in its own height, which is unchanged. A base-coloured shadow now runs under and over the line where it draws over the content above, so the older content never shows at its edge.
- A thinking card in the Redraw tier now holds the thought and nothing else: the "Thinking · Step N" heading, the Pause following / Follow latest and Read in full / Collapse controls that came with the ported implementation, and the reading height it measured against the conversation while expanded are gone, so the card's frame is the thought's text with its height set by the preview and the text itself. The follow still runs at reading pace, and scrolling the card back to its end resumes it — the step the buttons used to do is now the scroll's own. Opening a thought still starts from its line inside a fold, so each thought keeps one line there and a press reads it in full.
- In the Redraw tier a turn's process now takes the shape of the host's Work details setting, so the two settings stop disagreeing: the plugin adds no tier control of its own — it reads the host's `ui-chat` value, re-reads it whenever a turn opens, and falls back to the Web client's default, Detailed, when the host serves none. Compact gathers a whole chain into one row, the intermediate output's own text included in that row's figures; Standard gathers everything before the last thought and leaves the intermediate output outside it, beside that thought; Detailed keeps the trailing intermediate output as its own row and gathers what came before; Verbose matches Detailed and draws a thought inside a fold as its whole reasoning card instead of the one-line "Thinking · …", with tools still opened by the reader alone. The host's own settings row stays the only control: the plugin never writes the value.
- Two lines of the model picker's copy are rewritten: Grok's rule now claims the whole Grok 4 line rather than the 4.5 build, so `grok-4`, `grok-4.5`, `grok-4-2026` and the rest read one sentence — one of the most intelligent models in the world, with native tool use and real-time search — and the ERNIE 5 row now reads a native omni-modal model with 2.4 trillion parameters, without the activation share or the context length.
- The plugin's stylesheet ships minified: comments and formatting stay in the source files, the sheet falls from 349 KB to 208 KB and `lib/client.js` from 712 KB to 570 KB. Nothing it paints changes: the end-to-end lane puts the sheet before and after minifying on the same page and compares computed values element by element across 22 page states, all identical. Minifying also brings rules the `!important` audit used to exempt within reach of it (a rule declaring one property twice keeps a single declaration once minified): judged one by one, the 46 `!important`s the page never needed — on the composer's stop button, the sidebar's ongoing indicator and the chat area's follow tail — leave the source sheets. The audit tightens with it: a rule inside a `@media` or `@supports` condition the page is not in is no longer judged, so its `!important` cannot be called redundant for a condition that keeps it out of the cascade. Measured on a local scratch host (two rounds of 20 page loads of each build, medians): evaluating the plugin's bundle takes about 8.3 ms instead of about 9.0 ms; the other startup timings move by less than they vary between rounds.

### Bug Fixes

- Less jank while an answer streams in a long session: the questions the follow asks on every batch of arriving text no longer go to the document — the conversation's scroller and its message column are read once and kept (a session switch or the Trajectory tab removes the old node, and the reading is taken again), the streaming mark is looked for inside the message column, and the presence of the host's back-to-end button is itself the reading that its follow is off. What a frame does read it reads once and shares between taking back the end the host wrote and deciding whether to keep walking. Measured on a 120-turn, 4286-node scratch conversation: the plugin's document-level queries fall from 3263 to 2762 (−15%) and the page's longest single stall from 270ms to 234ms; the larger the document, the more each avoided whole-page style recalculation is worth.
- In the model picker, the model in force gets a row of its own at the bottom of level 1 when its provider is not listed there. That row was built apart from every other row, so it carried no peak rate badge, no vendor mark and no description line; it now goes through the same row builder as the rest of the list, with the same badge, mark, description and row metrics.
- In the Redraw tier a thought inside a fold could only be closed from the chevron button: once its line was open, a press on the text itself did nothing, because the text carried a click only while closed and left the whole line to text selection afterwards. The text now toggles in both states — closed, a press opens it, open, a press closes it again — while a press that ended as a selection changes nothing, and a selection still holds the fold off as before.
- The live turn's status line no longer moves with the streaming answer. It was pinned only under the host's own following mark, and while an answer streams the follow's glide holds the scroll position short of the end; the host reads that write as the reader leaving the tail, takes the mark away, and the row falls back into the flow, where each burst pushes it down and the glide pulls it back (measured at 1280×600: with the mark off, the row's top travelled between 447px and 573px in 115 frames, while the pin sits at 426px). The glide now writes its own mark on the chat column while it holds a position, and the row is pinned under either mark, so a burst costs it nothing: in the same scenario the row's top stayed at 426px in all 112 frames the host's mark was off. Scrolled away from the tail neither mark is present, so the row keeps its document place instead of floating over what the reader went back to read.
- In the Redraw tier a turn's status label briefly broke onto two lines while the text changed — the leftover half hung out of the row (measured at a 1280×900 viewport: the status row stayed 32px tall while the outgoing segment measured 84×48px). Two layers of text replace each other, and in the same frame the old text was laid out at the new text's width: the row takes its width from a hidden sizer, and the absolutely positioned copies are widened by it, yet the browser still broke the old text at its earlier, narrower width in that frame. The sizer and both copies now keep to one line, so a growing label stays on one line and the row keeps its height.
- Fix **the settings page and the other deferred features vanishing from a rebuild until the plugin was switched off and on**: the build wrote `lib/client.js` first and replaced `lib/assets/` seconds later, and since the client half of hot reload watches only the bundle, a page swapped to the new bundle before its chunks were on disk, asked for them under the previous manifest, got a 404, and each deferred feature reported once and retired. New asset files now land first, the manifest after them, the files it does not name last, and `lib/client.js` is written after all of them: the generation a page swaps to finds its chunks already on disk and already in the manifest.

### Chores

- New build flag for a linked checkout, `DSH_CLAUDE_STYLE_DEBUG=1`: a rebuild keeps the entries an earlier build shipped and their files, so a page that booted the previous bundle does not lose the deferred features to a rebuild. The flag is inert in a release build and in CI, where the manifest carries exactly this build's assets; the build log says which mode ran.
- The build caches the Deepy sheets' vectors and the assets' brotli payloads in `.debug/build-cache/` under the hash of their inputs, so a rebuild after a TypeScript-only change drops from about 14 s to about 1.7 s while `lib/` stays byte-identical to an uncached build; the new `npm run dev` watches what the build reads and rebuilds on every save (with `DSH_CLAUDE_STYLE_DEBUG=1`), keeping the previous `lib/` and watching on when a build fails.

## [0.12.0] - 2026-10-07

[中文](#cn-0.12.0) | [English](#en-0.12.0)

<h3 id="cn-0.12.0">新增功能</h3>

- 桌面端把会话标题与标题行里的控件抬进窗口顶端的标题栏：标题靠左、控件靠右排在窗口按钮之前，标题行剩下的内容左移并上提到标题下面；放不下的一侧留在原来的行里。

### 体验优化

- **插件主文件缩小一半**：浏览器每次启动都要读取并解析的插件主文件此前是 1.6 MB（1,619,502 字节），现在压缩后是 0.8 MB（816,520 字节）。
- 右侧栏停靠的面板改成一枚悬浮卡片：四周各留 8px、16px 圆角、1px 描边与宿主面板自己的投影，列后面的画布从缝隙里透出来；分栏后每一栏的面板各有一枚卡片，拖出来的浮动面板保持宿主自己的窗口样式。
- **小鲸鱼的帧图改为矢量取用**：Deepy 的 18 张帧图此前由浏览器在某个动作第一次出现时下载 PNG、在画布上重建成矢量、再存进 Cache API；现在构建期就把它们转成矢量，按内容哈希长期缓存。第一次播放不再有重建的停顿，观感与之前一致；随包携带的帧图从 426 KB 变为 658 KB（brotli 后）。
- **浏览器里的侧栏品牌行**：非桌面外壳（浏览器页面）下侧栏品牌行是这一列的第一行，列顶部只有 6px 内边距，logo 贴着窗口上沿；品牌左侧也比「新会话」的加号圆片靠左 8px。现在浏览器页面给这一行加 8px 顶部边距，品牌带上这一行自己的 8px 左内边距，鲸鱼/星芒的左缘与加号圆片的左缘对齐。桌面外壳（Windows 标题栏、macOS）与折叠后的窄栏不变。
- **进行中的状态行不再随内容上下跳动**：宿主把「深度求索中」这一行画成聊天流的最后一行，答案流式追加时它跟着内容底部一起被推下去、跟随的滑动再把它拉回来，盯着末尾看时就是不停跳动。现在只要读者的跟随还开着，这一行就钉在输入框上方（输入框高度 + 上方的渐隐带 + 宿主的 16px 正文内边距），也就是跟随追上时它本来停的位置：突发的追加不再带动它，往回翻看历史时它照常留在文档位置，不会浮在读者正在读的内容上。
- 分栏的右侧栏：两栏各自仍是独立的圆角卡片，中间那条分栏线不再画（拖动时的提示照旧），两栏之间的距离从 16px 收到 6px，每栏到列边的距离从 8px 收到 6px。
- 手机宽度下的输入框下沿：权限选择器收起下三角，权限与模型选择器按窄屏上限截断，上下文只留圆环不显示数字；那一行同时不再溢出卡片——模型名随行收缩、输入框下方的停靠层不再保留桌面那两份留白，圆环因此回到卡片里、也不再压在推理等级上。
- 输入框下沿的权限档位：按钮不再画下三角（任何宽度都是），档位名过长时在按钮内截断；已经打开的档位卡在布局移动时会重新贴回它的触发按钮，而不再留在原处。
- 宿主的「回到底部」按钮改到输入框上方的正中：它原先长在对话栏右缘，正好压在站在输入卡片上的吉祥物身上；按钮仍是宿主的那个，皮肤只挪位置。

### 问题修复

- **启动之后才选的皮肤也会接手页面**：页面载入后才在皮肤中心选中别的皮肤时，本主题不让出页面，两套视觉叠在一起。现在无论页面启动时归谁，皮肤到来就让出、离开就接回，都不需要刷新。
- 右侧栏「开始」页的项目一屏放不下时，整列被上下同时裁掉，既看不到第一项也滚不到最后一项；现在这一列自己滚动，列表短时依旧居中。
- **发送时飞行的气泡从第一帧就是气泡的颜色**（#29）：替身此前带两层底色——输入卡片的底色压在上面、气泡的底色在下面——随形状一起互相过渡；形状早已收成气泡，上层还没退完，读者看到的气泡先发白，在 DeepSeek 档下正是 Claude 档那条灰气泡的样子，过半秒才变蓝。现在底色画在那层始终等于形状的壳上，按下那一刻起就是目标气泡自己的颜色，没有哪一层能落在形状后面。卡片的描边与阴影照旧随形状收掉，并在形状归位的那一刻写定、撤掉各自的动画，不会在收窄完成后多留一帧。
- 成本计量插件停止写入后，用量面板把它覆盖的历史（8/24 起 26 天、11.23B Token）整份丢掉，改由会话日志现折，面板只剩日志还在的那部分（13 天、6.47B）；现在两个来源按日期合并，账本认识的天仍用账本的数，只有它没覆盖的日期由折算补上，面板恢复完整历史。
- **与壁纸插件共存**：0.11.1 在启动时已有壁纸渲染（`body[data-we-wallpaper]`）的页面上整页让出，「与其他主题插件同时使用」里壁纸透过侧栏与玻璃弹层的效果随之失效。现在只为皮肤中心的皮肤（`html[data-dsh-skin]`）让路，壁纸在渲染时本主题照常工作。对外契约：不再读取 `body[data-we-wallpaper]`。
- **发送的替身不再在真实消息行缺席时淡出**：宿主的回显气泡只活约 159 毫秒，真实消息行要一秒以上才挂上，而替身按自己的时间表在 400 毫秒落地淡出，那一段里目标位置空着——读者看到刚发出的气泡淡成页面背景，随后整条又冒出来。现在降落前先确认有一条行在页面上可以交接：没有就把替身停在原地（保持可见、继续跟随目标位置），真实行一到立刻交接；宿主始终没挂上行时按 2.5 秒兜底把页面交还宿主。
- **设置页不再多出一层内边距**：皮肤自己的设置页带了 24px 横向内边距，而宿主的选项列本来就有 24px，于是整页比其余设置页（宿主自己的与别的插件的）向右缩进 24px、顶部也多 20px。现在横向不留内边距，顶部只留宿主行自己的 16px，标题与第一行文字和其余设置页在同一条竖线上。
- **吉祥物的分段控件回到右侧**：吉祥物这一行此前固定把控件排到文字下面（与品牌卡片同一套排法）。现在控件与文字同占一行、靠右对齐，只有在放不下时才落到下一行并从左边开始——判定用文字列的最小宽度（220px），控件本身不收缩。
- **欢迎语与账号区跟随登录的 DeepSeek 账号**：此前这两处只显示自定义用户名或本机系统用户名，登录账号的昵称从不出现；现在桌面端登录后显示账号昵称，自定义用户名仍然优先，账号资料读不到时才回退到 HDSL 昵称与本机系统用户名。
- 顶栏里的对话 / 轨迹标签条：标题与控件分列两侧时，标签条改取两者之间余下空当的中线（原先按窗口居中，两侧有内容后看着偏左）；鼠标在对话区时标签条重新能唤起（本表自己的静置透明度带 !important，唤起规则少了它就一直压不过去，网页端同样受影响）。
- 顶栏里的会话标题不再过早截断：标题的可用宽度改为直接留出标签条自身的宽度与两侧的空隙，而不是去读标签条「按窗口居中」时的位置——标签条随后会被推到标题与控件之间的中线，那个位置本来就会被放弃，标题因此在小一半的宽度上就开始省略号。标题同时下移 2px，在标题栏里读起来才是垂直居中。
- 用对话导航跳到某一轮之后，新输出不再把位置拖回页底：跳转算读者自己选定的阅读位置，接管与滚轮相同，跟随与流式滑行在这一期间让开，读者自己回到页底时解除。

### 其他变更

- **公开路由变化**：`GET /dsh-claude-style/deepy/<动作>.png` 不再提供，帧图改由 `GET /dsh-claude-style/assets/<内容哈希>.svg` 提供；品牌标志、厂商组合标与螃蟹帧图同样由这份构建清单决定内联进产物还是走这条路由（小鲸鱼的 18 张帧图走路由）。更新插件后需要重启宿主，早于本次构建的宿主半边没有这条路由，小鲸鱼不会出现（控制台提示一次）。
- **附带 source map**：npm 包里新增 `lib/client.js.map`，浏览器开发者工具里的报错位置与断点能对应到插件源码。
- **Anthropic 字体的投放点迁到宿主目录**：把两款 Anthropic 字体复制进插件包 `fonts/` 目录后界面仍用替代字体，那个位置已不再被读取。现在的投放点是 `$DSH_HOME/dsh-claude-style/fonts/`（没有设置 `DSH_HOME` 时是 `~/.dsh/dsh-claude-style/fonts/`）：放在这里的文件优先于包内的同名文件，缺失时照旧 404 回退到系统字体与替代字体。随包分发的四款字体与它们的授权文件改由构建写入 `lib/fonts/`，仓库里的字体文件移到了 `packages/assets/src/fonts/`，两款 Anthropic 字体在其 `anthropic/` 子目录里，仍然不随 npm 包分发。

<h3 id="en-0.12.0">New Features</h3>

- On the desktop the conversation's title and the header's controls rise into the window's own caption row — the title at the left, the controls at the right before the window buttons — and what is left of the title row closes up to the left and rides up under the title. A side without room stays in the header's own row.

### Improvements

- **The plugin's main file is half the size**: the file the browser reads and parses on every start was 1.6 MB (1,619,502 bytes); minified it is now 0.8 MB (816,520 bytes).
- A panel docked in the right sidebar is a floating card: 8px inside the column on every side, a 16px radius, a 1px hairline and the host's own panel elevation, with the column's canvas showing through the gap. Each column of a split dock gets its own card, and a panel pulled out of the sidebar keeps the host's own floating window.
- **Deepy's frames are taken as vectors**: the whale's 18 sheets used to be downloaded as PNGs the first time an animation appeared, rebuilt into a vector on a canvas and kept in the Cache API; the build now produces the vectors and they are cached for good under their content hash. The first play no longer pauses to rebuild and the whale looks the same; the sheets that ship with the package go from 426 KB to 658 KB (brotli).
- **The sidebar brand row in a browser**: without a desktop shell the brand row is the column's first row, so 6px of column padding was the whole inset and the logo sat against the window's top edge; the brand also started 8px left of the New session plus chip. A browser page now gives that row 8px of top margin and the brand the row's own 8px leading inset, so the whale or starburst's left edge lands on the chip's. The desktop shells (Windows titlebar, macOS) and the collapsed rail are unchanged.
- **The running status line no longer rides the content**: the host draws its "deep diving" row as the chat flow's last row, so every burst of a streaming answer pushes it down and the follow's glide drags it back, which reads as continuous jumping at the tail. While the reader's follow is on, the row is now pinned above the composer — the composer's height, the fade band above it and the host's 16px transcript padding — which is where it already comes to rest once the glide has caught up: a burst no longer moves it, and scrolled back through history it keeps its document place instead of floating over what the reader went back to read.
- In a split right sidebar each pane stays its own rounded card: the line the dock draws between them is gone (the drag highlight stays), the gap between the two comes in from 16px to 6px, and each pane now sits 6px from the column's edge instead of 8px.
- The composer's bottom line at a phone's width: the permission control drops its chevron, the permission and model controls truncate at narrow-screen caps, and the context meter keeps the ring without its number. The row no longer runs past the card either — the model name shrinks with it and the dock line under the card gives up the two desktop-sized reserves — so the ring lands inside the card instead of under the reasoning level.
- The permission tier control on the composer's bottom line drops its chevron at every width, not just on a phone, and a long tier name truncates inside the button. An open tier card is also placed again when the layout under it moves, instead of hanging where its trigger used to be.
- The host's back-to-end button now sits centred above the composer. Its shipped place is the conversation column's right edge, which is where the mascot stands on the composer card; the button stays the host's own and only its placement is the skin's.

### Bug Fixes

- **A skin picked after the page loaded takes the page too**: picking another skin in the Skin Center once the page had loaded left this theme on the page, two looks painted over each other. Now the theme gives the page up when a skin arrives and takes it back when the skin leaves, whichever way the page booted, without a reload.
- The right sidebar's start page clipped its entries at both ends once the list outgrew the pane, hiding the first rows with no way to scroll; the column scrolls now, and still centers the list while it fits.
- **The flying bubble is the bubble's colour from the first frame** (#29): the stand-in carried two fills — the composer card's over the bubble's — cross-fading as the shape narrowed, and the shape was already a bubble while the upper fill was still there, so the reader saw a pale bubble (in the DeepSeek palette, the colour the grey bubble has under Claude) that only turned blue half a second later. The fill is now painted on the one layer that is the shape at every step, so it is the destination bubble's own colour from the moment of the press and no fill can fall behind the shape. The card's hairline and shadow still leave with the shape, written and cancelled on the frame the shape settles rather than lingering a frame past it.
- Once the cost-meter plugin stopped writing, the usage panel discarded the whole history the ledger covered (11.23B tokens over 26 days from 8/24) and fell back to folding the session logs, which left it with only the part the logs still held (6.47B over 13 days); the two accounts now merge by date, the ledger keeps the days it knows and the fold fills only the dates past its newest, so the panel shows the whole history again.
- **Sharing the page with a wallpaper plugin**: 0.11.1 gave the whole page up when a wallpaper was already rendering at boot (`body[data-we-wallpaper]`), which lost the wallpaper showing through the sidebar and the glass popovers described under Alongside other theme plugins. Now only a Skin Center skin (`html[data-dsh-skin]`) makes the theme yield; while a wallpaper renders the theme keeps working. External contract: `body[data-we-wallpaper]` is no longer read.
- **The stand-in no longer fades out with no message row to land on**: the host's echo bubble lives about 159 ms while the real row takes over a second to mount, and the stand-in faded out on its own 400 ms schedule — with nothing at the destination, the reader watched the bubble they had just sent fade into the page and then the whole message pop back. The hand-over now waits until there is a row on the page to take the message: the stand-in holds where it is (visible, still following the destination) and hands over the moment the row mounts, with a 2.5 s backstop that gives the page back to the host if no row ever comes.
- **The settings page no longer adds an inset of its own**: the skin's page carried 24px of side padding while the host's options column already has 24px, which set the whole page — and its top, by another 20px — 24px inside the host's own pages and other plugins'. The page now keeps no side padding and only the host row's own 16px on top, so its heading and first row line up with every other page's.
- **The mascot's segmented control is back on the right**: the mascot row used to stack its control under the text, the layout the brand cards use. The control now shares the row and sits at its right edge, and drops to a line of its own starting at the left only when it no longer fits — decided by the text column's minimum width (220px), since the control itself never shrinks.
- **The welcome line and the account area follow the signed-in DeepSeek account**: both used to show the custom username or the local system user, never the signed-in account's nickname; on the desktop they now show the account nickname, a custom username still wins, and the HDSL name and the local system user remain the fallbacks for a profile that cannot be read.
- The Chat / Trajectory strip in the caption row: with the title and the controls standing on either side, the strip now takes the middle of the room left between them (it was centred on the window, which reads off-centre once both sides carry something), and hovering the conversation brings it back — the sheet's own resting opacity is stated with !important, so the reveal rule needed it too, on the web as much as on the desktop.
- The session title in the caption row no longer truncates early: its room is now the space up to the controls with the tab strip's own width and the air on both sides reserved, rather than the strip's window-centred position — the strip is then pushed to the middle between the title and the controls, so that position was one it was about to leave and the title began ellipsizing at half the width it had. The title also sits 2px lower, which is what reads as vertically centred in the caption row.
- After a jump to a turn from the conversation navigator, new output no longer drags the position back to the end: the jump counts as the reader choosing where to read, so it holds the conversation the way his own wheel does — the follow and the stream glide stand down until he comes back to the end himself.

### Chores

- **Public route change**: `GET /dsh-claude-style/deepy/<animation>.png` is gone; the frames are served by `GET /dsh-claude-style/assets/<content hash>.svg`, and the brand marks, the vendor lockups and the crab's sheets follow the same build manifest, which decides per file between an inline form and that route (the whale's 18 sheets take the route). Restart the host after updating: a host half older than this build has no such route and the whale will not appear (one console message).
- **Source map included**: the npm package now carries `lib/client.js.map`, so error locations and breakpoints in the browser's developer tools map back to the plugin's sources.
- **The Anthropic fonts are dropped into the harness home now**: copying the two Anthropic faces into the plugin package's `fonts/` directory left the look-alike faces in place, because that location is no longer read. The drop point is `$DSH_HOME/dsh-claude-style/fonts/` (`~/.dsh/dsh-claude-style/fonts/` when `DSH_HOME` is unset): a file there wins over a bundled face of the same name, and a missing one still answers 404 and falls back to the system and the look-alike faces. The four faces the package ships, with their licences, are written to `lib/fonts/` by the build, and the repository's font files moved to `packages/assets/src/fonts/`, the two Anthropic ones under its `anthropic/` directory and still outside the npm package.

## [0.11.1] - 2026-10-06

[中文](#cn-0.11.1) | [English](#en-0.11.1)

<h3 id="cn-0.11.1">新增功能</h3>

- **与皮肤中心交接**：DSH 皮肤中心把本主题列为可选皮肤。选中它即把整页交给本插件，换选其他皮肤、官方默认或壁纸在跑时页面自动交还，无需刷新。判定读皮肤中心注入服务端 HTML 的 `html[data-dsh-skin]` 与壁纸插件的 `body[data-we-wallpaper]`，两者任一存在即让路：让路期间不挂样式表、不安装功能、不占用任何文档属性，只保留设置页与偏好。构建在 `body` 上盖 `data-dsh-claude-style-handoff` 标记自己支持让路。

<h3 id="en-0.11.1">New Features</h3>

- **Skin center handoff**: the DSH Skin Center offers this theme as a selectable skin. Selecting it hands the whole page to this plugin; selecting another skin, the official default, or a running wallpaper takes the page back without a reload. The verdict reads the `html[data-dsh-skin]` attribute the Skin Center injects into the served document and the wallpaper plugin's `body[data-we-wallpaper]`; either one means yielding, and while yielded the theme mounts no stylesheet, installs no feature and claims no document attribute, keeping only its settings page and preferences. A build stamps `data-dsh-claude-style-handoff` on `body` to say it can do this.

**Full Changelog**: [v0.11.0...v0.11.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.11.0...v0.11.1)

## [0.11.0] - 2026-10-06

[中文](#cn-0.11.0) | [English](#en-0.11.0)

<h3 id="cn-0.11.0">新增功能</h3>

- **对话导航**：对话区右侧的轮次短横线改由插件绘制，间距与展开后的列表行高一致。鼠标碰到它立刻展开成一张列表，每一轮一行，写着开启这一轮的那条消息，每一行正好落在它那条短横线原来的位置上，正在读的那一轮保持原位；滚轮上下翻，点一行页面滑到那一轮（只滑最后一小段，约三分之一秒），还没加载的早期对话先加载再跳；指针停在列表上时，对话区顶部的对话 / 轨迹标签照常显示。Alt+↑ / Alt+↓ 跳到上一轮或下一轮，连按会接着走，输入框里有草稿时不接管；跳到的那一轮开头闪一条短横线。同时装着 dsh-plugin-msg-nav 时 Alt+↑ / Alt+↓ 留给它。设置页「对话」页新增「对话导航」开关，默认开启，关闭后恢复系统原来的轮次短横线与悬停预览。

### 体验优化

- **聊天区跟随的滑动更平稳**：流式输出时每来一行，画面滑完都会多跳一下（约 1.7 像素）；代码块这样的大块内容到达时，滚动一下子就冲到最快。现在滑动从静止平稳起步、停下时不再跳动；最新一行被压在屏幕下缘的时间按回放测算少了约四分之一到三分之一（一行一行输出时 533 → 400 毫秒，快速输出时 1350 → 1000 毫秒）。超过 1200 像素的距离不再一帧跳过去，而是先到离目标 1200 像素处，再滑完剩下的一段。
- **聊天气泡动效落地更平滑**：飞行结束的那一刻，气泡里的文字会瞬间变深、像换了字重。现在落地时真实气泡在飞行的气泡下面先显示出来，飞行的那份在 0.16 秒内淡出，文字是逐渐变清晰的；上浮的终点也正好落在气泡上，不再差出一两个像素。

### 问题修复

- **流式输出时画面不再忽而一下子顶上去、忽而往回掉**：正文变长时，聊天区有时一下子跳到最底，有时底部的状态行先往下掉一截再滑回来——宿主自己的贴底与插件的平滑跟随在同一帧里先后改写滚动位置，宿主那一下总是后写、直接画了出来，下一批文字到达时插件又把已经显示出来的位置拉回去。现在宿主的贴底在画出来之前就交给平滑跟随，正文变长时画面只会平稳上移；在本地一段带停顿的模拟输出里，停顿后头几行直接跳到最底的情况从每段都有变为没有，位置往回退的帧数为零。切换会话之后同样如此。
- **聊天气泡飞行时的底色跟着变成气泡的颜色**：输入框的底色画在卡片里层时（首页的输入框就是这样），飞起来的气泡一路保持输入卡片的白底，接上真实气泡的那一刻才突然换成气泡的颜色，工具栏那一行背后还会先露出一条气泡色。现在底色从输入框所在的那一块开始，随形状一起渐变成气泡的颜色，到终点时正好铺满整个气泡。
- **切换会话与新建会话不再卡住**：装着本插件时，点开另一条会话或新建会话，页面会僵住一到两秒，长对话里尤其明显。原因是选中文字的配色作用于整个页面，浏览器每一轮样式重算都要为页面上每个元素算一次选中样式；现在这套配色只作用于对话正文与输入框里承载文字的块级元素（段落、列表、标题、引用、代码）。实测单次切换的样式重算从 0.9–2.4 秒降到 0.11–0.51 秒（未装插件时约 0.05 秒）；侧栏、设置页与弹层里的选中配色回到宿主默认。
- **装卸或更新别的插件之后，本插件的界面不再失去样式**：此前别的插件加载、重新加载或更新之后，本插件的整个界面有时会变回宿主原本的样子，插件的标记却还留在页面上。现在无论别的插件如何装卸，本插件的外观都保持不变。
- **同时装着的别的插件不再丢失样式**：一个插件自己挂上去、没有归属标记的样式表，会被下一个加载的插件记在自己名下，并在那个插件重新加载时被删掉——同时装着的表情包插件就曾这样整份失去样式，只能刷新页面恢复。现在这类样式表在本插件看到它的当时就被标记为无主，之后任何插件的加载、重新加载与更新都不再碰它。
- **小鲸鱼帧图顶端的灰线消失**：Deepy 演某几段动画时，帧图最上方有时会闪出一条约 1 像素高的灰线，站在哪里、窗口多大不同就时有时无。现在任何站位、任何一段动画都不再出现，小鲸鱼的样貌与动作不变。
- **子智能体工作室的节点详情小窗不再把会话统计与 Token 用量带走**：打开工作室、点开一个子智能体的节点详情小窗之后，输入区上下文面板里的「会话统计」与「Token 用量」两段画到了那个小窗下面，没有底色地压在对话内容上，上下文面板只剩宿主自己的三行。现在两段仍留在上下文面板里。

<h3 id="en-0.11.0">New Features</h3>

- **Conversation navigator**: the turn marks at the conversation's right edge are drawn by the plugin, spaced at the height of the list they open into. Reaching them with the pointer opens that list at once, one row per turn carrying the message that started it, each row exactly where its mark was and the turn being read left in place; the wheel scrolls the list and a click glides the page to the turn (only the last stretch, about a third of a second), loading earlier history first when it is not loaded yet; the Chat / Trajectory tabs at the top of the conversation stay up while the pointer is on the list. Alt+↑ / Alt+↓ jump to the previous or the next turn and keep stepping when repeated, leaving the keys alone while the composer holds a draft; the turn you land on flashes a short line over its start. With dsh-plugin-msg-nav installed too, Alt+↑ / Alt+↓ stay with it. A Conversation navigator switch on the settings page's Conversation tab, on by default; off restores the host's own turn marks and hover preview.

### Improvements

- **The chat-area follow glides more evenly**: every streamed line ended its glide with an extra hop of about 1.7px, and a large block such as a code block set the scroll off at full speed at once. The glide now builds up from rest and comes to a stop without a hop, and the newest line spends a quarter to a third less time under the bottom edge on a replayed stream (line-by-line output 533 → 400 ms, fast output 1350 → 1000 ms). A distance past 1200px is no longer covered in one frame: the position goes to 1200px short of the target and glides the rest.
- **The send flight lands more smoothly**: the moment the flight ended, the bubble's words darkened at once, as if their weight had changed. The real bubble now shows underneath the flying one as it lands, and the flying copy fades out over 0.16 s, so the words sharpen into place; the rise also ends exactly on the bubble rather than a pixel or two past it.

### Bug Fixes

- **Streaming no longer jerks the chat area up or drops it back**: as the reply grew, the chat area sometimes jumped straight to the end and sometimes the status line at the bottom dropped a step before gliding back — the host's own pin to the end and the plugin's glide both wrote the scroll position in the same frame, the host's write always came last and was painted, and the next piece of text had the glide pull an already painted position back. The host's pin is now handed to the glide before it paints, so a growing reply only ever moves the view up smoothly; on a local simulated stream with pauses, the first lines after a pause no longer jump to the end (previously they did in every burst), and no frame moves the position backwards. The same holds after switching sessions.
- **The send flight's fill turns into the bubble's colour on the way**: where the composer paints its fill on an inner layer (as the home page's composer does), the flying bubble kept the composer's white all the way and switched to the bubble's colour only as it met the real bubble, with a strip of bubble colour showing early behind the toolbar row. The fill now starts on the part of the card the composer paints and changes into the bubble's colour along with the shape, covering the whole bubble when it arrives.
- **Switching and starting sessions no longer stalls**: with the plugin installed, opening another conversation or starting a new one froze the page for a second or two, worst in long conversations. The selection colours applied to the whole document, so every style pass had the browser compute selection styling for every element on the page; they now apply to the blocks that carry text in the conversation and in the composer — paragraphs, lists, headings, quotes, code. Measured on one switch, style recalculation went from 0.9–2.4 s to 0.11–0.51 s (about 0.05 s with the plugin off); selection colours in the sidebar, settings and popovers go back to the host's own.
- **Loading, reloading or updating another plugin no longer strips this plugin's styling**: after another plugin was loaded, reloaded or updated, the whole interface could fall back to the host's own look with this plugin's markers still on the page. The plugin's appearance now survives any other plugin being loaded, reloaded or removed.
- **Another plugin installed beside this one no longer loses its styling**: a stylesheet a plugin mounts without an ownership tag is taken into whichever package loads next and deleted when that package reloads — the meme plugin lost its entire styling that way, and only a page refresh brought it back. Such a sheet is now marked as unowned the moment this plugin sees it, and no plugin's load, reload or update touches it afterwards.
- **A grey line no longer flashes along the top of Deepy's frames**: while some animations played, a line about one pixel tall could appear at the top of the frame and vanish again, depending on where the whale stood and how large the window was. It no longer appears in any position or animation, and the whale looks and animates exactly as before.
- **A node detail in the subagent studio no longer takes the session statistics and the token usage with it**: with the studio open and a subagent node's detail popped up, the session statistics and the token usage sections drew under that popup with no surface of their own, over the conversation, leaving the composer's context panel with only the host's three rows. Both sections stay in the context panel now.

**Full Changelog**: [v0.10.6...v0.11.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.6...v0.11.0)

## [0.10.6] - 2026-10-05

[中文](#cn-0.10.6) | [English](#en-0.10.6)

<h3 id="cn-0.10.6">新增功能</h3>

- **聊天气泡动效**：提交消息的那一下，输入卡片原样浮起一份，一边飞一边把多余的收掉——工具栏左右两组贴着最近的角缩小、淡出，描边与阴影跟着形状收回，草稿里的字跟着变窄的形状一行一行重新排——落地时正好就是那条真实气泡；真实气泡在飞行期间藏着，落定后原位出现。设置页的「动画效果」选了「减弱」、两端不在同一屏、或起点读不到（快捷键与程序化提交）时都不飞；页面切到后台时另有定时器兜底，藏起来的消息一定会放出来。与对话区其他动画一起合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- **文件变更行**：从 run_code 程序里派发出去的写入与编辑按直接调用的样子显示——行尾带 `+n -m`，展开是改动卡片，路径可点开文件；失败与中断的行保留裁决信息、不再给路径链接，状态另有给读屏的说明。改动内容无法从参数推出的调用保留系统的输入 / 输出卡片。与对话区其他动画一起合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- **新到的文字先淡后实**：流式回答里新出现的字符从两成不透明度开始，约 0.12 秒内坐实到它自己的颜色，并按到达次序略作错开，读起来像文字正被写下。整段一次到达的内容（切会话、翻历史）、一次几千字的突发、以及刚被折叠重排过的文字都保持本色；主线程忙不过来时它自己让路，闲下来再继续。与对话区其他动画一起合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- **折叠不再瞬间切换，展开体像卷帘门一样拉下来**：读者点开或收起一行（工具卡片、思考行、命令卡片）或一个过程组时，高度逐帧变化，下方内容被真的推开或收回。门只走读者看得见的那一段，两千像素的展开体和两万像素的展开体在眼前的速度一样；展开体里是多张卡片时（代码卡片加输出卡片）整扇门一起走，不会先挤没能缩的那一张。主线程卡住时门停一下再接着走，不会跳变；读者自己滚动离开底部之后，收尾不会把他拽回去。它与其他对话区动画一起挂在「聊天区动画效果」这个开关上（默认开启），关掉后读者点开收起恢复系统原来的瞬开瞬收。
- **思考行与过程组自动开合**：模型还在思考时思考行自动开着，思考停下就收回去；运行中的过程组自动展开，这一段过程结束再收起，组体展开时组头的标签仍带实时细节的流光。读者自己按过的行或组，在当时的阶段里不再被改动；「详细」与「完全展开」两档不收纳组体，插件不碰它们。与对话区其他动画一起合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- **输入框插入符动效**：输入框里的光标改由插件自己绘制，移动时带一段位移过渡；提问卡片的作答框与排队消息的行内编辑框同样覆盖。设置页的「对话」页新增三档：每一格（默认，连打字也滑）、只在移动时（方向键与点击才滑，打字瞬时）、关闭（完全不动手，用浏览器自己的光标）。任何一次测量失败都会把原生光标还回来，不会出现光标看不见的情况。
- **聊天区跟随交给系统自己的跟随，封顶的工作过程不再掉队**：思考行收起、工具调用行出现这些结构时刻，贴着底部的读者现在被交还给系统自己的跟随，内容成片到达时不再停在离底部几十像素的地方；「标准」与「简洁」档里封顶的过程组（思考与工具输出收在一个带滚动条的组体里）同样补到底部，最新两行不再长期悬在下方。补到底部是按曲线走完的：零散到达的字收得住尾巴，一次涌进上百个 token 那样的厚块则以一段恒定速度滑过去，再落到末尾——流式输出时新加的一行把上文顶起来是平滑的，不再几十像素一下地跳。流式输出期间主滚动条的跟随也交给同一条曲线：系统原来是把末尾一帧写到位，现在这段位移由插件接管并滑过去；输出很快时最新几行会短暂拖在屏幕下缘之外，流一停就滑到位。读者自己发出的消息不受这条曲线影响：宿主把新消息滚进视野的那一下照旧一步到位，插件在消息到达前后短暂让开。读者自己滚动离开底部之后，插件不再插手，直到他自己回到底部。与对话区其他动画一起合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- **与 dsh-chat-ux 共存**：本机同时装着 [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux) 时，上面这几项整体让位——那个插件实现了同一批交互，两套同时生效会互相拦点击、抢同一批按钮、往宿主同一个座位键位按同一优先级注册。设置页的「对话」页把「聊天区动画效果」与「输入框插入符动效」两行的控件禁用，控件本身仍显示你自己设的值，下面另起一行用强调色写明「该选项由 dsh-chat-ux 管理」；你的设置不会被改写，那个插件中途装卸也照常跟随。它不在时这些交互按本插件自己的开关运行。

### 体验优化

- **权限菜单在窗口上方放不下时改为在控件下方展开**：权限分段控件的卡片固定朝上展开，窗口很矮时它的上缘顶出屏幕外，最上面几项点不到。现在上方容不下整张卡片时，它在控件下方展开。
- **上述动效跟随「动画效果」设置**：卷帘门过渡、聊天气泡动效、新文字淡入、插入符的滑动与闪烁、组头的流光此前只认系统的「减少动态效果」：设置页选「减弱」关不掉它们，选「总是」在系统开着减弱时也照样不动。现在它们读的是设置页解析出的那一档。

### 问题修复

- **「更多模型」的二级弹层在指针离开后收拢**：指针从「更多模型」挪到一级列表的模型行上之后，二级弹层在宽限期结束后收起，一级弹层保持不动。修复前只要指针还在一级弹层里它就永远挂着，遮住一级列表。
- **模型选择器打开二级弹层的瞬间即定位**：此前打开动作先定位后标记打开，而定位只认已标记打开的卡片，于是二级弹层沿用上一次的位置（连同上一次的窗口宽度算出的坐标），要等下一次指针事件才可能被纠正。现在先标记打开再定位，每次打开都落在当前位置。
- **插入符拆除后在途的那一帧不再落笔**：瞬落一帧之后恢复过渡属性的那次补写走的是一处未登记的帧，插件拆除时取消不到它，时机凑巧时它会在拆除之后对已收回的图层写入一次。现在这帧与队列帧一样登记在案，拆除时一并取消，回调也不再越过拆除线。
- **「文件变更行」的开关此前不起作用**：关掉它之后，run_code 程序里派发出去的写入与编辑仍然按新的样式显示。现在关掉即交还系统原来的行，打开即时接管，不需要刷新页面。
- **拖入附件后，输入区工具栏打开的面板不再被附件区域遮住**：附件存在时，从输入区工具栏按钮打开的面板（模型选择、思考强度等）中间被上方那块附件区域盖住一大截，只在卡片上方和输入框下方各露出一条边，面板里的行点不到。现在这类面板完整显示。
- **侧栏账号区因故障停用后，设置快捷键不再失灵**：插件的侧栏账号区出错退役后，按 Ctrl+,（macOS 为 ⌘,，网页版宿主为 Ctrl+Alt+,）什么都不打开。现在按键交还宿主，宿主自己的设置快捷键照常打开设置。

### 其他变更

- **昵称与封号页语言只存在设置里**：早先在宿主半边不认这两个字段时存进浏览器本地的值，会在打开页面后写进插件设置，本地那份随后删除；此后两项与其他设置一样只保存在宿主的设置表单里。

<h3 id="en-0.10.6">New Features</h3>

- **Send flight**: on submission the composer card lifts as it is and sheds what is extra on the way — the toolbar's two groups shrink and fade into their nearest corners, the hairline and shadow shrink with the shape, the words in the draft re-flow into the narrowing shape a line at a time — landing exactly on the real bubble, which hides while the flight is up and reappears in place when it lands. Nothing flies when the animation choice is Reduced, when the two ends are not on one screen, or when the origin cannot be read (a shortcut or a programmatic submission); a timer releases a hidden message if the page is in the background. It rides the Chat-area animations switch on the settings page's Conversation tab, on by default.
- **File change rows**: a write or edit dispatched from inside a run_code program is shown like a directly called one — the row carries the `+n -m` tail, expands into the diff card and its path opens the file; a failed or interrupted row keeps its verdict, drops the path link and announces its state to a screen reader. A call whose changed text cannot be derived from its arguments keeps the host's IN/OUT card. It rides the Chat-area animations switch on the settings page's Conversation tab, on by default.
- **New text fades in**: characters arriving in a streaming answer start at a fifth opacity and settle to their own colour in about 0.12 s, staggered slightly by arrival order, so the text reads as being written. A block arriving whole (a session switch, a page of history), a burst of thousands of characters and text that just reflowed from a fold all stay solid; when the main thread is too busy the fade gives way and resumes once it is free. It rides the Chat-area animations switch on the settings page's Conversation tab, on by default.
- **Folds no longer snap: a body rolls down like a door**: opening or closing a row (a tool card, a thinking row, a command card) or a process group now moves the height frame by frame, really pushing the content below away or pulling it back. The door only rolls the stretch the reader can see, so a two-thousand-pixel body and a twenty-thousand-pixel one move at the same speed in front of him; a body holding several cards (a code card plus an output card) rolls as one door rather than squeezing away the card that can shrink. A stalled main thread does not make it jump — the door pauses and carries on — and a reader who scrolled away from the bottom is not pulled back when the fold settles. It rides the Chat-area animations switch together with the entrance fade of an expanded body (on by default); with that switch off, a reader's own press snaps open and shut the way the host does it.
- **Thinking rows and process groups open and close by themselves**: a thinking row opens while the model reasons and folds back when it stops; a running process group opens and folds back once that piece of work ends, its header keeping the live-detail sweep while the body is open. A row or group the reader pressed himself keeps what he chose for that phase, and the Detailed and Fully expanded tiers — which do not cap a body — are never touched. It rides the Chat-area animations switch on the settings page's Conversation tab, on by default.
- **Composer caret motion**: the composer's text caret is drawn by the plugin and glides between positions; a question card's answer box and a queued message's inline editor are covered as well. The Conversation tab gains a three-way choice — Every move (the default, typing included), Explicit moves (an arrow key or a click glides, a keystroke lands instantly) and Off. A measurement that fails hands the native caret back, so a caret is never lost.
- **The chat area's scroll goes back to the host's own follow, and a capped piece of work no longer lags behind**: at the structural moments — a thinking row folding, a tool call row arriving — a reader sitting at the bottom is now handed back to the host's own follow instead of being left tens of pixels short by the burst of content; a process group capped in the Standard and Compact tiers (thinking and tool output kept in one scrolling body) is caught up the same way, so the last two lines no longer hang below the fold. Catching up runs on a curve: a trickle of characters settles softly, and a thick burst — a hundred-odd tokens arriving at once — glides at one steady speed before landing, so while text streams a new line pushes the text above it up smoothly instead of in forty-pixel steps. While content streams, the main scroller's follow runs along the same curve: where the host wrote its end in one frame, that displacement is now taken over and walked, so with a fast stream the newest lines trail just below the fold and slide into place once it stops. A message the reader sends is not affected by that curve: the host's scroll to bring it into view lands at once, and the plugin stands down around the arrival. Once the reader scrolls away from the bottom himself, the plugin stays out of it until he returns. It rides the Chat-area animations switch on the settings page's Conversation tab, on by default.
- **Coexisting with dsh-chat-ux**: with [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux) installed on the same machine these effects stand down whole — that plugin implements the same interactions, and two copies intercept each other's clicks, press the same controls and register the same seat key at the same priority. The settings page's Conversation tab disables the Chat-area animations and Composer caret motion rows while each one goes on showing the value you set, with a line underneath in the accent colour reading "Managed by dsh-chat-ux"; your settings are not rewritten, and the hand-over follows that plugin being loaded or removed mid-session. With it gone they run on this plugin's own switches as usual.

### Improvements

- **The permission menu opens below the control when it does not fit above**: the permission control's card always unfolded upward, so in a short window its top edge ran off-screen and the first rows could not be clicked. It now opens below the control when the card does not fit above.
- **Those animations follow the Animation setting**: the rolling door, the send flight, the token fade, the caret's glide and blink and the header's live-detail sweep used to read the system's reduced-motion query alone, so Reduced on the settings page did not stop them and Always did nothing while the system asked for reduced motion. They now read the resolved choice.

### Bug Fixes

- **The More-models card folds once the pointer leaves**: moving the pointer from the More-models cell onto a model row of the first level now folds the second level after the grace, the first level staying put. Before, it hung open as long as the pointer stayed anywhere in the first level, covering its list.
- **The model picker places its second level at the moment it opens**: the open path used to place the card before marking it open, and the placement only reads cards marked open — so the card kept its previous position (with coordinates computed for the previous window width) until some later pointer event corrected it. It is marked open first and placed after, so every open lands on the current position.
- **The caret's teardown no longer leaves a frame that still draws**: the one-off frame that hands the transition back after an instant landing was untracked, so the teardown could not cancel it and, given the right timing, it fired after the teardown and wrote into a layer that had already been released. It is tracked like the queue's frame now — cancelled with the rest, and its callback stands down past the teardown.
- **The File change rows switch did nothing**: with it off, a write or edit dispatched from inside a run_code program still drew the new row. Off now hands the host's own row back and on takes it over, without a reload.
- **A panel opened from the composer's toolbar is no longer covered by the attachment area**: with an attachment in the composer, a panel opened from a toolbar button — the model picker, the reasoning-effort slider — lost its middle to the attachment area above it and showed only a strip above the card and another below the input box, so none of its rows could be clicked. Such panels now draw in full.
- **The settings shortcut keeps working after the sidebar account area is switched off by a fault**: once the plugin's sidebar account area failed and retired, Ctrl+, (⌘, on macOS, Ctrl+Alt+, in the web host) opened nothing. The keys now go back to the host, and the host's own settings shortcut opens the settings as usual.

### Chores

- **The nickname and the account-hold page's language live in the settings alone**: a value kept in the browser's local storage while the host half did not know these fields yet is written into the plugin settings when the page opens, and the local copy is removed afterwards; from then on both are saved in the host's settings form like every other setting.

**Full Changelog**: [v0.10.5...v0.10.6](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.5...v0.10.6)

## [0.10.5] - 2026-10-04

[中文](#cn-0.10.5) | [English](#en-0.10.5)

<h3 id="cn-0.10.5">新增功能</h3>

- **配色与字体可以交给宿主，与壁纸等主题插件一起使用**：插件以前总是改写宿主的颜色与字体，并在侧栏、对话区刷上实色底，和 dsh-wallpaper-engine 这类同样改写宿主颜色的主题插件同时启用时，壁纸被盖住，谁的颜色生效还取决于加载先后。设置页新增「配色」与「字体」两项，各有「Claude」与「跟随宿主」两档，默认仍是 Claude。选「跟随宿主」后，插件不再改写宿主的颜色或字体，也不再给侧栏、对话区刷底色，只保留布局和控件；插件自己画的弹层、卡片与选择器改用宿主的颜色，同时启用壁纸插件时随它的玻璃效果变成半透明，弹层还会模糊背后的画面以保证文字清楚。选 Claude 时外观与以前完全一致。
- **接管宿主界面的功能都能单独关闭**：权限分段控件、侧栏搜索、进行中 / 已归档视图、轮次状态行与对话 / 轨迹标签条以前没有开关，不想要其中一项就只能停用整个插件。现在每一项都有自己的开关，关闭后宿主原来的界面立刻回来，再打开立刻生效，都不需要刷新页面。
- **设置页分为五个分页**：设置项以前排成一整列。现在顶部的分页条把它们分进「通用」「外观」「输入区」「侧栏」「对话」五页；「快捷供应商」紧跟在「重绘模型选择器」下面、两项之间不画分隔线，模型选择器关闭时变灰不可操作，「出现位置」在吉祥物关闭时同样变灰。
- **吉祥物可以单独选择，像素螃蟹也随智能体的工作换动画**：吉祥物以前由品牌决定，螃蟹只站在工作台首页，只会偶尔掏出电脑敲一阵代码。现在设置页的「吉祥物」可选「跟随品牌」（默认，Claude 品牌下是螃蟹、DeepSeek 品牌下是 Deepy）、「螃蟹」「Deepy」或「关闭」，「出现位置」可选只在首页，或首页与对话页都出现（默认）。螃蟹和 Deepy 一样站在两种首页版面与对话页的输入区上沿，随工作状态换动画：思考时头顶冒出思考泡泡，写回答与调用工具时敲电脑，三个会话同时工作时戴上安全帽，子代理运行时戴耳机或挥手指挥，等你操作时头顶亮起感叹号，压缩上下文时被压扁，完成时蹦跳，失败时双眼打叉、发抖，闲置一分钟后睡着，有动作时惊醒；闲着时偶尔东张西望、挥挥钳子，或者掏出电脑敲一阵代码。点它的左半边或右半边会被戳得往一侧躲，连点四下会被挠痒，按住拖动会被拎起来。螃蟹的帧图随插件内联，约 20 KB。

### 体验优化

- **设置项说明改为只说行为**：设置页十项的说明以前夹带设计缘由（进度圈为什么不停、彩蛋页为什么不跟随界面语言），动辄两三行。现在每条说明只说这一项改什么、各档分别是什么效果；「修改品牌标识」「重绘设置弹层」等动宾式或与其他条目不一致的标题一并统一为名词短语。
- **Windows 桌面端的顶栏不再是一条单独的色带**：顶栏以前刷着侧栏的颜色，横贯整个窗口，右上角最小化、最大化、关闭三个按钮还托在一块同色的矩形上，打开设置时周围都被遮罩盖暗，只有这块矩形不变。现在顶栏透明，侧栏和主界面各自通到窗口顶端，两者之间的分隔线从顶到底连成一条，主界面左上角的圆角去掉；三个按钮直接落在页面上，打开设置时随页面一起变暗，悬停高亮照常。macOS 与 Web 端不变。

### 问题修复

- **小鲸鱼不再把阴影画在目标、待办与排队卡片上**：DeepSeek 品牌下，小鲸鱼被叠在输入卡片上方的目标、待办与排队卡片顶起时，它身下阴影的末端落在那张卡片的最上缘。现在小鲸鱼抬高 3 像素，阴影落在卡片上，卡片上不再压着一道暗色。
- **侧栏搜索框与它下面的按钮等高、间距一致，桌面端也不再被顶栏盖住**：搜索框以前比「新会话」「插件」这些行高出 4 像素，与它们相隔也只有 4 像素，排在这一列里比其余各行都松。现在搜索框与各按钮同为 28 像素高，与「新会话」的间隔为 6 像素，与各按钮之间的间隔相同；Windows 桌面端那一行为此少抬高 4 像素，搜索框整块落在顶栏下方，不再被截去上缘。
- **模型选择器右端不再被上下文计量环压住**：在「轨迹」或「上下文」标签页停留后切换对话，模型选择器最右端的档位文字会落在计量环上，并一直保持到上下文数字再次变化；现在回到对话页就恢复两者的间距。

### 其他变更

- **设置的保存字段新增九项**：插件的设置表单新增 `palette`、`typeface`、`mascot`、`mascotScope`、`permissionsControl`、`workspaceView`、`sidebarSearch`、`turnStatus`、`viewTabs`。宿主半边是旧版本时（更新插件后没有重启宿主），这几项改动保存不下来，重启宿主后恢复正常。

<h3 id="en-0.10.5">New Features</h3>

- **Colours and typefaces can be left to the host, so the skin works alongside wallpaper and other theme plugins**: the plugin always rewrote the host's colours and fonts and painted solid canvases under the sidebar and the conversation, so next to a theme plugin that rewrites the same colours, such as dsh-wallpaper-engine, the wallpaper was covered and whose colours won depended on load order. The settings page adds Colours and Typefaces, each with Claude and Follow the host; Claude stays the default. Under Follow the host the plugin rewrites neither the host's colours nor its fonts and paints no canvas under the sidebar or the conversation, keeping only its layout and controls; its own popovers, cards and pickers take the host's colours, turn translucent with a wallpaper plugin's glass, and blur what lies behind them so their text stays readable. Under Claude the look is exactly as before.
- **Every feature that takes over the host's interface can be switched off on its own**: the permission control, the sidebar search, the In progress / Archived view, the turn status line and the Chat / Trajectory tabs had no switch, so dropping one meant disabling the whole plugin. Each now has its own switch; off brings the host's original back at once, on brings the feature back at once, with no reload either way.
- **The settings page is split into five tabs**: the settings used to run down one column. A tab strip at the top now sorts them into General, Appearance, Composer, Sidebar and Conversation; Quick providers sits right under Redraw the model picker with no divider between the two, and greys out while the picker is off, as Where it appears does while the mascot is off.
- **The mascot is chosen on its own, and the pixel crab follows the agent's work too**: the brand used to decide the mascot, and the crab stood on the Studio home page alone, now and then pulling out its laptop to type. The settings page's Mascot now offers Follow the brand (the default: the crab under Claude, Deepy under DeepSeek), Crab, Deepy or Off, and Where it appears offers the home page alone or the home page and conversations (the default). Like Deepy, the crab stands on the composer of both home layouts and of the conversation, and changes its animation with the work: a thought bubble while the model thinks, typing on its laptop while it writes and calls tools, a hard hat with three sessions at work, headphones or conducting while subagents run, an exclamation mark while it waits on you, squashed while the context is compacted, hopping when a turn finishes, crossed eyes and a shake when something fails, asleep after a quiet minute and startled awake at the next move; between jobs it now and then looks around, waves a claw, or pulls out its laptop to type for a while. A click on its left or right half pokes it aside, four quick clicks tickle it, and pressing it and pulling lifts it. The crab's sheets ride the bundle, about 20 KB.

### Improvements

- **Settings descriptions now state behavior only**: the ten settings rows used to mix design rationale into their descriptions (why the progress ring never stops, why the easter egg ignores the interface language) and ran two to three lines each. Every description now says only what the setting changes and what each option does; verb-form or inconsistent titles such as the brand and sidebar-footer rows are unified to noun phrases.
- **The Windows titlebar is no longer a band of its own**: the caption row was painted in the sidebar colour across the whole window, and the minimize, maximize and close buttons sat on a block of that colour, which stayed bright while the settings mask darkened everything around it. The row is transparent now: the sidebar and the main area each run to the top of the window, the divider between them runs top to bottom in one line, and the main area loses its rounded top-left corner; the three buttons sit on the page itself, dim with it under the settings mask, and keep their hover highlight. macOS and the web build are unchanged.

### Bug Fixes

- **Deepy no longer paints its shadow across the goal, todo and queue cards**: under the DeepSeek brand, when the goal, todo or queue cards pushed the whale up off the composer card, the tail of the shadow under it landed on the top edge of that card. The whale now sits 3px higher: the shadow rests on the card instead of a dark band being stamped across it.
- **The sidebar search box matches the height and the rhythm of the rows under it, and no longer hides under the desktop titlebar**: the box stood 4px taller than New session, Plugins and the rows below them, and sat 4px from New session, which left the top of the list looser than the rest of it. The box is 28px like those rows now, 6px above New session, the same step the rows take among themselves; on the Windows Desktop that row rises 4px less, which keeps the whole box below the titlebar instead of cutting its top edge.
- **The right end of the model trigger no longer sits under the context meter**: after a spell on the Trajectory or Context tab, switching conversations brought the right end of the model trigger under the occupancy ring, and it stayed there until the reading moved again; coming back to the conversation now restores the clearance between the two.

### Chores

- **Nine new stored settings**: the plugin's settings form gains `palette`, `typeface`, `mascot`, `mascotScope`, `permissionsControl`, `workspaceView`, `sidebarSearch`, `turnStatus` and `viewTabs`. With an older host half still running (the plugin updated without restarting the host), changes to these do not save until the host restarts.

**Full Changelog**: [v0.10.4...v0.10.5](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.4...v0.10.5)

## [0.10.4] - 2026-10-03

[中文](#cn-0.10.4) | [English](#en-0.10.4)

<h3 id="cn-0.10.4">体验优化</h3>

- **没有 Anthropic 字体时，界面与正文换成外观相近的字体**：没有把 Anthropic Sans / Serif 装进系统或放进插件 `fonts/` 目录时，界面以前落到 Segoe UI、苹方这类系统字体，对话正文落到 Georgia，字形和排版都和原样差得远。现在插件自带 Inter 与 Noto Serif（SIL OFL 1.1）代替两款 Anthropic 字体，它们的字高、字宽与原字体相差不到百分之二，换字体时文字不会重新换行，粗体用的是字体本身的字重。两款字体只含 Anthropic 字体覆盖的拉丁字符，中文照旧使用系统中文字体；npm 包因此大约增加 214 KB。已经启用 Anthropic 字体的环境不受影响。
- **品牌标识改为大卡片选择**：设置页的品牌选项由分段小按钮改为一排大卡片，每张卡片放对应的品牌标识（Claude 的陶土星芒、DeepSeek 的蓝鲸），当前品牌的卡片带品牌色描边；后续新增品牌只需添一张卡片。
- **设置页同时出现在设置对话框与插件页**：0.1.7 起这页只显示在插件页内。现在设置对话框恢复「Claude Style」标签页，两处渲染同一份页面、共用同一份偏好存储，一边改动另一边即时跟上；旧版宿主不受影响，仍只有设置对话框一处。

### 问题修复

- **简洁用量模式下的统计弹层不再出现空置半行与多余分组**：宿主「性能与用量」设置选为简洁时，上下文弹层以前把四个数字拆在「会话统计」和「Token 用量」两个小标题下，三项指标占两行、一项指标占一行，各自留下一处空白格。现在简洁模式下移除分组小标题，总用时、首 token 平均、输出速度与缓存命中四个指标合并为整齐的 2×2 排版。
- **其他插件放进输入框的模型菜单恢复上下排列**：同时启用 `dsh-thinking-effort` 这类自带模型菜单的插件时，菜单里的各个供应商分组以前被挤成一行横排。现在分组按原样上下排列。
- **macOS 桌面端的封号彩蛋页不再重复出现窗口按钮**：macOS 桌面壳的窗口左上角是系统画的三个红黄绿按钮，彩蛋页以前又画了一套最小化 / 还原 / 关闭，页面上于是出现两排按钮。现在这页不画自己那套，星芒标与字标、「退出登录」直接排进系统标题栏那一行，并让开左侧的三个按钮；按住这一行的空白处仍然可以拖动窗口。
- **其他插件的弹层与标签保持原有的形状**：其他插件的元素只要类名里带 `badge` 或 `tag`，以前都会被改成胶囊圆角。额度插件的弹层因此变成四角极圆的方圆形，标题和底部按钮被切掉一角，弹层里各段的分隔线也弯成弧形。现在胶囊圆角只用在宿主自己的徽标与标签上（轨迹标签、自定义模型行的标签、提问里的「推荐」、快捷键按键等），而且两端是正圆弧，不再略方。

<h3 id="en-0.10.4">Improvements</h3>

- **Without the Anthropic fonts, the interface and conversation text use close look-alikes**: when Anthropic Sans and Serif were neither installed on the system nor dropped into the plugin's `fonts/` directory, the interface used to fall back to system fonts such as Segoe UI or PingFang and the conversation body to Georgia, far from the intended letterforms and layout. The plugin now ships Inter and Noto Serif (SIL OFL 1.1) in their place; their letter heights and widths are within two percent of the Anthropic fonts, so text does not rewrap when one replaces the other, and bold text uses the fonts' own weights. Both carry only the Latin characters the Anthropic fonts cover, so Chinese text keeps using the system's Chinese fonts; the npm package grows by about 214 KB. Setups that already have the Anthropic fonts are unaffected.
- **The brand choice is now a row of large cards**: the settings page's brand option changes from small segments to large cards, each carrying the brand's own mark (Claude's clay starburst, DeepSeek's blue whale) with the active card outlined in the brand accent; a new brand is one more card.
- **The settings page now shows in both the settings dialog and the plugin page**: since 0.1.7 it lived only on the plugin page. The settings dialog keeps its "Claude Style" tab again — both render the same page against the same preference store, so a change in one appears in the other at once. Older hosts are unaffected and keep the dialog tab as the only seat.

### Bug Fixes

- **The stats popover under compact usage no longer shows half-empty rows and redundant groups**: when the host's performance and usage setting was set to compact, the context popover previously split the four figures under "Session statistics" and "Token usage" headings, leaving awkward empty slots in two separate grids. The compact mode now removes the section headings and places total time, average TTFT, output speed, and cache hit share together into a clean 2x2 layout.
- **A model menu another plugin puts in the composer stacks its groups again**: with a plugin that brings its own model menu, such as `dsh-thinking-effort`, the menu's provider groups used to be squeezed into one horizontal row. They stack top to bottom as the plugin draws them now.
- **The account-hold page on the macOS Desktop no longer draws a second set of window buttons**: the top-left of a macOS Desktop window belongs to the system, which paints the three red-yellow-green buttons; the page used to draw its own minimize, maximize and close as well, so the window showed two rows of buttons. It draws none of its own now — the starburst and wordmark and the Sign out button take their place in the titlebar row, clear of the three buttons on the left, and the window is still dragged by the empty part of that row.
- **Other plugins' popovers and tags keep their own shape**: any element of another plugin whose class name contained `badge` or `tag` used to be turned into a pill. A quota plugin's popover became a squarish blob with very round corners, its title and bottom buttons clipped at the corners and the dividers between its sections bent into arcs. The pill radius now applies only to the host's own badges and tags (trajectory tags, the custom model row tag, the Recommended mark in a question, shortcut key caps and the like), and their ends are true round arcs instead of slightly squared ones.

**Full Changelog**: [v0.10.3...v0.10.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.3...v0.10.4)

## [0.10.3] - 2026-10-01

[中文](#cn-0.10.3) | [English](#en-0.10.3)

<h3 id="cn-0.10.3">体验优化</h3>

- **上下文弹层与计量环右缘对齐**：宿主把弹层从计量环的左缘往下放，输入行右端按这个位置只够把它挤到窗口右缘，和圆环错开一截。现在弹层的右缘与计量环的右缘齐平，窗口宽度变化、页面滚动与弹层自身高度变化时都重新量。
- **用量面板的数字与模型列表写法统一**：概览页「Token 总量」一格与热力图提示原来写「1.0M」「2.00B」「963.6K」，现在与模型列表一样写「1M」「2B」「963.6k」——最多一位小数、整数不带 `.0`、`k` 小写，单位按四舍五入后的值取，刚过百万的读数不再出现「1000k」。轮次状态行的输出 tokens 也走这一套写法。
- **首页工作区弹层改到控件正上方**：hero 行的工作区与预设两个弹层原来贴在控件右侧、底边与控件齐平；现在与输入框上的模型、推理档位弹层同一种摆法，与控件右缘对齐、在控件上方留 6px 展开，上方空间不够时翻到控件下方。快捷供应商弹层一直与触发控件右缘对齐，却从左下角放大展开，现在与模型弹层一样从右下角展开。
- **「性能与用量」选简洁档时，上下文弹层里仍有四个数字**：以前简洁档下弹层里只有宿主自己的上下文明细，会话的用时与速度一概看不到。现在简洁档补上总用时（模型用时加工具调用用时）、首 token 平均、输出速度与缓存命中比例；详细档给出宿主那两组全部的行，与之前一致。

### 问题修复

- **推理档位触发控件收起后不再回来**：切到不带档位的模型再切回来，或离开再回到带输入框的页面，模型名右边只剩一块空位，档位名与可点的控件都看不见了。现在触发器重建后回到模型名旁边，档位照常可选。
- **输入框下方那一行里上下文计量环偏高**：同一行里模型名、推理档位与权限控件的中心都在一条线上，只有计量环与它的读数高出 2 像素。现在计量环与这一行其余控件同线。

### 其他变更

- **两份 README 改成同一套骨架**：英文版删去功能清单与「停用与卸载」两节，小鲸鱼 Deepy 的八张动图移进预览一节，安装步骤两份都读作插件页、终端、插件市场三步。0.10.2 条目里提到的「特点」一节随这次改动不再存在。
- **发行包不再包含 README 截图**：`package.json` 的 `files` 只带 `docs/STYLE.md` 与 `docs/architecture.md` 两篇文档，八张截图留在仓库里。npm 包解包体积由 3.24 MiB 降到 2.47 MiB，下载体积由 1.89 MB 降到 1.07 MB；GitHub 与 npm 页面上的 README 图片照常显示。

<h3 id="en-0.10.3">Improvements</h3>

- **The context popover now lines its right edge up with the meter**: the host hangs the panel from the meter's LEFT edge, and at the end of the composer row that position only fits by parking the panel against the window's right margin, well clear of the ring. The panel's right edge now sits on the ring's, re-read on window resizes, page scrolls and changes to the panel's own height.
- **The usage panel's numbers now read the way the model list writes them**: the Overview tab's Total tokens cell and the heat grid's tips used "1.0M", "2.00B" and "963.6K"; they now print "1M", "2B" and "963.6k" like the model list — one decimal at most, a whole number without its ".0", a lowercase k, and the unit picked on the rounded value, so a count just past a million never reads "1000k". The turn status line's output tokens print through the same formatter.
- **The home page's workspace popover now opens over its control**: the hero row's workspace and preset cards used to sit beside their control, bottom-aligned with it; they now take the placement the composer's model and effort popovers use — right-aligned with the control and opening 6px above it, flipping below when the viewport leaves no room. The quick-provider popover, which has always been right-aligned with its trigger, scaled in from its bottom-left corner; it now grows from the bottom-right one, like the model picker.
- **The context popover keeps four figures under the compact "performance & usage" row**: with the compact row the popover used to carry the host's context rows and nothing about the session. It now adds the total time (the model's time plus the tool calls'), the first-token average, the output speed and the cache-hit share; the detailed row keeps the host's whole set, exactly as before.

### Bug Fixes

- **The reasoning-effort control no longer stayed away once taken down**: switching to a model without levels and back, or leaving a page with the input area and returning, left an empty slot beside the model name — no level name, nothing to click. The trigger now returns beside the model name, and the levels are selectable again.
- **The context meter rode high in the composer's control row**: the model name, the effort level and the permission control shared one centre line while the ring and its reading sat 2px above it. The meter now sits on the same line as the rest of the row.

### Chores

- **Both READMEs now share one skeleton**: the English one drops its feature list and its "Disabling and uninstalling" section, Deepy's eight GIFs move into the preview, and installation reads as three steps — plugin page, terminal, plugin market — in both languages. The "Features" section the 0.10.2 entry names no longer exists as of this change.
- **The npm package no longer carries the README screenshots**: `package.json`'s `files` now ships only the two documents under `docs/` (`STYLE.md` and `architecture.md`), leaving the eight screenshots in the repository. The unpacked package drops from 3.24 MiB to 2.47 MiB and the tarball from 1.89 MB to 1.07 MB, while the README keeps showing its images on GitHub and npm.

**Full Changelog**: [v0.10.2...v0.10.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.2...v0.10.3)

## [0.10.2] - 2026-09-30

[中文](#cn-0.10.2) | [English](#en-0.10.2)

<h3 id="cn-0.10.2">新增功能</h3>

- **设置页新增「动画效果」，三档可选**：「随系统」跟随 Windows 自己的「显示动画」设置（原来的行为）；「减弱」把动画停在代表帧上、界面的过渡压到瞬时；「总是」无论系统怎么设置都播放动画。系统设置中途变化时立即按新值生效。后台任务的转圈在三种设置下都照常转动，停住的圈读起来像坏了而不是安静。

### 体验优化

- **小鲸鱼 Deepy 的帧图改为浏览器端矢量化播放**：每张动画表图第一次被用到时，在页面里把 PNG 像素重建成 SVG（按颜色合并同行游程）再播放——浏览器按显示尺寸栅格化矢量，内存里只留显示大小的小图（原先整张大位图常驻，18 张全解码的理论上限约 144 MB），且任意屏幕缩放比例下都锐利。转换结果以表图自己的内容戳为键缓存，一张表只有自己的像素变了才重转；转换失败的表按原 PNG 播放，与之前行为一致。实测每张表的一次性转换约 50–95 毫秒，生成的矢量与原图逐像素一致。
- **流式输出期间界面的每帧开销约减半**：一轮功能刷新的实测中位耗时从 6.6 毫秒降到 3.0 毫秒（p90 从 9.4 降到 3.2，同页同法对比）。三处改动：思考档位开关的摆放原来每轮都「写外边距再读位置」强制两次重排，现在只在档位文字变化时量一次、位置值不变不写（该功能单轮耗时 2.24 → 0.007 毫秒）；上下文计量环的宽度原来每轮读取（流式期间等于每轮一次强制布局），现在只在百分比读数或重绘范围变化时量；其余功能的刷新维持「只读必要节点、只写变化值」。
- **小鲸鱼 Deepy 的播放交给浏览器的动画引擎**：换帧从「每 50 毫秒一次定时器改写 background-position（每帧一次主线程重绘）」改为「胶片条 transform 平移 + WAAPI steps 关键帧」——循环动画播放期间主线程完全没有 JS 运行，换帧只走合成器。状态机、减弱动态效果下的静止帧、点击戳刺与抬起反应的行为不变；冒烟测试核对帧在前进、且不唤醒任何界面刷新。
- **DeepSeek 档的亮色背景蓝更淡**：亮色画布由 `#F7FAFF` 换成 `#FAFBFF`，侧栏 `#F7F9FF`，各层底色、分段控件与开关底板、表头、滚动条按同样的幅度调淡，整页的蓝现在只是白底上的一层色调。暗色配色不变。
- **会话的数字收进上下文弹层，输入行不再挂那行小字**：输入卡片下方原来那行「2 轮 158 步 · 242 tok/s · 32M tok · 缓存命中 99%」及其悬停展开的卡片一并去掉；这些数字（模型用时、工具调用用时、首 token 平均、输出速度，以及缓存命中、未缓存输入、缓存读取、输出）现在追加在上下文计量环的弹层里，排在宿主自己的上下文明细下方，弹层开着的时候跟着会话实时更新。该弹层改为悬停弹起（跟随「悬停打开弹层」偏好，指针离开即收起），点击打开也照旧可用；它本来是「啪」地出现，现在与皮肤自建的卡片一样淡入上浮。数字还没到时，那块位置先按同样的高度占住（两个小标题下面是与真实行等高的占位条），不会出现弹层先矮后高；占位最多保留 2 秒，之后让位给宿主自己画的版面。

### 问题修复

- **已归档列表的会话标题不再默认是黑色**：静止时与进行中的会话一样用次级灰，只有指针停在行上或键盘焦点进入行时才是主文字色。
- **桌面端封号彩蛋页不再重复出现窗口按钮，Claude 标贴着顶栏**：Windows 桌面壳的最上面一行是系统层，它自己画了最小化、最大化、关闭三个按钮；彩蛋页以前又画了一套，顶栏上于是出现两排按钮。现在这页不画自己那套，星芒标与字标、「退出登录」直接排进系统顶栏那一行，那一行也跟着页面换成象牙白或暖黑；按住这一行的空白处仍然可以拖动窗口。
- **封号彩蛋页在 DeepSeek 档下也显示 Claude 标**：以前选 DeepSeek 时页面上只剩「Claude」文字、旁边的星芒被去掉；这页复刻的是 Claude 自己的界面，现在两档都画完整的 Claude 字标。
- **账号弹层不再先贴着底部出现再往上跳**：宿主的账号卡片挂载时只带它自己那三行，皮肤的行晚一帧进入，卡片随之变高，宿主再晚一帧按新的高度重新摆位。此前这次重新摆位发生在卡片已经淡入到约三分之一的时候，于是看到的是它先停在偏下的位置、再跳上去。现在卡片在皮肤的行走位完成之前不上色，入场动画从它最终的高度与位置开始播放。

### 移除

- **删除 Anthropic 品牌档**：设置页「修改品牌标识」只剩 DeepSeek 与 Claude 两档；已经存过 `anthropic` 的设置读作 Claude（这一档的标识与配色本来就与 Claude 相同）。

### 其他变更

- **README 的小鲸鱼介绍附上动图**：「特点」里小鲸鱼 Deepy 一条下面加了八张 GIF，分别是空闲、思考、写回答与调用工具、指挥子代理、等你操作、失败、完成与睡着。仓库里的 Deepy 展示页因体积过大（约 7.6 MB）移除，全部 20 个动画的 GIF 仍在 `showcase/gifs/`。

<h3 id="en-0.10.2">New Features</h3>

- **A new Animation setting with three choices**: Follow the system keeps Windows' own "show animations" setting in charge (the previous behaviour); Reduced holds every animation on its still frame and takes the interface's transitions down to nothing; Always plays them whatever the system says. A change to the system setting lands immediately. The background-work ring turns in all three, since a still ring reads as broken rather than as calm.

### Improvements

- **Deepy's animation sheets now play as vectors generated in the browser**: the first time an animation is wanted, its sheet's PNG pixels are rebuilt as SVG (same-color runs of a row merged into one path per color) and that vector is what plays — the browser rasterizes it at the size the whale is drawn, so memory holds only that small image (the sheets used to stay decoded whole, with a theoretical ceiling around 144 MB for all eighteen), and the whale is sharp at every display scale. Generated vectors are cached under each sheet's own content stamp, so a sheet is re-converted only when its own pixels change; a sheet that decodes but does not convert plays as the PNG it came from, exactly as before. Measured locally: a one-time 50–95 ms per sheet, and the generated vector is pixel-identical to the source.
- **The per-frame cost of streaming is roughly halved**: a measured feature-refresh pass went from a 6.6 ms median to 3.0 ms (p90 from 9.4 to 3.2, same page, same method). The effort control's placement used to force two reflows per pass (write a margin, read the box back); it now measures only when the level's label changes and writes only moved values (that feature alone went from 2.24 ms to 0.007 ms a pass). The context meter's width used to be read every pass — a forced layout each pass while streaming — and is now re-measured only when the percentage reading or the restyle scope changes.
- **Deepy now plays on the browser's animation engine**: frame changes move from a 50 ms timer rewriting background-position (a main-thread repaint per frame) to a filmstrip translated by WAAPI steps keyframes — while a loop plays, no JS runs on the main thread at all and frames composite instead of repaint. The state machine, the still frames under reduced motion, and the poke/lift reactions behave exactly as before; the smoke suite checks that frames advance without waking a single skin pass.
- **A paler blue behind the DeepSeek brand's light palette**: the light canvas moves from `#F7FAFF` to `#FAFBFF`, the sidebar to `#F7F9FF`, and the raised layers, segmented-control and switch plates, table headers and scrollbars step back with them, so the blue now reads as a tint on white. The dark palette is unchanged.
- **The session's numbers moved into the context popover, and the composer row no longer carries them**: the "2 turns 158 steps · 242 tok/s · 32M tok · Cache hit 99%" line under the input card and the card it opened on hover are both gone; those numbers (model time, tool-call time, average time to first token, output speed, and cache hits, uncached input, cache reads, output) are appended to the context meter's popover, under the host's own context rows, and follow the session while that popover stays open. The popover now opens on hover — following the "open popovers on hover" preference, and folding away when the pointer leaves — while a click still opens it, and it fades and rises in the way the skin's own cards do instead of popping. Until the numbers arrive, that block holds their height (bars as tall as real rows, under the two real headings), so the popover never opens short and grows; the place is held for at most 2 seconds, after which the host's own layout stands.

### Bug Fixes

- **Archived conversations no longer rest in black**: an archived title sits in the same grey as the host's own session rows and takes the primary ink only while the pointer is on its row or the keyboard focus is in it.
- **The account-hold page on the Desktop no longer draws a second set of window buttons, and its Claude lockup sits on the titlebar row**: the top row of a Windows Desktop window belongs to the system, which paints minimize, maximize and close there; the page used to draw its own three as well, so the titlebar showed two rows of buttons. It draws none of its own now — the starburst and wordmark and the Sign out button take their place in that row, the row takes the page's ivory or warm black, and the window is still dragged by the empty part of it.
- **The account-hold page shows the Claude lockup under the DeepSeek brand too**: choosing DeepSeek used to leave the bare "Claude" text with the starburst dropped; the page reproduces Claude's own screen, so both brands now draw the full Claude lockup.
- **The account popover no longer appears against the bottom edge and jumps up**: the host mounts its card with its own three rows and places it from that geometry, the skin's rows arrive a frame later so the card grows, and the host re-places it a frame after that. That re-placement used to land when the card had already faded to about a third, so it read as appearing low and then jumping. The card now stays unpainted until the skin's rows are in it and its placement has settled, and the entrance animation plays from its final height and place.

### Removals

- **The Anthropic brand choice is deleted**: the settings page's Brand mark row offers DeepSeek and Claude only, and a stored `anthropic` reads as Claude, whose marks and palette it already shared.

### Chores

- **The README's Deepy entry now shows it moving**: eight GIFs sit under the Deepy item in Features — idle, thinking, answering and calling tools, conducting subagents, waiting on you, failed, finished and asleep. The repository's Deepy showcase page is removed for its size (about 7.6 MB); GIFs of all 20 animations remain in `showcase/gifs/`.

**Full Changelog**: [v0.10.1...v0.10.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.1...v0.10.2)

## [0.10.1] - 2026-09-28

[中文](#cn-0.10.1) | [English](#en-0.10.1)

<h3 id="cn-0.10.1">其他变更</h3>

- **README 预览换成 Claude 与 DeepSeek 两套配色的截图**：原来只有一组亮暗首页截图，现在两套配色各有工作台首页与一段 Markdown 对话（标题、列表、任务清单、表格、代码高亮、引用）的亮暗截图，共八张；截图里的工作区、会话、用量与昵称都是示例数据。
- **README 新增鸣谢**：注明像素小鲸鱼 Deepy 的动画帧图出自 calmly-eating-bugs 绘制的 Deepy 小鲸鱼主题包、经作者许可随插件分发，并附上作者贡献到仓库 `showcase/` 目录的展示页与 GIF 原件入口。展示页只在 GitHub 仓库里，npm 包的内容与体积不受影响。

<h3 id="en-0.10.1">Chores</h3>

- **README previews now show both the Claude and the DeepSeek palettes**: the single light/dark pair of the home page gives way to eight shots, each palette showing the Studio home page and a Markdown conversation (headings, lists, task lists, a table, highlighted code, a quote) in light and dark; the workspaces, sessions, usage and nickname in them are sample data.
- **README acknowledgements**: Deepy's animation frames are credited to the Deepy whale theme pack drawn by calmly-eating-bugs and shipped by the author's permission, with pointers to the showcase page and GIF originals the author contributed under the repository's `showcase/` folder. The showcase lives only in the GitHub repository; the npm package's contents and size are unchanged.

**Full Changelog**: [v0.10.0...v0.10.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.0...v0.10.1)

## [0.10.0] - 2026-09-28

[中文](#cn-0.10.0) | [English](#en-0.10.0)

<h3 id="cn-0.10.0">新增功能</h3>

- **DeepSeek 品牌下，输入框上站着像素小鲸鱼 Deepy**：品牌选 DeepSeek 时，螃蟹换成小鲸鱼 Deepy，动画逐帧取自 Deepy 主题包（每帧 50 毫秒）。它在首页（经典与工作台两种版面）站在输入卡片上沿、靠右；进入对话后站在整块输入区的上沿，要你批准、回答问题或审阅计划时站到那块面板上。只有主对话区有它，侧栏里的子代理对话没有。它的动作跟着智能体走：没事时呼吸、眨眼，偶尔东张西望或喷水；模型思考时冒思考云；写回答或调用工具时敲代码，两个会话同时在干活时戴耳机，三个以上戴安全帽砌砖；一个子代理在跑时戴耳机，两个以上指挥小鲸鱼分身；压缩上下文时吸入碎片；等你操作时摇感叹号铃铛；工具调用或这一轮失败时冒烟、眼冒金星；一轮或一次压缩结束时空翻撒彩纸。首页上它看整个工作区：按同时在干活的会话数挑动作，有会话在等你时摇铃，别的会话在后台做完时庆祝。闲下来后一分钟没动鼠标、没按键就睡着，再动一下就惊醒。点脸或尾巴会被戳得晃动，连点四下被挠痒痒，按住往外拖被拎起来。系统要求减少动态效果时每个状态停在一张代表帧上，点它才动。本机实测，小鲸鱼动着时页面主线程每秒多用约 13 毫秒（没有它时约 1–3 毫秒），换帧不触发皮肤的整页刷新，页面切到后台时停止换帧。插件新增公开路由 `GET /dsh-claude-style/deepy/<动作>.png` 提供帧图（共约 0.4 MB，浏览器在某个动作第一次出现时才下载）；更新插件后要重启宿主，小鲸鱼才会出现。

### 体验优化

- **品牌标识的「关闭」改名为 DeepSeek，整套配色换成 DeepSeek 蓝色系**：设置页「修改品牌标识」原来的「关闭」现在明确写作 DeepSeek（设置值由 `off` 改为 `deepseek`，已经存下的 `off` 照样读作 DeepSeek）。选它时强调色由陶烬橙换成 DeepSeek 的品牌蓝 `#4D6BFE`，主按钮、开关、勾选、焦点框、链接与轮次状态行都跟着变；亮色画布从偏黄的象牙白换成带一点天蓝的亮白 `#F7FAFF`（侧栏 `#F3F7FE`），暗色画布从暖黑换成蓝黑 `#13161D`，边框、各级灰色文字、弹层与菜单卡片、搜索面板、分段控件、表头与滚动条一并换成冷色，用户消息气泡带一点蓝，行内代码用正文颜色。侧栏与首页照旧显示宿主自己的 DeepSeek 鲸鱼与字标，并画成 DeepSeek 蓝；账号行没有头像时、进行中与结束轮次的状态行，原来的 Claude 标也换成 DeepSeek 的鲸鱼标（进行中时摇摆着游动）。Claude 与 Anthropic 两档的样子不变。
- **已归档列表里删除被拒时弹出提示说明原因**：此前点「删除」被拒绝时界面毫无反应，只在控制台记一条警告。现在会弹出宿主自己的 Toast：会话仍被应用占用时提示「会话仍被本应用占用，重启后再删除」，其余拒绝提示「删除失败：原因」，行保持原样。

<h3 id="en-0.10.0">New Features</h3>

- **Deepy the pixel whale on the composer under the DeepSeek brand**: with the DeepSeek brand chosen, the crab gives way to Deepy, whose frames come from the Deepy theme pack one for one (50 ms a frame). On the home page (Classic and Studio alike) it stands on the composer card's top edge near its right end; in a conversation it stands on top of the whole input area, and while you are asked to approve something, answer a question or review a plan it stands on that panel. Only the main conversation carries it; the sidebar's subagent chats do not. What it does follows the agent: between jobs it breathes and blinks, now and then looking around or spouting; a thought cloud while the model thinks; typing while it writes an answer or calls tools, headphones when two sessions work at once and a hard hat from three; headphones for one running subagent and a squad of little whale clones to conduct for two or more; inhaling the fragments during a context compaction; an exclamation bell while something waits on you; smoke and dizzy stars when a tool call or the turn fails; a flip and confetti when a turn or a compaction finishes. On the home page it reads the whole workspace: how many sessions are working picks the animation, a session waiting on you rings the bell, and one finishing in the background is celebrated. A minute with no work and no pointer movement or key presses puts it to sleep, and the next one wakes it with a start. Clicking its face or tail pokes it, four quick clicks tickle it, and pressing and pulling lifts it. With reduced motion requested each state holds one frame, and it moves only when clicked. Measured here, the animating whale adds about 13 ms of main-thread work a second (the page idles at 1–3 ms without it); a frame change wakes none of the skin's page passes, and frames stop while the page is in the background. A new public route, `GET /dsh-claude-style/deepy/<animation>.png`, serves the frames (about 0.4 MB in all, each animation fetched the first time it plays); after updating the plugin, restart the host for the whale to appear.

### Improvements

- **The brand mark's "Off" is now DeepSeek, with the whole palette in DeepSeek blue**: the settings page's Brand mark row now names its first choice DeepSeek (the setting's value changes from `off` to `deepseek`, and a stored `off` still reads as DeepSeek). It trades the ember orange accent for DeepSeek's brand blue `#4D6BFE` across primary buttons, switches, checks, focus rings, links and the turn status line; the yellowish ivory light canvas gives way to a white with a touch of sky blue, `#F7FAFF` (sidebar `#F3F7FE`), and the warm-black dark canvas to a blue-black `#13161D`, with the hairlines, grey inks, popover and menu cards, search palette, segmented controls, table headers and scrollbars turning cool, user bubbles taking a touch of blue and inline code set in the body ink. The sidebar and the home page keep the host's own DeepSeek whale and wordmark, painted DeepSeek blue; the account row's picture without an avatar and the status line of running and ended turns trade the Claude mark for DeepSeek's whale (which sways as it swims while the turn runs). The Claude and Anthropic choices look as before.
- **A Toast now explains a refused delete on the archived list**: a delete the host half refuses used to do nothing visible, leaving one console warning. The host's own Toast now rises: when the conversation is still held open by the app it reads "The conversation is still held open by this app; restart it, then delete again", and every other refusal reads "Delete failed: \<reason\>". The row stays put.

**Full Changelog**: [v0.9.1...v0.10.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.9.1...v0.10.0)

## [0.9.1] - 2026-09-27

[中文](#cn-0.9.1) | [English](#en-0.9.1)

<h3 id="cn-0.9.1">问题修复</h3>

- 修复 **已归档列表里的会话删不掉**：点「删除」后宿主半边只删存储目录、不动归档记录，存储目录已经不在的会话更是直接被拒——列表那一行永远留着，重载页面后还在。现在删除成功时宿主半边在同一请求里把该会话从归档集合里移除；归档集合里存储目录已消失的条目（幽灵）也按删除成功处理并移出归档集合，浏览器随即重拉一次会话列表基线，已删除的会话不会再靠旧摘要顶在已归档列表或会话树里。旧版宿主半边对目录缺失的会话回 404 时，浏览器同样移除该行。

<h3 id="en-0.9.1">Bug Fixes</h3>

- **Fixed archived sessions refusing to disappear when deleted**: the delete button removed the stored directory while the archive record kept the id, and a session whose directory was already gone was refused outright — the row stayed on the list and survived a page reload. A successful delete now also drops the session from the archive set in the same request, an archive entry whose stored directory has vanished is answered as deleted and leaves the set, and the browser re-pulls the session baseline right after, so a deleted session no longer lingers on the archived list or in the session tree on a stale summary. Against an older host half that still answers 404 for a missing directory, the browser removes the row just the same.

**Full Changelog**: [v0.9.0...v0.9.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.9.0...v0.9.1)

## [0.9.0] - 2026-09-26

[中文](#cn-0.9.0) | [English](#en-0.9.0)

<h3 id="cn-0.9.0">新增功能</h3>

- **侧栏搜索框与搜索面板**：鼠标移到侧栏上时，左上角的品牌标志淡出、换成一个淡入的搜索按钮（右端标出宿主的搜索快捷键），点它在窗口上方打开搜索面板；宿主的搜索快捷键（桌面端 Ctrl+K，Web 端 Ctrl+Alt+K，在设置里改过的以改后的为准）也打开这个面板，侧栏「工作区」标题行原来的搜索图标不再显示。面板打开与关闭时连同背后的遮罩一起淡入淡出。面板能搜历史会话、项目、插件、当前会话可用的 Skill 与快捷键。会话按标题、所属工作区名和对话内容搜：你和模型说过的每句话都算（工具调用的参数与子代理会话不算），句子中间的几个中文字也能搜到，不分大小写，空格多几个少几个都行；行下显示命中的那一句，命中的字加粗。插件新增只读的私有路由 `/dsh-claude-style/session-search` 供面板查询，与其他私有路由一样先过宿主的请求校验；宿主进程启动后第一次打开面板时它会把全部会话读一遍（本机 128 个会话约 16 秒，这期间面板显示「正在搜索」），之后每次查询约 0.1 秒。顶部的「全部 / 会话 / 项目 / 插件 / Skill / 快捷键」切换分类；搜索框为空时列出最近的五个会话和「新会话 / 插件 / 设置 / 键盘快捷键」几个操作。↑↓ 选择，Enter 打开，Tab 与 Shift+Tab 切换分类，Esc 关闭。选中会话即打开该会话；选中项目在这个工作区开一个新会话；选中插件打开它在插件页的详情；选中 Skill 把 `/名称 ` 放到当前会话输入框的开头；选中快捷键打开宿主的快捷键列表，并筛到这一条。侧栏收起成窄条时没有搜索框。
- **进行中、已停止与失败的轮次改用 Claude Code 式的状态行**：原来宿主把「深度求索中，用时 N 秒」「已停止」「处理失败」排在这一轮的最前面，工作过程往下越排越长、状态却停在上方。现在这一行跟在这一轮工作的末尾（这一轮的页脚、排队中的消息仍在它下面），画成 Claude Code 的样子。进行中是一个转动的火花标记加「用时 · 输出 tokens · 当前动作」，例如「34秒 · 1.2k tokens · 思考中…」，当前动作依次有等待模型、思考中、思考了 N 秒、输出中、准备调用工具与运行工具中；停止或失败后火花静止，文字为「已停止 · 17秒 · 179 tokens」「处理失败 · 12秒 · 300 tokens」这样，历史里的这些轮次也一样。tokens 是这一轮已完成各步上报的输出用量，正在输出的那一步结束后计入。正常结束的一轮仍是宿主原来的「用时 N 秒」，在原来的位置，折叠与展开照旧。

### 体验优化

- **像素螃蟹改用 Claude Code 的原版动画**：工作台首页输入卡片上的螃蟹原来是按 Claude Code 的样子手绘的十一个姿势；现在换成 Claude Code 自己的敲代码动画，逐帧照搬（43 帧、每帧 80 毫秒，约 3.4 秒）：眨眼、掏出笔记本电脑放到卡片边沿、跳一下侧过身敲一阵键盘、收起电脑转回正面，像素边缘清晰。电脑仍用随主题变化的灰色，触发方式（点击、指针移开、闲置时隔二三十秒自己来一次，减少动态效果时只认点击）不变。
- **对话中输入框的发送键改成 Claude Code 的回车图标**：原来是等宽字体里的「↵」字符，有内容时变成陶土橙；现在是按 Claude Code 画的回车箭头（上沿一小段、沿右侧向下、再沿底边向左到箭头），线条清晰，输入框有内容时用正文墨色，空着时仍是浅灰。
- **桌面端侧栏的品牌行上移 10px**：桌面端的侧栏从 40px 高的标题栏下方开始，品牌标志因此比 Web 端低出一截；现在品牌行（连同其下的新会话、插件与会话列表）上移 10px，悬停时换上的搜索框仍整个露在标题栏下方，与标题栏里的收起按钮也不重叠。Web 端不变。
- **用量面板的倍数趣味行从二十九本书扩到六十五本**：书单补入《黄色壁纸》《变形记》《化身博士》《野性的呼唤》《时间机器》《绿野仙踪》《黑暗之心》《浮士德》《螺丝在拧紧》《伊索寓言》《彼得·潘》《君主论》《隐形人》《安徒生童话》《世界大战》《善恶的彼岸》《白牙》《沉思录》《格林童话》《格列佛游记》《瓦尔登湖》《鲁滨逊漂流记》《神曲》《包法利夫人》《查拉图斯特拉如是说》《奥德赛》《双城记》《远大前程》《理想国》《罪与罚》《利维坦》《安娜·卡列尼娜》《卡拉马佐夫兄弟》《堂吉诃德》《基督山伯爵》《悲惨世界》，长度都是全文以 o200k_base 分词器实测的值（英文原著或通行英译本，《浮士德》为德文原文）。书单仍从《道德经》排到《追忆似水年华》，用量越过的书更密，趣味行落到的那本书离实际用量更近。

### 问题修复

- 修复 **开启「自动弹出弹层」后进入封号彩蛋页会立刻退出**：桌面端从账号菜单点开彩蛋页时，全窗浮层让指针「离开」菜单，悬停收起随后代宿主菜单按下的 Escape 被插件的键盘路由当成了用户按键，约 0.1 秒就把刚打开的彩蛋页关掉。现在这次代发的 Escape 只送达宿主菜单：彩蛋页开着时悬停收起同时停摆，页面保持打开，退出后侧栏与账号菜单恢复进入前的样子。
- 修复 **启用皮肤后带输入框的会话页上快捷键失灵**：皮肤常驻页面的模型选择器、推理强度与权限弹层卡片在关闭时仍标注 `role="menu"`，宿主据此把快捷键仲裁给一个看不见的「前景菜单」，连按 Esc 停止智能体、Ctrl+W 关闭页面与标签页菜单的 Esc 都不再生效（Web 端受影响的面更宽）。现在这一角色标注随卡片开合写入与撤销：卡片打开时才存在，快捷键的仲裁恢复如常。

<h3 id="en-0.9.0">New Features</h3>

- **A sidebar search box and search palette**: while the pointer is over the sidebar, the brand mark at its top left fades out into a search button (the host's search shortcut shown at its right end), and pressing it opens a search palette near the top of the window; the host's search shortcut (Ctrl+K on the desktop, Ctrl+Alt+K on the web, or whatever it has been rebound to in settings) opens the same palette, and the search icon the sidebar's Workspace heading used to carry is gone. The palette fades in and out together with the mask behind it. The palette searches past sessions, projects, plugins, the skills the current session offers and keyboard shortcuts. Sessions match by title, by workspace name and by what was said in them: every message between you and the model counts (tool-call arguments and subagent sessions do not), a few Chinese characters from the middle of a sentence match, case does not matter and neither do extra spaces; the matching line shows under the row with the match in bold. The plugin adds a read-only private route, `/dsh-claude-style/session-search`, for these queries, behind the host's request check like its other private routes; the first time the palette opens after the host process starts, the route reads every session once (about 16 s for 128 sessions here, while the palette shows "Searching…"), and each query after that takes about 0.1 s. The palette has All / Sessions / Projects / Plugins / Skills / Shortcuts across the top to narrow the list; with the box empty it lists the five most recent sessions and the New session, Plugins, Settings and Keyboard shortcuts actions. ↑↓ moves, Enter opens, Tab and Shift+Tab switch the category, Esc closes. Picking a session opens it; a project starts a new session in that workspace; a plugin opens its details on the plugins page; a skill puts `/name ` at the head of the current session's input; a shortcut opens the host's shortcut list filtered to that entry. The collapsed sidebar rail has no search box.
- **A Claude Code style status line for running, stopped and failed turns**: the host used to put "Deep diving for N s", "Stopped" and "Failed" at the very top of the turn, so the work grew downward while its status stayed above it. The line now follows the end of the turn's work (the turn's footer and queued messages still sit below it) and looks like Claude Code's. While the turn runs it is a turning spark, then elapsed time · output tokens · what the model is doing, for example "34s · 1.2k tokens · Thinking…", the action being one of waiting for the model, thinking, thought for N s, writing, preparing a tool call and running tools; once the turn is stopped or fails the spark stands still and the line reads like "Stopped · 17s · 179 tokens" or "Failed · 12s · 300 tokens", for such turns in the history too. The token count is the output usage the turn's finished steps report; the step still streaming joins it once it finishes. A turn that finishes normally keeps the host's own "Took N s" in its place, and folding works as before.

### Improvements

- **The pixel crab plays Claude Code's own animation**: the crab on the Studio home page's composer card used to be eleven hand-drawn poses after Claude Code's; it now plays Claude Code's own laptop animation frame for frame (43 frames of 80 ms, about 3.4 s) — a blink, a laptop pulled out onto the card's edge, a hop into a side-on stance to type away, the laptop put away as it turns back — with crisp pixel edges. The laptop keeps its theme-following grey, and what sets it off (a click, the pointer leaving it, on its own every half minute or so, only a click under reduced motion) is unchanged.
- **The in-conversation composer's send button uses Claude Code's return glyph**: it used to be the "↵" character from the monospace font, turning clay once there was text; it is now Claude Code's drawn return arrow (a short stub along the top, down the right side, back along the bottom to the arrowhead) in crisp strokes, in the body ink once the box holds text and still pale grey while it is empty.
- **The desktop sidebar's brand row sits 10px higher**: the desktop sidebar starts below the 40px titlebar, which left the brand mark lower than on the web; the brand row (and the New session, Plugins and session list below it) now rises 10px, with the search box that takes its place on hover still wholly below the titlebar and clear of the collapse button there. The web build is unchanged.
- **The usage panel's yardstick line grows from twenty-nine to sixty-five books**: the list adds The Yellow Wallpaper, Metamorphosis, The Strange Case of Dr Jekyll and Mr Hyde, The Call of the Wild, The Time Machine, The Wonderful Wizard of Oz, Heart of Darkness, Faust, The Turn of the Screw, Aesop's Fables, Peter Pan, The Prince, The Invisible Man, Andersen's Fairy Tales, The War of the Worlds, Beyond Good and Evil, White Fang, Meditations, Grimms' Fairy Tales, Gulliver's Travels, Walden, Robinson Crusoe, The Divine Comedy, Madame Bovary, Thus Spoke Zarathustra, The Odyssey, A Tale of Two Cities, Great Expectations, The Republic, Crime and Punishment, Leviathan, Anna Karenina, The Brothers Karamazov, Don Quixote, The Count of Monte Cristo and Les Misérables, each sized by feeding its full text to the o200k_base tokenizer (the English original or the standard English translation; Faust in the German original). The list still runs from Tao Te Ching to In Search of Lost Time; with the books set closer together, the one the line lands on sits nearer the real usage.

### Bug Fixes

- **Fixed the account-hold easter egg closing itself right after it opened while "Open popovers on hover" is on**: on the desktop, opening the page from the account menu made the full-window overlay "leave" the menu, and the hover close that followed pressed Escape on the host's behalf — which the skin's keyboard routing took for the user's own key and dismissed the page about 0.1 s in. That dispatched Escape now reaches only the host's menu, the hover close stands down while the page is open, and the sidebar and its account menu come back as they were once the page is dismissed.
- **Fixed shortcuts going dead on conversation pages with an input box while the skin is enabled**: the model picker, reasoning-effort and permission popover cards the skin keeps in the page carried their `role="menu"` mark while closed, so the host arbitrated its shortcuts to an invisible "foreground menu" — pressing Esc twice to stop the agent, Ctrl+W to close a page and the Esc of the tab menu all stopped working (the Web build loses a wider set of them). The mark now rides the card's open state: it exists only while a card is open, and shortcut arbitration goes back to normal.

**Full Changelog**: [v0.8.0...v0.9.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.8.0...v0.9.0)

## [0.8.0] - 2026-09-26

[中文](#cn-0.8.0) | [English](#en-0.8.0)

<h3 id="cn-0.8.0">体验优化</h3>

- **对话 / 轨迹 / 上下文切换时高亮块平滑滑动**：切换视图时，高亮块此前在原标签上淡出、在新标签上淡入；现在同一块高亮从原标签滑到新标签，宽度随标签文字一起变化，标签文字颜色同步过渡。滑动不受系统「减少动态效果」设置影响，Windows 关掉了「在 Windows 中显示动画」时照样滑动。
- **权限分段、进行中 / 已归档与设置页分段控件的高亮块同样滑动**：只读 / 编辑 / 自动 / Yolo、侧栏的进行中 / 已归档，以及设置页里的各组分段控件，切换时高亮块都从原来那一段滑到新的一段，与对话视图标签同一套动画。
- **页面持续变化时插件的每帧开销大幅下降**：流式输出、打字机效果这类每帧都改动页面内容的场景，插件样式表此前让浏览器每帧的样式重算从 1.6ms 涨到 11–18ms，每帧主线程总耗时 14–23ms，超过一帧 16.7ms 的预算而掉帧；现在同一场景下样式重算为每帧 1.9–2.7ms，总耗时 5–7ms（本机无界面 Chrome 实测）。界面外观不变。
- **工作区选择菜单改为 Claude Code 的文件夹菜单样式**：菜单此前每行前面都有一个文件夹图标，行距与档位菜单的两行条目一样宽；现在是一张窄卡片，纯文字行排得更紧，文件夹图标与「添加工作区…」前的加号都不画，当前工作区仍以强调色勾号标出。档位菜单保持原样。
- **用量面板的倍数趣味行从十一本书扩到二十九本**：标尺书单补入《道德经》《爱丽丝漫游奇境》《圣诞颂歌》《弗兰肯斯坦》《道林·格雷的画像》《福尔摩斯冒险史》《哈克贝利·费恩历险记》《简·爱》《德古拉》，以及四大名著、《三体》三部曲、《活着》《平凡的世界》等中文书目，整份书单从《道德经》（约 7.6K tokens）排到《追忆似水年华》。书长改用真实口径：公有领域原书按全文以 o200k_base 分词器实测，仍在版权期的书目按出版字数以同一分词器实测的比例折算，几本英文经典的长度也按实测值更新。英文界面的这一行改为 “You've used ~N× the tokens in <书名>.”，此前的 “~N× more tokens than” 读起来是多出 N 倍，与实际倍数差了一倍。
- **账号弹层卡片改用象牙白底色**：浅色模式下，账号弹层与宿主账号菜单此前是纯白卡片，和界面其余部分的暖色调不一致；现在与主画布同为象牙白 `#FCFCFB`，靠细边框和阴影与侧栏区分。暗色模式不变。

### 问题修复

- 修复 **侧栏「已归档」显示「没有已归档的会话」**：插件启动时宿主的归档数据往往还没到，列表就一直停在空白；现在列表跟随宿主的归档记录与会话列表实时更新，启动后、在别处归档或取消归档后都立刻反映。列表收录的会话与宿主自带「仅已归档」筛选一致（不含子代理会话与已不存在的会话），每行显示宿主给出的标题，不再出现成片的「未命名会话」；会话多时列表在侧栏内滚动，不再被截在窗口底部。
- 修复 **点击已归档行没有任何反应**：现在与宿主会话树里点已归档会话一样，窗口顶部弹出宿主自己的提示「已归档对话暂时无法查看，请取消归档后查看」。
- 修复 **英文界面下「排队发送」「插话发送」按钮的外观与中文界面不一致**：英文界面下，回复进行中且草稿非空时，这两个按钮此前不显示强调色，悬停时也没有底色；现在与中文界面一致。输入框里各按钮改为按它们在宿主界面中的位置识别，不再依赖按钮文字，宿主改动按钮文案或切换界面语言都不影响样式。

### 其他变更

- **页面标出正在运行的构建**：`<body>` 上的 `data-dsh-claude-style` 属性现在写着已加载的包的构建编号（`npm run build` 会打印同一个编号），报告问题时即使页面经过多次热重载、从未刷新，也能说清运行的是哪一版。

<h3 id="en-0.8.0">Improvements</h3>

- **The Chat / Trajectory / Context highlight slides between tabs**: switching views used to fade the highlight out on the old tab and in on the new one; now one highlight slides from the old tab to the new one, resizing to the new label as it goes, while the labels' colours cross over. The slide ignores the system's reduced-motion setting, so it still plays with Windows' "Show animations in Windows" turned off.
- **The permission segments, Active / Archived and the settings page's segmented controls slide their highlight too**: Read / Edit / Auto / Yolo, the sidebar's Active / Archived, and every segmented control on the settings page now slide the highlight from the old segment to the new one, with the same motion as the conversation view tabs.
- **Much lower per-frame cost while the page keeps changing**: when content changes every frame (streaming output, a typewriter effect), the plugin's stylesheet used to raise the browser's style recalculation from 1.6ms to 11–18ms per frame, for 14–23ms of main-thread work per frame — over the 16.7ms frame budget, so frames dropped. The same scenario now costs 1.9–2.7ms of style recalculation and 5–7ms in total per frame (measured locally in headless Chrome). Nothing on screen looks different.
- **The workspace picker takes the look of Claude Code's folder menu**: every row used to carry a folder glyph and was spaced like the preset menu's two-line entries; it is now a narrow card of plain text rows set closer together, with no folder glyph and no plus sign on "Add workspace…", and the current workspace keeps the accent check. The preset menu is unchanged.
- **The usage panel's yardstick line grows from eleven to twenty-nine books**: the list adds Tao Te Ching, Alice's Adventures in Wonderland, A Christmas Carol, Frankenstein, The Picture of Dorian Gray, The Adventures of Sherlock Holmes, Adventures of Huckleberry Finn, Jane Eyre and Dracula, plus the Chinese classics — the Four Great Classical Novels, the Three-Body trilogy, To Live and Ordinary World — with the whole list spanning Tao Te Ching (~7.6K tokens) to In Search of Lost Time. Book lengths now carry a real basis: public-domain originals are measured by feeding their full text to the o200k_base tokenizer, and in-copyright titles are their published word counts at the ratio that tokenizer measures, with several English classics' lengths updated to the measured values. The English line now reads "You've used ~N× the tokens in <book>."; the former "~N× more tokens than" said N times more, one whole book off the real multiple.
- **The account popover's card takes the ivory canvas fill**: in light mode the account popover and the host's account menu were pure white cards, out of tone with the warm rest of the interface; they now share the main canvas's ivory `#FCFCFB`, set off from the sidebar by their hairline and shadow. Dark mode is unchanged.

### Bug Fixes

- Fixed **the sidebar's Archived view reading "No archived conversations"**: the host's archive data usually arrives after the plugin starts, and the list stayed empty. The list now follows the host's archive record and session list live, so it fills in after startup and reflects archiving or unarchiving done anywhere. It holds the same conversations as the host's own "Archived only" filter (no subagent sessions, no sessions that no longer exist), each row carries the host's title instead of a run of "Untitled conversation", and a long list scrolls inside the sidebar instead of being cut off at the bottom of the window.
- Fixed **clicking an archived row doing nothing**: it now raises the host's own notice at the top of the window, "Archived sessions cannot be opened. Unarchive it to view.", the same one the host's session tree shows for an archived session.
- Fixed **the Queue message and Steer message buttons looking different in the English UI**: in English, with a reply running and a non-empty draft, these two buttons showed no accent colour and no hover fill; they now match the Chinese UI. The composer's buttons are now recognised by where they sit in the host's markup rather than by their text, so a host wording change or a switch of the UI language leaves their styling intact.

### Chores

- **The page states which build it is running**: the `data-dsh-claude-style` attribute on `<body>` now carries the build id of the loaded bundle (`npm run build` prints the same id), so a bug report can name the exact build even after hot reloads that never reloaded the page.

**Full Changelog**: [v0.7.2...v0.8.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.2...v0.8.0)

## [0.7.2] - 2026-09-25

[中文](#cn-0.7.2) | [English](#en-0.7.2)

<h3 id="cn-0.7.2">新增功能</h3>

- **账号位置的头像改为玩家自己的皮肤**：启动器记下了玩家导入的皮肤，宿主半边把那张规范化贴图以只读路由发给浏览器，浏览器按启动器账号列表相同的裁法取头部——脸的 8×8 贴图块按盒子的 1/18 内缩，帽子层铺满整个盒子。头部按**方形**绘制，不用账号头像那条路径的圆形遮罩：它画到盒子边缘，任何圆角都会切掉它的像素。没有头像、头像文件已删、图取不到时显示 Claude 徽标。
- **权限档位改为跟随宿主目录**：权限控件（输入框分段控件与它的弹层）不再写死四档，段位与行都按宿主的 `permissionPresets` 目录构建——目录里有的档位才画，宿主没提供的整条不出现，第三方插件注册的档位因此成为一等公民：auto mode 插件的 `auto-mode` 会以 **Auto mode** 出现在弹层里，并在分段控件里占用 **Auto** 那一格（部署同时提供宿主内置 Auto review 时，内置档退居弹层、把格子让给部署自己的自动档）。档位名与说明仍由皮肤给（皮肤不认识的档位用宿主自己的名字与说明，机器值不上屏），行保持纯文字——预设声明的 `icon` 也不画，档位列表读起来是一份清单。切换仍走宿主的 `/permission <preset>`。

### 体验优化

- **工作台首页在还没选工作区时也显示用量面板与权限分段**：刚打开、尚无会话的首页此前只有问候语和输入框；现在用量面板照常出现在两者之间，输入框下方显示 Read / Edit / Auto / Yolo 分段，停在新会话的默认权限上，点它和点输入框一样打开工作区选择。
- **工作台首页「先选工作区」的虚线框只框住单行输入框**：虚线框此前连同输入框下方的工具行一起框进去，比输入框高出一截；现在虚线画在单行输入框本身，指针移上去时变色的提示不变。

### 问题修复

- 修复 **选中划过行内代码时代码段显示为一块偏浅的独立高亮**：芯片的半透明底色画在选中高亮之上，把芯片内的选中色混浅了一档；现在芯片内的选中色预先抵消这层罩色，整段选区呈现统一的选中色，聚焦与失焦、深色与浅色下一致。
- 修复 **窗口较矮时工作台首页被用量面板撑出窗口**：面板放不下时整页向下延伸，问候语被顶出窗口上沿；现在面板在问候语与输入框之间自己滚动，底边渐隐，滚到底时渐隐消失，问候语、上下文行与输入框都留在窗口内。

<h3 id="en-0.7.2">New Features</h3>

- **The account row's mark becomes the player's own skin**: the launcher stores every imported skin as a normalized texture atlas, and the host half serves it over a read-only route. The browser crops the head the way the launcher's own account list does — the face's 8×8 texel block inset by 1/18 of the box, with the hat layer over the whole box. The head is drawn **square** rather than under the round mask the avatar-photo path uses, because it reaches the box's edges and any rounding would shave its pixels off. With no picture, a deleted file, or a picture that cannot be served, the Claude mark shows.
- **The permission ladder now follows the host catalog**: the permission control (the composer's segmented group and its popover) no longer hardcodes four tiers. Both the segments and the rows are built from the host's `permissionPresets` catalog, so a deployment offers exactly the tiers it configures and a tier no one serves is absent rather than drawn dead. A tier a third-party plugin registers is therefore a first-class entry: the auto mode plugin's `auto-mode` appears as **Auto mode** in the popover and takes the **Auto** slot of the segmented group (when the deployment also serves the host's built-in Auto review, that one stays in the popover and the slot goes to the deployment's own tier). Names and descriptions still come from the skin — a tier it does not know reads with the host's own name and description, never with its machine id — and the rows stay text-only: a preset's declared `icon` is not drawn either, so the ladder reads as one list. Switching still goes through the host's `/permission <preset>`.

### Improvements

- **The Studio home shows the usage panel and the permission segments before a workspace is picked**: a fresh home with no session yet showed only the greeting and the input box; the usage panel now sits between them as usual, and the Read / Edit / Auto / Yolo segments show under the input box, resting on the preset a new session starts in — pressing them opens the workspace picker, the same as pressing the input box.
- **The Studio home's dashed "pick a workspace" ring outlines the single-line input box alone**: the ring used to take in the toolbar row under the input box and stood a row taller than it; it is now drawn on the input box itself, and still changes colour under the pointer.

### Bug Fixes

- Fixed **inline code showing a separate, lighter highlight when selected**: the chip's translucent wash painted over the selection and lightened it inside the chip; the in-chip selection paint now pre-compensates for that wash, so a selection crossing inline code is one even colour, focused or blurred, dark or light.
- Fixed **the usage panel pushing the Studio home past a short window**: when the panel did not fit, the whole page grew downward and the greeting ran off the top; the panel now scrolls between the greeting and the composer with its bottom edge fading out (the fade lifts at the end of the scroll), and the greeting, the context row and the input box stay in the window.

**Full Changelog**: [v0.7.1...v0.7.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.1...v0.7.2)

## [0.7.1] - 2026-09-25

[中文](#cn-0.7.1) | [English](#en-0.7.1)

<h3 id="cn-0.7.1">体验优化</h3>

- **默认首页版面改为工作台**：没在设置里选过版面时，新会话页用工作台版面——问候在左上、输入卡片贴住窗口底边、中间是用量面板、卡片上沿站着像素螃蟹，也就是 Claude Code 自己的首页。经典版面仍可在设置页随时切回，已经选过版面的不受影响。

<h3 id="en-0.7.1">Improvements</h3>

- **Studio is the default home layout**: without a layout chosen in the settings, the new-conversation page opens in the Studio layout — the greeting at the top left, the composer on the window's bottom edge, the usage panel in between and the pixel crab on the card, Claude Code's own home. Classic stays one switch away in the settings page, and a layout already chosen is kept.

**Full Changelog**: [v0.7.0...v0.7.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.0...v0.7.1)

## [0.7.0] - 2026-09-25

[中文](#cn-0.7.0) | [English](#en-0.7.0)

<h3 id="cn-0.7.0">新增功能</h3>

- **两套首页版面，设置页随时切换**：新增「首页版面」设置项。**经典**沿用居中大标题加输入卡片；**工作台**把标题移到左上角并固定为一句「What's up next, 用户名？」（无衬线小字，与品牌标记同一行），输入框改用对话内的单行样式贴住窗口底部、上方一行细边框上下文胶囊，标题与一块 480px 窄栏用量面板贴着输入框左缘排布——概览页签是六个数字格（会话数、消息数、Token 总量、活跃天数、高峰时段、最常用模型）与 26 周按天热力图（等分列方格、蓝色数据色阶）；模型页签是每天一根按模型颜色自下而上堆叠的柱子，下面跟一份模型排行（色块、模型名、输入与输出、占比，超过六行折成「再显示 N 个」，展开后末尾是「收起」），柱与色块共用同一套按名次取色的蓝色色阶；右上角的「全部 / 30 天 / 7 天」范围切换过滤数字格（含高峰时段）、趣味行与模型排行，热力图与柱状图保持自身窗口；所选范围内的用量超过一本书时，热力图下方出现倍数趣味行：书从《动物农场》到《追忆似水年华》共十一本，每次回到新会话页随机换一本，范围内用量还不到这本书时退到已经超过的最长那本。面板只在新会话页出现，进入对话后自动消失。
- **用量数据在本机汇总**：新增只读路由 `GET /dsh-claude-style/usage`（与用户名路由同一同源护栏）。装了 `dsh-cost-meter` 时直接读它的账本缓存（只读），否则读本机会话日志自行汇总，并按日志文件增量缓存——冷启动首次约两秒，之后每次启动约 3 毫秒。两种来源都给出每个模型的四类 token 与每天按模型拆分的 token（`models` 与 `days[].models`），模型页签的柱状图与排行读它们；账本按「提供方:模型」记账，同一模型经不同提供方的用量合成一行。账本不记小时，读账本时其余数字先出，高峰时段随后由本机会话日志按天算出补上。汇总不可用（旧宿主半边或汇总失败）时，面板改用宿主会话列表自带的投影值出数。
- **面板先画骨架再填数**：数字到达前先画好外框、占位数字、空热力格与模型行的占位条，到达后只替换文字、格子颜色与条长，整个版面不跳动；取不到数据的格子画破折号，不画零。
- **输入卡片上的像素螃蟹**：工作台版面的新会话页上（经典版面没有），输入卡片上沿靠右站着 Claude Code 的像素螃蟹。点它一下、指针从它身上移开时、以及页面开着时每隔 25–45 秒，它照 Claude Code 的样子敲一次代码：半转身眨眼，掏出笔记本电脑放到卡片边上，侧身敲一会儿键盘，收起电脑转回正面，约三秒；系统要求减少动态效果时（例如 Windows 关掉了「在 Windows 中显示动画」），只有点它才播放。只有螃蟹本身接收指针，电脑挥动的空白处不挡点击。
- **热力图的日期提示**：指针停在热力图的某一天上，立刻浮出 Claude Code 样式的深色提示，写着日期和当天的消息数（如「9月9日 — 15,955」）；靠两端的几列提示贴着格子外沿，不会伸出面板。会话列表兜底来源没有按天的消息数，此时提示写当天的 Token。概览的数字格同时改用 Claude Code 的叫法：消息数、Token 总量、最常用模型（模型名不加粗）。
- **经典首页的问候更多了**：经典版面的大标题不再每个时段只有一句，早上、午间、下午、晚上、深夜各有一组问候，另有几句不分时段；每次回到新会话页随机换一句，同一次停留里不会跳动。
- **接入 HDSL 启动器的账号信息**：由 HDSL 启动的实例，昵称与头像会优先取启动器里的账号。昵称按「自定义昵称 → 官方账号昵称 → HDSL 昵称 → 上次探测到的系统用户名 → 系统用户名 → `User`」回退，头像按「官方账号头像 → HDSL 头像 → Claude 徽标」回退。宿主半边新增两条只读私有路由，与用户名路由同级过宿主请求栅栏：`GET /dsh-claude-style/hdsl` 回账号元数据（不含头像文件的绝对路径），`GET /dsh-claude-style/hdsl-skin.png` 回头像图片。契约版本读不到或不认识时整组忽略；头像文件被删除时回落到徽标。

<h3 id="en-0.7.0">New Features</h3>

- **Two home layouts, switchable in the settings page**: a new Home layout preference. **Classic** keeps the centered headline over the composer card; **Studio** pins the greeting to the top left as one fixed line ("What's up next, <user>?", in the sans UI face on the brand mark's line), docks the composer in the conversation's single-line form at the window's bottom edge with a row of hairline context chips above it, and sets the greeting and a 480px usage panel against the composer's left edge — an Overview tab with six stat cells (sessions, messages, total tokens, active days, peak hour, favorite model) and a twenty-six-week per-day heat grid of square cells in equal columns, and a Models tab stacking each day's per-model tokens into one bar over a ranked model list (swatch, model name, input and output, share; past six rows it folds behind a "show more" row, and the open list ends in a "show less" row), both reading the same rank-ordered blue ramp. The All / 30d / 7d range pills filter the tiles (the peak hour included), the multiplier line and the model list while the grid and the chart keep their own windows, and once the picked range's total passes one book a multiplier line appears under the grid — eleven books from Animal Farm to In Search of Lost Time, a fresh one drawn each time the new-conversation page comes back, stepping down to the longest book the range has passed when it has not reached the drawn one. The panel appears on the new-conversation page only and steps away once a session is open.
- **The usage numbers are folded locally**: a new read-only route, `GET /dsh-claude-style/usage`, behind the same same-origin fence as the username route. With `dsh-cost-meter` installed it reads that plugin's ledger cache (read-only); otherwise the host half folds the local session logs itself and caches the result incrementally per log file — about two seconds on the first cold pass, about 3 ms per start afterwards. Both sources answer each model's four token buckets and each day's per-model tokens (`models` and `days[].models`), which the Models tab's chart and ranking read; the ledger books usage per provider and model, and one model served by several providers is one row. The ledger keeps no hours, so with it the other figures land first and the peak hour follows a moment later, folded per day from the local session logs. When the fold cannot answer (an older host half or a failed pass), the panel falls back to the projection block each host session row carries.
- **The panel draws its skeleton before its numbers**: the frame, number placeholders, an empty heat grid and stand-in share bars come first; arriving values replace only the text, the cell colours and the bar lengths, so nothing shifts. A figure no source can answer is a dash, never a zero.
- **A pixel crab on the composer card**: on the new-conversation page of the Studio layout (the Classic layout has none), Claude Code's pixel crab stands on the composer card's top edge near its right end. When it is clicked, when the pointer leaves it, and every 25–45 seconds while the page is in view, it plays Claude Code's laptop routine — a half turn and a wink, a laptop brought out onto the card's edge, a spell of typing side-on, and the laptop put away as it turns back, about three seconds; with reduced motion requested (Windows' "Show animations in Windows" turned off, for one) only a click plays it. Only the crab itself takes the pointer, so the room the laptop swings through never blocks a click.
- **Day tips on the heat grid**: resting the pointer on a day of the heat grid shows Claude Code's dark tip at once, with the date and that day's messages ("Sep 9 — 15,955"); over the columns at either end the tip lines up with the cell's outer edge and stays inside the panel. The session list's fallback has no per-day message count, and its tips name the day's tokens instead. The Overview tiles take Claude Code's names as well: Messages, Total tokens and Favorite model (the model name at regular weight).
- **More greetings on the classic home page**: the classic headline no longer has one line per time of day — morning, midday, afternoon, evening and night each have a pool, plus a few lines for any hour; a fresh line is drawn each time the new-conversation page comes back and holds still while you stay.
- **HDSL launcher accounts are picked up**: an instance started by HDSL prefers the launcher's account for both the nickname and the picture. The nickname falls back through the custom nickname → the signed-in account's name → the HDSL account name → the last probed system user → the system user → `User`; the picture through the account's avatar → the HDSL avatar → the Claude mark. The host half gains two read-only private routes behind the same request fence as the username route: `GET /dsh-claude-style/hdsl` answers the account metadata (never the avatar file's absolute path) and `GET /dsh-claude-style/hdsl-skin.png` answers the image. A contract version that is missing or unknown voids the whole group, and a deleted avatar file falls back to the mark.

<h3 id="cn-0.7.0">体验优化</h3>

- **同时只开一张弹层卡片**：悬停或点击打开模型选择器、推理强度、权限、账户抽屉、会话统计卡片、工作台新会话页的工作区菜单时，之前打开的那张卡片立即收起，两张卡不再叠在同一角；宿主自带的工作区菜单与账户菜单一并参与。
- **悬停停留由 50ms 延长到 100ms**：指针以平常速度扫过触发器不再展开卡片——工作台版面把上下文行贴在输入卡片正上方，此前指针移向输入框时几乎每次都会展开工作区菜单；停在触发器上仍然立即展开。模型选择器的收起宽限与会话统计卡片的展开停留保持各自的例外值。

<h3 id="en-0.7.0">Improvements</h3>

- **One popover card at a time**: opening the model picker, the reasoning-effort card, the permission menu, the account drawer, the session-stats card or the studio new-conversation page's workspace menu now folds whatever card was up before it, so two panels no longer stack over one corner; the host's own workspace and account menus join on the same terms.
- **The hover dwell goes from 50 ms to 100 ms**: a pointer crossing a trigger at an ordinary pace no longer unfolds a card — the studio layout sets the context row directly above the composer card, where a pointer on its way to the input used to unfold the workspace menu almost every time — while a pointer parked on the trigger still opens at once. The model picker's close grace and the stats card's open dwell keep their own values.

<h3 id="cn-0.7.0">问题修复</h3>

- 修复 **浅色模式下聊天记录顶部「加载更早」按钮几乎看不见**：浅色下的实色悬停底改为浅灰，按钮文字对比度从 2.6:1 回到 4.7:1，深色不变；同族令牌下的工作区重命名输入框在浅色里也不再是深色方块。
- 修复 **设置页「账号与余额」的「充值」按钮文字与底色几乎同色**：统一的链接色不再覆盖这类实心按钮链接，按钮恢复自身配色（浅色 3.1:1，深色 6.1:1），旁边的「查询用量」回到描边按钮样式。
- 修复 **实心主按钮悬停时底色跳出陶土色系**：悬停色与底色现在同族，悬停不再跳到冷灰或近白。
- 修复 **工作区选择器弹层打开时先跳到触发器下方再弹回**：弹层从打开的第一帧起就停在触发器旁边的正确位置，不再有可见的跳动。
- 修复 **切换到 Yolo 或 Auto 后权限停留在原档位**：皮肤此前通过模拟点击被隐藏的宿主访问按钮、再按文字寻找弹层里的档位行来完成这两个档位的切换，输入栏被锁定或按钮处于禁用状态时这条路径点不动，点确认后预设也不变化。现在任何档位都直接请求宿主的 `/permission` 命令完成切换（与官方弹窗确认后走的是同一条写入路径），点击后权限立即生效，皮肤控件与宿主按钮同步显示新档位；切换请求失败时控件按各功能失败隔离规则交还宿主按钮，不再无声无息。
- 修复 **权限弹层随重建在页面里残留**：宿主重渲染换掉控件容器后，下一次重建会往页面里追加一颗新弹层，旧弹层失去引用后永远留在文档里（长时间使用的页面上数到过 38 颗）。现在每次安装弹层先清扫文档里已有的弹层，功能卸载时一并扫除，页面上始终只有当前这一颗。
- 修复 **已归档行的时间被操作按钮顶离右缘**：取消归档与删除按钮此前以透明常驻占位，时间只能停在按钮预留区的左边，悬停时三样挤在一行。现在与官方会话行同一机制：静止时按钮不占位，时间与行右缘对齐；悬停（或键盘聚焦行）时时间让位隐藏，两颗按钮出现在原位置。按钮隐身期间也不再响应落在那片区域上的点击。
- 修复 **页面加载后第一次修改设置提示「设置存储不可用，改动不会被保存」**：设置表单现在会等宿主的命名空间登记完成后再绑定，登记晚到时也会在到达后立即绑定并读回取值，第一次修改即可保存。
- 修复 **新会话页把鼠标从预设模式快速移到工作文件夹时两个弹层同时打开并闪烁**：一行里的两个选择器（工作文件夹与预设模式）现在只会有一个打开，移到另一个触发器时先收起前一个，两个弹窗不再同时出现、也不再闪动；悬停离开收起的是悬停打开的那一个。

<h3 id="en-0.7.0">Bug Fixes</h3>

- Fix **the "load earlier" button at the top of the transcript being nearly invisible in light mode**: the light-mode solid hover fill is now a light gray, returning the button's contrast from 2.6:1 to 4.7:1 (dark unchanged); the workspace rename field on the same token family is no longer a dark block in light mode either.
- Fix **the "Top up" button in Settings → Account & balance showing its label in the same colour as its fill**: the shared link ink no longer overrides filled-button anchors, so the button keeps its own ink (3.1:1 light, 6.1:1 dark) and the neighbouring "View usage" returns to the outlined treatment.
- Fix **a filled primary button's hover fill jumping out of the accent family**: the hover now stays in the fill's family instead of jumping to a cold gray or near-white.
- Fix **the workspace picker card jumping below its trigger and back as it opens**: the card holds its correct position beside the trigger from the first frame it appears, with no visible jump.
- Fix **the preset staying on its old tier after switching to Yolo or Auto**: the skin drove these two tiers by synthetically clicking the hidden host access button and then locating the tier row by label in the opened menu; with the input bar locked or the trigger disabled that path pressed nothing, and the preset never changed after confirming. Every tier is now requested directly through the host's `/permission` command — the same write path the official dialog's confirmation ends in — so the switch takes effect immediately and the skin control and the host button agree on the new tier; a failed request retires the control through the per-feature failure isolation rule instead of passing silently.
- Fix **the permission popover stranding in the document across rebuilds**: when a host re-render replaced the control's container, the next rebuild appended a fresh popover while the previous one lost its only reference and stayed in the document forever (38 were counted on a long-lived page). Each install now sweeps every popover already in the document before appending its own, teardown sweeps the rest, and exactly one popover remains.
- Fix **the archived rows' time being pushed off the row's right edge by the action buttons**: the unarchive and delete buttons reserved their place while transparent, so the time stopped where their reserved space began and hover crowded all three onto one line. The rows now follow the host's own session rows' mechanism: at rest the buttons occupy nothing and the time right-aligns with the row; on hover (or while the row holds keyboard focus) the time steps aside and the two buttons take its place. The invisible buttons also stop answering clicks aimed at that area.
- Fix **the first settings change after a page load reporting "The settings store is unavailable, so changes will not be saved."**: the settings form now waits for the host's namespace registration before binding, binds as soon as a late registration arrives and reads the value back, so the first change saves.
- Fix **both popovers on the new-conversation page opening at once, and flickering, when the pointer moved quickly from the preset mode to the workspace folder**: only one of the row's two pickers (the workspace folder and the preset mode) is open at a time — moving to the other trigger folds the first, so the two cards no longer appear together or flicker, and a hover-leave folds the picker the hover opened.

**Full Changelog**: [v0.6.4...v0.7.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.4...v0.7.0)

## [0.6.4] - 2026-09-24

[中文](#cn-0.6.4) | [English](#en-0.6.4)

<h3 id="cn-0.6.4">问题修复</h3>

- 修复 **刚启动、账号抽屉还没展开过时，页脚里的插件条目一直留在账户行旁边**：隐藏页脚条目与把条目镜像进抽屉原本挤在同一次调用里，而抽屉没打开时这次调用会提前返回，于是宿主重新渲染出来的插件图标继续画在侧栏底部、紧挨账户行，直到抽屉被展开过一次才被标记隐藏——这正是该现象只在首次启动后出现的原因。现在隐藏条目每次同步都跑，只有镜像需要抽屉容器。
- 修复 **底栏统计弹层偶尔只剩一段（只显示会话统计，或只显示 Token 用量）**：皮肤按标签文字区分宿主的两颗药丸，读取窗口又只有 300 毫秒，而宿主的两个面板按它自己的提交节奏挂载，晚到一步就丢掉那一段。现在按面板自身的标记判定类型，等待拉长到 800 毫秒、读失败时重试一次；药丸按钮每一步都从 DOM 重新取，窗口内还会再按一次——宿主重渲染换掉节点时，按旧节点等于没按；首次只读到一段时安排一次补读把缺的那段补上，卡片只增不减，已经打开的卡片不会被一次失败的读取改小。会话本身没有计时数据时宿主也不渲染计时面板，此时只有 Token 用量是正确的。
- 修复 **0.1.7-rc.2 里工作区会话行的状态圈消失**：新宿主把会话行的前导座位交给槽位出口渲染，座位里因此始终有一个 `div[data-slot]` 包裹层（`display: contents`），座位不再是空元素，画在 `:empty` 上的圆圈就不再出现。圆圈现在也挂在空的槽位出口上；座位里带运行状态点时仍由状态点自己绘制。
- 修复 **账户抽屉收起时它的行与图标停在账户行上方**：自建抽屉的内容要在收起状态下预先对账（镜像行只在收起时同步、展开时冻结），所以收起时面板连同齿轮图标一直挂在账户行正上方，此前只用透明度隐藏，内容仍留在绘制与命中树里。收起状态改用 `visibility` 隐藏（保留布局，关闭的淡出照常），展开时恢复可见。

<h3 id="en-0.6.4">Bug Fixes</h3>

- Fix **the footer's plugin entries staying beside the account row after a fresh start until the drawer has been opened once**: hiding the entries and mirroring them into the drawer shared one call that returned early while no drawer was up, so the plugin icons the host re-rendered stayed painted at the sidebar's bottom next to the account row until the drawer had been opened once — which is why the symptom only appeared after a fresh start. The hiding now runs on every sync; only the mirroring needs the drawer's container.
- Fix **the stats card occasionally showing only one section (session statistics alone, or Token usage alone)**: the skin told the host's two pills apart by their label text and read with a 300 ms window, while the host mounts its panels on its own commit — one late panel lost that section. The read now identifies each panel by its own marker, waits up to 800 ms and retries once; it re-resolves the pill from the DOM at every step and presses the live node again while the window lasts, because a press on a node the host has since re-rendered goes nowhere; and a card that did come up short schedules one late re-read that fills the missing section in, so the card only ever grows and a failed read never shrinks a card already on screen. A session with no timing data renders no timing panel in the host either, where Token usage alone is correct.
- Fix **the workspace session rows' status circle disappearing on 0.1.7-rc.2**: the newer host renders the row's leading seat through a slot outlet, so the seat always carries a `div[data-slot]` anchor (`display: contents`) and is never empty — the circle drawn on `:empty` stopped appearing. The circle now hangs on the empty outlet anchor as well; a seat carrying the running status dot still keeps the dot's own paint.
- Fix **the account drawer's rows and icons parked above the account row while it is closed**: the self-built drawer's content is reconciled while closed by design (the mirror sync only runs then and freezes while open), so the panel and its gear icon sit right above the account row; opacity alone left that content in the paint and hit-test tree. The closed state now hides it with `visibility` (layout kept, closing fade intact) and the open state restores it.

**Full Changelog**: [v0.6.1...v0.6.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.1...v0.6.4)

## [0.6.1] - 2026-09-24

[中文](#cn-0.6.1) | [English](#en-0.6.1)

<h3 id="cn-0.6.1">新增功能</h3>

- **适配 DSH 0.1.7 内置自动审查（Auto review）**：分段控件与权限菜单增加审查模式，分段控件显示为 `Auto`、弹层与当前状态显示为 `Auto review`；原 `Auto`（完全权限）更名为 `Yolo`；选择审查模式或完全权限时均正常调起宿主风险确认对话框。审查档位跟随宿主的权限目录：只有宿主的 `permissionPresets` 目录携带 `auto`（内置自动审查已启用）时才显示，目录变化时随之增减；目录读不到时整个权限控件交还宿主的访问模式按钮。
- **已归档会话的删除按钮恢复可用**：宿主没有给浏览器半边提供删除会话的接口（工作区控制器只有归档与取消归档，agent 协议里的会话删除由宿主委托给持有存储的 ACP agent），插件此前调用第三方插件的路由，该插件不在环境里时点下去没有任何反应。现在由插件的宿主半边新增私有路由 `POST /dsh-claude-style/session-delete` 删除本机会话目录：只接受 POST 与同源请求，id 必须匹配宿主自身的会话 id 形状，正在打开的会话拒绝删除，目录解析后必须留在会话根目录内。

<h3 id="en-0.6.1">New Features</h3>

- **Support DSH 0.1.7 built-in Auto review**: add review mode to the permission segmented control and popover, displayed as `Auto` in segments and `Auto review` in the menu and current status; rename the former `Auto` (Full access) segment to `Yolo`; selecting either review mode or Full access drives the host's risk confirmation dialog. The review tier follows the host's permission catalog: it appears only while the host's `permissionPresets` catalog carries `auto` (the built-in auto review is enabled), and tracks catalog changes; when the catalog cannot be read, the whole permission control hands the host's access-mode button back.
- **The archived rows' delete button works again**: the host gives the browser half no way to delete a session (the workspace controller only archives and unarchives, and the agent protocol's session delete is the host delegating to an ACP agent that owns the storage), so the skin used to call a third-party plugin's route and did nothing when that plugin was absent. The plugin's host half now serves a private route, `POST /dsh-claude-style/session-delete`, which removes the local session directory: POST and same-origin requests only, the id must match the host's own session id shape, an open session is refused, and the resolved directory must stay inside the sessions root.

**Full Changelog**: [v0.6.0...v0.6.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.0...v0.6.1)

## [0.6.0] - 2026-09-24

[中文](#cn-0.6.0) | [English](#en-0.6.0)

<h3 id="cn-0.6.0">问题修复</h3>

- 修复 **会话切换或卸载时因移动 React 插槽节点导致浏览器卡死与 DOM 异常**：停止将 `conversation.composer.dock` 容器内的会话统计药丸与上下文计量器通过 DOM 操作移入工具栏行，改为纯样式定位覆盖，保留节点在 React 虚拟树中的原生父子归属，消除 `Node.removeChild: The node to be removed is not a child of this node` 抛错与死循环卡死。
- 修复 **权限控件或会话统计出错时整个输入区样式被一并关闭**：出错只关掉权限控件本身，交还宿主的访问模式按钮、统计弹窗与统计行，输入区其余样式照常。

### 移除

- **移除 0.1.5 及更早宿主的适配**：偏好读写只走宿主官方的 `configForms` 表单，删掉插件自建的 `/prefs` 路由；最低宿主版本提高到 0.1.7。

### 其他变更

- **内部结构整理，行为无变化**：输入区的布局工作收进独立的 composer 特性，推理强度滑块的点阵与账号行各自拆成独立碎片，重复的宿主查询与残留节点清理合并成共用函数；调度器不再点名具体特性。
- **回归脚本共用一套无头浏览器启动**：smoke / probe / probe-timing / shoot 的浏览器配置目录改放 `.debug/`，调试端口由浏览器自选，`--cdp-port` 参数取消；probe 打开已有会话，跳过「新会话」。

<h3 id="en-0.6.0">Bug Fixes</h3>

- Fix **browser freezes and DOM exceptions during session switching or unmounting caused by moving React slot nodes**: stop moving the session stats pills and context meter out of the `conversation.composer.dock` container via DOM manipulation into the toolbar row; position them via CSS overlay instead, preserving native parent-child relationships in the React virtual tree and eliminating `Node.removeChild: The node to be removed is not a child of this node` crashes and freeze loops.
- Fix **the whole composer restyle switching off when the permission control or the session stats fail**: a failure now switches off only the permission control, which hands back the host's access-mode button, statistics dialogs and statistics row, while the rest of the composer keeps its styling.

### Removals

- **Remove the adaptation for hosts 0.1.5 and earlier**: preference reads and writes go only through the host's `configForms` form, dropping the plugin's own `/prefs` route; the minimum host version rises to 0.1.7.

### Chores

- **Internal restructuring, no behavior change**: the composer's layout work moves into a composer feature of its own, the reasoning-effort slider's dot matrix and the account rows move into fragments of their own, and repeated host lookups and leftover-node sweeps merge into shared helpers; the scheduler no longer names individual features.
- **One headless-browser launcher for the regression scripts**: smoke / probe / probe-timing / shoot keep the browser profile under `.debug/` and let the browser pick its own debugging port (the `--cdp-port` option is gone); probe opens an existing session and skips "New session".

**Full Changelog**: [v0.5.3...v0.6.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.3...v0.6.0)

## [0.5.3] - 2026-09-23

[中文](#cn-0.5.3) | [English](#en-0.5.3)

<h3 id="cn-0.5.3">新增功能</h3>

- **账号区改为在宿主账号弹层里追加插件自己的行**：宿主自带的账号行就是入口（不再隐藏、不再由插件代为接管），弹层里依次是账号头部、其它插件的页脚条目与宿主自己的设置 / 意见反馈 / 退出登录；宿主没有账号区的环境（Web、0.1.5）先由插件自建账号区，再追加同样的行。宿主行的文案、顺序与点击行为保持原样。

### 体验优化

- **账号弹层外观统一**：卡片改用纯白背景（暗色保持原样）、宽度与侧栏一致，并去掉底部的横向滚动条；宿主账号菜单套用插件的行、图标、分隔线与悬停底色。
- **桌面 Windows 标题栏模式下对话 / 轨迹控件居中常显**：控件移到标题栏那一行（与新会话按钮同一行）并保持可见，点击不再被标题栏的拖拽区域吞掉。

### 问题修复

- 修复 **关闭插件或关掉「折叠侧栏设置区」后，桌面端自带的账号区没有还原**：交出页脚时摘掉插件打在宿主账号行上的标记，宿主行恢复自带的外观与点击。
- 修复 **Ctrl+, 无法打开设置**：该组合键重新由插件接管（宿主文案一直宣传它，宿主自身没有绑定）。
- 修复 **收起侧栏后新会话按钮在顶栏出现横贯的悬停底色**：收起状态交由宿主自己的图标控件承载，插件不再绘制悬停底色。

### 移除

- **移除设置行的 Ctrl+, 提示文案**：设置行保留，点击仍可打开设置。

<h3 id="en-0.5.3">New Features</h3>

- **The account area now appends the plugin's own rows into the host's account popover**: the host's own account row is the entry (it is no longer hidden or taken over), and the popover lists the account header, the other plugins' footer entries and the host's own Settings / Feedback / Sign out; on a host without an account area (Web, 0.1.5) the plugin builds one first and appends the same rows. The host's own rows keep their copy, order and click behavior.

### Improvements

- **One look for the account popover**: the card now uses a pure white background (dark keeps its own), spans the sidebar's width, and no longer draws a horizontal scrollbar at its foot; the host's account menu takes the plugin's row, icon, separator and hover treatment.
- **Centred, always-visible Conversation / Trajectory control in the desktop Windows titlebar**: the control moves onto the titlebar row (the same row as the New session button), stays visible, and its clicks are no longer swallowed by the titlebar's drag region.

### Bug Fixes

- Fix **the desktop's own account area not coming back after the plugin is disabled or "Collapse the sidebar settings area" is turned off**: handing the footer back drops the plugin's marker from the host's account row, which returns to its shipped look and click behavior.
- Fix **Ctrl+, no longer opening settings**: the key combination is handled by the plugin again (the host's copy advertises it, while the host itself binds nothing).
- Fix **a full-width hover plate on the New session button in the titlebar once the sidebar is collapsed**: the collapsed state is carried by the host's own icon control, and the plugin no longer paints a hover plate there.

### Removals

- **Remove the settings row's Ctrl+, hint text**: the row stays and a click still opens settings.

**Full Changelog**: [v0.5.2...v0.5.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.2...v0.5.3)

## [0.5.2] - 2026-09-23

[中文](#cn-0.5.2) | [English](#en-0.5.2)

<h3 id="cn-0.5.2">新增功能</h3>

- **冒烟测试新增 `desktop` 桌面端页脚用例**：覆盖 0.1.7 桌面端页脚接管、抽屉镜像与账号资料首帧读取。

### 问题修复

- 修复 **切到插件页后档位触发器浮在页面上**：座位消失时隐藏触发器并归还预留边距。
- 修复 **窗口宽度变化时档位触发器慢半拍**：随 resize 与卡片尺寸变化和 CSS 同帧重定位。
- 修复 **按住滑块拖出卡片边界时卡片提前收起**：悬停关闭改看物理按住，松开按键才收起。
- 修复 **模型名、档位与后续控件间距忽大忽小**：统一到该行自身的 12px 节奏。
- 修复 **桌面端 Ctrl+, 弹出账号菜单而非设置**：快捷键与抽屉设置行共用入口，改为驱动宿主菜单。
- 修复 **账号抽屉的登出图标跑到左上角**：图标位自己作定位参照，按宿主尺寸绘制。
- 修复 **登录时账号资料请求被中止**：等服务就绪并订阅账号状态流，只在首帧、登录与登出读取。
- 修复 **桌面端从抽屉打不开设置**：设置行只认宿主设置按钮，桌面端让位给镜像的宿主设置行。
- 修复 **宿主账号行叠在皮肤账号行上**：选择器穿过插槽锚点整行隐藏。

### 其他变更

- **内部结构拆分，行为无变化**：超限碎片按 D13 约定拆开，调度器改由 `entry.js` 的 FEATURES 表统一安装与 pass 序。

<h3 id="en-0.5.2">New Features</h3>

- **New `desktop` footer smoke-test case**: covers 0.1.7 desktop footer takeover, drawer mirroring and the first account-profile read.

### Bug Fixes

- Fix **the effort trigger lingering on the plugins page**: hide it with its seat and give the reserved margin back.
- Fix **the effort trigger lagging on window resize**: reposition it in the same frame as CSS on resize and card-size changes.
- Fix **the card closing while the slider is still held**: hover-close now tracks the physical press and closes only on release.
- Fix **uneven spacing between model, effort and later controls**: unify them on the row's own 12px rhythm.
- Fix **Ctrl+, opening the account menu instead of settings on desktop**: the shortcut and drawer row now share one entry that drives the host menu.
- Fix **the sign-out icon landing in the drawer's top-left corner**: the icon slot is now the positioning context and draws at the host's size.
- Fix **the account profile request being aborted at sign-in**: wait for the service and subscribe to the account state stream, reading only on first frame, sign-in and sign-out.
- Fix **settings not opening from the drawer on desktop**: the settings row accepts only the host settings button and yields to the mirrored host row on desktop.
- Fix **the host account row stacking over the skin's row**: the selector now reaches through the slot anchor and hides the whole row.

### Chores

- **Internal restructuring, no behavior change**: oversized fragments were split per D13, and the scheduler now installs and orders passes from a FEATURES table in `entry.js`.

**Full Changelog**: [v0.5.1...v0.5.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.1...v0.5.2)

## [0.5.1] - 2026-09-23

[中文](#cn-0.5.1) | [English](#en-0.5.1)

<h3 id="cn-0.5.1">新增功能</h3>

- **冒烟测试 `npm run smoke`**：零依赖检查宿主路由栅栏与浏览器半边的启动、空闲、teardown 不变量。
- **账号行显示真实头像与昵称**：桌面端登录后取官方资料，正圆头像与昵称以 60 秒轮询保持新鲜。
- **账号抽屉接管宿主账号菜单**：动态镜像宿主菜单条目并直连官方行为。

### 体验优化

- **档位名换档改成交换动画**：旧名向上模糊淡出、新名自下模糊淡入，拖动中也逐档滚动。
- **档位两端文案随语境本地化**：中文显示「更快 / 更强」，英文仍是 `Faster` / `Smarter`。
- **最高档的点阵动画改为纯哈希粒子**：无排序方向，羽流形状由逐块静态透明度承担。
- **座位里模型与档位两枚触发器靠拢**：名字与档位之间只剩 4px。
- **推理等级拆成独立触发器与弹层**：新碎片 `effort-picker.js` 只向 `ui.model` 要座位、档位与提交。
- **推条手感三处打磨**：圆角收小、按住放大 10%、档位点加阻尼。
- **推理推条换脸成 Claude Desktop 同款**：填充段 + 档位刻点 + 胶囊旋钮，最高档触发点阵动画。
- **输入框底部阴影改由座位自绘横条与渐变**：座位高度即横条高度，不再逐态重写卡片阴影。
- **模型介绍文案整体校订一轮**：修中英语义冲突与生硬措辞，统一单位与术语。

### 问题修复

- 修复 **0.1.7 设置页选项能显示但存不进去**：命名空间改从 `configForms` 已服务的名单挑选，失败回落自建路由。
- 修复 **斜杠命令 / @ 提及菜单打开时回车直接发送**：删除皮肤对回车的拦截，交给宿主处理。
- 修复 **关掉插件或热重载后皮肤又画了回来**：teardown 取消排队中的那一帧，之后的 `schedule()` 一律不生效。
- 修复 **一个特性出错导致整张皮半挂**：teardown 最先注册，每个特性单独安装与同步、失败即退役。
- 修复 **调度器空闲时仍每帧跑 pass**：账号行按需重建、排序只挪错位项，空闲 pass 降为 0。
- 修复 **非桌面端把「在应用中打开」菜单收进抽屉**：改按账号标签匹配触发器。
- 修复 **「设置」行变成账号名并弹出账号菜单**：只接受带 `aria-haspopup="dialog"` 的按钮。
- 修复 **图标型登出按钮没被排除**：同时读 `aria-label` / `title` / 类名，并跳过宿主账号区。
- 修复 **设置存储误报不可用**：读路径不再做可用性判定，仅写入失败才提示。
- 修复 **松开推条后旋钮弹回原档位再跳回**：等待回声期间不跟随滞后快照，超时或换梯后恢复。
- 修复 **松手瞬间档位名连跳两下**：footer 只换推条以外的节点，且先提交再只画一次。
- 修复 **拖动时滑块冲出终点线并与填充脱开**：位移改用独立 `translate` 属性，填充右端改为直角。
- 修复 **点击两档之间可能让档位选择器崩溃**：目录未 settle 期间不摘触发器也不关卡片。
- 修复 **点击滑槽其他位置时滑块瞬移**：把按下与拖动拆成两个状态，按下时仍有过渡动画。

### 安全

- **用户名、昵称、头像与插件条目不再拼进 HTML**：一律以文本写入，头像改用真正的 `<img>`。
- **设置与用户名路由不再对任何人敞开**：先过宿主请求栅栏，并限制内容类型、体积与数组长度。

<h3 id="en-0.5.1">New Features</h3>

- **Smoke test `npm run smoke`**: a dependency-free check of the host route fence and the browser half's boot, idle and teardown invariants.
- **The account row shows the real avatar and nickname**: on desktop sign-in it reads the official profile and keeps the round avatar and nickname fresh by polling every 60s.
- **The account drawer takes over the host account menu**: it mirrors the host menu's entries and drives the official actions directly.

### Improvements

- **Effort-name changes now swap**: the old name blurs upward while the new one blurs in from below, scrolling step by step while dragging.
- **Effort end labels are localized**: Chinese now shows localized labels, English stays `Faster` / `Smarter`.
- **The apex dot animation is now pure hashed particles**: no ordering or direction, with the plume shape carried by per-block static opacity.
- **The model and effort triggers in the seat move closer**: only 4px is left between the model name and the effort name.
- **Reasoning effort splits into its own trigger and popover**: the new `effort-picker.js` asks `ui.model` only for the seat, effort and commit.
- **Three slider feel tweaks**: smaller corners, a 10% scale-up while held, and damping around each step.
- **The effort slider is restyled to match Claude Desktop**: fill, step ticks and a capsule knob, with the apex step triggering the dot animation.
- **The composer's bottom shadow now comes from the seat's own bar and gradient**: the seat height is the bar height, no per-state card shadows.
- **The model descriptions got a full copy-editing pass**: fixing CN/EN conflicts and awkward wording, unifying units and terms.

### Bug Fixes

- Fix **settings showing but not saving on 0.1.7**: the namespace is now picked from the namespaces `configForms` serves, falling back to the plugin route.
- Fix **Enter sending half-typed text while the slash or @ menu is open**: the skin's Enter interception is removed and the host handles it.
- Fix **the skin repainting itself after disable or hot reload**: teardown cancels the queued frame and later `schedule()` calls no longer take effect.
- Fix **one failing feature leaving the whole skin half-mounted**: teardown registers first, and each feature installs and syncs alone, retiring on failure.
- Fix **the scheduler running a pass every frame while idle**: the account row rebuilds only on change and sorting moves only misplaced entries, so idle passes drop to 0.
- Fix **the "Open in app" menu being pulled into the drawer on non-desktop**: triggers are now matched by the account label.
- Fix **the settings row turning into the account name and opening the account menu**: it now accepts only buttons with `aria-haspopup="dialog"`.
- Fix **icon-only sign-out buttons not being excluded**: it now reads `aria-label` / `title` / class names and skips the host account area.
- Fix **settings storage falsely reporting unavailable**: the read path no longer judges availability, only a failed write warns.
- Fix **the knob snapping back to the old step after release**: it no longer follows the lagging snapshot while waiting for the echo, resuming on echo, ladder change or timeout.
- Fix **the effort name jumping twice on release**: the footer now replaces only non-slider nodes, and commit happens before a single paint.
- Fix **the knob overshooting the track end and detaching from the fill while dragging**: position now uses the standalone `translate` property and the fill's right end is square.
- Fix **clicking between two steps sometimes crashing the effort picker**: while the catalog has not settled it no longer removes the trigger or closes the card.
- Fix **the knob teleporting when clicking elsewhere on the track**: press and drag are split into two states, so a press still animates.

### Security

- **Usernames, nicknames, avatars and plugin entries are no longer spliced into HTML**: all are written as text and the avatar uses a real `<img>`.
- **The settings and username routes are no longer open to anyone**: they pass the host request fence and cap content type, body size and array length.

**Full Changelog**: [v0.5.0...v0.5.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.0...v0.5.1)

## [0.5.0] - 2026-09-22

[中文](#cn-0.5.0) | [English](#en-0.5.0)

<h3 id="cn-0.5.0">新增功能</h3>

- **插件页有了自己的图标**：`package.json` 填陶烬橙星芒的相对路径，构建期复制到 `lib/`。
- **插件卡片有了本地化的标题与描述**：`locale/*.json` 提供 `meta.title` 与描述，`exports` 用通配避免降级。
- **侧栏「工作区」改成进行中 / 已归档分段控件**：驱动宿主筛选并从树里读回选中态，归档行挂删除按钮。

### 体验优化

- **推理等级改成一级弹层底部的推条**：无极滑动、松手对齐最近档位，键盘可用，二级弹层只剩「更多模型」。
- **`model-picker.js` 拆出两块回到停止线内**：推条与文案解析各成新碎片，二级档位状态一并删除。
- **推条的滑槽与旋钮几乎等高**：滑槽从 6px 细线改为 14px 圆角槽，对齐 Claude 真机比例。
- **弹层悬停时间统一**：停留 50ms 打开、离开 100ms 关闭，统计卡片仍 300ms 打开。
- **「更多模型」二级弹层收口**：底对齐、不重复供应商、没得列就整行去掉，不支持思考时不画推条。

### 问题修复

- 修复 **真圆被画成鹅卵石**：给六处真圆与滑槽补上 `corner-shape: round`。
- 修复 **全屏面板下顶栏标签与后台任务数浮在面板之上**：该行 `z-index` 从 100 降到 9。
- 修复 **热重载后模型选择器失去点击效果**：弹层节点重建判据改为「为空或已脱离文档」，并重置渲染签名。
- 修复 **热重链后宿主半边资产路由整代失联**：改为无条件经 `ctx.inject(['webServer'])` 注册路由。
- 修复 **推条拖动掉帧、不跟手**：拖动位移并入每帧一次 rAF，并对同值写入加护栏。
- 修复 **二级弹层悬停打开后不随指针移开收起**：一级弹层委托 `mouseover`，指针离开入口即收起。
- 修复 **切换档位后模型选择器一段时间不可用**：只在解析不出席位且无分组时才显示加载行。
- 修复 **composer 获焦时 `ui.heroMenu.close` 抛错**：调用前补存在性护栏。
- 修复 **0.1.7 上上下文标记被落在第二层**：新增 `mergeContextMeterIntoRow()` 归位到模型触发器右侧。
- 修复 **composer 底行三种控件字型不一**：统一为同一字体、13px、500 字重、20px 行高。
- 修复 **统计句盒子横跨半个行**：改用 `flex: 0 1 auto` 与自动外边距，盒子贴合文字。
- 修复 **0.1.7 上设置静默失效**：宿主半边导出 `Config`，设置按宿主世代分流到官方表单或旧注册制。
- 修复 **统计卡片内容缺块、关不掉、易误触发**：只认真实点击，悬停需停留 300ms，并按世代清扫遗留卡片。
- 修复 **软链安装下 schemastery 解析不到**：改按 harness 自己的解析基准取 schemastery。
- 修复 **0.1.7 上输入框的「＋」失去皮肤样式与位置**：标签列表补子串匹配，恢复 24px 与顺序。
- 修复 **侧栏两行形状不一致**：统一度量、静止透明 / hover 才铺底色，图标盒统一为 20px。
- 修复 **侧栏两行图标 hover 转 90°**：加 `transition: transform .25s`，指针离开自动转回。

### 移除

- **模型行的厂商字体整块移除**：字体资产、子集化脚本、令牌与 `@font-face` 一并删除。

<h3 id="en-0.5.0">New Features</h3>

- **The plugins page gets its own icon**: `package.json` points at the clay starburst's relative path, copied into `lib/` at build time.
- **The plugin card gets localized title and description**: `locale/*.json` supplies `meta.title` and description, exported via a wildcard to avoid a downgrade.
- **The sidebar "Workspaces" title becomes an Active / Archived segmented control**: it drives the host filter and reads selection back from the tree, with a delete button on archived rows.

### Improvements

- **Reasoning effort becomes a slider at the bottom of the first-level popover**: it slides freely and snaps on release, is keyboard-accessible, and the submenu holds only "More models".
- **`model-picker.js` splits into two fragments and returns under the stop line**: the slider and copy lookup become new fragments, and the submenu effort state is removed.
- **The slider track and knob are now nearly the same height**: the track goes from a 6px line to a 14px rounded groove, matching Claude's real proportions.
- **Popover hover timing is unified**: 50ms dwell to open and 100ms to close, while the stats card keeps its 300ms open dwell.
- **The "More models" submenu is tightened up**: bottom-aligned, no repeated providers, hidden when empty, and no slider when the model lacks reasoning.

### Bug Fixes

- Fix **circles rendering as pebbles**: six true circles and the slider track now declare `corner-shape: round`.
- Fix **the header preset label and background-task count floating above a fullscreen panel**: that row's `z-index` drops from 100 to 9.
- Fix **the model picker losing its click effect after hot reload**: popover nodes now rebuild when null or detached, and the render signature is reset.
- Fix **host-side asset routes losing a whole generation after a hot re-chain**: routes now always register through `ctx.inject(['webServer'])`.
- Fix **the effort slider dropping frames and lagging while dragging**: moves are batched into one rAF per frame and same-value writes are guarded.
- Fix **the submenu staying open after the pointer moves away**: the first-level popover delegates `mouseover` and closes it once the pointer leaves the entry.
- Fix **the model picker being unusable for a while after an effort change**: the loading row shows only when no seat and no groups can be resolved.
- Fix **`ui.heroMenu.close` throwing on every composer focus**: an existence guard now precedes the call.
- Fix **the context meter dropping to a second layer on 0.1.7**: a new `mergeContextMeterIntoRow()` returns it to the model trigger's right.
- Fix **the composer's bottom-row controls using different type**: they now share one font at 13px / 500 / 20px line height.
- Fix **the stats sentence box spanning half the row**: `flex: 0 1 auto` with auto margins now shrink-wraps it to the text.
- Fix **settings silently failing on 0.1.7**: the host half exports `Config` and splits settings by host generation between the official form and the old registry.
- Fix **the stats card missing content, refusing to close and misfiring**: it now accepts only trusted clicks, needs a 300ms dwell, and sweeps stale cards per generation.
- Fix **schemastery not resolving under a symlinked install**: it is now resolved from the harness's own resolution base.
- Fix **the composer "+" losing its skin styling and position on 0.1.7**: substring label matches restore its 24px size and order.
- Fix **the sidebar's two rows not matching**: shared metrics, transparent until hover, and a uniform 20px icon box.
- Fix **the sidebar rows' icons rotating 90° on hover**: add `transition: transform .25s` so they turn back on pointer leave.

### Removals

- **The model row's vendor font is removed entirely**: the font asset, subsetting script, token and `@font-face` are all deleted.

**Full Changelog**: [v0.4.0...v0.5.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.4.0...v0.5.0)

## [0.4.0] - 2026-09-21

[中文](#cn-0.4.0) | [English](#en-0.4.0)

<h3 id="cn-0.4.0">新增功能</h3>

- **快捷供应商多选弹层**：设置页新增多选弹层，勾选者的模型直接列进一级弹层，按供应商分组、组名领在分隔线前。
- **当前模型行**：供应商改由自己的分隔线承载，席位不在已列供应商时在列表末尾补一行；二级弹层高度随内容自适应。
- **重做模型选择器开关**：设置页新增开关（默认开），关掉后交回宿主自己的模型菜单，只影响弹层。
- **首页目录与预设弹层**：改用皮肤弹层样式，触发器展开时给卡片打标记并重绘。
- **Popovers 规范**：`docs/STYLE.md` 新增「多选一弹层」的卡片、行、分隔与页脚度量表及类名匹配纪律。
- **hero 弹层位置**：改从触发器旁边弹出、底边对齐并向上生长，视口不够时翻到左侧，滚动缩放时重算。
- **首页弹层纳入自动弹出**：悬停触发器即展开、移开即收起，与对话框重绘门控一致。
- **快捷供应商清单**：官方服务始终不列入，残留的已下线供应商带「已移除」标记，取消勾选即从存储清除。
- **焦点收起弹层**：`focusin` 落进对话卡片时关闭权限、模型、会话统计、账户抽屉、hero 菜单与快捷供应商弹层。

### 体验优化

- **一级弹层滚动区**：只滚动模型列表，分隔线与「推理程度 / 更多模型」钉在卡片底部，高度随内容自适应。
- **自动弹出三档**：关闭 / 仅账号区 / 全部（默认全部），旧布尔值读取时归一。
- **弹层度量统一**：账户抽屉、会话统计与权限弹层对齐规范的行高、圆角、间距、最小宽度与 `z-index`。

### 问题修复

- 修复 **热重载重复渲染**：账户区与模型席位改为 DOM 幂等，更新前清扫上一代同名节点。

### 其他变更

- **清理开发期痕迹**：删除未调用的 `applyBrand`、未用参数与过时注释，行为无变化。

<h3 id="en-0.4.0">New Features</h3>

- **Quick-provider multi-select popover**: pick providers in settings and their models list directly in the first-level popover, grouped with the provider name leading each divider.
- **The current-model row**: the provider now rides its own divider; a seat outside the listed providers gets one appended at the end.
- **Redo model picker toggle**: a new setting (on by default) hands the model seat and both popovers back to the host's own menu.
- **Hero directory and preset popovers**: restyled to the skin's popover language via a marker set when the trigger reports `aria-expanded="true"`.
- **Popover spec**: `docs/STYLE.md` gained card, row, divider and footer metrics plus the class-name matching rules.
- **Hero popover placement**: it now opens beside the trigger, growing upward, flipping left when space is short, and repositions on scroll or zoom.
- **Hero popovers follow auto-popover**: hovering the trigger opens them and leaving closes them, gated like the composer restyle.
- **Quick-provider list**: official services never appear, and a removed provider stays flagged until unchecked and cleared from storage.
- **Focus closes popovers**: a `focusin` inside the chat card dismisses the permission, model, stats, account, hero-menu and quick-provider popovers.

### Improvements

- **First-level popover scroll region**: only the model list scrolls while the divider, reasoning effort and "More models" stay pinned at the card bottom.
- **Auto-popover has three levels**: Off / Account area only / All (default All), with old booleans normalized on read.
- **Popover metrics unified**: the account drawer, session stats and permission popover now share the spec's row height, radius, spacing, min width and `z-index`.

### Bug Fixes

- Fix **Duplicate renders on HMR**: the account area and model seat are now DOM-idempotent, sweeping the previous generation's nodes before updating.

### Chores

- **Dev leftovers removed**: deleted the unused `applyBrand`, an unused parameter and stale comments, with no behavior change.

**Full Changelog**: [v0.3.2...v0.4.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.2...v0.4.0)

## [0.3.2] - 2026-09-21

[中文](#cn-0.3.2) | [English](#en-0.3.2)

<h3 id="cn-0.3.2">新增功能</h3>

- **会话统计跟随自动弹出**：与账户、模型、权限三个弹层对齐，关闭开关后悬停不再弹出。
- **更多模型弹层收紧**：列间距、分组间距与分组标题上边距各收到 4px。
- **锁定标不再回退**：没有规则命中的模型不画标，未用到的品牌一并删除。
- **新增 `longcat` 品牌**：补 `mimo` → `xiaomimimo` 规则，OpenCode 的 MiMo 与 LongCat 现在命中。
- **OpenAI 标不可见**：vendoring 清掉本地资产里带 `fill` 的内联 style，再补 `currentColor`。
- **更多模型排序**：行内边距收到 3px，同供应商模型按 id 升序排列。
- **锁定标多处修正**：Meta 漂移、混元高光与 `hy-mt2` 解析，新增 Gemma / Nano Banana 两个品牌。
- **厂商锁定标合成**：按 Lobe 的合成比例生成 `combine/<厂商>.svg`，图标与字标合为一件图形，自建字标与供应商图标删除。
- **Claude 行锁定标**：改画 Claude 自己的字标，`anthropic` 仍作 `anthropic` 路由兜底。
- **新增家族规则**：`gemma` 与 `nano-?banana` 各补一条官网口径文案，不再掉到档位规则。
- **Fable 与 Mythos 规则**：两条各用官网定位句，不再掉到兜底文案。

### 问题修复

- 修复 **过时模型说法**：修正 DeepSeek 下线版本、Grok 4.5、文心 5.0 与 `kimi-for-coding` 的过时文案。
- 修复 **插件加载即崩**：清掉对已删除 `WORDMARK_SVGS` 的加载期引用，并补一条加载校验脚本。
- 修复 **锁定标占位不显示**：把根的绘制属性重新包一层 `<g>`，并去掉会变提示的 `<title>`。
- 修复 **当前模型行丢供应商**：格式定为 `模型 (供应商)`，描述只在第一级显示，一级那行补上描述。
- 修复 **冷启动后选择器空等**：会话一解析出来就预热模型目录，把等待挪进启动过程。
- 修复 **Grok 行显示 xAI 标识**：`brands.models` 改指 Grok 自己的标记，provider 分组标题仍用 xAI。
- 修复 **当前模型行显示 id 串**：改用与其他行同一套外显名与厂商标记逻辑，无名字才退回 id。

### 其他变更

- **抽出 `model-brand.js`**：把品牌判定整块搬进新碎片，`model-picker.js` 回落到停止线以内。
- **字标扫描改预置数组**：加载时构建词表，并新增 `scripts/probe-timing.cjs` 分项计时。
- **模型简介按官网重写**：19 条精确条目与 54 条家族规则逐条对齐官网，家族文案不写最高级与版本数字。
- **文案改按线映射**：DeepSeek 删除旧版精确条目，改为 Flash / Pro / 其余三条线级文案。
- **去掉档位前缀**：不再用「旗舰档：」等自家定位话术，改用厂商自己的定位句。
- **描述不再重复模型名**：共 50 条去掉「X 系列：」式开头。
- **规格条目补用途**：10 条只剩参数与价格的条目按「面向…的…」形状并回官网用途句。

<h3 id="en-0.3.2">New Features</h3>

- **Session stats follow auto-popover**: it now matches the account, model and permission popovers, so with the setting off hover no longer opens it.
- **More-models popover tightened**: column, group and group-title spacing all reduced to 4px.
- **No lockup fallback**: a model with no matching rule draws no mark, and unused brands are dropped.
- **New `longcat` brand**: plus a `mimo` → `xiaomimimo` rule, so OpenCode's MiMo and LongCat now resolve.
- **Invisible OpenAI mark**: vendoring now strips inline `fill` styles from local assets and adds `currentColor`.
- **More-models ordering**: row padding reduced to 3px and each provider's models sort by id.
- **Multiple lockup fixes**: Meta drift, Hunyuan highlight and `hy-mt2` lookup, plus the Gemma and Nano Banana brands.
- **Combined vendor lockups**: `combine/<vendor>.svg` is generated from Lobe's own ratios, merging icon and wordmark; hand-built wordmarks and provider icons are gone.
- **Claude row lockup**: it now draws Claude's own wordmark, with `anthropic` kept as the fallback for the `anthropic` route.
- **New family rules**: `gemma` and `nano-?banana` each get an official one-liner instead of falling through to tier rules.
- **Fable and Mythos rules**: each uses its official positioning line instead of the generic fallback.

### Bug Fixes

- Fix **Stale model claims corrected**: retired DeepSeek versions move to line mapping, and Grok 4.5, ERNIE 5.0 and `kimi-for-coding` follow official naming.
- Fix **the plugin crashing on load**: the load-time reference to the removed `WORDMARK_SVGS` is gone, with a load-check script added to catch it.
- Fix **lockups reserving space but not showing**: root paint attributes are re-wrapped in a `<g>` and the tooltip-making `<title>` is dropped.
- Fix **the current-model row losing its provider**: the label is now `model (provider)`, descriptions show only at the first level, and that row gained one.
- Fix **the model picker waiting seconds after a cold start**: the catalog is warmed as soon as a session resolves, folding the wait into startup.
- Fix **the Grok row showing xAI's mark**: `brands.models` now points at Grok's own, while provider group headers still use xAI.
- Fix **the current-model row showing an id string**: it now uses the same display-name and brand logic as other rows, falling back to the id only when unnamed.

### Chores

- **`model-brand.js` extracted**: the whole brand-resolution block moved into a new fragment, bringing `model-picker.js` back under the size limit.
- **Wordmark scan prebuilt into an array**: the word list is built at load time, plus a new `scripts/probe-timing.cjs` for per-stage timings.
- **Model blurbs rewritten from vendor sites**: 19 exact entries and 54 family rules now match official pages, with no superlatives or version numbers in family copy.
- **Copy mapped by line, not version**: DeepSeek's old exact entries are gone, replaced by Flash, Pro and a shared line-level blurb.
- **Tier prefixes removed**: our own "flagship tier:" framing is gone in favour of vendor positioning.
- **Blurbs no longer repeat the model name**: 50 entries dropped the "X series:" prefix.
- **Spec-only blurbs gained a purpose**: 10 entries that had only specs now lead with the official use case.

**Full Changelog**: [v0.3.1...v0.3.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.1...v0.3.2)

## [0.3.1] - 2026-09-21

[中文](#cn-0.3.1) | [English](#en-0.3.1)

<h3 id="cn-0.3.1">新增功能</h3>

- **声明最低运行时**：`package.json` 新增最低宿主版本，仓库根新增 `screenshots.json` 供商店取图。
- **Gemini 行改用 Google Sans Flex**：子集随包分发，家族名改为 `Google Sans Flex Picker`，按 `data-brand` 挂载。

### 问题修复

- 修复 **贴图时 hint 发黑跑位**：给 hero 兜底节点补上宿主的定位与墨色，hint 回到输入框首行。
- 修复 **聚焦底纹盖住输入框**：底纹从 rail 移到卡片，与 hero 卡片同一位置。
- 修复 **封号彩蛋语言选不动**：`banLocale` 走浏览器本地兜底，宿主不认该键时先本地保存渲染，待其重启后补写。

### 其他变更

- **亮暗切换先色后样**：翻转瞬间抑制过渡并取消进行中的绘制动画，约 0.3s 后恢复。
- **composer 形态改属性**：由 JS 写 `data-composer-variant`，CSS 直接读，降低流式重算开销。
- **设置页 Tab 图标**：用 CSS 蒙版把通用齿轮换成 Claude 星芒，亮暗各自取色。
- **亮色背景层级调优**：一级 `#FCFCFB`、二级 `#FBFBF9`、三级 `#F9F9F6`，设置面板对齐画布。
- **去 AI 化与精简**：清理临时调试日志与历史规划文档，移除残留编号与重复注释，精简 README。

<h3 id="en-0.3.1">New Features</h3>

- **Minimum runtime declared**: `package.json` gained `engines.dsh: ">=0.1.5-rc.2"`, and a root `screenshots.json` feeds store screenshots.
- **Gemini row set in Google Sans Flex**: a subset ships with the package under the family name `Google Sans Flex Picker`, mounted by `data-brand`.

### Bug Fixes

- Fix **the hint turning dark and escaping the box on image-only drafts**: the hero fallback node gets the host's positioning and ink, returning the hint to the first line.
- Fix **the focus underlay painting over the inline input**: the underlay moves from the rail to the card, matching the hero card.
- Fix **the ban-page language refusing to change**: `banLocale` falls back to `localStorage`, renders locally, and is written back once the host half restarts.

### Chores

- **Theme-flip colour-before-style**: transitions are suppressed during the flip and running paint animations cancelled, restoring after about 0.3s.
- **Composer variant via attribute**: JS writes `data-composer-variant` for CSS to read, cutting restyle cost during streaming.
- **Settings tab icon**: a CSS mask swaps the generic gear for Claude's starburst, coloured per theme.
- **Light-theme layer tones tuned**: layers are `#FCFCFB`, `#FBFBF9` and `#F9F9F6`, with the settings panel matching the canvas.
- **AI-tells and cruft removed**: temporary debug logs and old planning docs are gone, along with stale numbering and duplicated comments.

**Full Changelog**: [v0.3.0...v0.3.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.0...v0.3.1)

## [0.3.0] - 2026-09-20

[中文](#cn-0.3.0) | [English](#en-0.3.0)

<h3 id="cn-0.3.0">新增功能</h3>

- **Claude 封号页彩蛋**：账户弹层顶部用户名横条可点开完整复刻页，全为明确退出动作，品牌偏好同样生效。
- **封号彩蛋语言设置**：可选中/英（默认英文），改动立刻重建页面并切换时间戳制式。

### 问题修复

- 修复 **回退引用块材质**：引用块恢复中性灰文字、灰底灰条，块内链接与代码各自保持材质。
- 修复 **文件引用颜色不一致**：文件引用改用链接色与同款下划线，代码片本身不动。
- 修复 **Markdown 表格左侧空隙**：删掉全局表格覆盖，首末单元格恢复内边距，窄表不再被拉满。

### 其他变更

- **封号页锁改手绘**：按参考图墨迹逐锚点描摹成三条贝塞尔路径，映射到 24 单位格。
- **修掉 `banSvg` 重复属性**：粗细改为形参只发一条属性，覆盖不再静默失效。
- **点击展开弹层不再即关**：改由点击别处或移出整个底栏关闭，悬停展开保持原逻辑。
- **账号横线移出 hover 区**：横线改为账号行的兄弟节点，hover 底板只覆盖账号名那行。
- **封号页排版**：内容列改为水平居中，页头整体下移 30px。
- **行内代码片收紧**：自带 `line-height: 1.2`，行盒收到 18px，上下不再虚胖。

<h3 id="en-0.3.0">New Features</h3>

- **Claude account-hold page easter egg**: the username strip opens a full replica with explicit exits, honouring the brand preference.
- **Ban-page language setting**: Chinese or English (default English), rebuilding the open page and timestamp format on change.

### Bug Fixes

- Fix **the blockquote material rolled back**: quotes return to neutral grey text, background and bar, leaving inner links and code untouched.
- Fix **file mentions not matching hyperlinks**: they take the link colour and underline, while the code chip stays unchanged.
- Fix **the left gap in Markdown tables**: global table overrides are gone, first and last cells regain padding, and narrow tables are no longer stretched.

### Chores

- **Ban-page lock redrawn by hand**: three Bézier paths traced from the reference ink and mapped to the 24-unit grid.
- **`banSvg` duplicate attribute fixed**: stroke width is now a parameter emitted once, so the override no longer silently fails.
- **Click-opened account popover no longer closes on mouse-out**: it closes on an outside click or leaving the footer, while hover keeps its old delay.
- **Account divider out of the hover area**: it is now a sibling of the account row, so the hover surface covers only the name.
- **Ban-page layout**: the content column is centred and the header drops 30px.
- **Inline code chips tightened**: they carry `line-height: 1.2` and an 18px line box, removing the extra padding.

**Full Changelog**: [v0.2.7...v0.3.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.7...v0.3.0)

## [0.2.7] - 2026-09-20

[中文](#cn-0.2.7) | [English](#en-0.2.7)

<h3 id="cn-0.2.7">新增功能</h3>

- **模型选择器厂商标识**：模型行显示所属厂商标识，`brands.providers` / `brands.models` 驱动，构建期校验。

### 其他变更

- **引用块改用链接材质**：引用共用链接蓝文字与下划线，底纹与竖条取淡色。
- **文本选区实色两态**：聚焦蓝底白字、失焦灰底黑字，由 `selection.js` 镜像焦点态。
- **接入 cc-switch 图标**：引入 107 个供应商图标并新增宿主路由，选择器优先用它们、缺失回退 Lobe。
- **供应商标签推挤 sticky**：滚动时上一个标签被下一个 section 推上去。
- **附件轨接缝优化**：移除 focus 时 1px 内圈阴影，消除图片区与文字区分界。
- **更多模型子弹层**：提高弹层高度，供应商标签改为 sticky 顶部条。
- **provider 标签强化**：分组标题改为黑底白字圆角矩形，暗色反相。
- **模型触发器 hover 去重**：删掉 trailing 下的额外 hover 规则，只留一层背景。
- **标题中文回退黑体**：SERIF 栈移除 CJK 衬线回退，西文仍用 Anthropic Serif。
- **统计弹层合并**：两个宿主弹层合并为一个自定义弹层，上下两区块各 2×2 网格。
- **统计区交互**：弹层改为 hover 打开，控件仅在指针位于对话窗口内时显示，统计行居中。
- **输入区统计合并**：会话与 token 统计并成一条居中紧凑文本，隐藏宿主图标与标签。
- **补充当前非官方模型**：非官方选中模型在官方与更多模型之间单独一行显示，触发器去掉箭头。

<h3 id="en-0.2.7">New Features</h3>

- **Vendor marks in the model picker**: rows show the model's vendor via `brands.providers` / `brands.models`, validated at build time.

### Chores

- **Blockquotes use the link material**: quotes share the link blue, underline, tinted background and bar.
- **Text selection in two solid states**: blue-on-white focused, grey-on-black blurred, mirrored by `selection.js`.
- **cc-switch provider icons wired in**: 107 icons plus a host route, preferred over Lobe with a fallback.
- **Provider labels as push-sticky**: each scrolling section pushes the previous label up.
- **Attachment rail seam fixed**: the 1px focus inset shadow is gone, removing the divider between image and text.
- **More-models submenu**: taller popover with provider labels as sticky headers.
- **Provider labels strengthened**: group headers become rounded black-on-white blocks, inverted in dark mode.
- **Model trigger hover de-duplicated**: the extra trailing hover rule is gone, leaving one background.
- **Heading CJK fallback to sans**: the serif stack drops its CJK fallback while Latin keeps Anthropic Serif.
- **Stats popovers merged**: the host's two become one custom popover with two 2×2 blocks.
- **Stats interaction**: the popover opens on hover, controls show only inside the chat window, and the row centres.
- **Composer stats merged**: session and token stats become one centred compact line, hiding host icons and labels.
- **Current non-official model added**: it gets its own row between official and more models, and the trigger loses its arrow.

**Full Changelog**: [v0.2.6...v0.2.7](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.6...v0.2.7)

## [0.2.6] - 2026-09-20

[中文](#cn-0.2.6) | [English](#en-0.2.6)

<h3 id="cn-0.2.6">新增功能</h3>

- **JetBrains Mono 免安装**：宿主半边新增字体路由，以 `@font-face` 注册为 webfont，缺失时回退系统字体栈。
- **Anthropic 字体可选免安装**：两个字体文件放进插件 `fonts/` 即以 webfont 提供，缺失时 404 回退。

### 其他变更

- **代码块与表格对齐 Claude**：行内代码与代码块字号 -1px，边框移到外层容器，表格字号与圆角上调。
- **自定义用户名**：设置页新增输入框，输入停顿后自动保存，宿主未重载时本地兜底。
- **链接与行内代码对齐 Claude**：链接下划线静止 60%、hover 100% 并加粗到 1.5px，代码改用 JetBrains Mono。
- **代码字体换 JetBrains Mono**：改用 JetBrains Mono Variable（含 Italic），随插件分发并保留 SIL OFL。
- **权限弹层 hover 打开**：悬停分段按钮即打开、移入取消关闭、移出延迟关闭，`autoPopover` 关闭时仍可点击。

<h3 id="en-0.2.6">New Features</h3>

- **JetBrains Mono without installing**: a host `/dsh-claude-style/fonts/*` route plus `@font-face`, falling back to the system stack when absent.
- **Optional Anthropic fonts without installing**: dropping the two files into the plugin's `fonts/` serves them as webfonts, with a 404 fallback.

### Chores

- **Code blocks and tables aligned to Claude**: code shrinks 1px, borders move to the outer container, and tables gain a size and radius.
- **Custom username**: a settings field autosaves after a pause, with a local fallback until the host half reloads.
- **Links and inline code aligned to Claude**: link underlines go from 60% to 100% on hover and thicken to 1.5px, and code moves to JetBrains Mono.
- **Code font switched to JetBrains Mono**: the variable font with italics ships with the plugin under SIL OFL.
- **Permission popover opens on hover**: hovering opens it, moving in cancels closing and leaving delays it; clicking still works with `autoPopover` off.

**Full Changelog**: [v0.2.5...v0.2.6](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.5...v0.2.6)

## [0.2.5] - 2026-09-20

[中文](#cn-0.2.5) | [English](#en-0.2.5)

<h3 id="cn-0.2.5">新增功能</h3>

- **模型文案改为运行时读取的数据文件**：文案表迁出 bundle，宿主按请求读取、浏览器半边按需缓存。
- **补充新模型线文案**：为榜单上未收录的模型线补写家族规则，未收录的仍回退目录文本。

### 体验优化

- **模型文案跟随全局语言、单行显示**：按 shell locale 取语言，每行只渲染一条，切换语言即时重绘。

### 问题修复

- 修复 **模型文案的两处误判**：锚定激活参数与稠密规则，并补 `north`、`gpt-oss` 规则。
- 修复 **塌缩态底栏插件控件压住 Claude 标**：塌缩时隐藏设置区内的按钮与触发器行。
- 修复 **塌缩态账户弹层被侧栏容器裁掉**：弹层改 `position: fixed`，坐标由脚本解析。
- 修复 **设置页文字整页消失**：折叠拆开，设置区不再继承零字号，文本恢复自然行高。

### 其他变更

- **源码按特性级分片重构**：`overrides`、`context` 与 CSS 拆成独立文件，调度器改走 `ui` 句柄。

<h3 id="en-0.2.5">New Features</h3>

- **Model copy is now a runtime data file**: the table left the bundle, is served by the host on request and cached on demand.
- **Copy for newly added model lines**: family rules added for the leaderboard's missing lines; unknown lines fall back to catalog text.

### Improvements

- **Model copy follows the global language, one line per row**: the shell locale picks the language and a switch redraws instantly.

### Bug Fixes

- Fix **two model-copy misreads**: anchor the active-parameter and dense rules, and add `north` / `gpt-oss` rules.
- Fix **a collapsed-sidebar plugin control covering the Claude mark**: hide the settings-area buttons and trigger row while collapsed.
- Fix **the collapsed-sidebar account popover being clipped by the sidebar**: it is now `position: fixed` with script-resolved coordinates.
- Fix **the whole settings page's text disappearing**: the collapse is split so the settings area no longer inherits zero font size.

### Chores

- **Source split into per-feature files**: `overrides`, `context` and CSS became separate files and the scheduler now uses the `ui` handle.

**Full Changelog**: [v0.2.4...v0.2.5](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.4...v0.2.5)

## [0.2.4] - 2026-09-19

[中文](#cn-0.2.4) | [English](#en-0.2.4)

<h3 id="cn-0.2.4">体验优化</h3>

- **深色输入框焦点由「加深」改为「提亮」**：焦点描边与晕边改用亮象牙，聚焦时明显亮起。
- **权限弹层列表间距加宽**：行间距由 2px 加宽到 6px，预设说明不再糊成整块。
- **会话统计并入输入框工具栏同一行**：两组 pill 移入工具栏、居中排列，输入区由三行压为两行。
- **统计 pill 改为悬停出现**：平时隐藏但保留占位，指针移入对话窗口时淡入。
- **消除附件轨与输入框之间的分界线**：以负外边距闭合间隙，卡片总高不变。
- **非对话页隐藏整个底部输入区**：仅对话页签激活时显示，宿主底部留白随之归零。
- **模型选择控件按 Claude 效果重构**：触发器只留模型名，弹层一级直列官方模型、二级旁侧展开，悬停即开。

### 问题修复

- 修复 **权限切换在 dsh 0.2+ 上完全失效**：当前会话改从 `uiSession` 主视图读取，兼容裸值投影。
- 修复 **亮色用户消息气泡由蓝改灰**：气泡底色改用皮肤的悬停灰，深色保持不变。
- 修复 **模型选择弹层永远停在「正在加载模型…」**：改走 `modelDir.store` 读写快照，并补上 rejection 处理。
- 修复 **深色强调色回到陶烬橙**：深色盘限定到 `[data-ds-dark-theme]`，不再被宿主蓝色盖掉。

<h3 id="en-0.2.4">Improvements</h3>

- **Dark-mode input focus now brightens instead of deepening**: the focus outline and halo use bright ivory and light up clearly.
- **Wider rows in the permissions popover**: row spacing grew from 2px to 6px so the preset descriptions no longer blur together.
- **Session stats merged into the composer toolbar row**: both pills moved into the toolbar, centered, cutting the composer to two rows.
- **Stats pills appear on hover**: hidden by default with their space reserved, they fade in when the pointer enters the conversation.
- **The seam between the attachment rail and the input is gone**: a negative margin closes the gap without changing the card height.
- **Composer hidden off the conversation page**: it shows only on the active conversation tab, and the host's reserved bottom space goes.
- **Model picker matches Claude**: the trigger keeps the model name, the first level lists official models and the second opens beside it.

### Bug Fixes

- Fix **permission switching broken on dsh 0.2+**: read the current session from the `uiSession` binding, tolerating bare-value projections.
- Fix **the light-mode user bubble being blue**: its fill now uses the skin's hover grey; dark mode is unchanged.
- Fix **the model popover stuck on "Loading models…"**: state now goes through `modelDir.store`, with rejection handling added.
- Fix **the dark accent returning to clay orange**: scope the dark palette to `[data-ds-dark-theme]` so the host's blue no longer wins.

**Full Changelog**: [v0.2.3...v0.2.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.3...v0.2.4)

## [0.2.3] - 2026-09-19

[中文](#cn-0.2.3) | [English](#en-0.2.3)

<h3 id="cn-0.2.3">问题修复</h3>

- 修复 **账户抽屉弹层刷新时 hover / 点击失效**：弹层打开期间镜像内容保持静止，点击目标在点击瞬间解析。

<h3 id="en-0.2.3">Bug Fixes</h3>

- Fix **account drawer popover losing hover / click**: mirrored content stays still while open and click targets resolve on click.

**Full Changelog**: [v0.2.2...v0.2.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.2...v0.2.3)

## [0.2.2] - 2026-09-19

[中文](#cn-0.2.2) | [English](#en-0.2.2)

<h3 id="cn-0.2.2">新增功能</h3>

- **对话内输入框重设计**：压缩为单行卡片、随内容增高，权限、附件与模型选择合并到下方同一行。
- **输入框焦点样式**：聚焦时描边转为中性色细线，外扩 1px 同色晕边并加深投影。
- **分时段首页欢迎语**：欢迎语随本地时间自动轮换，跨过整点时每 60 秒刷新。
- **模型思考状态重塑**：收录 Claude Code 的 185 种思考动词，扫光改为陶土橙与蜜桃暖色。
- **工作区运行中状态重塑**：侧栏加载动画改为 Windows 11 Fluent 风格的圆形圆弧旋转。
- **可切换品牌标识**：设置页新增 Claude Style 分区，在 Claude 与 Anthropic 两套标识间切换并本地保存。

### 问题修复

- 修复 **对话内输入框的多处布局问题**：吸附底部、随内容增高，附件区不再出现双层边框。
- 修复 **上下文用量弹层被误压缩**：弹层不再被挤扁，排版恢复正常。
- 修复 **账户抽屉多项问题**：非按钮控件与富控件条目正常收纳，图标、顺序与点击位置对齐。
- 修复 **`dsh-agy-link` 的 run_code 工具卡片排版异常**：卡片头部与代码预览恢复正常。

### 其他变更

- **源码拆分与构建化**：`lib/client.js` 改为构建产物，源码拆到 `src/`，新增无头回归探针。
- **Anthropic 字体入仓库**：`fonts/` 提供三个字体文件，随 Git 分发但不随 npm 包分发。

<h3 id="en-0.2.2">New Features</h3>

- **In-conversation composer redesigned**: a single-line card that grows with content, permissions, attachments and the model picker below.
- **Composer focus styling**: on focus the outline becomes a neutral hairline with a 1px same-color halo and a deeper shadow.
- **Time-of-day home greetings**: the greeting rotates with local time and refreshes every 60 seconds across an hour boundary.
- **Thinking status reshaped**: 185 Claude Code thinking verbs are included and the sweep turns clay-orange and peach.
- **Running-session status reshaped**: the sidebar loading animation became a Windows 11 Fluent-style circular arc spinner.
- **Switchable brand marks**: a Claude Style section switches between the Claude and Anthropic marks and saves the choice locally.

### Bug Fixes

- Fix **several composer layout issues**: it sticks to the bottom, grows with content, and the attachment area loses its double border.
- Fix **the context-usage popover being wrongly compressed**: it is no longer squeezed and lays out correctly again.
- Fix **several account drawer issues**: non-button and rich controls are collected properly, and icons, order and click targets line up.
- Fix **broken `dsh-agy-link` run_code tool card layout**: the card header and code preview render correctly again.

### Chores

- **Source split and a build step**: `lib/client.js` became a build artifact, source moved to `src/`, and a headless probe was added.
- **Anthropic fonts added to the repo**: `fonts/` ships three font files with Git but not with the npm package.

**Full Changelog**: [v0.2.1...v0.2.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.1...v0.2.2)

## [0.2.1] - 2026-09-19

[中文](#cn-0.2.1) | [English](#en-0.2.1)

<h3 id="cn-0.2.1">新增功能</h3>

- **账户抽屉悬停展开**：支持悬停展开与延迟关闭，移入弹层不打断浏览。

### 体验优化

- **权限控制器首段由 Plan 改名为 Read**：与它映射的只读预设名称一致。
- **新会话按钮改为与会话行同高的窄条**：左对齐加号图标、常驻悬停底色。
- **会话行标题默认为次级灰**：悬停或选中时回到主文字色。
- **账户底栏改为全宽分割线布局**：分割线贯通侧栏。

### 问题修复

- 修复 **LICENSE 版权署名缺失与 README 无效示例**：补齐署名并修正 patch 配置示例。

<h3 id="en-0.2.1">New Features</h3>

- **Account drawer hover opening**: it opens on hover and closes after a delay, and moving into the popover does not interrupt browsing.

### Improvements

- **The permissions control's first segment renamed from Plan to Read**: it now matches the read-only preset it maps to.
- **The new-session button became a narrow bar matching the session-row height**: a left-aligned plus icon with a persistent hover fill.
- **Session row titles default to secondary grey**: they return to the primary text color on hover or selection.
- **The account footer became a full-width divider layout**: the divider spans the sidebar.

### Bug Fixes

- Fix **the missing LICENSE attribution and an invalid README example**: attribution added and the manual patch sample corrected.

**Full Changelog**: [v0.2.0...v0.2.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.0...v0.2.1)

## [0.2.0] - 2026-09-19

[中文](#cn-0.2.0) | [English](#en-0.2.0)

<h3 id="cn-0.2.0">新增功能</h3>

- **Claude Code Desktop Theme**：从配色皮肤升级为完整的 Claude Code Desktop 视觉与交互复刻主题。
- **Plan / Edit / Auto 分段权限控制**：行内三段式控制器，支持快捷切换会话权限。
- **侧栏账户抽屉**：侧栏底部集成账户按钮与弹出菜单，可打开设置与管理插件。
- **视觉与文案重塑**：专属问候语、输入框引导文案与品牌星芒标识。

### 体验优化

- **优化亮色画布与侧栏色值**：画布取 `#FCFCFB`，侧栏取 `#FBFBF9`。

### 其他变更

- **项目重命名为 `dsh-claude-style`**：与上游 `claude-style-skin` 区分。

<h3 id="en-0.2.0">New Features</h3>

- **Claude Code Desktop Theme**: upgraded from a color skin into a full Claude Code Desktop visual and interaction replica.
- **Plan / Edit / Auto segmented permission control**: an inline three-segment controller for quick session permission switching.
- **Sidebar account drawer**: an account button and popup menu at the sidebar bottom, opening settings and plugin management.
- **Visual and copy refresh**: dedicated greetings, composer placeholder copy and the brand star mark.

### Improvements

- **Light canvas and sidebar colors tuned**: the canvas uses `#FCFCFB` and the sidebar `#FBFBF9`.

### Chores

- **Project renamed to `dsh-claude-style`**: to distinguish it from the upstream `claude-style-skin`.

## [0.1.0] - 2026-08-22

[中文](#cn-0.1.0) | [English](#en-0.1.0)

<h3 id="cn-0.1.0">新增功能</h3>

- **初始版本**：暖调象牙白 / 暖黑双画布与陶烬橙强调色。

<h3 id="en-0.1.0">New Features</h3>

- **Initial release**: warm ivory / warm black dual canvas with a clay-orange accent.
