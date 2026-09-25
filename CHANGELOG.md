# Changelog

All notable changes to `dsh-claude-style` are documented here, newest first.

## [Unreleased]

[中文](#cn-unreleased) | [English](#en-unreleased)

<h3 id="cn-unreleased">新增功能</h3>

- **账号位置的头像改为玩家自己的皮肤**：启动器记下了玩家导入的皮肤，宿主半边把那张规范化贴图以只读路由发给浏览器，浏览器按启动器账号列表相同的裁法取头部——脸的 8×8 贴图块按盒子的 1/18 内缩，帽子层铺满整个盒子。头部按**方形**绘制，不用账号头像那条路径的圆形遮罩：它画到盒子边缘，任何圆角都会切掉它的像素。没有头像、头像文件已删、图取不到时显示 Claude 徽标。
- **权限档位改为跟随宿主目录**：权限控件（输入框分段控件与它的弹层）不再写死四档，段位与行都按宿主的 `permissionPresets` 目录构建——目录里有的档位才画，宿主没提供的整条不出现，第三方插件注册的档位因此成为一等公民：auto mode 插件的 `auto-mode` 会以 **Auto mode** 出现在弹层里，并在分段控件里占用 **Auto** 那一格（部署同时提供宿主内置 Auto review 时，内置档退居弹层、把格子让给部署自己的自动档）。档位名与说明仍由皮肤给（皮肤不认识的档位用宿主自己的名字与说明，机器值不上屏），行保持纯文字——预设声明的 `icon` 也不画，档位列表读起来是一份清单。切换仍走宿主的 `/permission <preset>`。

<h3 id="en-unreleased">New Features</h3>

- **The account row's mark becomes the player's own skin**: the launcher stores every imported skin as a normalized texture atlas, and the host half serves it over a read-only route. The browser crops the head the way the launcher's own account list does — the face's 8×8 texel block inset by 1/18 of the box, with the hat layer over the whole box. The head is drawn **square** rather than under the round mask the avatar-photo path uses, because it reaches the box's edges and any rounding would shave its pixels off. With no picture, a deleted file, or a picture that cannot be served, the Claude mark shows.
- **The permission ladder now follows the host catalog**: the permission control (the composer's segmented group and its popover) no longer hardcodes four tiers. Both the segments and the rows are built from the host's `permissionPresets` catalog, so a deployment offers exactly the tiers it configures and a tier no one serves is absent rather than drawn dead. A tier a third-party plugin registers is therefore a first-class entry: the auto mode plugin's `auto-mode` appears as **Auto mode** in the popover and takes the **Auto** slot of the segmented group (when the deployment also serves the host's built-in Auto review, that one stays in the popover and the slot goes to the deployment's own tier). Names and descriptions still come from the skin — a tier it does not know reads with the host's own name and description, never with its machine id — and the rows stay text-only: a preset's declared `icon` is not drawn either, so the ladder reads as one list. Switching still goes through the host's `/permission <preset>`.

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
- **输入卡片上的像素螃蟹**：工作台版面的新会话页上（经典版面没有），输入卡片上沿靠右站着 Claude Code 的像素螃蟹。点它一下、指针从它身上移开时、以及页面开着时每隔 25–45 秒，它照 Claude Code 的样子钓一次鱼：半转身眨眼，举竿甩到卡片边上，侧身钓一会儿，收竿转回正面，约三秒；系统要求减少动态效果时（例如 Windows 关掉了「在 Windows 中显示动画」），只有点它才播放。只有螃蟹本身接收指针，鱼竿挥动的空白处不挡点击。
- **热力图的日期提示**：指针停在热力图的某一天上，立刻浮出 Claude Code 样式的深色提示，写着日期和当天的消息数（如「9月9日 — 15,955」）；靠两端的几列提示贴着格子外沿，不会伸出面板。会话列表兜底来源没有按天的消息数，此时提示写当天的 Token。概览的数字格同时改用 Claude Code 的叫法：消息数、Token 总量、最常用模型（模型名不加粗）。
- **经典首页的问候更多了**：经典版面的大标题不再每个时段只有一句，早上、午间、下午、晚上、深夜各有一组问候，另有几句不分时段；每次回到新会话页随机换一句，同一次停留里不会跳动。
- **接入 HDSL 启动器的账号信息**：由 HDSL 启动的实例，昵称与头像会优先取启动器里的账号。昵称按「自定义昵称 → 官方账号昵称 → HDSL 昵称 → 上次探测到的系统用户名 → 系统用户名 → `User`」回退，头像按「官方账号头像 → HDSL 头像 → Claude 徽标」回退。宿主半边新增两条只读私有路由，与用户名路由同级过宿主请求栅栏：`GET /dsh-claude-style/hdsl` 回账号元数据（不含头像文件的绝对路径），`GET /dsh-claude-style/hdsl-skin.png` 回头像图片。契约版本读不到或不认识时整组忽略；头像文件被删除时回落到徽标。

<h3 id="en-0.7.0">New Features</h3>

- **Two home layouts, switchable in the settings page**: a new Home layout preference. **Classic** keeps the centered headline over the composer card; **Studio** pins the greeting to the top left as one fixed line ("What's up next, <user>?", in the sans UI face on the brand mark's line), docks the composer in the conversation's single-line form at the window's bottom edge with a row of hairline context chips above it, and sets the greeting and a 480px usage panel against the composer's left edge — an Overview tab with six stat cells (sessions, messages, total tokens, active days, peak hour, favorite model) and a twenty-six-week per-day heat grid of square cells in equal columns, and a Models tab stacking each day's per-model tokens into one bar over a ranked model list (swatch, model name, input and output, share; past six rows it folds behind a "show more" row, and the open list ends in a "show less" row), both reading the same rank-ordered blue ramp. The All / 30d / 7d range pills filter the tiles (the peak hour included), the multiplier line and the model list while the grid and the chart keep their own windows, and once the picked range's total passes one book a multiplier line appears under the grid — eleven books from Animal Farm to In Search of Lost Time, a fresh one drawn each time the new-conversation page comes back, stepping down to the longest book the range has passed when it has not reached the drawn one. The panel appears on the new-conversation page only and steps away once a session is open.
- **The usage numbers are folded locally**: a new read-only route, `GET /dsh-claude-style/usage`, behind the same same-origin fence as the username route. With `dsh-cost-meter` installed it reads that plugin's ledger cache (read-only); otherwise the host half folds the local session logs itself and caches the result incrementally per log file — about two seconds on the first cold pass, about 3 ms per start afterwards. Both sources answer each model's four token buckets and each day's per-model tokens (`models` and `days[].models`), which the Models tab's chart and ranking read; the ledger books usage per provider and model, and one model served by several providers is one row. The ledger keeps no hours, so with it the other figures land first and the peak hour follows a moment later, folded per day from the local session logs. When the fold cannot answer (an older host half or a failed pass), the panel falls back to the projection block each host session row carries.
- **The panel draws its skeleton before its numbers**: the frame, number placeholders, an empty heat grid and stand-in share bars come first; arriving values replace only the text, the cell colours and the bar lengths, so nothing shifts. A figure no source can answer is a dash, never a zero.
- **A pixel crab on the composer card**: on the new-conversation page of the Studio layout (the Classic layout has none), Claude Code's pixel crab stands on the composer card's top edge near its right end. When it is clicked, when the pointer leaves it, and every 25–45 seconds while the page is in view, it plays Claude Code's fishing routine — a half turn and a wink, the rod cast down onto the card's edge, a spell of fishing side-on, and the rod put away as it turns back, about three seconds; with reduced motion requested (Windows' "Show animations in Windows" turned off, for one) only a click plays it. Only the crab itself takes the pointer, so the room the rod swings through never blocks a click.
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
