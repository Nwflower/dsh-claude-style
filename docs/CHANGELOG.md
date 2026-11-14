# Changelog

All notable changes to `dsh-claude-style` are documented here, newest first.

## [0.21.2] - 2026-11-14

[中文](#cn-0.21.2) | [English](#en-0.21.2)

<h3 id="cn-0.21.2">新增功能</h3>

- 配色方案与命名标志预设支持结构化 YAML、界面管理和明暗图片变体
- 模型选择器支持按标识、品牌、目录或自定义顺序排列，未识别品牌的模型行不再显示副标题
- 模型选择器新增 SenseNova 与 SCNet 品牌组合标和厂商文案

### 体验优化

- 进行中的回合每新写出一行过程，这一行的入场改由引擎在合成器上播放，长会话流式输出时不再每写出这一行就重算一次整页样式
- 以多参数选择器列表结尾的样式规则在构建时展开成按类名、属性或标签匹配的几条，浏览器不再拿它们去试页面上的每个元素；六千节点的页面上，皮肤样式表下的一次样式计算从 28.7 毫秒降到 22.5 毫秒
- 皮肤的样式表按宿主自己的类名匹配宿主元素，节点一插入就带着皮肤的样式，写上部件标记不再让浏览器重算样式；六千节点的页面上，一次样式计算从 22.5 毫秒降到 13.7 毫秒，宿主在插入后立即读布局时一次挂载的遍历、样式与布局合计从 72.3 毫秒降到 32.6 毫秒
- 折叠展开动效的三条样式规则不再让对话里的每个元素逐行查找它上方的全部消息，切换到一段六百条消息的会话时样式计算从 236.9 毫秒降到 92.8 毫秒，两百条时从 53.7 毫秒降到 32.9 毫秒
- 挂上一段对话时，给宿主元素命名的那趟遍历每个元素只做一次选择器判断，被移走的子树不再逐个节点查十几张表；切换到一段六百条消息的会话时，皮肤的脚本时间从 66.0 毫秒降到 47.7 毫秒

### 问题修复

- 详情栏展开时切换会话，栏会先收起再展开，对话的右边缘跟着来回移动一次；现在栏与对话的宽度在切换期间保持不动，只有栏内的读数换成新会话的。本地一段 105 行的会话，切换回它时浏览器的样式计算从 351 毫秒降到 221 毫秒
- 详情栏展开时标题栏的子智能体入口重新让位，栏内的子智能体一节列出本会话开始过的全部子智能体，已结束的折成计数
- 触屏窄屏布局交由宿主或移动适配插件控制帧网格，避免会话列落入零宽或侧栏轨道

<h3 id="en-0.21.2">New Features</h3>

- Support structured YAML, UI management and light/dark assets for colour schemes and named logo presets
- Add ID, brand, catalog and custom model ordering, and keep description lines off models without a recognised brand
- Add SenseNova and SCNet vendor lockups and descriptions to the model picker

### Improvements

- A process row a running turn writes enters through an animation the engine plays on the compositor, so a long streamed turn no longer recalculates the page's styles for every row
- Style rules ending in a multi-argument selector list are written out at build time into rules matched by class, attribute or tag, so the browser no longer tries them on every element; on a 6,000-node page one style calculation under the skin's sheet drops from 28.7 ms to 22.5 ms
- The skin's stylesheet now matches host elements by the host's own class names, so a node carries the skin's styles the moment the host inserts it and writing a part mark no longer makes the browser recalculate; on a 6,000-node page one style calculation drops from 22.5 ms to 13.7 ms, and a mount whose layout the host reads right after inserting drops from 72.3 ms to 32.6 ms of walk, style and layout
- The three style rules behind the fold's reveal no longer have every element of a conversation search all the messages above it; switching to a 600-message session drops from 236.9 ms of style calculation to 92.8 ms, and a 200-message one from 53.7 ms to 32.9 ms
- The pass that names host elements now asks one selector test of each element of a mounted conversation, and no longer looks every node of a removed subtree up in a dozen tables; switching to a 600-message session drops from 66.0 ms of the skin's script time to 47.7 ms

### Bug Fixes

- Switching sessions with the details rail open used to fold the rail away and bring it back, moving the chat's right edge out and in once; the rail and the chat now keep their widths through a switch and only the rail's readings change to the new session. Returning to a local 105-row session drops from 351 ms of browser style calculation to 221 ms
- The header's subagent entry steps aside again while the details rail stands, and the rail's Subagents section lists every child the session started, settled ones behind a finished count
- Leave narrow touch frame grids to the host or mobile adapter so the conversation cannot land in a zero-width or sidebar rail track

## [0.21.1] - 2026-11-14

[中文](#cn-0.21.1) | [English](#en-0.21.1)

<h3 id="cn-0.21.1">新增功能</h3>

- 新增羊皮纸、森林、暮色与蔷薇四套配色预设，外观设置里可选可改，侧栏与气泡色由各自的背景推出
- 外观设置支持新建、复制、重命名和删除多套配色方案，编辑预设与明暗颜色，并显示文字对比度

### 体验优化

- 让详情栏、用量面板与轮次状态行的 token 读数按数值本身取单位，不足 1k 写实际数量，1k 到 1000k 用一位小数的 k，1000k 起才用 M 与更大的单位，百万窗口下的剩余空间不再与窗口同读作 1M
- 详情栏各节的标题改为常规字重，环境、上下文、会话统计、Token 用量、产出与进程由各自的标题行、分隔线和留白分开，其余文字的字号与颜色不变
- 详情栏改用宿主的悬停气泡补上每一行说不出的部分，产出行给出完整路径，被截断的标题给出全文，行内文字已经完整时不弹气泡，气泡挂在页面主体上，详情栏滚动时也不会被裁掉
- 「首页统计范围」默认统计现有主会话；各范围只显示同一集合的会话数，子代理不再计入，已删除主会话仅在「全部记录」中保留
- 配色方案的管理与编辑合成一个双栏弹窗，左侧列出全部方案，右侧给出所选方案的浅色与深色样张、颜色和对比度读数
- 进行中的回合每写出一行过程——工具调用、思考、上下文注入——这一行用 0.24 秒淡入、上移并从左侧放大到位，打开或切换会话时已有的行不重播
- 为搜索原文和小写副本分别设置常驻容量上限，被淘汰会话与超大会话仍参与完整检索
- 详情栏首帧先画出上下文的占用与占比，分项随宿主折叠就位，其余各节同时出现，不再让整栏停在正在读取
- 对话详情、配色对比度附注与字体缺失提示改为一句话说明影响范围与要做的事
- 流式回答的新文字默认淡入，字符从看不见到坐实本色用 0.24 秒、前段快后段缓，思考窗口未到上限时底边也留一道渐隐，最新一行从这道边缘升起
- 工具调用的终端输出、diff 与文件内容按行分段出现，一次挂载的正文每两条一段、段间 140 毫秒，超过四十行之后每条 12 毫秒，整批最多 3.8 秒并按比例压缩，运行中命令追加的一行立刻出现，页面自己装载的旧对话不重播
- 字体行说明页面画不出的 Anthropic 字体，按装进系统或放进投放点两条路给出说明
- 拉开首页热力图五档色阶的明度差距，让相邻等级在明暗主题下都更容易分辨
- 详情栏的上下文分项改按实际发送给模型的内容计价，对话拆成用户消息、助手消息与工具结果三行，技能正文归入技能，各项按大小降序排列，八种分项色统一到同一感知明度，占用总量与占比仍取服务商的读数
- 紧凑底栏支持独立开关输出速度、首 Token 时间、缓存命中率、费用、Token 总量与上下文圆环
- 详情栏的上下文一节在接近自动压缩点时给出到压缩线的距离与一个「压缩会话」按钮，按下走宿主自己的 /compact 命令，压缩后占用与分项随下一轮读数自动收敛
- 配色方案新增明暗正文颜色入口，可以单独调整文字亮度而不改变背景色
- 输入区底行去掉宿主控件箱留在推理档位与上下文圆环之间的 12px 空档，圆环左内边距收成 4px，悬停与展开时只留圆环本身、不再铺一块深色底板

### 问题修复

- 适配新版 DeepSeek Harness 的独立会话状态服务、原生未读菜单、模块样式路径标记、服务端路由鉴权与侧栏新会话行操作按钮布局
- 关闭聊天动效时取消尚未执行的自动折叠，保留输入法组合与读者手动开合状态
- 切换会话、关闭统计或重新加载宿主资源时释放旧请求，避免晚到回答覆盖当前品牌和费用状态
- 窄屏输入栏的固定控件（思考深度、语音、发送、计量环）不再被压扁重叠，模型名与权限文字先缩短，模型版本标签在所有布局里保持可见，首页页宽不足时右侧控件整组换行并保持靠右，会话宽窄布局都保持单行
- 修复侧栏「新会话」一行在 DSH 0.2.2-rc.3 上右移的问题，圆片与标题回到搜索、插件各行的同一列
- 面板替换时释放旧元素并恢复宿主样式，关闭缩放处理后停止已排队的布局改写
- 色卡圆点支持键盘聚焦显示名称，并与鼠标共享同一条提示气泡
- 详情栏的会话统计与 Token 用量改读底部读数那一份实时读数，并按同一段时长逐帧推行，数字与那行一样连续增长
- 详情栏分别展示进程、子智能体和团队，区分命令的前后台执行，保留会话命令历史并折叠已结束记录
- 切换会话与返回首页时立即释放滚动持有和文字揭示状态，保留的旧容器不再继续绘制
- 侧栏重排只移动位置确实改变的会话座位，局部换位时保留其余节点、焦点与所在分组边界
- 窄屏帧网格按宿主几何兜底，页宽标记固定 drawer 0、rail 56 与宿主侧栏宽度，侧栏收起或抽屉时不再被过期的行内值改成展开宽度，会话区不再塌成右侧窄条或闪现半白帧
- 修复长会话增长时回写陈旧滚动位置、窄屏输入栏溢出与页帧塌陷、中文输入光标变细，以及提问卡片错误的 Ctrl 回车提示
- 设置保存失败提示不再使用误导性存储异常文案，并锁定输入区右侧 React 插槽的父子结构

<h3 id="en-0.21.1">New Features</h3>

- Add four colour presets — Parchment, Forest, Dusk and Rose — selectable and editable in Appearance, each deriving its sidebar and bubble from its own canvas
- Create, duplicate, rename and delete colour schemes in Appearance, edit presets and light/dark colours, and read text contrast

### Improvements

- Pick the unit of every token count from the count itself, writing the real number below a thousand, k with one decimal through a thousand k, and M or above only past that, so the room left in a million-token window no longer reads the same as the window
- Set every details section heading in the regular weight, leaving the environment, context, session stats, token usage, outputs and processes sections told apart by their own heading line, hairline and room, with the sizes and inks unchanged
- Give each details row the host's own hover bubble for what its line cannot say, an output row its full path and a cut title its whole text, with no bubble where the line says everything, and hang the bubble on the page body so the rail's scrolling never clips it
- Default home session scope to current main sessions; every scope shows one count from its own population, excludes subagents, and retains deleted main sessions only in All recorded
- Merge the colour scheme manager and editor into one two-column dialog, with every scheme on the left and the chosen one's light and dark specimens, colours and contrast figures on the right
- Each process row a running turn writes — a tool call, a thought, a context injection — fades in, rises and grows from its leading edge over 0.24 s, and the rows already standing when a session is opened or switched to never replay
- Bound resident search text and lowercase copies separately while keeping evicted and oversized sessions fully searchable
- Paint the details rail's context occupancy on the first frame, with its breakdown and the other sections taking their place as the host's answer lands, instead of holding the whole rail on one loading line
- The Details, palette contrast and missing-font lines each say their reach, and the one thing to do, in a single sentence
- New characters of a streaming answer fade in by default, each arriving unseen and settling to its own colour over 0.24 s, and the reasoning window keeps a soft bottom edge below its cap so the newest line rises out of it
- A tool call's terminal output, diff and file contents now surface in chunks of two rows 140 ms apart, one row every 12 ms past the first forty, and a batch is compressed to arrive within 3.8 s; a line a running command appends appears at once, and a conversation the page mounts on its own is never replayed
- The typeface row names the Anthropic faces the page cannot draw and says how to supply them, on the system or at the fonts folder
- Increase contrast between all five home heatmap levels in light and dark themes
- Price the details rail's context parts from the content actually sent to the model, splitting the conversation into user messages, assistant messages and tool results, counting a skill's body as skills, ordering the parts largest first and holding every part colour to one perceived lightness, with the occupancy and share still the provider's own reading
- Add independent compact-footer toggles for output speed, TTFT, cache-hit rate, cost, token total and the context ring
- Offer the distance to the auto-compaction line and a compact button in the details rail's context section once a session comes near it, running the host's own /compact command so the occupancy and its parts settle on the next reading
- Add light and dark text colour seeds to palette schemes, allowing text brightness changes without changing the canvas
- Close the 12px gap the host's controls box left between the effort level and the context ring on the composer's bottom line, cut the ring's left inset to 4px, and drop the dark plate the ring painted under the pointer and while its panel was open

### Bug Fixes

- Support current DeepSeek Harness session status service, native unread actions, client module stylesheet path tags, authenticated route peers and sidebar new-session row action buttons
- Cancel pending automatic folds when chat animations are disabled, preserving input composition and manual fold choices
- Release old requests on session changes, statistics teardown and host resource resets to keep late answers from replacing current brand and cost state
- Narrow composer bars no longer squeeze their fixed controls (effort, voice, send, meter ring) into each other, the model name and permission text shorten first, the release tag stays visible in every layout, the new-conversation card wraps its right-hand cluster to a second right-aligned line when the page is too narrow, and the conversation row stays on one line in both layouts
- Keep the sidebar's New session row on the same column as the search and panel rows after DSH 0.2.2-rc.3 moved it right
- Release replaced panels and restore host styles, stopping queued layout rewrites after panel scaling is removed
- Let colour-card discs reveal their labels on keyboard focus through the same pointer hint
- Read the details rail's session stats and token usage from the same live reading as the composer line and count to each new value over the same duration, so both grow the same way
- Separate processes, subagents and team in Details, distinguish foreground and background commands, and retain session command history behind a finished count
- Release reader scroll holds and text reveal state on session changes and home navigation, including retained inactive containers
- Move only the sidebar seats whose places changed, preserving the other nodes, focus and section boundaries during a local swap
- Narrow frame grids fall back to the host's own geometry, page-width marks pin drawer 0, rail 56 and the sidebar's own width, a collapsed or drawer sidebar is no longer drawn at a stale expanded width, and the conversation no longer collapses into a right strip or flashes a half-white frame
- Fix stale scroll restoration, narrow composer overflow and frame collapse, thin IME carets, and the incorrect Ctrl+Enter hint on question cards
- Correct the settings-save error copy and preserve the React parent-child structure of the composer's right slot

## [0.21.0] - 2026-11-12

[中文](#cn-0.21.0) | [English](#en-0.21.0)

<h3 id="cn-0.21.0">新增功能</h3>

- 「对话统计信息位置」新增「跟随详情栏」，会话详情栏展开时隐藏输入区下方的统计行，详情栏收起或退避时照「独立成行」显示
- 在对话右侧提供会自动开合的详情栏，列出工作目录与仓库、上下文占用、会话统计（模型与工具用时、首 token 平均、输出速度、费用、缓存命中与 token 分项）、产出、变更请求和后台任务；全部行按最新在前排列、不设条数上限；读数按会话隔离，费用跟随计费币种；头部按钮可收起或手动打开，窄窗口自动退避，收起后停止取数
- 会话总览面板中的子智能体显示实际用时与用量、点击打开对应会话，后台任务可展开查看留存输出
- 详情栏展开时，标题栏的子智能体与后台任务入口让位给详情栏的后台任务一节
- 详情栏展开时，对话与轨迹切换器站到标题所在的一行，标题按剩余宽度截断
- 会话总览的输出、变更与每类后台任务超过两条时折叠其余行，按剩余条数展开
- 会话总览的后台任务按进程、子智能体与团队分组，各组只在有行时出现，并在超过两条时各自折叠
- 首页模型图使用随模型稳定的十色分类色板，热力图扩为五档，并可按活跃会话、当前工作区或全部记录统计
- 新增行内代码字色选择，可恢复 Claude 0.19.7 的经典暖色且保留自定义颜色卡优先级
- 模型选择器新增「启用智能体团队协作」开关，适配 DSH 0.2.2-rc.2 模型菜单里的智能体团队入口，关闭已发过请求的会话时先弹出确认

### 体验优化

- 顶栏控件统一为 28px 方底板与 16px 图标，工具与面板开关之间加一条分隔线，打开方式去掉描边并只保留一块悬停底板
- 会话详情栏统一为一种字号与行距，每一行只占一行，行尾状态改为不带边框的文字；会话统计拆成「会话统计」与「Token 用量」两节并默认收起，收起时分别显示输出速度与费用；上下文分项不再逐个标注估算记号；详情栏展开时标题栏的预设标签让位给环境一节
- 会话详情栏收起的节改为 36px 一行并保留自己那条分隔线，整栏不再收滚动条，内容超出时照常滚动，右边缘只留一条与对话之间的分界线
- 会话详情栏的产出、进程与子智能体只展示最新用户轮次，跨轮仍运行的任务继续保留，后台通知与自动续行不清空本轮内容
- 会话详情栏收起时只占标题一行，展开的节静止时隐去箭头，节标题成为全栏唯一的加粗文字；产出行的图标改为单色线形，后台任务与子智能体的完成状态不再写状态字，只留停住的时钟
- 会话详情栏的进出与对话的收放合成一段 300ms 的位移，栏从对话右边缘长出来又收回去，两条边始终重合；与宿主右侧栏交接时按外框写下的归属当场开始，不再等右栏宽度归零后跳一帧
- 手动收起会话详情栏后，所有会话与重启之后都保持收起，直到再次按下标题栏的详情按钮
- 会话详情栏为运行中的进程与可继续子智能体提供独立停止按钮，支持再次点击确认、停止中反馈与失败重试
- 会话统计按左侧标签、右侧数值逐行显示，会话读数与 token 用量分组排列
- 状态标记放在行首时，折叠工作区的运行标记改为跟在名字之后，标记出现或消失时工作区名称不再左右移动
- 会话详情栏改从会话头部下面开始，头部连同标题与按钮保持整列宽度、落在栏的上方，只有转录与输入框让出宽度
- 侧栏开合、拖拽分栏与窗口缩放期间，对话行等宽度停止变化后整体重排一次，长会话不再按动画帧数重复重排
- 发送消息的过渡不再每帧读布局，连发两条时不再留下重复的气泡
- 将随包等宽可变字体转为体积更小的 woff2 格式，收窄流式观察回调与常驻监听并清理可替代的结构选择器
- 侧栏条目的固定状态改用 DSH 0.2.2-rc.2 自带的固定列表，编辑侧栏对话框、行上的取消固定按钮与 More 菜单共用一份状态，取消固定的条目仍会跨重启保存

### 问题修复

- 详情栏各节支持独立折叠并显示简要读数，整栏开合统一使用标题栏按钮，预设说明移入环境区域；上下文采用 Claude 配色，细分系统工具、MCP 工具、指令文件、技能与运行上下文，并显示估算数量和窗口占比
- 会话详情栏改用独立的一层（24），标题栏挂出的菜单不再被它盖住
- 会话详情栏的下缘停在底部面板的上缘，不再压住底部面板
- 会话详情栏的产出文件可直接在宿主预览中打开，支持 Windows 路径与包含空格的文件名
- 写文件调用和执行结果跨两次详情栏轮询到达时，成功写入的文件仍会完整列入产出
- 修复某一轮运行失败后上下文计量环读到 0% 的问题，失败尝试的零用量样本不再顶掉提供方上一次报告的读数
- 修复账号菜单把插件卡片压成一行截断文字、并把卡片副本收窄到账号行宽度导致标签折行与撑高的问题
- 修复提问卡片点过「其他」之后再点回原来选中的选项，选中圆圈不再出现的问题
- 修复宿主右栏打开时详情栏仍按自身宽度挤压对话、把对话压成窄条的问题，并让详情按钮先收起右栏再让出这一侧
- 修复详情栏的统计读数与底部读数措辞不一致、并且落后一个轮询周期的问题，token 计数改为带分隔符的精确数字，时长与首 token 平均按宿主写法印出，宿主落下统计帧时立即刷新
- 修复工作目录不是 Git 仓库时环境一节列出目录下所有仓库的问题，环境只显示本机与工作目录，工作目录在仓库里时才加仓库名与分支
- 修复与工作区树插件同时启用时运行中会话排序跨越工作区或分组标题边界的问题
- 修复侧栏固定入口选中与悬停时底板被行间距撑高、叠出第二层的问题
- 修复非 Windows 桌面壳误判标题栏、标签被遮挡后无法回退及详情栏打开时控制栏偏右的问题
- 合并流式统计的数字重绘并复用宽度探针，减少长会话中的强制同步布局
- 修复对话运行期间通过拖动滚动条、按上方向键或翻页回看前文时被新消息与工具调用拉回底部的问题
- 输入区结构与尺寸不变时不再重复排队空测量，真实尺寸变化仍自动重排
- 修复长思考展开状态下流式输出时顶部吸顶的思考标题随消息列位移上下跳动的问题
- 为随包拉丁字体补充字符范围声明，移除中文字体前的西文衬线回退并恢复中日韩标题的自然字距
- 第三方供应商的会话不再显示、也不再扣减 DeepSeek 账号余额
- 对话正文里的选中配色覆盖到粗体、行内代码与语法高亮等嵌套文本，全部 Markdown 形态在聚焦与失焦下都取同一个底色
- 承载非 portal 提示气泡的对话行不再跳过排版，消息操作条的悬停提示恢复原位与可见
- 皮肤窄屏断点与宿主抽屉阈值 768 对齐，收起侧栏、抽屉与页面窄屏布局在同一宽度切换，页面缩放下不再由皮肤改写抽屉态的列宽
- 新建会话页的输入卡在 420 像素以上保持单行控件，过长的模型名以省略号截断，400 像素以下只在第二行放右侧控件
- 顶栏文件资源管理器图标在任何状态下保持应用自身的颜色

<h3 id="en-0.21.0">New Features</h3>

- Add a Follow the details rail choice to the conversation statistics position, hiding the line under the composer while the session details rail is open and showing it as its own line when the rail closes or steps back
- Add a width-driven details rail beside the conversation with the working directory and its repositories, context occupancy, session stats (model and tool time, first token, output speed, cost, cache hit and token buckets), outputs, change requests and background work, listing every row newest first, scoped per session and priced in the chosen billing currency, with a header control to close or reopen it; it retreats under a narrow frame and stops asking once closed
- Show each subagent's real time and usage in the session overview, open its conversation from the row, and expand a background job's retained output
- Let the details rail's Background tasks section take over the title bar's subagent and background job entries while the rail is open
- Place the conversation and trajectory switch on the title's own line while the details rail is open, with the title truncating to the remaining width
- Fold the rows past the second in the session overview's Outputs and Changes sections and in each background category, behind a control naming the count left
- File the session overview's background rows under commands, subagents and team, each group shown only with rows and folded past its second row
- Give home models stable categorical colours, widen the heat grid to five levels and add active, current-workspace and all-record session scopes
- Add an inline-code colour choice restoring Claude 0.19.7's warm ink while preserving the custom colour card's precedence
- Add the agent teamwork switch to the model picker, matching the entry DSH 0.2.2-rc.2 puts in its model menu, with a confirmation before turning it off in a session that has sent requests

### Improvements

- Unify the header's controls on one 28px plate with 16px glyphs, divide the session actions from the panel switches with a hairline, and drop the open-with control's outline so the whole control takes one hover plate
- Set the session details rail in one type size and row rhythm with single-line rows and unboxed trailing states; split session statistics into Session stats and Token usage, both folded by default with the output speed and the cost beside their headings; drop the per-figure estimate marks from the context parts; and let the Environment section take over the title bar's preset label while the rail is open
- Give the session details rail's folded sections a 36px row that keeps its own hairline, and hide the rail's scrollbar while the column keeps scrolling, leaving one hairline between it and the chat
- Limit outputs, jobs and subagents in the session details rail to the latest human-prompted round while keeping older running work visible and preserving the round through background notices and automatic continuations
- Fold the session details rail's folded sections onto their heading line, hide an open section's chevron at rest, keep bold for section titles alone, draw output rows with single-stroke marks, and let finished jobs and subagents keep their clock instead of a status word
- Make the session details rail's arrival and exit one 300ms move with the chat's own inset, growing the rail out of the conversation's right edge so the two edges stay together, and start the handover with the host's right column on the frame the frame states the side's owner rather than a frame after that column finishes closing
- Keep the session details rail closed across sessions and restarts once it is closed by hand, until the header's details button is pressed again
- Add independent stop controls for running jobs and continuable subagents in the session details rail with click-again confirmation, stopping feedback and retry after failure
- Display session statistics in compact rows with labels on the left and values on the right, grouping session figures and token usage
- Move a collapsed workspace's running mark behind its name when the mark stands on the leading side, so the name stays where it stood while the mark appears and goes
- Start the session details rail under the conversation header, which keeps the column's whole width so its title and controls stand above the rail, with only the transcript and the composer giving the width up
- Relay conversation rows once the column's width stands still, so a sidebar toggle, a dragged divider or a window resize lays a long conversation out once instead of once per frame
- Stop the send transition from reading layout every frame, so a second send no longer leaves a duplicate bubble behind
- Ship JetBrains Mono variable faces as WOFF2, narrow streaming mutation and timer work, consolidate fold listeners, and replace avoidable structural selectors
- Sidebar entries now share the pin list DSH 0.2.2-rc.2 keeps, so the Edit sidebar dialog, the unpin button on each row and the More menu act on one state, and the entries taken off are still stored across restarts

### Bug Fixes

- Give each details section independent folding and a compact reading, control the rail from the conversation header and place its preset in Environment; split context into system tools, MCP tools, instruction files, skills and runtime context with Claude colours, estimated counts and window shares
- Give the session details rail its own layer (24) so menus the header hangs no longer open under it
- Stop the session details rail at the bottom panel's top edge so it never covers that panel
- Open output files from the session details rail in the host preview, including Windows paths and filenames containing spaces
- Keep successfully written files in Outputs when a write call and its result arrive in separate details-rail polls
- Fix the context meter reading 0 % after a round fails, where a failed attempt's zero usage sample displaced the reading the provider last reported
- Fix the account menu collapsing a plugin's footer card into one truncated line and pinning its copy to the account row's width, which folded the card's labels and made it taller
- Fix the question card's chosen option losing its ring after the custom answer is chosen and that option is picked again
- Fix the details rail keeping its own width and squeezing the conversation to a narrow strip while the host's right panel is open, and have the details control close that panel before handing the side over
- Fix the details rail's figures reading differently from the composer's readout and trailing it by one polling cycle, printing exact grouped token counts and the host's own duration wording, and refreshing as soon as the host lands a figure frame
- Fix the environment section listing every repository under a working directory that is not itself a checkout, showing the machine and the working directory alone and adding the checkout's name and branch only when the directory sits in one
- Keep running-session sorting inside each contiguous session segment so rows never cross workspace or group headers in shared flat lists
- Keep the sidebar's pinned entries to one plate when active or hovered, without the row's foot stretching it below the row
- Keep view tabs out of unsupported desktop caption bands, restore them when covered and centre the control while the details rail is open
- Coalesce streaming statistic writes and retain the measurement probe, reducing forced synchronous layout in long conversations
- Preserve the reader's scrollback position across scrollbar drags, upward keys, content clicks and host growth pins while a turn runs
- Skip redundant composer measurements while preserving automatic reflow when its structure or dimensions change
- Counter-slide top-pinned thinking disclosure headers during streamed growth so the sticky header stays stationary
- Declare Unicode ranges on bundled Latin faces, drop Georgia and Times fallbacks ahead of CJK fonts, and restore normal heading letter-spacing in CJK locales
- A session on a third-party provider no longer shows or draws down the DeepSeek account balance
- Paint the selection of nested Markdown runs — bold text, inline code, syntax tokens — so every shape in a conversation takes the one selection colour, focused and blurred
- Keep the conversation row holding a non-portal tooltip laid out, restoring the message actions' hover labels in place and in view
- Align the skin's narrow breakpoint with the host's 768 px drawer threshold, so the rail, the drawer and the narrow page layout switch at one width and the skin leaves a drawer frame's columns to the host
- Keep the new-conversation composer on one control line from 420 px up, truncate an over-long model name with an ellipsis, and give the trailing controls their own second line below 400 px
- Keep the header's file explorer icon in its own app colour in every state

## [0.20.3] - 2026-11-10

[中文](#cn-0.20.3) | [English](#en-0.20.3)

<h3 id="cn-0.20.3">新增功能</h3>

- 新增折叠工作区的运行标记，标记样式与位置跟随进行中动效设置

### 体验优化

- 顶栏落位改为一次算完，标题按文字所需的宽度参与判定，旁边的控件簇在同一趟里跟到标题末尾，不再等下一趟落位
- 把动效滑块、折叠重排、上下文环与光标在写阶段里的布局读取挪回读阶段，交互时不再触发整页样式重算

### 问题修复

- 修复账号菜单预热期间侧栏「更多」与设置页下拉被一并隐藏、按下没有反应的问题
- 修复中文输入法组词时自定义用户名的字母重复，编辑期间输入框保留读者自己的文本，放弃编辑回到编辑前的用户名
- 修复插件挂在侧栏页脚的整块区块（企业应用）随账户区接管一并消失的问题，区块留在账号行上方，侧栏收成细轨时由账户弹层承载它的副本
- 修复推理等级滑块在顶档拖动、停驻与松手时的掉帧，顶档的点阵改由一块画布逐块绘制
- 修复进行中会话的标题扫光与 IM 渠道标题重叠的问题；由伪元素绘制的标题保留原生运行标记，接管或释放后自动更新

### 其他变更

- 整理开发目录与验证入口，功能清单统一登记测试覆盖，替身页面检查共用一个运行器

<h3 id="en-0.20.3">New Features</h3>

- Add the running mark to a collapsed workspace row, following the ongoing animation and side settings

### Improvements

- Place the caption row in one pass, judging the title by the width its words need and moving the cluster beside it to the title's end in that same pass instead of a pass later
- Move the layout reads of the motion slider, the fold reposition, the context meter and the caret out of the write phase, so an interaction no longer forces a whole-page style recalculation

### Bug Fixes

- Fix the sidebar's More card and the settings page's dropdowns staying unpainted while the account menu warms up, so a press on them appears to do nothing
- Fix duplicated letters in the custom username while a Chinese input method composes it, keeping the reader's own text in the field until the edit commits and restoring the username an abandoned edit replaced
- Fix a plugin's footer block — the enterprise apps section — vanishing with the footer the takeover gathers, so the block keeps its place above the account row and the account menu carries its copy while the sidebar stands as the rail
- Fix the reasoning slider dropping frames while the reader drags, holds or releases at the strongest level by drawing the top rung's dot field on one canvas
- Fix running-title shimmer overlapping IM channel titles; titles drawn by pseudo-elements retain the native running marker and update when taken over or released

### Chores

- Reorganize the development directories and verification entry points, declare feature coverage in the manifests and run the stand-in page checks through one runner

## [0.20.2] - 2026-11-09

[中文](#cn-0.20.2) | [English](#en-0.20.2)

<h3 id="cn-0.20.2">体验优化</h3>

- 把回答行里的重跑与删除移到用量与时间之前，与宿主的动作按钮同处一簇
- 改善模型选择器一级列表的收尾，所选快捷供应商已列全时不再显示「更多模型」
- 降低超长回答流式输出时的扫描与渐显开销
- 改善长会话之间切换时的页面响应
- 看过的消息按上次高度跳过离屏排版，长会话之间切换更流畅
- 降低内容搜索的内存占用，小写文本只为查过的会话保留，并设固定上限
- 改善长会话的每帧开销，流式跟随、进程分组与等待行不再按整栏或整页扫描，归档列表只移动真正换位的行
- 同一颜色只回读一次画布，输入区的根标记经缓存的座位读取，页面不再为每帧的颜色与座位付一次查询
- 改善助手流式输出时的折叠调度，用户消息的新增、替换和尺寸变化仍会触发完整检查

### 问题修复

- 修复新会话首页切到「模型」标签页时的卡顿
- 修复侧栏「展开其余 N 个会话」的文字起点比会话标题靠右一截，两者现在同一起点
- 修复状态标记放在行首时，行首位带着其他插件内容的会话行，时间比其他行往左缩进一截
- 修复侧栏悬停展开后鼠标移开时收起动作播放两遍，现在只滑出一次
- 修复会话标题进入顶栏后缩成「论…」，标题宽度不再按上一个名字裁切后的宽度锁定，改名或换到标题更长的会话后重新占满可用宽度
- 释放页面已移除的消息的尺寸观察，长会话里这份订阅不再随消息累积
- 修复长会话性能测试两轮采样的仪器一致性和倍率门槛说明
- 修复会话头那簇控件在顶栏边界处被压窄的问题，宽度不够时它退回会话头那一行而不是截断或折行
- 修复会话切换后旧对话仍被滚动位置与等待行文案持有的问题，切换后不再保留上一段对话的页面内容
- 修复关闭再打开标题栏功能时重复注册右侧栏控件的问题
- 修复统计面板绑定在会话切换后留住旧对话，长会话反复切换时页面不再逐次增长
- 修复提问卡片中被选中的单选圆环在深色主题下显示为白色圆心的问题
- 修复页面缩放在 101% 时右侧栏列宽可能晚一帧换算的问题
- 修复连续思考增长时上方正文可能整段跳变的问题

<h3 id="en-0.20.2">Improvements</h3>

- Move rerun and delete on an answer's control row ahead of its usage and time, beside the host's own action buttons
- Improve the model picker's first level so More models is not drawn once the chosen quick providers already list the whole catalog
- Reduce streaming scan and reveal cost on very long answers
- Improve page responsiveness when switching between long conversations
- Skip off-screen layout of seen messages at their kept height, so switching between long conversations stays responsive
- Hold the lowercased search text only for the sessions a query reached, within a fixed budget
- Reduce the per-frame cost of a long conversation, where the stream follow, the process groups and the waiting line stop scanning whole columns and the archive moves only the rows that changed place
- Read each painted colour from the canvas once, and read the composer's root through the cached seat instead of a document query on every frame
- Improve streaming performance by skipping user-message folding for assistant-only growth while structural and size changes still refresh the fold

### Bug Fixes

- Fix the stall when switching to the Models tab on the new-conversation page
- Fix the sidebar's overflow row (“Show N more sessions”) starting its words further in than the session titles above it; the two now share one start
- Fix a session row whose leading seat carries another plugin's content showing its time a seat's width short of the others' when the mark stands on the leading side
- Fix the sidebar's hover peek retracting twice when the pointer leaves; it now slides away once
- Fix the session title shrinking to its first character in the caption row, with its width no longer locked to the ellipsized width of the name before, so a rename or a longer name takes the room again
- Release the size observation of a message the page removes, so the subscriptions stop accumulating across a long conversation
- Fix instrumentation consistency and growth-bound descriptions across the two long-session performance samples
- Fix the header's control cluster being squeezed at the caption row's boundary, so it returns to the header's own row instead of truncating when its width no longer fits
- Release the old conversation's page content on a session switch, where the scroll hold and the waiting line's wording no longer keep a transcript the page removed
- Release the right-panel control's slot registration when the header band is switched off, so a later switch-on registers it once
- Fix the statistics panel bindings keeping a switched-away conversation, so repeated long-session switches stop growing the page
- Fix the question card's chosen radio showing a white centre under the dark theme
- Fix delayed column scaling when the right sidebar is toggled at 101% page zoom
- Fix whole-step jumps in earlier reasoning text as continuous reasoning grows

## [0.20.1] - 2026-11-08

[中文](#cn-0.20.1) | [English](#en-0.20.1)

<h3 id="cn-0.20.1">新增功能</h3>

- 新增「提示音效」设置，任务完成或受阻时播放提示音，可选关闭、轻柔、清晰，默认关闭

### 体验优化

- 改善对话区宽度手柄的亮线，等指针停住后再出现，不再被掠过的指针闪出
- 改善侧栏「更多」菜单的外观，使其在启动按钮右侧弹出、宽度随内容收缩、图标与文字同色、投影更深，并把侧栏顶部的图标改为更大的无底色图标
- 把「进行中对话」标记位置的默认值改到左侧
- 改善轮次导航卡片对指针的跟随，指针的高度即列表位置，移到横线左侧即停住以便点选

### 问题修复

- 修复日期视图开着时从视图菜单改的分组被按回单列表
- 修复皮肤浮层卡片内的宿主提示气泡被卡片盖住，只露出卡片边缘外的一截
- 修复图片预览蒙版被全局对话框尺寸上限缩小、右侧与底部各留出 48px
- 修复窄屏输入框工具栏随模型名长度折行，长模型名在原地省略
- 修复输入框底行右侧上下文圆环比左侧权限控件多缩进一层、两端视觉边界不对称
- 修复第三方插件插入的标签与宿主标签不垂直居中，标签栏按一个 segment 排它的每一个直接子元素
- 修复紧凑底栏的统计浮层下方仍保留空白统计行
- 修复「标题进入顶栏」把模式与智能体芯片留在标题下方另起一行，顶栏因此高出一整行、分割线随之下沉
- 修复关闭「对话 / 轨迹标签条」后宿主标签条仍被皮肤的悬停淡出、下划线隐藏与内边距接管
- 修复模型列表的每一行在分钟切换后多出一个峰谷电价表
- 修复顶栏接管标题后头部按宿主最小高度撑开、标签下划线与分割线之间多出一段空白

<h3 id="en-0.20.1">New Features</h3>

- Add a Sound cue setting that plays a cue when a task finishes or is blocked, choosing Off, Soft or Clear, off by default

### Improvements

- Improve the conversation width handle's bar to appear once the pointer rests, no longer flashing at a pointer passing over
- Improve the sidebar More menu so it opens beside its launcher, fits its rows, draws icons in the text colour and casts a deeper shadow, and give the sidebar's top rows larger icons without a backing disc
- Move the Ongoing conversations marker side's default to the left
- Improve the turn card's pointer steering, whose height over the rail's lines is the list's place, standing still once the pointer leaves the lines for a row to be pressed

### Bug Fixes

- Fix a grouping picked from the view menu being forced back to one list while the date view is on
- Fix a host tooltip opened inside a skin card being painted under the card, leaving only a strip past the card's edge
- Fix the image preview backdrop being shrunk by the global dialog size cap, leaving a 48px gap at its right and bottom edges
- Fix the narrow composer toolbar wrapping with model name length, truncating long model names in place
- Fix the context ring at the composer row's right end sitting a layer further in than the permission control at its left
- Fix a third-party plugin's tab in the conversation strip sitting off the host tabs' centre line, by stating one segment box for every child of the tablist
- Fix the compact statistics footer leaving a blank dock below its overlaid figures
- Fix the preset picker and the session chips standing on a second row under the lifted title, leaving the caption a row taller with its divider sunk below that row
- Fix the host's own conversation tabs staying under the skin's hover fade, hidden underline and padding after the Chat / Trajectory tabs switch is turned off
- Fix a second peak rate meter appearing on every model row after a minute rollover
- Fix the header keeping the host's minimum height once the caption row holds the title, which left a gap between the tab underline and the divider

## [0.20.0] - 2026-11-07

[中文](#cn-0.20.0) | [English](#en-0.20.0)

<h3 id="cn-0.20.0">新增功能</h3>

- 新增吉祥物悬停气泡，以像素字体显示含赠金、随会话花费实时扣减的账号余额与当前会话的花费
- 新增思考内容显示选择，默认两行步进并可改为逐字跟随
- 新增模型选择器的供应商分组折叠，悬停时才出现两段线箭头，展开状态不跨会话保留；分组之间拉开间距，供应商分隔线画得更清楚
- 新增模型回复所在轮次的重跑与删除，通过新分岔保留原会话
- 新增 System sans 字体选择，统一界面与 Markdown 的系统无衬线回退
- 新增独立界面字号调节，覆盖侧栏、输入区与设置等普通文字

### 体验优化

- 调整「思考内容显示」在设置页的位置，排到「动效」页末尾
- 改善模型弹层改换尺寸时的观感，折叠供应商分组走 Card resize 过渡，展开时底边始终贴在触发区上方
- 改善侧栏「工作区」标题行铃铛的墨色，与同一行里宿主的图标共用同一级墨色令牌
- 改善侧栏「工作区」标题行铃铛的操作反馈，悬停底色与宿主的图标一致，指针停稳后给出进入或离开日期视图的提示

### 问题修复

- 修复未安装 Anthropic 字体时页面向这三个字体文件发出的 404 请求
- 修复充值页的全窗口遮罩被对话框尺寸上限缩小、在窗口右侧和底部露出主界面的问题
- 修复英文界面下权限档位的说明仍显示中文
- 修复长间隔之后输出加快时聊天滚动位移逐渐累积、最新一行被推出可视区的问题
- 修复读者上滑浏览时流式增长仍改变其滚动位置的问题
- 修复流式输出收尾时消息列回弹与底部统计行跳动的问题
- 修复侧栏工作区分组标题与会话标题在暗色下层级相近的问题
- 修复移动端软键盘改变可视视口时输入区的跟随与底距
- 修复移动端首页用量面板与热力图左右不居中的问题
- 修复 Windows 顶栏高度与标题控件的垂直位置
- 修复日期视图默认开启的问题，侧栏默认按宿主自己的分组排列，按下铃铛才排成日期段落，刷新后回到宿主分组
- 修复账号余额对第三方供应商的会话也实时扣减的问题，平台余额只为官方供应商的会话变化
- 修复界面重载后价格目录晚到导致模型行整张重画、费率徽标闪烁的问题

<h3 id="en-0.20.0">New Features</h3>

- Add a hover bubble over the mascot that shows, in a pixel font, the account balance with gifted credit drawn down live by the conversation's cost, and that cost
- Add a reasoning display choice that steps the text two lines at a time by default, with continuous text as the option
- Add collapsible provider groups to the model picker, with the two-stroke caret shown on hover and the fold never kept across sessions; provider groups sit further apart and their rule is drawn clearer
- Add rerun and delete-turn actions for model answers, preserving the source session through a new branch
- Add a System sans choice with one system fallback stack across the interface and Markdown
- Add an independent font-size control for ordinary text in the sidebar, composer and settings

### Improvements

- Move the reasoning display row to the end of the Motion tab in settings
- Improve the model picker's card when it changes size: a folded provider group travels over Card resize, and the card keeps its bottom edge above the trigger while a group opens
- Improve the sidebar workspace header bell's ink to share the level the host's own icons in that row use
- Improve the sidebar workspace header bell's feedback with the host's own hover wash and a tooltip naming the date view it switches to or from

### Bug Fixes

- Fix the 404 requests the page sent for the three Anthropic font files when they are not installed
- Fix the recharge page's full-window overlay shrinking under the dialog size cap and leaving the main window showing at its right and bottom edges
- Fix the permission tiers' descriptions staying Chinese on an English interface
- Fix the chat scroll offset building up after a long pause in a faster stream and pushing the newest line out of view
- Keep the reader's chosen scroll position steady while a streamed answer grows
- Fix the message column rebound and footer statistics jump as a streamed answer settles
- Separate sidebar workspace labels from session titles in the dark scheme
- Keep the composer following the visible viewport as the mobile keyboard opens, moves and closes
- Center the home usage panel and heat grid within the available column on mobile
- Fix Windows caption height and vertical alignment of the title and header controls
- Fix the date view opening by default; the sidebar follows the host's own grouping until the bell is pressed, and a reload returns to the host grouping
- Stop the account balance deducting third-party provider sessions; the platform figure now moves only with the official providers' sessions
- Stop the rate badges flashing when a reload's price catalog arrives after the model rows are painted

## [0.19.10] - 2026-11-06

[中文](#cn-0.19.10) | [English](#en-0.19.10)

<h3 id="cn-0.19.10">新增功能</h3>

- 新增读者消息的撤回与编辑，两者都从消息前分岔，撤回把原文放回新会话的输入框，编辑把改过的文字直接发出
- 新增「重绘提问卡片」开关，关闭后提问卡片保留宿主原样
- 新增会话菜单的持久化手动未读标记与再次访问清除
- 新增进行中标记的左右位置选择，默认在行尾，左侧一档让标记回到行首插槽并保留真前导占位，第三方行首星标不再压住标题首字

### 体验优化

- 减少一批页面变化里主题自身写入的重复判定
- 读者消息下面的时间与复制按钮改为指针落上去才显现，与 Claude Code 一致
- 改善提问卡片宽度，与对话输入框上下对齐，问题标题换行更均衡
- 皮肤自己绘制的按钮与标题改用宿主的提示气泡，不再使用浏览器原生提示
- 背景不透明度一行只在壁纸插件生效时出现

### 问题修复

- 修复回答首行定位在流式输出期间不生效
- 修复已归档列表隐藏当前打开的空白会话
- 修复浏览历史消息时输入框尺寸变化或提问卡片出现将会话拉回底部
- 修复快速流式输出时消息列在末尾下方越积越远、最新一行落到可视区之外，滑动时长改为跟着输出到达的节奏

### 移除

- 移除对 dsh 0.2.2-rc.1 之前版本的支持，升级本插件前请先把 DeepSeek Harness 升级到 0.2.2-rc.1 或更新版本
- 移除侧栏的「会话按日期排列」开关，日期分段成为默认排法，顶行的铃铛随手换回宿主的按工作区分组

<h3 id="en-0.19.10">New Features</h3>

- Add retract and edit to a message the reader sent, each forking ahead of the message, retract putting its text back in the new session's composer and edit sending the amended text
- Add a Question card restyle switch that keeps the host's own question card when off
- Add persistent manual unread marks in session menus with clearing on a later visit
- Add a side choice for the running marker, at the trailing end by default, with the left side returning it to the host's leading slot and keeping that band reserved so a third-party leading star no longer covers the title's first glyph

### Improvements

- Judge a batch of page changes once for all of its subscribers
- Show the clock and copy buttons under a message the reader sent only while the pointer is on it, as Claude Code does
- Improve the question card to match the composer's width and balance its title lines
- Show the skin's own buttons and titles with the host's tooltip bubble instead of the browser's native one
- Show the background opacity row only while a wallpaper plugin is active

### Bug Fixes

- Fix the answer first-line anchor doing nothing while an answer streams
- Fix the archived list hiding the blank conversation that is open
- Fix composer resizing or question cards pulling the conversation to the bottom while reading earlier messages
- Fix the message column piling up below the tail during a fast stream until the newest line sat off screen, with the slide now timed to the pace the answer arrives

### Removals

- Remove support for dsh before 0.2.2-rc.1; upgrade DeepSeek Harness to 0.2.2-rc.1 or later before updating this plugin
- Remove the Group sessions by date switch; the date grouping is the default order and the top row's bell still returns to the host's workspace grouping

## [0.19.9] - 2026-11-05

[中文](#cn-0.19.9) | [English](#en-0.19.9)

<h3 id="cn-0.19.9">体验优化</h3>

- 降低会话较多时侧栏状态同步的观察开销
- 新增独立的会话标题扫光选项与同步预览，统一未读和待操作状态颜色并保留无障碍回退
- 改善设置页选项描述文案与代码注释，清理无关交互机制与内部实现细节
- 减少流式输出与输入过程中的整页查询
- 将等待尾部判定和会话导航索引测量合并到共享帧读阶段，减少流式输出中的重复样式计算

### 问题修复

- 修复多插件同时占用输入区工具栏时模型名称被压缩消失的问题，并保留现有 Claude 输入框布局
- 修复侧栏首行与新建会话之间的间距比其余行距更宽、面板行图标不再落在新建会话圆片那一列的问题
- 修复已归档会话的取消归档与删除按钮在部分宿主版本上只显出悬停底色、图标不显示的问题
- 修复文本输入框的自绘光标接管与位置测量
- 卸载时取消提问卡待执行的帧任务，避免卸载后继续刷新或移动焦点

<h3 id="en-0.19.9">Improvements</h3>

- Reduce sidebar status observation overhead with many conversations
- Add an independent running-title shimmer with matching previews, semantic unread and pending colors, and accessible fallbacks
- Improve settings descriptions and code comments by removing irrelevant interaction mechanisms and internal implementation details
- Reduce whole-document queries during streaming and typing
- Batch waiting-tail and conversation-navigation measurements in the shared frame read phase to reduce repeated style calculation while streaming

### Bug Fixes

- Keep the model selector readable when plugins crowd the composer toolbar while preserving the existing Claude composer layout
- Fix the sidebar's first row standing further from the New session plate than the rows under it and the panel rows' glyphs leaving the New session chip's column
- Fix the archived conversations' unarchive and delete buttons showing only their hover wash on some host versions, with no glyph
- Restore drawn-caret takeover and geometry for plain-text inputs
- Cancel pending question-card frames on teardown so released cards cannot refresh or move focus

## [0.19.8] - 2026-11-04

[中文](#cn-0.19.8) | [English](#en-0.19.8)

<h3 id="cn-0.19.8">新增功能</h3>

- 新增全局背景不透明度调节，以便与壁纸插件组合使用
- 新增侧栏品牌标志的显示开关
- 新增鲸娘像素吉祥物
- 新增可选的回答首行定位开关，正式回答开始时把第一行带到对话区顶部并停下

### 体验优化

- 会话状态指示移到行右侧，支持右键和菜单键打开原生会话菜单，悬停时状态与时间让位给行内归档、置顶按钮
- 日期视图的会话行在悬停或打开行菜单时隐藏行上的工作区标签，让位给行内操作
- 改善螃蟹的思考动画，改为举着泡泡棒吹泡泡
- 改善提问卡布局与选项样式，将卡片移到对话末尾并采用蓝色圆形单选标记
- 改善螃蟹吹泡泡、指挥、听音乐、睡觉与被挠痒时的动画，改为侧身朝向
- 将侧栏搜索框改为通过宿主面板列表注册的按钮，点击时保持当前页面并打开搜索面板，搜索样式保留图标与独立两项，已有的覆盖品牌设置迁移到独立
- 降低流式输出期间上下文估算的扫描频率，并延后加载账户头像
- 改善归档会话列表的分页加载与大量历史会话下的渲染性能
- 将 Markdown 正文链接在悬停与聚焦时保持链接蓝，不再变为强调色
- 将 Markdown 中的文件链接改为与网页链接一致的蓝色、正文字体与下划线
- 将 Claude 配色的行内代码字色改为中性黑，与正文墨色一致
- 改善会话头部在标题抬入标题栏后留下的空白，会话内容紧接控件行

### 问题修复

- 修复螃蟹指挥时指挥棒悬空、被挠痒时抬起的腿与壳分开
- 修复宿主给每个面板行加了一层包装后，编辑侧栏里勾掉的入口不再从侧栏消失的问题
- 修复新建会话与插件列表之间多出一段间距、侧栏第一行比其后的行距更疏的问题
- 修复统计信息收进上下文时输入卡片下方仍留着一条空白的问题
- 修复 ds-bot 已登录时“代码”切换会误选中登出菜单项的问题
- 修复阅读视图下输入区被隐藏的问题
- 修复已归档列表无法滚动、无法加载下一页的问题
- 修复新会话与插件列表因负边距而相互重叠的问题
- 修复触屏设备上流式输出时无法通过触摸停止自动跟随的问题
- 修复已归档列表行的取消归档与删除图标与宿主行内图标不一致的问题
- 修复全屏启动动画被弹窗尺寸上限裁切的问题
- 修复第三方模型选择器被皮肤隐藏而无法使用 Codex 速度档位的问题
- 修复侧栏视图菜单里选择「单列表」后立即被改回工作区、单列表模式无法使用的问题
- 修复日期视图把所有会话都归入「更早」、行上也不标出所属工作区的问题
- 修复输入卡片同时显示宿主与主题模型选择器的问题
- 修复触屏上按住对话区时流式输出仍把阅读位置推走的问题
- 修复手指在对话区底部抬起后自动跟随不再恢复的问题
- 修复子代理运行时停止键被发送键盖住的问题
- 修复子智能体侧栏输入框缺少皮肤权限控件的问题
- 修复子智能体侧栏的权限选择写入主对话会话的问题
- 修复子智能体侧栏的上下文圆环掉到卡片下方单独一行的问题
- 修复子智能体侧栏的上下文面板在主对话圆环上方打开的问题
- 修复子智能体侧栏输入卡片抢走主对话模型座位的问题
- 修复子智能体侧栏输入区工具行在宽度足够时仍换成两行的问题
- 修复状态行遮挡后排入的提问卡与用户消息的问题
- 修复插件拆卸后异步回调仍申请页面刷新的问题

### 移除

- 移除右侧栏的卡片布局与其设置项，面板改回宿主自己的底色并贴着栏边

<h3 id="en-0.19.8">New Features</h3>

- Add global background opacity control for use with wallpaper plugins
- Add a switch for showing the sidebar brand mark
- Add the whale girl pixel mascot
- Add an optional switch that brings the formal answer's first line to the top of the conversation as it starts and stays there

### Improvements

- Place native session status at the trailing edge, open native menus with right-click or menu keys, and let the status and time step aside for the inline archive and pin buttons on hover
- Hide the workspace label on a date-view session row while it is hovered or its menu is open, leaving the room to the inline actions
- Improve the crab's thinking animation so it blows bubbles from a bubble wand
- Improve the question card by moving it to the end of the conversation and drawing circular blue radio marks
- Improve the crab's bubble-blowing, conducting, music, sleeping and tickle animations so it turns to one side
- Register the sidebar search button through the host panel list, keep the current page when opening the search palette, retain Icon and Standalone as the two styles, and migrate a stored Cover the brand choice to Standalone
- Reduce context-estimate scanning during streaming and defer account avatar loading
- Improve archived-session pagination and rendering with large conversation histories
- Keep Markdown links in the link blue under hover and focus instead of the accent ink
- Style Markdown file links like web links, in the link blue with the prose face and underline
- Paint inline code in the Claude palette with the neutral ink instead of the warm red
- Improve the blank the conversation header kept once the title moved into the window title bar, the conversation now starting right under its controls

### Bug Fixes

- Fix the crab's baton floating clear of its claw while conducting and its lifted legs parting from the shell while tickled
- Fix the entries unchecked in the edit-sidebar dialog staying on the sidebar list after the host began wrapping every panel row in a box of its own
- Fix the extra space between New session and the panel list that left the sidebar's first row further from the plate than the rows below stand from each other
- Fix the blank row left under the composer card while the statistics position keeps the numbers in the context popover
- Fix the Code switch selecting ds-bot’s sign-out item when its account menu is signed in
- Fix the composer disappearing in the reader view
- Fix the archived list not scrolling or loading its next page
- Fix New session and the panel list overlapping because of a negative margin
- Fix streaming output ignoring a touch gesture meant to stop automatic following on touchscreens
- Fix the archived rows' unarchive and delete icons differing from the host's own row icons
- Fix the dialog size cap clipping a full-window boot animation
- Fix the skin hiding third-party model selectors and their Codex speed controls
- Fix the sidebar's Single list grouping snapping back to Workspace right after it is picked, which made the single-list mode unusable
- Fix the date view filing every conversation under Earlier and leaving the workspace label off its rows
- Fix the composer showing both the host and skin model selectors
- Fix streaming output still pushing the reading position away while a touchscreen reader holds the conversation
- Fix automatic following not resuming after a finger is lifted at the bottom of the conversation
- Fix the stop button over a running subagent being covered by the send one
- Fix the missing skin permission control in a subagent sidebar's composer
- Fix a subagent sidebar's permission pick being written to the main conversation's session
- Fix a subagent sidebar's context ring dropping onto a line below its card
- Fix a subagent sidebar's context panel opening over the main conversation's ring
- Fix a docked subagent composer taking the model seat from the main conversation
- Fix a subagent sidebar's composer toolbar wrapping onto a second line with room to spare
- Fix the status line covering question cards and reader messages mounted after it
- Fix asynchronous callbacks scheduling page passes after teardown

### Removals

- Remove the right sidebar's card layout and its setting, leaving panels in the host's own fill flush with the column

## [0.19.7] - 2026-11-03

[中文](#cn-0.19.7) | [English](#en-0.19.7)

<h3 id="cn-0.19.7">新增功能</h3>

- 新增侧栏的日期视图，会话按今天、昨天、星期几与更早分段，每行右手标出所属工作区，按顶行的铃铛在两种排法之间切换

### 体验优化

- 新增模型选择器第一层的输入即搜索，并在分组多于一个时保留“更多模型”一栏
- 新增按控件标识注册的外部挂载接口，允许其他插件在独立区域引用模型选择器等控件
- 侧栏「工作区」标题行右端多出一枚铃铛，按下去在宿主的工作区分组与按日期排列之间切换
- 页面缩放改成一个输入框，可输入 60 到 200 的任意百分比，悬停输入框可按滑条拖动，旁边的「恢复默认」回到默认值，旧设置里的固定档位自动换算过来
- 改绘提问卡片与已作答的回复气泡，采用与输入框一致的卡片外观
- 读者自己发出的消息气泡改用宿主写下的标记来认，不再靠背景色猜是哪一块
- 侧栏里正在运行的会话排到所属列表的最前面，运行标记消失后行回到宿主排定的位置
- 新建工作树控件改放在模式座位旁边，不再停在输入框上方那一行的右端

### 问题修复

- 修复宿主改写间距规则后对话流不再按宿主原有的间距排布的问题
- 修复过程组收起后它的答案行被跳过排版、展开时页面跳位的问题
- 修复侧栏收起成图标栏时面板行比新建会话按钮窄一像素的问题
- 修复侧栏页脚里插件以固定定位挂载的面板打开后立刻消失的问题
- 修复页脚里的插件卡片在按下瞬间被重建而丢掉这次点击的问题
- 修复侧栏插件浮层被页脚收拢隐藏及浮层文字行高塌缩的问题
- 修复 macOS 桌面端侧栏的 Claude 图标与名称无法跟随标志颜色设置的问题
- 修复从账号菜单打开的设置面板在鼠标离开后自行关闭的问题
- 修复安装 dsh-cost-meter 后首页概览的会话数与 Token 总量偏低的问题
- 修复切换会话时输入框先画在宿主自己的样式上、随后跳回皮肤样式的一帧闪动
- 修复思考块内的段落间距被正文 Markdown 规则放大的问题
- 修复鼠标滑过首页用量面板热力图时面板高度抽动的问题
- 修复侧栏收起成图标栏后各面板图标偏小、与下方添加文件夹和搜索图标大小不一的问题
- 修复页面残留隐藏的模态框或菜单时，悬停展开的侧栏移开鼠标后不收起的问题
- 修复 Windows 桌面端会话标题在系统标题栏不显示的问题
- 修复流式输出时状态行随每段新内容落位上下跳动的问题

<h3 id="en-0.19.7">New Features</h3>

- Add a date view to the sidebar that groups sessions under Today, Yesterday, each weekday and Earlier, tags every row with the workspace it belongs to, and switches between the two orders from the top row's bell

### Improvements

- Add type-to-search on the model picker's first level, and keep the More models row with more than one provider
- Add a control-id registry for external mounts so other plugins can reference controls such as the model picker in independent regions
- Draw a bell at the right end of the sidebar's workspace heading that switches the list between the host's workspace grouping and the date view
- Page zoom is one field that takes any percentage from 60 to 200, dragged on the seekbar its hover opens and reset by the label beside it, with the fixed steps stored by an earlier version converted as they are read
- Draw the question card and the settled reply in the same card look the composer keeps
- Read the reader's own message bubble from the mark the host writes on it, instead of guessing which block it is by its background colour
- Stand a session that is running at the head of the list it belongs to, and let the row return to the host's own order once the running mark goes away
- Place the new-worktree control beside the mode seat instead of the far end of the row above the composer

### Bug Fixes

- Fix the conversation flow no longer spacing itself by the host's own gap rules after the host rewrote them
- Fix a process group's answer row being skipped for layout, so opening a folded group no longer shifts the page
- Fix the sidebar's panel rows being one pixel narrower than the new-session button while the sidebar stands as an icon rail
- Fix a plugin's fixed-position panel mounted in the sidebar footer vanishing as soon as it opens
- Fix a plugin's footer card losing the press when the takeover rebuilt it mid-click
- Fix sidebar plugin overlays being collapsed by the footer takeover and their text line height collapsing
- Fix the Claude mark and wordmark in the macOS desktop sidebar ignoring the mark colour setting
- Fix the settings panel opened from the account menu closing itself once the pointer leaves
- Fix the home overview undercounting sessions and tokens whenever dsh-cost-meter is installed
- Fix the composer drawing at the host's own style for a frame after a session switch, then jumping to where the skin keeps it
- Fix the paragraph spacing inside a thinking block being widened by the prose Markdown rule
- Fix the usage panel's height jittering as the pointer crosses the heat grid on the home page
- Fix the sidebar rail's panel icons standing smaller than the add-folder and search icons below them
- Fix the hover-opened sidebar staying up after the pointer leaves when a hidden modal or menu stands in the page
- Fix the session title missing from the window caption row on the Windows desktop
- Fix the status row bouncing as each burst of streamed content lands

## [0.19.6] - 2026-10-30

[中文](#cn-0.19.6) | [English](#en-0.19.6)

<h3 id="cn-0.19.6">新增功能</h3>

- 新增独立的「推理等级滑块」开关，关闭后把推理等级的座位交还宿主，让第三方推理强度插件注入到模型座位的滑块重新可见

### 体验优化

- 改善模型用量图表的柱子与日期轴，使柱子自基线生长，日期标签按可用宽度抽稀并保留最新一天
- 收紧编辑侧栏对话框的卡片圆角，并在勾选时沿路径描绘对钩

### 问题修复

- 回合结束后宿主留下的占位状态行不再被画上第二条等待行，加载点不再出现两套。
- 修复中文输入法上屏后皮肤光标停在第一个分词结果后面的问题
- 修复未配置 API Key 时 DeepSeek 账号的模型不出现在模型选择器一级列表的问题
- 修复侧栏会话行的操作按钮在 DSH 新版下相互重叠的问题
- 修复切换会话时视图标签条先画在宿主自己的位置上、随后跳回皮肤位置的一帧闪动
- 修复开启页脚接管后宿主的版本更新入口被隐藏的问题
- 修复过程行的单列布局去掉宿主限高、过程越多卡片越高的问题
- 修复安装 dsh-cost-meter 后首页概览的高峰时段恒显示「—」的问题
- 修复切换对话与轨迹视图时观察者在换树过程中反复强制样式重算造成的卡顿

<h3 id="en-0.19.6">New Features</h3>

- Add a separate Reasoning effort slider switch that hands the reasoning-effort seat back to the host when off, so a third-party effort slider injected into the model seat shows again

### Improvements

- Improve the model usage chart's columns and date axis so the columns grow from the baseline and the labels thin to the width available while keeping the newest day
- Tighten the Edit sidebar dialog's card corner and draw the tick along its path when an item is checked

### Bug Fixes

- The slot the host keeps after a turn stops no longer gets a second waiting line drawn into it, so the loader no longer shows twice.
- Fix the skin's caret stopping after the first segment when a Chinese input method commits English letters
- Fix the DeepSeek Account models missing from the model picker's first level when no API key is configured
- Fix the sidebar session row action buttons overlapping under the new DSH release
- Fix the view tab strip drawing at the host's own place for a frame after a session switch, then jumping to where the skin keeps it
- Fix the host's version-update control disappearing once the footer takeover is on
- Fix the column process rows growing the group card with every step instead of scrolling it inside the card
- Fix the peak hour reading as a dash on the home overview whenever dsh-cost-meter is installed
- Fix the repeated forced style recalculation by observers during a conversation-trajectory view switch

## [0.19.5] - 2026-10-27

[中文](#cn-0.19.5) | [English](#en-0.19.5)

<h3 id="cn-0.19.5">新增功能</h3>

- 新增过程行的单列风格
- 新增侧栏「更多」菜单里的「编辑侧栏…」
- 设置页标签栏的每个标签前新增一枚线性图标
- 新增「首页版面」的「关闭」选项

### 体验优化

- 改善设置页「首页版面」的预览卡
- 改善设置页的分组与控件
- 改善设置页标题行的仓库入口

### 问题修复

- 修复窄窗口下指针停在侧栏开关上时整窗被压暗的问题
- 修复切换会话后正文行距与表格宽度再次变化
- 修复 macOS 上标签条上抬后标题栏按钮间歇点不动
- 修复工作台版面上输入卡片跑到问候语下面、不再贴窗口底边

<h3 id="en-0.19.5">New Features</h3>

- Add a column style for process rows
- Add Edit sidebar… to the sidebar's More menu
- Add a line mark before each tab in the settings tab strip
- Add an Off choice to Home layout

### Improvements

- Improve the Home layout previews in settings
- Improve the settings page's grouping and controls
- Improve the repository link in the settings heading

### Bug Fixes

- Fix the whole window dimming while the pointer rests on the sidebar toggle in a narrow window
- Fix the prose's line height and table widths changing again after a session switch
- Fix the titlebar buttons on macOS intermittently ignoring a press once the view-tab strip rises
- Fix the composer card landing under the greeting instead of the window's bottom edge on the dashboard home

## [0.19.4] - 2026-10-26

[中文](#cn-0.19.4) | [English](#en-0.19.4)

<h3 id="cn-0.19.4">新增功能</h3>

- 新增看板用量能力：已折好的会话用量（每天的四类 token 分桶、按小时的结算次数与各模型总量）经 `dsh-claude-style:usage` 交给看板组件，与工作台首页那块用量面板读同一份缓存；能力注册可以带自己的调用时长上限。
- 新增对 `dsh-better-sidebar` 底部面板的页面像素适配：面板的左右边取两侧栏的实际位置、上边取输入区座位的下沿、下边取窗口底，全部按页面缩放因子换算；拖拽侧栏期间暂停写入，缩放回到 1 倍时把插件自己的值写回。
- 新增自定义计费表（#170）：设置页「计费币种」下面多一行「编辑」，打开一张按模型填写单价的表（模型 / 缓存读 / 输入 / 输出，每百万 token）。填过的桶覆盖官方价格表，留空的桶仍按表格计价；表格里查不到的模型只按这张表计价。价格表跟会话一起送到宿主，正在流式估算的那一段也按同一张表算。窄屏时每一行折成一张卡片，模型在上、三个单价各带标签。

### 体验优化

- 改善用量面板热力图的日提示：提示改为网格里常驻的一个元素，指针从一天移到另一天时在两天之间移动与缩放，不再为每一格生成一个再销毁，指针移过格间空隙时也不再消失；出现前有一小段停顿，离开时随即淡出。
- 改善颜色涂装的开销：等待行与设置预览卡上，色相与漂移两条常驻动画从连续插值改为按二十四步推进，`filter` 与八层背景位置从每帧重绘降为每周期二十四次（约每秒五次）；四到五秒的周期下，漂移仍读作流动而不是跳动。
- 改善折叠摘要测算文案宽度的开销：测量所依赖的字体签名按隐藏的测量元素缓存，字体加载完成时整体失效，`getComputedStyle` 不再每个分组每趟重算；宽度表超过五百条时重新开始，长会话里每个不同的计数不再各占一条永久记录。

### 问题修复

- 修复宿主的语音输入展开输入行活动格时，主题认不出这一格、挂载其中的麦克风入口随之失去座位排版的问题。
- 修复页面缩放下页面横向滚动、内容越出窗口右边界（#166）：缩放只写在 `<body>` 上，`<html>` 的内边距与 `<body>` 的外边距先按窗口排版、再被倍数放大，越过窗口的那几像素又没有哪个 `overflow` 收得住。缩放时两者一并归零，纵向滚动交给文档元素，页面宽度不再随倍数多出几像素。
- 修复中文输入法的合成被皮肤打断：输入框处于合成期间时，空闲提示不再写入输入卡片，合成落地后再补写一次，微软拼音等输入法可以完整输入一个词。
- 修复模型选择器的峰谷徽章在分钟刷新后仍使用旧的悬停提示与读屏文字，使两级菜单的倍率、倒计时与完整说明同步更新，跨分钟打开二级菜单时也会刷新已有行。
- 修复窗口不可见时皮肤动画仍在运行：页面隐藏时 `<body>` 带上 `data-dsh-claude-asleep`，样式表把页面上的动画停在当下位置，首页涟漪的帧与字符定时器一并停摆，回到前台从当下继续，不再追赶积压的合成帧。
- 修复比窗口还高的皮肤弹层把下半截画到页面外：落位之后统一夹进窗口，卡片从窗口上沿开始，底部的行不再落到看不见的地方。
- 修复选择「减弱」动画后骨架脉冲仍在循环：上下文统计面板与首页用量面板的占位条各有一处声明压过全局兜底把循环次数定成一次的规则，一处是带 `!important` 的动画简写，一处是更高的选择器权重；两处改为从兜底网读循环次数。
- 修复会话视图页签的按钮盒相互重叠的问题，使各页签的点击区域与选中底板保持独立。
- 修复侧栏页脚的更新入口在接管后消失（#167）：插件挂在 `sidebar.footer.action` 里的更新控件带 `data-dsh-plugin="update"` 与 `data-dsh-part="entry"`，皮肤按这两个名字认出它，把它留在侧栏——原节点留在槽位里不显示，账号行右端立一份它的副本，文案、图标、进度与点击都跟着插件自己走；侧栏收成细轨时副本收起。
- 修复三处随使用累积的残留：模型按钮重建时，标签交换的尺寸订阅没有随旧标签释放；模型子菜单的悬停定时器与光标焦点结算的定时器在功能拆卸后仍会触发。
- 修复账号行显示登录用的账号号码而不是设置里的用户名：桌面端有账号行时那一行由宿主自己渲染，皮肤只重绘了它的盒子与头像，文字从未被替换；而设置页明确写着「用户名显示在欢迎语与账号行里」。现在宿主那行的标签换成解析出的名字，交还页脚时把宿主原文放回。
- 修复关闭「重绘模型选择器」后上下文圆环掉到工具栏下方单独一行（#162）：圆环原本以模型座位的盒子为落点，关闭重绘后座位不存在，于是皮肤既没有画圆环、也没有把宿主自己的圆环收起来，宿主那个更宽的圆环占住这一行，中段空档被判为放不下，整行让到下方。圆环回答的是上下文用量，与模型选择器是否重绘无关：没有座位时它落在座位的槽本身，宿主圆环照旧收起。

<h3 id="en-0.19.4">New Features</h3>

- Add a widget-board usage capability: the folded session usage (four token buckets per day, settlements per hour and per-model totals) reaches widget cards as `dsh-claude-style:usage`, reading the same cache as the studio home panel; a capability registration can now carry its own call timeout.
- Add page-pixel fitting for `dsh-better-sidebar`'s bottom panel: its left and right edges follow the two side columns, its top edge follows the composer seat's bottom, and its height reaches the window's bottom, all divided by the page-zoom factor; writes pause while a column is dragged, and every value the plugin wrote is restored at scale 1.
- Add the custom price table (#170): a "Edit" row under the billing currency opens a per-model table of rates (model / cache read / input / output, per million tokens). A filled bucket overrides the official tables and a blank one keeps their rate; a model the tables do not carry is priced from this table alone. The rows travel with the session to the host, so the answer still streaming is priced the same way. Under 760px each row folds into a card with the model above three labelled rates.

### Improvements

- Improve the usage panel's day tip: the tip is one element the grid keeps, so it travels and resizes between two days instead of being built and dropped for each cell, and crossing the gutters between cells no longer makes it disappear; it rests a moment before appearing and fades at once on the way out.
- Improve the cost of the colour wash: on the waiting line and the settings preview cards, the hue turn and the drift advance in twenty-four steps instead of interpolating continuously, taking the `filter` and the eight background positions from a repaint per frame to twenty-four a cycle (about five a second); over a four-to-five-second cycle the drift still reads as drifting rather than stepping.
- Improve the cost of measuring a folded summary's wording: the face a measurement depends on is kept per hidden measuring span and dropped when a face arrives, so `getComputedStyle` is no longer recalculated per group per pass, and the table starts over past five hundred entries instead of keeping a permanent record for every count a long session rolls.

### Bug Fixes

- Fix the theme not recognising the composer's activity seat while the host expands it for voice input, which took the seat's layout away from the microphone entry mounted inside it.
- Fix the page scrolling sideways and content running past the window's right edge at a page zoom (#166): the scale was written on `<body>` alone, so the document element's padding and the body's margin were laid out against the window and then drawn through the factor, and no `overflow` could clip the few pixels that reached past it. Both go to zero while the page is drawn at a factor and the document element takes the vertical scroll, so the page no longer grows a few pixels wider with every step.
- Fix the skin breaking an input-method composition: the idle hint is no longer written into the composer card while the field is composing, and settles once the composition lands, so CJK input methods can finish a word.
- Fix model picker rate badges retaining stale tooltips and accessible names after a minute refresh, keeping the rate, countdown and full judgement together in both menu levels and refreshing existing rows when the second level opens in a new minute.
- Fix the skin's animations running while the window is hidden: a hidden page marks `<body>` with `data-dsh-claude-asleep`, the stylesheet holds every animation on the page where it stands, and the home ripple's frame and character clocks stop with it, so a return carries on from there instead of catching up on queued frames.
- Fix a skin popover taller than the window drawing its lower rows off the page: every card is held inside the window after it is placed, so it begins at the window's top edge instead of ending below its bottom.
- Fix the skeleton pulses still cycling under the Reduced animation choice: the placeholders of the context statistics panel and of the home page's usage panel each overrode the theme-wide net's single iteration — one through a shorthand carrying `!important`, the other through a heavier selector — and both now take their iteration count from that net.
- Fix overlapping conversation view-tab buttons so each tab keeps its own hit area and active pill.
- Fix the update control vanishing from the sidebar footer once the skin takes the footer over (#167): the control a plugin mounts into `sidebar.footer.action` names itself with `data-dsh-plugin="update"` and `data-dsh-part="entry"`, and the skin recognises it by those names and keeps it in the sidebar — the plugin's own node stays hidden in its slot while a copy of it stands at the right end of the account row, carrying the plugin's words, mark, progress and press; the rail folds the copy away.
- Fix three leftovers that accumulate with use: a rebuilt model button left its label's swap subscription behind with the old label, and the model sub-menu's hover timer and the caret's focus-settle timer still fired after their feature was torn down.
- Fix the account row showing the account number the host signs in with instead of the name from the settings: on a host that renders that row itself the skin repainted its box and picture but never its words, while the settings page promises the name shows on the account row too. The host row's label now carries the resolved name, and the host's own label is put back when the footer is handed over.
- Fix the context ring dropping to a line of its own under the toolbar when "Redraw the model picker" is off (#162): the ring stood behind the model seat's box, and with the picker's redraw off there is no seat — so the skin drew no ring and left the host's own meter uncovered, whose wider box took the row and made the middle gap read as too narrow, moving the whole line below. The ring answers the context reading, not the picker's switch: with no seat it closes the slot itself, and the host's meter stays covered.

## [0.19.3] - 2026-10-25

[中文](#cn-0.19.3) | [English](#en-0.19.3)

<h3 id="cn-0.19.3">体验优化</h3>

- 改善 DeepSeek 配色的浅色层次：画布改为 #FBFCFF、侧栏为 #F7F9FF，表面、表头、悬停底、边框与文字色从画布种子派生，不再继承 Claude 的纯白卡片。
- 改善模型选择器在千级模型目录下的开销：开卡不再整卡重建，峰谷徽章按行原位刷新，价目表匹配与目录签名按代缓存。
- 改善主题风格切换的反馈：配色固定在某张颜色卡时，切换主题会提示「配色已被固定为…」，并可直接改为跟随品牌。

### 问题修复

- 修复其他插件的输入框被套上整页焦点描边：键盘焦点环改由宿主自己的 `:focus-visible` 规则画出、皮肤只提供墨色，兜底环以零权重写在 `:where()` 里，插件声明的 `outline: none` 重新生效。
- 修复从独立成行切换到紧凑底栏时统计信息的详情与位置适配，使不同切换路径得到一致布局。
- 修复「进行中」分段仍显示已归档会话的问题：切换分段会同步宿主的筛选与分组，已归档改用宿主自己的列表，归档行保留删除按钮。
- 修复用量面板丢失账本安装前的历史、以及插件生成的会话不计入用量的问题：用量折叠按宿主认的逻辑会话 id 读取日志，账本没有记录的日子由本地折叠补齐。
- 修复内容搜索对含冒号或斜杠的会话 id 写不进缓存、以及一次读取失败让该会话从结果中消失的问题：缓存文件按 id 的哈希命名，读取失败的会话保留上一份语料并在下一轮重试。
- 修复单个特性的失败牵连整页的问题：设置写入被拒绝时重新读取存储值，事件分发与滚动缓动逐个隔离，measure 与 sync 分别累计连续失败次数。
- 修复关闭工作区开关后归档删除按钮仍在渲染、占位文案不随特性退出还原、折叠动画期间的第二次点击被丢弃，以及等待徽章退场定时器不随特性停止的问题。
- 修复延后加载的功能块一次失败后再也不重试、以及反复开关功能累积页面观察的问题：失败的块加载会被遗忘并在下次启用时重试，宿主查找共用一条页面观察；分块脚本超时也会失败而不是无限挂起。
- 修复独立成行时统计行比输入区底部那一行更高的问题：统计行现在与那一行同高，紧凑底栏仍占工具栏的一行。
- 修复独立成行时费用数字与前后数字之间的间距比其他数字之间更宽的问题，各数字现在按行自身的间距等距排布。

### 安全

- 修复模型文案、字体与构建资源路由缺少同源栅栏的问题：这三个入口与其余私有路由共用同一道校验，非本机页面不能再借它们探测用户自置的字体。

<h3 id="en-0.19.3">Improvements</h3>

- Improve the DeepSeek palette's light steps: the canvas is #FBFCFF and the sidebar #F7F9FF, with surfaces, table heads, hover plates, borders and inks derived from that canvas instead of inheriting Claude's white card.
- Improve the model picker's cost on a four-digit model catalog: an open stops rebuilding the card, rate badges refresh row by row in place, and the price-table match and the catalog signature are cached per generation.
- Improve the feedback when switching theme style while the colours are pinned to a card: a toast names the pinned colours and offers to follow the brand again.

### Bug Fixes

- Fix another plugin's inputs gaining a page-wide focus outline: the keyboard ring is now drawn by the host's own `:focus-visible` rules from the skin's ink, and the fallback ring weighs nothing inside `:where()`, so a plugin's own `outline: none` stands.
- Fix statistics detail and placement when switching from On its own line to Compact footer so different switching paths produce the same layout.
- Fix the In progress section still listing archived conversations: switching the segment now drives the host's filter and grouping, the archived view uses the host's own list, and its rows keep the delete button.
- Fix the usage panel losing history from before the cost ledger existed and sessions with plugin-generated ids never reaching the totals: the fold now reads logs by the host's logical session id, and days the ledger never recorded are filled from the local fold.
- Fix content search failing to cache sessions whose ids carry a colon or a slash, and a session disappearing from results after one unreadable pass: cache files are named by a hash of the id, and a session that cannot be read keeps its previous corpus and is retried on the next pass.
- Fix one feature's failure spreading across the page: a rejected settings write reads the stored value back, event dispatch and scroll easing are isolated per feature, and measure and sync count consecutive failures apart.
- Fix the archived-row delete action staying mounted after the workspace switch is turned off, placeholder text not being restored when the feature stands down, a second fold click dropped during the closing animation, and the wait badge's exit timer outliving its feature.
- Fix deferred feature chunks never retrying after one failed load and feature switches accumulating page observers: a failed chunk is forgotten and retried on the next enable, host lookups share one page observation, and a chunk whose script never arrives now times out instead of hanging.
- Fix the statistics standing taller than the composer's bottom row when they have a line of their own: the line now matches that row's height, while the compact footer keeps the toolbar row's.
- Fix the cost figure standing farther from the figures around it than they stand from each other when the statistics have a line of their own: every figure now keeps the line's own gap.

### Security

- Fix the model copy, font and built-asset routes missing the same-origin fence every other private route carries: all three now pass the same check, so a page outside this machine can no longer probe the fonts a reader dropped in.

## [0.19.2] - 2026-10-24

[中文](#cn-0.19.2) | [English](#en-0.19.2)

<h3 id="cn-0.19.2">体验优化</h3>

- 改善推理档位的强调色：外显文字与滑块卡片中的档位名跟随主题强调色，弱档更淡、强档对比更强，并随档位升高略微向红色偏移；说明文字和两端的「更快 / 更强」保持原来的灰色。
- 改善推理档位的名称切换：名称的模糊进出改由滑块行程驱动，向更强档拖动时旧名向上离开、新名从下方进入，向更弱档拖动时反向播放。
- 改善输入栏模型名与推理等级的共同容器：两者仍作为一个行项排列，但各自拥有独立的内层容器与 hover 底板，指针只点亮被指向的那一个。
- 改善模型选择器的发布标记：1017 标签改用中性灰底与次级灰字，不再使用宿主的业务色。

### 问题修复

- 修复点按推理滑块切换档位时，指针的轻微抖动被误判为拖动，导致滑块瞬移并跳过动画的问题：指针需先离开点按位置一小段距离，才进入拖动状态。
- 修复选择自定义配色后，开启「水波纹字符背景」的新会话首页不显示字符水波纹、控制台报「not an opaque colour」的问题。
- 修复水波纹字符背景在颜色令牌不可读时持续报错且不退出：连续几轮读取失败后报告并退役，令牌恢复可读则照常绘制。
- 自定义配色未选行内代码色时，深色主题沿用浅色卡的字色，代码胶囊几乎看不见；现在按主题各取本卡的字色。
- 修复在较新的宿主版本上会话视图页签只剩当前一个、其余被收进「更多」菜单的问题：全部视图重新排在页签栏里，选中项仍由一颗滑动的药丸标出，「更多」按钮与页签栏并排。
- 修复新会话页水波纹字符背景在相隔较远处连续点击时，先前的波纹突然变慢的问题：每一次点击现在只加快它自己周围的波速，已经荡开的波纹保持原来的行进速度。
- 修复选择自定义配色后发送消息时，飞出的气泡取不到读者自己的气泡颜色、晕圈落在透明卡片上、气泡边缘的细线不显示的问题。

<h3 id="en-0.19.2">Improvements</h3>

- Improve the reasoning level's accent colour: the composer's words and the slider card's level name follow the theme accent, lighter at the weak end and stronger at the top, leaning slightly toward red as the level climbs; the caption and the Faster / Smarter scale ends keep their own grey.
- Improve how the reasoning level's name changes: the blur and travel now follow the slider's own path, with the old name leaving upward and the new one rising from below toward a stronger level, and the motion playing in reverse toward a weaker one.
- Improve the shared seat holding the composer's model name and reasoning level: the two stay one row item, but each now has its own inner container and hover plate, so the pointer lights only the one it is over.
- Improve the model picker's release marker: the 1017 tag now uses a neutral grey plate and secondary grey ink instead of the host's business colour.

### Bug Fixes

- Fix the reasoning slider teleporting and skipping its animation on a click whose pointer moved by a pixel or two: the press now becomes a drag only after the pointer leaves the click's small tolerance.
- Fix the new-conversation page drawing no ripple field, with an error in the console, once a custom palette is chosen and the field is on.
- Fix the home ripple reporting forever without exiting while a colour token stays unreadable: it retires after several failed rounds and draws again once the tokens read.
- An unpicked inline-code colour fell back to the light card's ink under the dark theme, leaving code chips all but invisible; each scheme now takes its own card ink.
- Fix newer hosts showing only the current conversation view tab, with the other views sent into the More menu: every view sits in the strip again, the selected one still marked by the sliding pill, and the More button beside it.
- Fix the new-conversation page's ripple glyph background slowing a ring already in flight when a second press lands far from the first: a press now speeds up only the ground around itself, and a ring keeps travelling as the press that started it set it.
- Fix the send flight once a custom palette is chosen: the flying bubble no longer takes its fill from the reader's own bubble, the halo lands on the transparent card, and the hairline around the bubble is left out.

## [0.19.1] - 2026-10-24

[中文](#cn-0.19.1) | [English](#en-0.19.1)

<h3 id="cn-0.19.1">体验优化</h3>

- 合并重复的颜色标记：抬升面、活跃行墨色、会话标题墨色与水波墨色改用宿主的对应颜色，二级表头与浅色第二层面板取与悬停底板和画布相同的值，首页的数据蓝收敛为一个标记，各处属性回退的墨色与画布字面值按色阶统一。
- 改善紧凑底栏的间距：各数字之间改为与独立成行时一致，底栏整体收窄。
- 改善紧凑底栏在宽度充足时的信息展开：先由折叠总数展开为精确总数，再展开为输入与输出的 token 数；空间不足时才退为独立成行。
- 改善对话输入区底部控件的对齐与文字层次：权限、统计、模型与推理强度共用 28px 控制盒和 2px 内边距，文字统一以半透明主文字色呈现，悬停时恢复到完全不透明。
- 改善模型选择器里 Kimi K3.1 Pro 的描述：它读自己这条产品线的官方定位，不再沿用 K3 那一句。
- 改善紧凑底栏：工具栏上只显示费用、Token 总量与缓存命中百分比，费用取四位有效数字与四位小数中较短的写法，Token 按 123tok、1.1ktok、15.1Mtok、1.2Btok 显示，缓存命中不再带「缓存命中」四字。
- 改善紧凑底栏中上下文环的位置：它现在站在「收进上下文」所在的位置，即输入行内模型选择器之后，不再随数字浮到工具栏上。

### 问题修复

- 修复主窗口设置中输入区的上下文外显样式与数字夹在模型选择器各项之间的问题：它们现在与统计信息位置、底栏统计位置和计费币种排成一块。
- 修复页面缩放为 1.25 或 1.5 倍时整页可以滚过内容末尾、露出一段空白的问题：缩放后的页面按窗口自身的尺寸绘制，窗口的边缘就是页面的边缘。
- 修复 Kimi Code 的 K3、K3.1 Pro 与 K3.1 Pro Highspeed 会话不显示费用的问题：价格快照补上 K3.1 的两条目录价，模型标识解析覆盖 Kimi Code 的写法，人民币价目按厂商公布的价格作答。
- 修复启用壁纸引擎后，用量面板热力图的日期提示、会话标题的提示以及品牌图片的清除按钮在透明画布上丢掉文字与记号的问题：这些反色底上的字与记号改用宿主自己的表面色。

### 其他变更

- 改善 `npm run verify` 的失败判定：超时、进程被系统终止、浏览器无法启动和测试套件未装载等基础设施问题记为「未判定」且不写入判定缓存，只有断言失败才记为失败并缓存；同一轮运行的冒烟与端到端通道按机器核心数分配固定的并发页数。

<h3 id="en-0.19.1">Improvements</h3>

- Consolidate the duplicated colour markers: the raised surface, the active row's ink, the session title's ink and the ripple's ink now take the host's own colours, the table head and the light second-level panel use the hover plate's and the canvas' values, the home page's data blue becomes one marker, and the property fallbacks spell one literal per ink and canvas step.
- Improve the compact footer's spacing: its figures stand apart exactly as they do on their own line, narrowing the footer.
- Improve how the compact footer expands when the toolbar has room: the folded token total becomes the exact count, then the input and output token figures; the line moves below only when even the folded form does not fit.
- Improve the alignment and text hierarchy of the controls under the conversation composer: permission, statistics, model and effort now share a 28px control box and a 2px inset, their words use one translucent primary ink, and the ink returns to full opacity under the pointer.
- Improve the model picker's description for Kimi K3.1 Pro: the row now reads its own model line's positioning instead of K3's.
- Improve the compact footer: the toolbar shows the cost, one session token total and the cache-hit percentage — the cost in the shorter of four significant digits and four decimals, the total as 123tok, 1.1ktok, 15.1Mtok or 1.2Btok, and the cache hit without its label.
- Improve where the compact footer draws the context ring: it stands where the Inside the context popover position draws it, after the model picker inside the composer row, instead of riding the toolbar with the figures.

### Bug Fixes

- Fix Context display and Context display number sitting among the model picker's rows in Main window settings: they now stand in one block with Conversation statistics position, Footer alignment and Billing currency.
- Fix the page scrolling past the end of its content into an empty band at a page zoom of 1.25 or 1.5: the scaled page now draws at the window's own size, so the window's edge is the page's edge.
- Fix K3, K3.1 Pro and K3.1 Pro Highspeed sessions on Kimi Code showing no cost: the price snapshot now carries K3.1's two catalogue lines, model-id resolution covers the Kimi Code spellings, and the CNY figures answer as the vendor publishes them.
- Fix the usage panel's day tip, the session title's tip and the brand picture's remove mark losing their ink over a wallpaper's cleared canvas: the words and marks on those inverted plates now take the host's own raised-surface tone.

### Chores

- Improve how `npm run verify` judges a failure: a timeout, a process the system ended, a browser that would not start and a spec suite that did not load now answer unjudged without filing a verdict, only a failed assertion fails and is cached, and the smoke and end-to-end lanes of one run share a fixed page budget from the machine's core count.

## [0.19.0] - 2026-10-23

[中文](#cn-0.19.0) | [English](#en-0.19.0)

<h3 id="cn-0.19.0">新增功能</h3>

- 对话统计新增紧凑底栏：费用、缓存命中率和上下文圆环共用工具栏，支持左侧、居中和右侧位置，空间不足时独立成行。
- 主窗口设置的输入区新增「底部间距」，对话页输入框与窗口底边的距离可选紧凑、默认和宽松。
- 主窗口设置的输入区新增「上下文外显样式」与「上下文外显数字」：上下文占用可在饼图、dsh 圆环配绿到红、量取附图的圆环配蓝黄红三色之间选择，数字开关决定表盘旁是否显示百分比。
- 主窗口设置的对话区新增「对话栏宽度」，按宿主宽度的 100%、75% 或 50% 绘制对话栏，输入框随对话栏同宽。
- 新增侧栏悬停展开：侧栏收起时，鼠标停在侧栏按钮上，侧栏就浮在页面上方展开，主窗口宽度不变；鼠标移开或选中会话后自动收起，点击按钮仍是固定展开，可在设置页「侧栏 → 悬停展开侧栏」关闭；Windows 桌面端与 web 生效（#108）。

### 体验优化

- 跟进 Claude 桌面版的浅色与深色画布：浅色画布改为 #FFFFFF、侧栏 #FAFAFA，深色画布改为 #191919、侧栏 #1F1F1F，整套色阶随新的画布种子一起更新。
- 跟进 DeepSeek 配色的浅色背景：画布改为 #FFFFFF，侧栏改为 #FAFAFA。
- 改善流式回答的 token 估算：每次工具调用按该工具自己的价格计入，代替统一的固定值，读取类调用不再被高估、写入类调用不再被低估；每个模型的估算再按自身已结算的步骤在 0.9–1.1 之间自动微调倍率。
- 改善模型选择器里 Gemini 4 Argon 与 GPT-6 Astra、Sol、Luna 的描述：每条产品线显示自己的官方定位。
- 改善等待行加载点在动作之间的切换：旧动作的每颗点在自己静止的那一刻把位置交给新动作里配对的那颗，新的点从原地出发走进自己的轨迹，三颗变四颗时一颗分成两颗、四颗变三颗时两颗合成一颗，框里不再出现空白。

### 问题修复

- 修复在首页切换其他插件放在输入框里的页签后整块输入区消失的问题：只有会话自身的视图页签切到非对话视图时，输入区才会收起（#131）。
- 修复显示缩放或页面缩放为小数倍时，像素螃蟹播放动画时身侧出现一条细竖线的问题（#130）。
- 修复 DeepSeek 配色下用户消息气泡显示为宿主淡灰色的问题：气泡改用该颜色卡的淡蓝色 #ECF0FF，与主题一致（#134）。
- 修复输入框里的上下文计量环在面板已经打开时仍向读屏软件报告「已收起」的问题：计量环的展开状态与宿主面板同时变化。
- 修复设置了页面缩放后窄窗口布局仍按未缩放的窗口宽度切换的问题：首页统计格、封禁页与输入行上下文计量环旁的数字改按页面自身的宽度收窄（#129）。
- 修复设置页「外观 → 配色」的颜色卡只能选中自定义卡的问题：Claude 与 DeepSeek 卡现在也能点选，各自换上该卡的配色而不改动通用页的品牌标志，选中的卡上给出「恢复跟随品牌」，把配色交回当前品牌（#128）。
- 修复品牌标志的颜色只作用于上传图片的问题：该行由「图片颜色」改为「标志颜色」，内置品牌标志、上传的标志图与文字标志（含账号行头像里的那张）都按「强调色」或「文字色」上色，设置页的品牌区预览当场显示所选颜色，「强调色」一项按当前配色卡的颜色上色（#135）。

### 其他变更

- 改善本地任务管理，按任务延续需要建立工单，并提供独立的会话临时目录及进程保护回收命令。

<h3 id="en-0.19.0">New Features</h3>

- Conversation statistics add a compact footer with cost, cache hit rate and the context meter, left/center/right alignment, and a separate line when toolbar space runs out.
- Main window settings add Bottom gap under Composer, which sets the room between the conversation's composer and the bottom of the window to Compact, Default or Roomy.
- Main window settings add Context display and Context display number under Composer: the context share draws as the pie, dsh's ring on the green-to-red band, or the measured ring on three bands, and the switch shows or hides the percentage beside it.
- Main window settings add Conversation width under Conversation, which draws the conversation column at 100%, 75% or 50% of the host's width with the composer following it.
- Add opening the sidebar on hover: while the sidebar is collapsed, resting the pointer on its toggle opens it over the page and the main window keeps its width; it closes when the pointer leaves or a session is picked, a click on the toggle still keeps it open, and Settings → Sidebar → Open the sidebar on hover turns it off; it works on the Windows desktop app and the web (#108).

### Improvements

- Follow Claude desktop's light and dark canvases: the light canvas is #FFFFFF with a #FAFAFA sidebar, the dark canvas #191919 with a #1F1F1F sidebar, and the whole ladder follows the new canvas seeds.
- Follow DeepSeek's light background: the canvas is #FFFFFF and the sidebar #FAFAFA.
- Improve the streaming token estimate: a tool call now carries its own tool's price instead of one flat figure, so a read is no longer overpriced and a write no longer underpriced; each model's estimate is also scaled between 0.9 and 1.1 from its own settled steps.
- Improve the model picker's descriptions for Gemini 4 Argon and GPT-6 Astra, Sol and Luna: each model line shows its own official positioning.
- Improve how the waiting line's loader dots change from one motion to the next: each dot hands its place to its partner in the new motion at its own still moment and that dot travels from there into its own path, one dot splitting in two going from three dots to four and two meeting in one going back, so the box never empties.

### Bug Fixes

- Fix the whole input area vanishing on the home page after picking a tab in another plugin's menu inside the composer: the input area stands down only when the conversation's own view tabs leave the chat (#131).
- Fix a thin vertical line appearing beside the pixel crab while it plays at a fractional display or page zoom (#130).
- Fix the user message bubble showing the host's light grey under the DeepSeek palette: the bubble takes that colour card's light blue #ECF0FF instead (#134).
- Fix the composer's context ring telling a screen reader it is collapsed while its panel is already open: the ring's expanded state now changes together with the host's panel.
- Fix the narrow-window layouts switching on the unzoomed window width under page zoom: the home page's stat cells, the ban screen and the number beside the composer row's context ring now narrow with the page's own width (#129).
- Fix the colour cards under Appearance → Colours accepting only the custom card: the Claude and DeepSeek cards can now be picked too, each painting its own palette while the theme style's brand mark stays, and a picked card offers “Follow the brand again” to hand the colours back (#128).
- Fix the brand mark's colour reaching only uploaded images: the row is now “Mark colours”, the built-in mark, an uploaded mark and wordmark — the account row's avatar included — all take the accent or the text colour, the settings page's brand area previews the chosen colour at once, and “Accent” follows the colour card in force (#135).

### Chores

- Improve local task management with work orders based on continuity needs and independent session scratch directories with process-aware collection.

## [0.18.5] - 2026-10-23

[中文](#cn-0.18.5) | [English](#en-0.18.5)

<h3 id="cn-0.18.5">体验优化</h3>

- 改善长会话之间切换的卡顿：观察总线上一次挂载的大批次改为绘制后按 8 毫秒分片派发，新增节点的祖先去重从逐个 contains 改为沿树向上查找，过程组首次折叠同步延后一拍。

### 问题修复

- 修复统计显示在上下文浮层时，每轮回答结束的那一刻输入卡片向上跳一下的问题：宿主重新绘制的上下文计量环在出现的同一刻即被收起，输入卡片保持原位。
- 修复模型在一轮中分多步输出时，前面几段思考与工具调用的过程组不再自动收起的问题：新的过程组出现后，同一轮里之前的过程组随即收起，只展开最新的一组。

<h3 id="en-0.18.5">Improvements</h3>

- Improve switching between long sessions: a large mutation batch is dispatched after paint in 8 ms slices, added-node dedup walks up the tree instead of a contains check per earlier node, and the process groups' first fold sync waits one frame.

### Bug Fixes

- Fix the composer card jumping up for a moment as each answer finishes while the statistics live in the context popover: the host's redrawn context meter is put away the moment it appears, and the card stays where it stands.
- Fix earlier process groups staying open when the model works in several steps within one turn: once a new process group appears, the earlier groups of that turn fold, and only the newest one stays open.

## [0.18.4] - 2026-10-23

[中文](#cn-0.18.4) | [English](#en-0.18.4)

<h3 id="cn-0.18.4">体验优化</h3>

- 改善设置页的标签条：把「输入区」与「对话」两个标签页合并为「主窗口」，一页内上「对话区」、下「输入区」两组各带组标签，对话统计信息位置与计费币种两行归入输入区。
- 改善模型选择器里的模型描述：描述只写模型擅长什么或官方宣传语，去掉上下文长度、激活参数、生成速度与价格，中英文两版写同样的内容。

### 问题修复

- 修复账户菜单在页面缩放或窗口较矮时上方放不下、翻到账户行下方并盖住账户行的问题：上下都放不下的菜单留在空间更大的一侧，贴着窗口边缘展开。
- 修复「工作步骤收起时机」设为「下次有新消息时」后，最新一轮结束时过程组不再自动折叠的问题：回答出现后，这一轮的过程组照常收起。
- 修复收起过程组时，标题下方的内容先跳动一下、再被平滑推上来的问题：收起改为一段连续的动画，标题与组体之间的间距随组体一起收起。
- 修复在对话里滚动时画面经常跳到别处的问题：离屏的对话行只在按真实尺寸排过一次版之后才跳过排版，滚动时不再按估算高度突然改变位置。
- 修复页面缩放不为 100% 时侧边栏的内容越出它自己那一列、在列的右缘被截断的问题：侧边栏内容与拖拽手柄改为与侧边栏列同宽。
- 修复宿主进程在会话历史较大时持续满核：用量折叠改为逐个会话隔离读取失败，一次读取失败不再作废整轮并让记录无法落盘；单轮耗时超过刷新周期时，下一轮等到本轮耗时两倍之后开始，不再背靠背重跑。
- 修复重绘模型选择器与座位上的模型名缺少「1017」发布标签的问题：官方渠道的 deepseek-flash 行在名字后面带上这个标签，座位上的当前模型名旁边也带着它。
- 修复设置页外观标签的品牌标志不随「图片颜色」上色的问题：标志与文字标志按所选的「强调色」或「文字色」显示，两种主题下都与所在的底色分得开。
- 修复封号彩蛋没有铺满整个窗口、右侧与底部露出下层页面的问题：整页重新占满窗口。

<h3 id="en-0.18.4">Improvements</h3>

- Improve the settings page's tab strip: Composer and Conversation become one Main window tab, its page split into a Conversation group above and a Composer group below, each under its own label, with Conversation statistics position and Billing currency standing in the Composer group.
- Improve the model descriptions in the model picker: each one says what the model is good at or carries the vendor's own tagline, drops context length, active parameters, generation speed and price, and reads the same in Chinese and English.

### Bug Fixes

- Fix the account menu flipping below the account row and covering it when the page zoom or a short window leaves too little room above: a menu that fits on neither side stays on the roomier one, held against the window's edge.
- Fix process groups no longer folding at the end of the latest turn when When to Collapse Work Details is set to On next message: once the answer is in, the turn's process groups fold as usual.
- Fix the content under a process group jumping once and then sliding up when the group is folded: the fold is one continuous motion, and the gap under the header closes with the body.
- Fix the conversation jumping elsewhere while the reader scrolls: an off-screen row is skipped only after it has been laid out at its real size, so no row takes its height under the reader.
- Fix the sidebar's content overflowing its own column and being cut off at the column's right edge when the page zoom is not 100%: the sidebar's content and its drag handle now take the column's width.
- Fix the host process pegging a core on a large session history: the usage roll-up isolates a log it cannot read, so one failed read no longer voids the pass and leaves the record unwritten, and a pass that outlasts the refresh period waits twice its own length before the next one starts.
- Fix the redrawn model picker and the seat's model name missing the "1017" release tag on the official Flash model: the deepseek-flash row carries it after the name, and so does the seat's current model name.
- Fix the Appearance tab's brand mark ignoring the image colour choice: the mark and the wordmark now show in the chosen Accent or Text colour, legible against the plate in both themes.
- Fix the account-hold easter egg stopping short of the window, with the host page showing along its right and bottom edges: the page fills the window again.

## [0.18.3] - 2026-10-22

[中文](#cn-0.18.3) | [English](#en-0.18.3)

<h3 id="cn-0.18.3">新增功能</h3>

- 新增思考强度重点色选项：推理等级按钮按当前档位取色，关闭的档位与模型自己的默认档位保持灰色，每个思考档位在蓝色到紫色之间取自己的一档，越高越靠紫色一端。

### 体验优化

- 改善会话标题的重命名：鼠标扫过顶栏标题时浮出一块底板与「重命名会话」提示，点击即可就地编辑，回车写入新名称、Esc 保持原名。
- 改善会话标题重命名输入框的样子：换成与 Claude 一致的样式，画布底色、一圈选区蓝细边、小圆角，宽度随输入的会话名伸展。
- 改善流式回复期间写回 token 的估算：正文按中文字符、中文标点、拉丁词、数字、空白与标点各段本身的形状计价，替换原先按宽窄字符计数的规则，估算值贴近服务商的分词结果。
- 把只做分隔的线收细、调淡一档：侧栏账号行上沿、搜索面板页脚、上下文统计、设置行、弹层与菜单分隔线以及正文分隔线改用新的分隔线令牌，宽度收到 0.5px，卡片与输入框的轮廓保持原样。
- 把配色改为由少量种子颜色与一张共用音阶表在构建时生成：两档各自的强调色、明暗画布与正文链接成为仅有的输入，其余颜色按明度、彩度与透明度的台阶推出；两档的观感保持不变，个别中性色与强调色与此前的取值最多相差几个色差单位。
- 把模型名与推理等级放进同一个座位框里：两段文字在行里成为一个整体，贴着行的右端、向左生长，悬停底板画在整个框上，模型菜单与档位卡片都从它的右端挂下来；原先单独浮在行上、靠逐帧测量钉在模型按钮旁的档位按钮不再需要定位。
- 把配色下的强调色选项改成颜色卡：两张品牌卡画出各自的强调色、明暗背景与行内代码色，第三张自定义卡可以改这四个颜色，改一个就整页换上；正在生效的那张卡带选中边框，品牌卡不能点选，跟随当前品牌亮起；指向或聚焦一个圆点时它连同邻近的圆点一起抬起，上方的提示说明它是什么颜色，并随指针在圆点之间移动；「图片颜色」多了强调色一档，此前存下的强调色成为自定义卡的第一个颜色。
- 改善切换模型时模型名的样子：名字在原地换成新模型名，离开的名字向上穿过一层模糊，新名字从下方升上来，两段文字同时站在座位框里，座位宽度随两段中较宽的一段过渡；选了减弱动效时名字直接换过去。

### 问题修复

- 修复按住窗口框架上的文字拖动时变成划词的问题：侧栏与会话标题所在的头部不再产生选区，正文、输入框与草稿照旧可以选中。
- 修复窗口标题栏里的会话标题与它下方那一行控件重叠：行顶原先插进标题自己的框里，标题框随窗口与字号变高时两行字就压在一起；行顶现在停在标题框下方一段固定的空白处，整行始终留在会话头部里。
- 修复页面缩放不为 100% 时费用窗口比窗口宽：插件的费用明细窗口与单步费用弹窗按视口单位声明尺寸，缩放再乘一次，右侧一列连同它所在的边缘被推出窗口，倍率越高越明显；这两个窗口现在按页面自己的尺寸封顶，卡片比内容窄时窗口里的表格可以横向滚动。
- 修复页面缩放不为 100% 时右栏面板比它自己的列宽：宿主按窗口像素写下面板宽度与拖拽手柄，缩放又把两者放大一次，面板因此盖住中间列，手柄也离面板可见边缘一截；现在两者按页面的像素重算，面板宽度以框架分给它的那一列为上限。
- 修复页面缩放不为 100% 时搜索面板比它该在的位置低一截：面板顶部的空白读的是窗口高度的百分比，而面板画在页面自己的像素里；这条空白现在按皮肤量出的页面高度换算。
- 修复页面缩放切换后宿主的框架与浮层停在旧倍率：换挡时皮肤量出的页面尺寸、宿主框架的列宽与宿主浮层的空间都由偏好写入唤醒，面板从别处写入倍率时它们不动；现在这一次写入本身也会唤醒它们，换挡、回到 100% 与从 100% 离开都立即生效。
- 修复输入框提示在中文界面里仍读英文的问题：提示文案按宿主的界面语言取词，宿主不画提示的卡片由皮肤补上自己的提示。
- 修复回复流式生成时在输入框里用输入法打字被打断：过程分组与思考行自己折叠时，原先在每次活动状态变化时替读者按一下标题，按下与抬起焦点都发生在输入法还没上屏的那一刻，浏览器于是把已敲的拼音丢掉、重新弹出候选框。这两处现在等到上屏之后再按，上屏那一刻补做一次折叠。
- 修复会话已经显示正文时输入框停在正文中间的问题：宿主把输入框的位置与正文区的高度挂在会话根上的 active 标记上，这个标记落到别处时输入框就不再贴在窗口下沿，正文从它下面接着画；现在只要页面上有对话列，输入框照旧贴住窗口下沿、脚下的画布与渐隐带照旧铺满，新会话页不受影响。
- 修复桌面窗口里 ds-bot 的 Bot 界面占住页面时 Chat / Code 切换消失的问题：切换器改留在 ds-bot 自己的顶行，不再按标题栏里本主题侧栏列的标记定位，从 Bot 界面回到代码界面的路一直都在。
- 修复大量输出时等待行下方露出正文残行的问题：等待行钉在输入框上方时，它脚下的画布一直铺到输入框顶，滑动中的正文不再从状态行下沿透出。
- 修复中止生成后过程内容被收起、页面只剩空白的问题：被读者中止的轮次没有最终回答，它的过程组保持展开，工作到停下为止的内容留在页面上。
- 修复推理等级滑块拖到最高或最低档后无法往回拖的问题：指针越过轨道端点时滑钮停在端点、手势继续，往回拖仍跟着指针，直到松开才定在该档，卡片保持打开。
- 修复重绘消息导航在宿主轨标不再写 `data-index` 的宿主上点击无反应的问题：轨标数量与列表一致时按轨道自己的顺序取标记，宿主写下的位置照旧优先。
- 修复切换会话时费用金额停在币种符号加短横的占位上的问题：金额的请求还在路上时离开这场会话，回到会话后照常重新索取，金额落在原位。
- 修复选完模型、宿主重新枚举目录期间座位短暂变空的问题：模型名与推理等级留在原处，打开的卡片不移动，宿主答复到达时两者一同更新。
- 修复切换模型时模型名横向滑动的问题：旧名字与新名字的右边都停在座位框的右端，座位框向左移动宽度时文字不再跟着移动，换字只在竖直方向上发生。
- 修复「收进上下文」档位下统计条可能盖住输入区底行控件的问题：统计条退到卡片下面只作定位层，卡片与底行画在它上面，计量圆环与手机插件的信息条仍立在卡片之上。

### 其他变更

- 删除十二个没有调用方的导出，把注释里三十二处指向引擎迁移前位置的路径改成现址，四条故障补丁按当前代码重记，构建里「滚动位置只由 scroll-owner 写入」那条检查按引擎所在的位置恢复生效，AGENTS.md 的四处陈述与实现一致，工作树的删除工具接受 .agents/worktrees/，插件的表现与断言不变。
- 新增本地工单系统：每个任务在 `.debug/work/` 下拥有自己的目录、索引与临时文件，测量值随工单退役，关闭时整目录删除，孤儿目录与散落临时文件由 `npm run work -- gc` 清理。

<h3 id="en-0.18.3">New Features</h3>

- Add the effort accent colour option, which paints the reasoning-effort button by the level in force: a switched-off level and the model's own default level stay grey, each thinking level takes its own step between the blue and the violet, and the ladder climbs toward the violet.

### Improvements

- Improve renaming a session from its title: the pointer over the header title raises a plate and a tip naming the press, a click opens an editor in place, Enter writes the new name and Escape keeps the old one.
- Improve the field a session title is renamed in: it takes Claude's own face — the canvas fill, a thin ring in the selection blue and a small radius — and grows with the name being typed.
- Improve the written-back token estimate while an answer streams: the text is now priced by the shape of its runs — CJK characters and marks, Latin words, digits, whitespace, punctuation — in place of the wide/narrow character rule, so the figure stays close to the provider's own count.
- Bring every line that only separates down one finer, quieter step: the account row's upper edge, the search panel's foot, the context stats, the settings rows, the menu and popover separators and the transcript's rule take the new divider token at 0.5px, while a card's and a field's outline keep theirs.
- Generate the palette at build time from a handful of seed colours and one shared tone ladder: each look's accent, its light and dark canvases and its prose link are the only inputs, and every other colour follows a lightness, chroma and alpha step; both looks keep their appearance, with individual neutral and accent colours a few ΔE00 away from their former values.
- Put the model's name and the reasoning level in one seat box: the two texts are a single item in the row, standing against the row's right end and growing leftward, with the hover plate on the whole box and both the model menu and the effort card hanging from that right end. The level's button no longer floats over the row on coordinates measured every frame.
- Replace the accent option under Colours with colour cards: the two brand cards draw their accent, light and dark backgrounds and inline-code colour, and the third card lets the reader change those four, repainting the page as soon as one changes; the card in effect wears a selected border, and a brand card, which cannot be picked, lights up while its brand is the current one; pointing at or focusing a disc lifts it along with its neighbours, and a hint above names its colour and follows the pointer from disc to disc; the image-colour choice gains an accent option, and a stored accent becomes the first colour of the reader's card.
- Improve how the model's name changes when another model is picked: the name swaps in place — the words leaving rise through a blur while the new name comes up from below, both standing in the seat box at once, with the seat travelling to the wider of the two as it runs; with reduced motion the name simply changes.

### Bug Fixes

- Fix a drag that starts on the window's own chrome turning into word selection: the sidebar and the conversation header take no selection, while the transcript, the fields and the draft still do.
- Fix the conversation title in the window's caption row overlapping the row of controls below it: the row's top was tucked into the title's own box, so a taller window or type size pressed the two lines together. The row's top now stands a fixed gap below the title's box, keeping the row inside the conversation header.
- Fix the cost meter's fee windows standing wider than the window at a page scale other than 100%: both state their size in viewport units, which the scale multiplies once more, so the right column and the edge it sits on are pushed out of the window and the higher the factor the further. Both are now capped with the page's own size, and a card narrower than its rows lets the table inside scroll sideways.
- Fix the right panel standing wider than the column the frame gives it at a page scale other than 100%: the host states the panel's width and the drag handle's place in the window's pixels, and the scale enlarges both once more, so the panel covers the centre and the handle leaves the panel's visible edge. Both are recomputed in the page's pixels here, with the width the frame gives that column as the panel's ceiling.
- Fix the search panel standing lower than its place at a page scale other than 100%: the air above it was a percentage of the window's height while the panel is drawn in the page's pixels, and that gap now converts through the page height the skin measures.
- Fix the host frame and the host's floating cards keeping the old factor after the page scale changes: the page's own size, the frame's columns and the space the host's cards are given were woken by a preference write alone, so a factor written from anywhere else left them as they were. The write itself now wakes them, so leaving 100%, switching between factors and coming back all take effect at once.
- Fix the composer's hint reading English under a Chinese interface: the words now follow the host's interface language, and the skin supplies its own hint where the host draws none, as on a card holding an attachment.
- Fix input-method typing in the composer being cut short while an answer streams: when a process group or a thinking row folded itself, the skin pressed its header for the reader on every activity change, and the focus leaving and returning landed mid-composition, so the browser dropped the letters typed so far and opened the candidate window again. Both now wait for the composition to land, and settle once it has.
- Fix the composer coming to rest in the middle of the transcript once a conversation is showing: the host grants the composer's place and the transcript's height from the conversation root's active mark alone, so a mark landing elsewhere left the card off the window's bottom edge with rows painting on below it. While a message column is mounted the card now keeps the window's bottom edge, the canvas bar and the fade band with it, and the new-conversation page is untouched.
- Fix the Chat / Code switch disappearing when ds-bot's Bot surface has the page in the desktop window: the switch now stays in ds-bot's own top row instead of taking the caption strip through this theme's sidebar-column mark, so the way back to the code interface stays on screen.
- Fix a sliver of the answer showing under the waiting line while a large answer streams in: while the line is pinned over the composer, the canvas under it now reaches the composer's top, so the text the stream slide is bringing up no longer shows below the line.
- Fix the page collapsing to a blank band when a turn is stopped: a turn the reader stopped has no final answer, so its process group stays open and the work up to the stop stays on the page.
- Fix the reasoning-effort slider sticking at its strongest or weakest level after the pointer overshot the track's end: the knob now stays at the end while the gesture goes on, follows the pointer back, and settles on the level under it at the release, with the card still open.
- Fix the redrawn message navigator ignoring a press on hosts whose rail marks carry no `data-index`: while the rail holds as many marks as the list has turns, a mark is now taken by its place in the rail, and a place the host states is still read first.
- Fix the cost segment staying on the currency's dash after a session switch: an answer still on its way when the reader leaves the conversation no longer blocks the next ask, and the total lands in the segment's place.
- Fix the seat blanking while the host re-enumerates the directory after a model is picked: the model's name and the reasoning level stay where they are, the open card holds still, and both move together when the host answers.
- Fix the model's name sliding sideways while another model is picked: the outgoing and arriving names both hold the seat box's right end, so the box travelling to the other width leaves the words where they stand and the swap stays vertical.
- Fix the statistics dock being able to draw over the composer row's controls in the "into the context" position: the dock now sits below the card as a positioning layer, the card and its row paint above it, and the meter and a mobile plugin's strip still stand above the card.

### Chores

- Remove twelve exported symbols with no caller, rewrite thirty-two comment references that still named the files' pre-migration paths, rebase four defect patches onto the current code, restore the build check that only the scroll owner writes a scroll position at its engine path, bring four statements in AGENTS.md in line with the implementation, and let the worktree remover accept .agents/worktrees/, with the plugin's behavior and assertions unchanged.
- Add a local work-order system: each task owns a directory, index entry and temporary files under `.debug/work/`, measurements retire with the order, closing deletes the directory, and `npm run work -- gc` clears orphaned directories and loose temporary files.

## [0.18.2] - 2026-10-21

[中文](#cn-0.18.2) | [English](#en-0.18.2)

<h3 id="cn-0.18.2">问题修复</h3>

- 修复页面缩放不为 100% 时浮层按窗口量出的尺寸与位置都不成立：宿主自己画的会话卡片、账号菜单、上下文弹层把量到的位置直接写进坐标，在缩放下又被放大一次，开在触发控件上方的菜单还会因为自身高度是在另一个空间里量的而压在控件上；按窗口封顶的卡片同样会高出窗口一截，末尾几行读不到。现在宿主自己的浮层拿回一像素对一像素的空间，写下的长度与量到的盒子在屏幕上一致；按窗口封顶的规则改读皮肤量出的页面尺寸，不再用 vh 与 vw。
- 修复页面缩放不为 100% 时宿主框架的三列按窗口像素排布：宿主量框架用窗口像素，写下的列却是页面像素，右列被推出框架，左侧栏拉开后比它该有的宽度多出这一份倍率、显示不全。宿主自己的列宽现在按页面的像素重算；一列被收窄到零时这一份不换算，交给宿主原样摆放。
- 修复页面缩放不为 100% 时皮肤自己画的三处几何落在别处：首页的点击涟漪按窗口像素数格子却画在页面里，落在点击点的右下方；标题栏上的切换按钮在桌面窗口里量左邻控件与侧栏时混用了两种像素，站到了侧栏之外；推理档位触发器让出宽度时按窗口像素读取自己的宽度，窄卡片里算出的上限偏大。三处都改按页面自身的像素换算。

<h3 id="en-0.18.2">Bug Fixes</h3>

- Fix the cards and caps measured against the window not holding at a page scale other than 100%: the host's own session card, account menu and context popover write a measured position straight into their coordinates, which the scale then multiplies a second time, and a menu opening over its trigger lands on it because its own height was measured in the other space; a card capped against the window comes out taller than it as well, leaving its last rows unreadable. The host's own floating cards are now given a space one pixel to one pixel with the window, so a length the host writes and a box the host measures are the same length on screen, and a rule that caps a card against the window reads the page's own size instead of `vh` and `vw`.
- Fix the host frame's three columns being laid out in the window's pixels at a page scale other than 100%: the host measures its frame in the window's pixels and writes the columns in the page's, so the right column stands outside the frame and a sidebar dragged to a width is drawn that factor wider and shows cut off. The host's own column widths are now recomputed in the page's pixels, and a write that narrows a column to nothing is left as the host made it.
- Fix three pieces of the skin's own geometry landing elsewhere at a page scale other than 100%: the home page counted its ripple cells in the window's pixels while drawing them in the page's, so a press rippled down and right of where it landed; the window tab strip measured the controls and the sidebar beside it in one set of pixels and wrote the answer in another, standing outside the sidebar; and the effort trigger read its own width in the window's pixels while giving room back to the model name, so a narrow card kept a cap that was too wide. All three now convert through the page's own pixels.

Full Changelog: [v0.18.1...v0.18.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.18.1...v0.18.2)

## [0.18.1] - 2026-10-21

[中文](#cn-0.18.1) | [English](#en-0.18.1)

<h3 id="cn-0.18.1">问题修复</h3>

- 修复收起的一轮里，一段推理正文重新出现在最终回答中：会话行离开视口时不再参与排版，留下的是估算的高度，并占出了位置；最终回答、以及宿主收起的行已不在这条规则里。

<h3 id="en-0.18.1">Bug Fixes</h3>

- Fix a stretch of reasoning reappearing inside a folded turn's final answer: rows outside the viewport left the layout to an estimate of their height and so took up room they do not take. The final answer and the rows the host has folded are no longer under that rule.

## [0.18.0] - 2026-10-21

[中文](#cn-0.18.0) | [English](#en-0.18.0)

<h3 id="cn-0.18.0">新增功能</h3>

- 新增对话统计上的会话费用：宿主半按每次结算的发生时刻与模型计价，人民币与美元两张官方价表都随快照下发，设置里可选显示币种；价格快照与峰值费率目录由仓库的定时工作流抓取，安装端每天从仓库更新一次，包内副本兜底。

### 体验优化

- 设置页的计费币种新增「关闭」：选它后统计行不显示费用，也不向宿主索取价目表与会话金额。
- 把设置页「侧栏」页的「面板悬浮卡片」改名为「右侧栏卡片布局」，开关本身与存下的设置值不变。
- 模型选择器的二级菜单顶部新增搜索框：输入名称即可在整份模型目录里筛选，回车之外的方向键、选择与编辑照常可用；行距同时收紧。清除按钮沿用 transitions.dev 的溶解效果（文字下沉模糊、占位符从上方落入、每个词下方亮起一道光带），并跟随设置的动画档位；搜索框里的光标使用皮肤自己的光标动画。
- 扩大费用的模型覆盖：快照附带一份公共模型目录的刊例价（美元/百万 token），官方价表没有的模型按它计价，人民币按快照内的固定汇率折算；Kimi K3 这类订阅渠道的模型也按 API 刊例价出数，不再一律留空。
- 改善钠的兜底标记：它只跟随流容器自己的子节点变化，一批变化只标记这一批新增的子元素，流式输出期间不再读整页的变化记录。
- 改善钠设置项的说明：写成「改写dsh及插件的样式表，在牺牲兼容性的前提下优化渲染性能」，生效中的规则条数改用强调色显示。
- 把设置页「折叠侧栏设置区」「侧栏搜索」「对话导航」三行改名为「重绘账户区」「重绘搜索面板」「重绘消息导航」，三处开关与存下的设置值不变。
- 模型选择第二层的卡片在搜索时按新列表的高度平滑改变大小，不再跳变；把动画设为「减弱」时立即落位。
- 把设置页外观标签的「品牌名称」「标志图片」「文字标志」「图片颜色」四行合并成一行「品牌标志」，排在外观标签的最前面：直接把侧栏的品牌区搬进设置页，标志与名称居中，图片颜色作为同一块的子行；指针移到标志或名称上即出现灰色矩形，点一下就在原处更换图片或输入名称，四行原有的开关与存下的值不变。
- 把模型选择器里模型行的高度从 30px 收到 27px，字号与行内文字不变，一级与二级菜单同步。
- 改善长会话里流式输出的流畅度：离视口的历史条目不再参与样式计算、布局与绘制，滚动的总高度仍按它们各自的尺寸保留。

### 问题修复

- 修复按下输入卡片或过程分组自行展开时输入框的光标跳回草稿开头的问题：焦点交还之前先记下选区，连同焦点一起放回。
- 修复上下文占用与统计收进弹出面板时，输入框的 @ 菜单把数字那一行顶到菜单上的问题：部件标记不再把宿主挂在输入卡片浮层座位里的菜单读成输入框自己的行与右侧控件，菜单打开时数字仍站在工具栏那一行。
- 修复页面缩放时输入区右下角的上下文弹层纵向位置偏低、下沿越出窗口的问题：皮肤按页面自身像素把弹层放在计量圆环上方，留出宿主原来的间距，弹层长高时重新对齐。
- 修复档位矩阵的方块在卡片关闭后仍带着两个无限动效运行、页面空闲时主线程持续被占满的问题：卡片不在打开状态或读者选了减弱动效时，方块与两层装饰的动画停下，打开且动效全开时恢复。
- 修复切换推理等级时档位按钮的宽度随新名字伸缩、把模型名与已经打开的档位弹层一起挤动的问题：按钮按当前档位表里最宽的名字预留宽度，换档时按钮宽度与弹层位置都不动。
- 修复第三方插件挂在侧栏页脚的对话框被接管隐藏、打开成模态框后整页失去响应的问题：自身是浮层的页脚条目不再收进账号菜单，皮肤也不向它写入 display。
- 修复读者自己发的那条消息滚动出视口后不再出现高度折叠控制：这类消息所在的流条目保留排版，助手行仍跳过视口之外的排版。
- 修复自定义模型的标识是服务商内部别名时（如 kmodel 显示为 kimi-k2.6）模型选择器里没有说明行、也画不出厂商标的问题：文案规则与厂商规则改为同时读标识与显示名称。
- 修复切换会话时统计行的费用区先消失再出现、整行跟着重新排版的问题：费用区在会话金额到达之前保留原来的位置，以币种符号加一道短横占位并压暗，宽度按金额的量度预留，新金额到达后在同一位置替换。
- K3 的人民币费用改按厂商公布的人民币价目表计算：未命中 20 元、命中 2 元、输出 100 元每百万 token，不再用美元价乘固定汇率。
- 修复钠的改写写入失败后样式表恢复不回来、宿主改动规则后改写无声失效的问题：一次写入失败会把这次写入的规则全部写回，已写入的规则逐张表登记；生效条数归零时设置项写明宿主已改动这些规则，开关关闭时读不回原样的规则也会上报。
- 修复首页「工作台」的用量面板停在打开窗口那一刻的数字：面板挂载期间按固定周期重取，回到窗口时也重取；宿主侧的汇总缓存从 5 分钟降到 30 秒，等汇总结果的轮询上限放宽，大历史不再先看到旧值。
- 修复模型选择器在模型较多时压扁带描述的行、让描述文字挤进下一行的问题，列表改为随内容滚动。
- 修复模型选择器搜索框的三处问题：搜索框紧贴卡片上沿、输入时光标高于文字、清空后光标不回最左边。搜索框自带一段上边距，单行输入框的光标按内容框居中后与文字齐平，清空时把插入点放回开头并重新测量光标。

### 其他变更

- 让决策记录的正文只引用在册的编号，决策索引写明放弃的方案归入后果一节、没有重审条件时写「无。」，lint 核对每条决策的四个小节按序齐全、重审条件非空，且在册决策引用作废编号即失败。
- 去掉模型二级分组三处规则上多余的 !important：同一批取值已由别的规则给出，importance 场景逐条实测去掉优先级后页面没有任何变化。
- 钠渲染引擎改为以 PolyForm Shield 1.0.0 授权：可以阅读、修改与分发，不能用来提供与本插件竞争的产品；仓库其余部分仍为 MIT，已发布的 0.17.0 不受影响，名字的来源在通知文件里写明致敬 Minecraft 的 Sodium 模组。
- 把测试层从 CommonJS 改成 ESM，十一份测试数据表集中到 packages/testing/data/，三份字体许可证与作者清单合并成一份，宿主半的构建脚本移入 scripts/，两张螃蟹笔记帧归入 mascot/crab/，插件的表现与断言不变。

<h3 id="en-0.18.0">New Features</h3>

- Add the session's cost to the conversation statistics: the host half prices every settlement at its own instant and route, both official price tables ship in the snapshot, and the settings choose the currency; a scheduled workflow keeps the price snapshot and the peak rate catalog in the repository, every install refreshes from it once a day, and the packaged copies answer when it cannot be reached.

### Improvements

- Add Off to the settings page's Billing currency: chosen, the statistics line draws no cost and the browser asks the host for neither the price table nor the session's amount.
- Rename the Sidebar tab's Float docked panels switch to Right sidebar card layout, with the switch and the stored value unchanged.
- Add a search field to the top of the model picker's second level: typing a name filters the whole model catalog, while selection, editing and the arrow keys keep working as before, and the rows sit closer together. Its clear control plays transitions.dev's dissolve — the words fly down through a blur, the placeholder falls in from above, and a streak ignites under each word — answering the animation choice in force, and the field's caret is the skin's own animated one.
- Widen the cost figure's model coverage: the snapshot carries the public catalogue's list prices (USD per million tokens), a model the official table does not price falls back to it, and CNY converts at the snapshot's fixed rate; subscription-channel models such as Kimi K3 now show their API list-price equivalent instead of nothing.
- Improve Sodium's fallback mark: it follows the changes of a flow container's own children and marks only the children a batch added, so streaming output no longer reads the whole page's change records.
- Improve the Sodium setting's copy: it now reads that it rewrites dsh's and plugins' stylesheets, trading compatibility for rendering performance, and the number of rules in effect stands in the accent colour.
- Rename three settings rows to Redraw the account area, Redraw the search panel and Redraw the message navigator, with their switches and stored values unchanged.
- Make the model picker's second-level card resize smoothly to the height of the list a search leaves, instead of jumping; under Reduced motion it lands at once.
- Merge the Appearance tab's Brand name, Brand mark, Wordmark and Image colours rows into one Brand row that opens the tab: the sidebar's brand area itself now stands in the settings page with its mark and name centred, a grey rectangle follows the pointer onto the mark or the name, a press replaces the image or types the name in place, and the image colours sit under it as a sub-row; the four rows' switches and stored values are unchanged.
- Tighten the model picker's model rows from 30px to 27px, with the font sizes and the text inside them unchanged, on both levels of the menu.
- Improve streaming smoothness in long conversations: rows outside the viewport no longer take part in style calculation, layout or paint, while the scroll range keeps their own sizes.

### Bug Fixes

- Fix the composer's caret jumping back to the start of the draft when a press on the input card or a process group's own toggle moves the focus: the selection is captured before the move and restored with the focus.
- Fix the composer's numbers riding up onto the @ menu when the statistics live in the context popover: the part walk no longer reads the host's own menu, mounted in the input card's overlay seat, as the composer's row and trailing cluster, so the numbers stay on the toolbar row while a menu is open.
- Fix the context popover above the composer's meter sitting too low and running past the window's bottom edge under page zoom: the skin places it above the meter in the page's own pixels, at the host's own gap, and re-takes that reading when the popover grows.
- Fix the effort matrix's blocks keeping two infinite animations each while their card is closed, which kept the main thread busy with nothing on screen, and their shortened cycle still repainting every frame under reduced motion: the animations stop while the card is not open or the reader has chosen reduced motion, and resume when the card opens with motion full.
- Fix the effort button taking each level's own width, which pushed the model name and the open effort card sideways whenever the level changed: the button now reserves the widest name of its ladder, so a switch leaves both its width and the card's place alone.
- Fix the whole page going unresponsive when a dialog a plugin mounts into the sidebar footer was hidden by the takeover: a footer entry that is itself a floating overlay is no longer collected into the account menu, and the skin writes no display rule onto it.
- Fix the fold control under a message the reader sent going missing once that message scrolled out of view: rows holding the reader's own messages keep their layout, while assistant rows still skip layout off screen.
- Fix a custom model whose id is the provider's own alias (`kmodel` shown as `kimi-k2.6`) losing its description line and its vendor mark in the model picker: the copy and brand rules now read the display name as well as the id.
- Fix the cost segment of the statistics line vanishing and reappearing across a session switch, which re-laid the whole line: the segment now keeps its place until the session's amount arrives, standing as the currency symbol and a dash in the quiet ink, with the width of an amount reserved, and the new figure replaces it in the same room.
- Price K3 in CNY from the vendor's own CNY table — 20 input, 2 cache hit, 100 output per million tokens — instead of converting the USD list price at the snapshot's rate.
- Fix a Sodium rewrite that could not be undone after a failed write, and the rewrite going quiet once the host changed the rules: a failed write now writes back every rule it wrote, the rules taken are held sheet by sheet, the setting says so when the number in effect falls to zero, and a rule that cannot be read back as the rewrite left it is reported.
- Fix the Studio home's usage panel standing on the figures of the moment the window opened: the panel reads the roll-up again on a fixed period while it stands on the page and once more when the reader comes back to the window, the host half's roll-up cache drops from five minutes to thirty seconds, and waiting for a cold fold no longer gives up before the numbers land.
- Fix the model picker squeezing rows that carry a description when the catalog outgrows the card, where the second line ran into the row below; the list scrolls instead.
- Fix three faults of the model picker's search field: it sat flush against the card's top edge, its drawn caret stood above the text, and clearing left the caret where the old words ended. The field now carries its own inset above, a single-line field's caret is centred in its content box, and a clear puts the insertion point back at the start and measures the caret again.

### Chores

- Make a decision's prose cite only the decisions in force, say in the index that an abandoned option belongs under 后果 and that a decision with nothing to revisit writes 「无。」, and have lint check that every decision carries its four sections in order with a review condition that says something, and that no live decision cites a retired number.
- Drop the redundant !important on the model picker's level-2 group rules: other rules already carry the same values, and the importance scenario measured no change on the page with the priority removed.
- License the Sodium rendering engine under PolyForm Shield 1.0.0: read, change and redistribute it, but not to provide a product competing with this plugin; the rest of the repository stays MIT, the published 0.17.0 is unaffected, and the notice file states that the name is a tribute to Minecraft's Sodium mod.
- Move the testing layer from CommonJS to ESM, gather its eleven data tables under packages/testing/data/, merge the three font licences and the authors list into one file, take the host half's build script into scripts/, and put the two crab laptop frames into mascot/crab/, with the plugin's behavior and assertions unchanged.

## [0.17.0] - 2026-10-20

[中文](#cn-0.17.0) | [English](#en-0.17.0)

<h3 id="cn-0.17.0">新增功能</h3>

- 新增通用设置里的实验性开关「钠(Sodium)渲染引擎」：打开后就地改写宿主对话流的间距规则，只拿对话流的直接子元素去匹配，长会话流式输出时每次插入的样式重算更省；首次检测到适配的宿主版本时自动打开，小字显示生效中的规则条数，悬停列出每一条。

### 体验优化

- 窗口变窄时底部工具栏先压缩模型外显名，档位选择器与上下文显示器保持原位，三者不再互相覆盖。
- 改善推理强度滑杆最高档的点阵动效：一条光带从右端扫过，方块按簇亮起，亮度峰值连续变化，入场时前沿带一道亮光。
- 面板打开时，右侧栏的收起按钮出现在顶栏右端，面板自己那一枚仍留在面板上，按下即收起面板，宿主的打开按钮回到原处。
- 设置页的说明收成一句话，只说这一项给读者什么。
- 改善长会话流式输出时的帧耗时：标题栏布局、侧栏底部入口的隐藏、输入框下统计行与上下文用量药丸的重新测量、思考强度按钮的重新定位、思考行的自动折叠，以及对话与过程分组的跟随滚动，不再在其他写入之后强制页面重算样式与布局。

### 问题修复

- 修复页面缩放不为 100% 时账号菜单跑到用户名下方并越出窗口的问题：宿主按自身几何摆放的那张卡片由皮肤按同一套几何重新摆放，卡片的高度与位置在同一个坐标空间里算出，缩放后仍贴在账号行上方。
- 修复用量面板里热力格的日期提示在上排格子被抬到网格之外的问题：格子下方的余量更多时，提示改挂在格子下方，网格顶部那几行的提示不再越过网格上沿盖住统计格。
- 修复浅色主题下模型菜单里的供应商名颜色过浅、对比度不足以读清 11px 标签的问题。
- 修复设置里某一项偏好存成带 `toString` 字段的对象、或存成 `toString` 这类内置名字时整套偏好读取出错的问题：这样的值现在读作该项的默认值。
- 修复归档会话的删除按钮拒绝插件生成的会话 id 的问题：含冒号与 @ 的 id（im-connect 的 `im:<channel>:dm:<user>:<token>@<domain>`）现在按宿主自己的目录命名规则定位到存储它的那个目录再删除，路径形状与带转义符的 id 仍然拒绝。
- 修复设置页导航里的 Claude Style 一格不显示 Claude 星芒的问题，这枚单色标记重新替下宿主的齿轮图标，浅色画布上取标签文字的颜色。
- 修复侧栏收起后账号卡片被压成图标宽度、用户名与菜单项被裁的问题：从图标栏打开的账号卡片现在按卡片自己的宽度展开在账号按钮旁。
- 修复侧栏收起成图标栏后皮肤的搜索框整件消失、只剩宿主自己的放大镜的问题：收起栏现在在标记下方给出皮肤自己的搜索图标，与新建会话同一步进，随其余图标一起从右侧滑入，「独立」与「覆盖品牌」两种样式在收起态一致呈现。
- 修复流式输出很快时聊天区的跟随滑动跟不上内容的问题：滑动重新起步时改从动画自己画到的位置算起，一个回合开头读者自己那条消息在场期间让位结束后立刻恢复，一帧长高超过滑动一段距离的内容也照常滑完能滑的那一段，输入卡片的位置在整个回合里不再移动。
- 修复窄窗口下对话区底部残留一条横向滚动条的问题：面板自身的横向溢出不再产生滚动条，面板内需要横向滚动的代码块与表格仍各自滚动。

### 移除

- 移除功能一览与设置说明两份文档，功能清单不再写中英文描述。

### 其他变更

- README 改成展示文案：截图与动画帧在前，预览各一行说明，安装两个命令块，鸣谢四条。

<h3 id="en-0.17.0">New Features</h3>

- Add the experimental Sodium rendering engine switch to the General settings: it rewrites the host conversation flow's spacing rules in place so only the flow's own children are matched against them, so each insertion costs less style recalculation while a long conversation streams; it turns itself on the first time it detects a host release it covers, and its line shows how many rules are in effect and lists each one on hover.

### Improvements

- On a narrow window the composer's bottom row compresses the model name first, so the effort trigger and the context meter keep their places instead of overlapping it.
- Improve the strongest rung's dot matrix on the reasoning slider: a band of light sweeps in from the right, the blocks light in clusters, their peaks vary continuously, and the arrival carries a bright leading edge.
- While the panel is open, the right panel's collapse button appears at the top bar's right end and the panel keeps its own copy; pressing it closes the panel and the host's open button returns.
- A setting's line says one clause: what the setting gives the reader.
- Improve frame time while a long conversation streams: the title bar layout, hiding the sidebar footer's entries, measuring the stats line and the context meter's pill under the composer again, repositioning the effort trigger, folding thinking rows automatically and following the conversation and its process groups no longer force the page to recompute style and layout after other writes.

### Bug Fixes

- Fix the account menu opening below the account row and past the window's edge at any page zoom other than 100%: the card the host places from its own geometry is placed by the skin from the same geometry, with the card's height and position computed in one space, so it still hangs over the row once the page is drawn at a factor.
- Fix a heat cell's day tip rising out of the grid on its upper rows: where the cell holds more room below it, the tip now hangs under the cell, so the top rows' tips no longer reach over the grid's top edge across the stat cells.
- Fix the provider names in the model menu reading too faint in the light theme for an 11px label.
- Fix reading the preferences failing when one of them is stored as an object holding a `toString` field or as a built-in name such as `toString`: such a value now reads as that preference's default.
- Fix the archived rows' delete button refusing plugin-generated session ids: an id carrying a colon or an at sign (im-connect's `im:<channel>:dm:<user>:<token>@<domain>`) now resolves to the directory the harness stored it under before deletion, while a path-shaped id and one carrying the escape itself stay refused.
- Fix the Claude Style row in the settings navigation not drawing the Claude starburst, which replaces the host's gear again and takes the label's ink on the light canvas.
- Fix the account card being squeezed to the width of the rail's icon and cutting its name and rows off: a card opened from the icon rail now expands at the card's own width beside the account button.
- Fix the skin's search box disappearing when the sidebar collapses to the icon rail and leaving only the host's own magnifier: the rail now keeps the skin's search icon under the mark on the host's step, it slides in from the right with the other icons, and the independent and overlay styles stand the same way there.
- Fix the chat area's follow falling behind a fast answer: a restart of the stream slide is measured from where the animation itself has painted, the stand-down over the reader's own message ends with that message's entrance instead of a fixed window, and a frame growing by more than one slide carries is slid as far as a slide does; the composer's own box no longer moves through the turn.
- Fix the horizontal scrollbar that appeared under the composer on a narrow window: the transcript pane's own horizontal overflow is clipped, while code blocks and tables inside it keep their own scrolling.

### Removals

- Remove the feature list and the settings documents; a feature manifest no longer carries a two-language description.

### Chores

- Make the READMEs presentation copy: screenshots and animation frames lead, each preview gets one line, installation is two command blocks, and the acknowledgements are four bullets.

## [0.16.3] - 2026-10-18

[中文](#cn-0.16.3) | [English](#en-0.16.3)

<h3 id="cn-0.16.3">新增功能</h3>

- Beam 的模型行画出厂商组合标，`opencode-go/beam-free` 这类标识认领 Reflection 的组合标，字标站在名字前面，标记在浅色画布上用厂商自己的品牌色、深色画布上随标签文字。

### 体验优化

- 一次改写或折叠作废的淡入片段改为在一趟原地压缩里收走，屏幕上的样子不变。
- 流式输出期间写回的 tokens 把工具调用算进去，每出现一行调用就按一行计，纯文字的字重也更接近实际比例。
- 等待行换词不再强制页面同步重算样式与布局。
- 过程组较多的会话切换时摘要一次量完。
- 等待行加载点换动作时先出后进，上一组各自在折返处淡出，最后一颗走完新的那组才从头开始、各自淡入，18×14 的小框里不再同时挤着两组点。

### 问题修复

- 用量面板里热力格的日期提示按自己的宽度贴向格子的一边，不再把面板撑出横向滚动条。
- 设置页里刚改动的开关停在读者按下的那一档，改动交给宿主期间宿主重读设置文档不会把值盖回去，给出答复时再按答复校正。
- 关闭「聊天区滚动动画」后，进行中的状态行留在文档里，滚动整份交回宿主，读者往回翻看时它随内容一起滚走。
- 窗口很窄时，思考强度按钮留在输入卡片里，它借的宽度从模型名的截断里出，输入卡片不再横向滚动，按钮也不会画到侧栏上方。
- 等待行加载点沿直线往返时走的是简谐运动，三颗点在两端停顿、穿过中点最快，经过中点时缩到最小。

### 其他变更

- 注释与内置文档里重复的那一份清掉了，代码行为不变。
- 两道检查各补上一处，750 行停线开始管单元测试文件，整份文档查找的登记规则写明单元测试不在其内，`packages/contracts/src/timing.ts` 的 `host.column-observer` 添上持有它的那份单元测试。

<h3 id="en-0.16.3">New Features</h3>

- Beam rows draw the vendor lockup, so an id such as `opencode-go/beam-free` claims Reflection's lockup, the wordmark leads the label, and the mark wears the vendor's own brand colour on the light canvas and the label's ink on the dark one.

### Improvements

- The fade segments one rewrite or fold invalidates are taken out in a single in-place compaction, and nothing on screen changes.
- The written-back tokens count the tool calls while an answer streams, each call row counting once and plain text taking a share closer to what the provider bills.
- The waiting line swaps its words without forcing a synchronous style and layout pass.
- A conversation with many process groups switches with its summaries measured once.
- The waiting line's loader changes motion one set at a time, the set leaving fading out where it turns and the next starting from the top only after the last dot has gone, so the 18×14 box no longer holds two motions at once.

### Bug Fixes

- A heat cell's day tip lines up with the side its own width needs, so it stays inside the panel near either end.
- A control just changed in the settings page stays where the reader left it while the change crosses to the host, and follows the host's answer when it arrives.
- With the chat-area scrolling animation off, the running status line keeps its document place and a reader scrolling back finds it travelling with the content.
- With a very narrow window the reasoning-effort trigger stays inside the composer card, taking the room it borrows beside the model trigger out of the model name's truncation, so the card no longer scrolls sideways and the trigger is never drawn over the sidebar.
- The waiting line's loader dots walk their lines in simple harmonic motion, each resting at either end, fastest and smallest through the middle.

### Chores

- Comments and built-in documents lose the copy that stood twice.
- Two checks each gain one thing, the 750-line stop line now covering unit test files and the whole-document lookup register saying plainly that a unit test stands outside it, and `packages/contracts/src/timing.ts`'s `host.column-observer` naming the unit test that holds it.

## [0.16.2] - 2026-10-17

[中文](#cn-0.16.2) | [English](#en-0.16.2)

<h3 id="cn-0.16.2">新增功能</h3>

- 侧栏里进行中的对话标记可以换回滚动的圆环，「动效」页新增「进行中的对话」一行，两张卡片带出「呼吸灯」（默认）与「滚动圆环」两档（设置项 `ongoingIndicator` 的取值为 `breathe` 与 `ring`），正在跑的那一行立刻换过来，动画设为「减弱」时两档都停住。

### 体验优化

- 上下文弹层里的数字改为连续计数，接到新读数时从眼前的数计数到新值，与输入卡片下面那一行同一套动作，弹层每次打开都从当时的读数写起。
- 流式输出时，写回的 tokens 随文字上涨，按已经到达的文字估算着上涨、结算时换成提供方给出的真实值，读入的 tokens、缓存命中率与计量饼的占用都不动。
- 流式输出时，上下文计量饼不再拖慢页面，它需要的两种颜色改在每一帧开头读取。
- 推理强度滑块不再在每次更新里重排页面，滑块轨道与滑钮的宽度改在每一帧开头读取。
- 长对话流式输出时，消息折叠与推理窗口不再拖慢页面，气泡查找与高度、样式的读取都改在每一帧开头完成。
- 计数中的上下文数字与等待计时不再让整页重算样式，状态行与上下文弹层里上涨的数字、等待行的计时都改为原地改写文字。

### 问题修复

- 搜索面板的分类页签按下哪一枚滑块就滑向哪一枚，滑块在按下的一刻出发。
- 思考行回放推理时不再拖慢页面，推理窗口里的文字每 0.84 秒平滑上移一步、一步追到最新一行，正在思考的回合里页面保持流畅。
- 推理窗口的高度跟着文字一起长，推理每写出新的一段窗口就在同一帧长到文字自己的高度，最新的几行不再被下缘裁住。

<h3 id="en-0.16.2">New Features</h3>

- The sidebar's mark for a running conversation can be the turning ring again, the Motion tab gaining an Ongoing conversations row whose two cards offer Breathing light (the default) and Turning ring (the `ongoingIndicator` setting is `breathe` or `ring`), with the running row changing at once and Animation set to Reduced holding both still.

### Improvements

- The context popover's figures count to their readings, a row's number travelling from the value on show to a new one the way the line under the input card does, and a panel that opens writing the reading of the moment.
- The tokens written back climb while an answer streams, growing with the text that has arrived and taking the provider's own number once that step settles, while the tokens read in, the cache-hit share and the meter's occupancy stay as they were.
- The context meter's pie no longer slows the page while an answer streams, its two colours now read at the start of each frame.
- The reasoning-effort slider no longer lays the page out again on each update, its track and knob widths now read at the start of each frame.
- Message folding and the reasoning window no longer slow the page while a long conversation streams, the bubble lookup and the height and style reads now happening at the start of each frame.
- Counting context figures and the wait timer no longer make the whole page recompute its styles, the figures on the status line and in the context panel and the wait line's timer rewriting their text in place.

### Bug Fixes

- The search palette's filter highlight follows the tab pressed, the sliding background starting within the press itself.
- Replaying the reasoning in the thinking row no longer slows the page, the text gliding up one step every 0.84 seconds with each step reaching the newest line.
- The reasoning window grows with its text, taking the text's own height within the frame the text arrives, so the newest lines are no longer held behind its lower edge.

## [0.16.1] - 2026-10-17

[中文](#cn-0.16.1) | [English](#en-0.16.1)

<h3 id="cn-0.16.1">新增功能</h3>

- 读者自己发出的长消息可以收起来，气泡下面多出一个「展开全文」，按下放回整条、再按收起，这条消息在本次会话里保持读者选的样子，设置页关掉「自动开合与卷帘门」时这项跟着关掉。
- 新会话页有了水波纹字符背景，点击页面荡开水波、被扫过的字符显现出来；设置页「外观」页首页版面下新增同名开关，默认关闭、带「实验性」标记，设置存为 `homeRipple`，宿主半边是旧版本时改动保存不下来。
- 设置页「通用」多了页面缩放，整页按 0.8x、1x、1.25x、1.5x 绘制，界面、文字与控件一起缩放，「随系统」保持系统与 DSH 给出的尺寸，设置页自己也按同一倍数绘制、档位可以在这一页上直接比出来，贴输入区展开的弹层仍贴着各自的按钮，设置存为 `pageZoom`。
- 代码字体先试 Anthropic Mono，把 Anthropic 的等宽字体装进系统或放进 `$DSH_HOME/dsh-claude-style/fonts/` 之后，代码块、行内代码与等宽标签都由这款字体绘制，没有这份文件时仍用随包分发的 JetBrains Mono，中文照旧落到系统中文字体；字体文件只在仓库里提供，npm 包不带。

### 体验优化

- 页面缩放的标题旁标出「实验性」，设置页「通用」页的「页面缩放」一行带上与插件页标记实验性插件相同的那一枚标签。
- 深色弹层的边只剩边框本身，皮肤自建的弹层卡片与它重绘的账户菜单、首页选择器不再在边框外侧铺一道 3px 的黑色沉降，卡片的外缘就是那道高光边线，两层投影照旧。
- 工作台首页的问候语与用量面板之间只剩一个列间距，标题块不再为下方预留 30px、面板随之整体上移 30px，之间只留首屏列自己的 10px 间距，经典版面上问候语与输入卡片之间的间距保持原样。
- 主题风格的两张卡片左图右文，Claude 卡片是星芒标志加 Claude 文字标志、DeepSeek 卡片是它的标志与文字合成的一件图形，均沿用插件已有的图形资源。
- 「动画」设为「减弱」时，动效页的预览卡仍能分清两档，状态行画法、光标动画、新文字淡入与消息气泡动画的卡片各停在一帧，卡片略变暗、行下方写明这一项此时不生效，选择仍可修改。
- 上下文占用那一环改成一枚饼，已占用与未占用画成两段同心扇区，15% 与 85% 互为镜像、对半时是两枚等大的半圆；色带照旧按占用取色、读数与这一块同色，触发按钮的位置与高度、输入行给它留的宽度都不变。
- 独立成行的数字改成从当前读数计数到新读数，每个数字留在原位连续增长或减少到新值，流式输出期间接连更新时后一次从当时显示的值接着走，切换会话时也从上一段的数字计数到新一段的；缓存命中那一截的色带只染数字与百分号，「缓存命中」四个字留在这一行自己的颜色。
- 五个开关改成直接装卸，关闭输入框插入符动效、吉祥物、模型选择器、侧栏账号区或输入区重绘范围时，宿主的界面随即回来，重新打开就在原位装回、不用刷新页面；`Ctrl+,` 打开设置的快捷键改由设置页承担。
- 远程页面上的设置也能改，经局域网地址或隧道打开的页面与运行 DSH 的电脑上那一页读写同一份设置，任意一边改动另一边不需要刷新就会跟上。

### 问题修复

- 长消息的起飞带着消息自己的字，折叠收住的长消息在飞行时替身从第一帧起就显示这条消息的开头，盒子从输入框自己的高度收拢到折好之后的高度。
- 另一款皮肤作画时本主题整页让出，侧栏、对话、输入区与设置页一起离场、只留那款皮肤与宿主自己的界面；在皮肤中心里本插件那一行选回本主题，这些内容与读者存下的偏好一起回来。
- 深色模式下分段控件的滑块有了底色，设置页的页签与并排开关、经典首页的权限分段里当前项的滑块比底座亮一档，浅色与 DeepSeek 深色配色下同样成立。

### 其他变更

- 用户消息的两处宿主查询移进引擎层，气泡的查找与用户行的选择器现在都放在 `packages/engine/src/chat-dom.ts`，颜色分量与透明度的读取也一并搬过去，读者看到的行为不变。

<h3 id="en-0.16.1">New Features</h3>

- A long message the reader sent can be folded away, with a Show the whole message control under the bubble that hands the whole message back and folds it again, and the message keeps what the reader chose for the rest of the session; turning the chat area's folding off turns this off with it.
- The new-conversation page gets a ripple glyph background, where a press sends out waves and the characters a wave passes show; a switch of the same name sits under the home layout on the Appearance tab, off until it is turned on and marked experimental, stored as `homeRipple`, and a change to it does not save with an older host half.
- The settings page's General tab gains page zoom, the page drawn at 0.8x, 1x, 1.25x or 1.5x with the interface and its controls growing or shrinking together, and Follow the system keeping the size the system and DSH give it; the popovers that open off the composer stay on their own triggers, and the setting is stored as `pageZoom`.
- Code is drawn in Anthropic Mono first, so code blocks, inline code and the mono labels take Anthropic's mono face once it is installed on the system or dropped into `$DSH_HOME/dsh-claude-style/fonts/`, the JetBrains Mono copy the package carries still answering without the file and Chinese text keeping falling through to the system's Chinese faces; the face is served from this repository only, not from the npm package.

### Improvements

- Page zoom is labelled experimental, the row on the settings page's General tab carrying the tag the plugin page marks an experimental package with.
- A dark popover's edge is its border again, the skin's own popover cards and the account menu and hero-row pickers it repaints no longer laying a 3px black falloff outside the border, so the card's outer edge is the highlight line itself with the two drops unchanged.
- The studio home's greeting and usage panel sit one column gap apart, the headline block no longer reserving 30px below itself and the panel moving up by 30px so only the hero column's own 10px gap stands between them, while the classic layout keeps the spacing under its greeting.
- The theme style cards read mark left, word right, the Claude card carrying the starburst beside the Claude wordmark and the DeepSeek card its mark and word as one lockup, both from the plugin's own artwork.
- While Animation is Reduced the Motion tab's cards still tell their two choices apart, the status paint, caret, text fade and message entrance cards each holding one frame, with the cards dimmed and the row saying the choice takes no effect now while it stays editable.
- The context meter's ring is a pie, the occupied share and the rest drawn as two sectors on one centre, so 15% and 85% mirror each other and an even split is two half discs; the colour band still follows the occupancy with the reading the same colour, and the trigger keeps its box, its height and the room the row keeps for it.
- The line of numbers counts to a new reading from the one it shows, each figure staying where it is and growing or falling to its new value, a reading landing while the count is in flight carrying on from the value on show and another session's numbers counted to from the ones the line was showing; the cache share's colour band marks its figure and percent sign alone, the words before them keeping the line's own tone.
- Five switches now install and remove their feature whole, so turning one off brings the host's own interface back and turning it on again installs it in place without a reload; the `Ctrl+,` shortcut for settings now belongs to the settings page.
- Settings can be changed from a remote page, a page opened through a LAN address or a tunnel reading and writing the same settings document as the page on the computer running DSH, and a change made on one side reaching the other without a reload.

### Bug Fixes

- A folded message's flight carries the message's own words, the stand-in showing the message from its own first line from its first frame while its box closes from the composer's own height down to the folded one.
- With another skin painting the page this skin hands over the whole page, the sidebar, the conversation, the composer and the settings page leaving together so the skin and the host paint alone, and picking this plugin's row in the skin center bringing them back with the reader's saved preferences.
- The segmented controls' slider carries a fill in dark mode, the current item reading one step lighter than its groove on the settings page's tabs and paired switches and the classic home's permission presets, and the light and DeepSeek dark palettes reading the same way.

### Chores

- Two host reads of a user message move into the engine, the bubble lookup and the user row selector now standing in `packages/engine/src/chat-dom.ts` with the colour-part and alpha reads moved along, and nothing the reader sees changes.

## [0.16.0] - 2026-10-16

[中文](#cn-0.16.0) | [English](#en-0.16.0)

<h3 id="cn-0.16.0">体验优化</h3>

- 用量记录的体积缩到约四成，记录里一天的量按路由存放、当天总量由这些路由相加得出，小时直方图只记非零的格子，日志已不在的会话不再存指纹，与记录一致的那一趟不再写盘。
- 界面每帧少做整份文档的查找，查不到东西的查找答案在页面结构变化之前一直有效，设置页的导航格、侧栏的已归档清单清理与账户卡片的清理都收窄到它们各自所在的侧栏里。
- 长对话里收走状态行的那一趟不再按对话长度平方增长，运行行清单改作一次集合，摘除的一趟随行数线性走完。
- 滚动动效的断言不再随机器快慢变化，探针从滑行开始的那一帧起逐帧记下距离，断言改成这条记录的不变式；阈值与帧数住进 `packages/testing/bounds.json`，`scripts/lint.mjs` 新增一条规则，要求台账里每条边界都有名字、有限的值与理由，被检查读到的名字必须在台账里，没人读的条目要被拿掉。
- 账户页脚那一块不再靠 `!important` 取胜，账户行、账户菜单、头像与皮肤画布、抽屉里的行与悬停都改为按选择器本身的权重压过去，账户菜单与首页两个菜单的行样式合成一处按两个标记写，页面外观不变。
- 页脚接管那一块也不再靠 `!important`，`packages/client/src/features/account/footer-takeover.css` 里那 43 处 `!important` 去掉了，页脚各容器归零、镜像条目塌缩、侧栏收成细轨时的账号按钮与弹层以及细轨里隐藏设置入口的规则，改为按选择器本身的权重压过去，页面外观不变。
- 状态行里的说法改为放不下才截断，模型自己写的推理从句、命令调用声明的说明、正在操作的文件名都整句带到这一行，放得下多少由这一行的宽度决定，宿主那一行的内容盒取所在行的宽度，说法在自己的盒子里截断并画省略号，加载点、计时与徽标留在原处。
- 状态行里的从句不再被名字里的点号截断，句子的边界交给页面自己的句子规则，说法从分词一直带到这一句真正结束的地方，助动词与分词之间的一两个词与完成进行时也能读出来；否定的句子与还没动手的打算照旧不读。
- 状态行里的从句站到下一次意图到达为止，模型自己那句从句在下一次意图到达之前一直站着，新的从句、调用自带的说法或写回答、调用工具这类状态一到才改口；「精确状态行」关掉时不读从句，一个说法锁一秒的规则落在说法上而不是落在行上，宿主在步骤之间重建那一行时这一轮站着的说法与它的锁跟着这一轮走。
- 状态行与过程组标题的扫光改用宿主自己的做法，高光带由一层带遮罩的窗口与其中一份着色的文字副本反向平移组成，节奏、步进、0.3 秒的起始延迟与遮罩都与宿主的行一致，回合进行中的页面上不再有运行中的绘制型动画。
- 深色下的边框改为一层高光，`--dsw-alias-border-l1`/`-l2`/`-l3` 的深色取值改为同一个透明白在 `.09`/`.18`/`.30` 三档，卡片、面板、代码块与小徽标的外缘读作顶光打出的倒角高光；浅色的三档仍是暖色实色。
- 弹层的边缘留在边框上，皮肤自建的弹层卡片与宿主自己的账户菜单、首页选择器不再把边线挪进投影，深色在外侧加一道 3px 暗色沉降、投影收成 `0 8px 24px` + `0 2px 6px`，深色加深到 `rgba(0,0,0,.65)` / `rgba(0,0,0,.45)`。
- 侧栏与对话栏之间的分割线收到发丝细边，这条线从 1px 改为 0.5px、Windows 桌面顶栏里它的延续段同步改，在高分屏上正好是一个物理像素。
- 用户消息气泡改用写定的一对底色，`--dsw-specific-bubble` 在 Claude 配色下改为浅色 `#f0f0ef`、深色 6% 白，深色这一格由本插件写定，浅色采用皮肤已有的中性底衬；设置页的消息气泡演示读同一个令牌，随之一起变。
- 流式输出的平滑跟随交给显卡来画，输出期间滚动位置由宿主自己的跟随写到末尾，皮肤只把新长出的内容从下缘滑上来，状态行停在原处不动，回到底部按钮不再需要藏起来。
- 弹层里的分隔线统一成宿主那一根，宿主菜单自己画的 `[role="separator"]` 与皮肤自己建的分隔都是同一根 0.5px 的 `--dsw-alias-border-l2`、写成零高度盒子上的上边框；那条通用规则落在共享外壳里，皮肤自己的卡片与它重绘的两个宿主菜单一起受它管辖，模型选择器的两个页脚上边框也从 1px 收到 0.5px。

### 问题修复

- 删除对话不再带走它的用量，面板的账记在插件自己的目录里，日志已不在的会话照旧留着它结算过的日子，面板继续给出这些日子的 tokens、模型排行与小时分布；早先留在折算缓存里的日子在首次读取时迁移过来。
- 用量记录不再被覆盖掉，解析不了的记录改名成 `usage.json.corrupt-<时间戳>` 留在插件目录里再从会话日志重建，同一个 `$DSH_HOME` 下开着几个实例时每次写回先合并磁盘上的那一份，旧的折算缓存在记录写成功之后删除。
- 侧栏页脚的插件条目全部收进账号区，动作槽里的条目与别的插件直接挂在页脚上的卡片都收进账号弹层，卡片保持它自己的样子，侧栏底部只剩账号这一行。
- 带供应商命名空间的模型标识也认得出厂商标，网关把模型标识写成 `cn:hy3` 这类带前缀的形状时混元系列的模型行照常画出厂商组合标，模型列表的第一级也给出它的说明文案，规则的分段起点改为任何不是字母或数字的字符，`shy-mt2` 这类标识仍不被认领。
- 同一处分段起点下的其余模型也认得出厂商标，`kimi-k3`、`minimax-m3` 这一类带服务方命名空间的标识由 K3、M3 与 o 系列的规则读同一个分段起点认领，`nova` 那条补上分段边界，`sensenova-6.8-flash-lite` 不再被判成 Amazon Nova。
- Claude 品牌下的扫光不再是蓝色，状态行、过程组标题与宿主自己的调用行用同一道暖色高光（暗色为 `#faf9f5` 的 45%，亮色为 `#141413` 的 30%），DeepSeek 品牌下仍是宿主的颜色。
- 在侧边栏或旁边的子代理转录里滚动、点击不再让主会话停止跟随，只有落在主会话滚动区里的滚轮、按压与拖动，以及没有焦点时按下的滚动键，才算读者离开了末尾。
- 状态行不再把引用里的话当成模型在做的事，引号里（「」『』“”与英文双引号）的内容不参与从句判定、从句也不在那里断开，模型自己那一句里带引号的部分照旧原样带出；中文的「正在」判定撤掉，中文推理回到说等待词。

### 其他变更

- 样式表里判断「谁包含谁」的规则改为读一处标记，盖部件的同一趟走查把答案写成一处标记，页面上的 `:has()` 只剩进入作用域的两处与跟随焦点状态的一处；构建同时拒绝在 `:has()` 里读属性、核对每个标记都有声明的来源、并核对声明里的部件名。
- 每趟刷新与每一帧上的整份文档查找改走记下的答案，界面切换、聊天跟随与桌面端页头这九处改由宿主访问模块记住、页面结构变了才重新查找，聊天跟随改在消息列里读那个标记；剩下的四十六处逐条登记在册并写明缘由，脚本会拒绝新增的查找。
- 检查接受的数值成了一份会被核对的记录，每个检查所决定的数字字面量都写进 `packages/testing/check-numbers.json`（`npm run checks:numbers` 生成），闸门与云端核对这份记录，需要理由的边界继续住在 `packages/testing/bounds.json` 里。
- 每处保留下来的 `!important` 都记下它压过谁，判定为需要的每一处写进 `packages/testing/importance-ledger.json`，连同在哪个页面形态上判定需要以及去掉重要性之后接过这个属性的候选；台账里新出现或不再需要的条目会让走查失败，`DSH_IMPORTANCE_LEDGER=write` 从一次运行重写它。
- 构建要求每一处 `!important` 都有页面上的依据，重要性走查把读到的每一处声明都写进 `packages/testing/importance-ledger.json`，产物里任何一处不在台账里就直接构建失败并指出是哪些声明。
- 检查用的边界集中到一张表、每条带理由，跟随末尾允许落后多少、长会话里一帧最长多少、长时间任务一共允许多少都住进 `packages/testing/bounds.json`、经 `packages/testing/bounds.cjs` 读取，放宽一个边界是这个文件里的一行、理由就在旁边。
- 其余十个读数上限也搬进 `packages/testing/bounds.json`，每条带自己的理由。
- 宿主那张菜单卡片的查找收进一处，账户菜单问「宿主开着的那张菜单在哪」改由宿主访问模块记住答案、页面结构变化后才重查，登记表里这一条欠账随之划掉。
- 英雄首页那张选择器卡的触发点也记住答案，输入卡片上那个工作区触发点与首页那一行共用的查找由一处记住、页面结构变化才重查，登记表里这一条从三处降到两处。
- 首页那张宿主菜单卡也走同一条查找，英雄首页落位前改用宿主访问模块里记住答案的那一处，登记表里这条从两处降到一处。
- 两份决定草稿里记的现状跟上已经做完的部分，整份文档的查找记账现存四十三处，`importance` 台账覆盖全部五百三十九处 `!important`，边界表已有十四条由 `packages/testing/bounds.cjs` 供各场景读取，检查表达式里的其余数字由 `check-numbers.json` 记录并核对。
- 侧栏分区的标题改由总线登记表供着，标题清单由观察总线按选择器登记、随页面变化增量维护（D40），每趟刷新只在清单里挑一次，标题与布局都不变时不再走文档，登记表里这一条欠账划掉、现存四十二处。
- 登记一处查不到的原因，首页那一行「开着的选择器」要的是「属性一变就作废」的答案，得由它自己的读取或当趟已经拿着的行来给。
- 对手分类按走查自己的口径补齐两处，去掉重要性之后有过渡开始也算作「这个候选正托着值」，与简写并排写的长属性也成为候选，台账的说明把试过的三条死路一并写下。
- 冒烟的静置判定补上「没有还在跑的有限动画」，页面上仍在运行的有限动画未结束就不采读数，无限循环的那种不算。
- 外观层与它的闸门就位，冒烟走查的每个页面状态按部件记一份计算值快照（只收与字体无关的属性），快照进版本管理、`npm run verify` 的 `appearance` 闸门逐项比对；`scripts/ci-scope.mjs` 拒绝 `packages/testing/appearance.json` 变了而 `packages/client/src` 没变的推送，云端两个工作流都接上了这条。
- 方向记录改成一条方向一页，每条方向只写它回答的背景、决定、由此而来的后果与重审条件，`docs/adr/README.md` 与作废编号的清册由 `npm run docs:index` 生成，编号作废之后不再复用。

<h3 id="en-0.16.0">Improvements</h3>

- The usage record shrinks to about two fifths of its size, a day stored per route with its total summed from them, the hour histogram keeping its non-zero slots alone, a session whose log is gone carrying no fingerprint, and a pass that matches the record writing nothing.
- Fewer whole-document lookups per frame, a lookup that found nothing holding its answer until the page's structure changes, and the settings navigation cell, the sidebar's archived-list sweep and the account card's sweep scoped to the sidebar they live in.
- The pass that takes the state lines down no longer grows with the square of the conversation, its running-row list now a set so the pass walks it once per line.
- The scroll motion assertions no longer move with the machine, the probe recording the distance frame by frame from the frame the walk starts and the checks asking that recording's invariants; the thresholds and frame counts live in `packages/testing/bounds.json`, and `scripts/lint.mjs` requires every bound to carry a name, a finite value and a reason, a name a check reads to be in the table, and an entry nothing reads to come out.
- The account footer no longer wins with `!important`, the host account row, the account menu, the avatar and skin canvas and the drawer's rows and hover states carried by the selectors' own weight, and the account menu's rows and the home page's two menus stating their row style once for both markers together, so the pages look the same.
- The footer takeover no longer wins with `!important` either, the 43 declarations in `packages/client/src/features/account/footer-takeover.css` gone, the footer containers collapsing to zero, the mirrored entries folding away, the account button and popover in the collapsed rail and the settings entry hidden there now carried by the selectors' own weight, and the pages look the same.
- The status line cuts a wording only where it no longer fits, the clause the model's own reasoning hands the line, the description a command call declares and the name of the file a call works on all carried whole with the line's own width deciding how much shows, the host's content box taking the width of the row it stands in and the wording clipped with an ellipsis inside its own box while the loader, the clock and the badge keep their places.
- The status line's clause is no longer cut at a dot inside a name, where a sentence ends now following the page's own sentence rules so a clause runs from the participle to the place the sentence really ends, with the words that may stand between an auxiliary and its participle and the perfect continuous read too; a negated clause and a plan the model has not started are still passed over.
- The status line's clause stands until the next intent arrives, the model's own clause holding until a newer clause, a call's own words or a state such as writing or running a tool arrives; with the Precise status line off no clause is read, and the one-second lock rests on the wording rather than the row, so it travels with the turn when the host builds a fresh row between steps.
- The status line's and the process group header's sweep now use the host's own construction, a masked window and a tinted copy of the words moving in opposite directions with the period, the steps, the 0.3 s start delay and the mask matching the host's rows, so a page with a turn running has no paint-driven animation.
- The dark border is a highlight, the dark values of `--dsw-alias-border-l1`/`-l2`/`-l3` now one translucent white at `.09`/`.18`/`.30`, so the edge of a card, a panel, a code block or a small badge reads as a chamfer catching the top light while the three light rungs stay the warm opaque ladder.
- A popover's edge stays its own border, the skin's own popover cards, the host's account menu and the hero row's pickers no longer moving the line into the shadow, and dark gaining a 3px falloff outside it with the drop tightened to `0 8px 24px` plus `0 2px 6px` and deepened to `rgba(0,0,0,.65)` / `rgba(0,0,0,.45)`.
- The split between the sidebar and the conversation becomes a hairline, the line dropping from 1px to 0.5px with its continuation through the Windows caption row, which lands on a single device pixel on a retina display.
- The reader's message bubble takes a stated pair of fills, `--dsw-specific-bubble` stating `#f0f0ef` in light and a 6% white lift in dark under the Claude palette, that dark cell written by the skin and the light half the skin's existing neutral; the settings page's demonstration bubble reads the same token and moves with it.
- The smooth follow while streaming is drawn by the graphics card, the host's own follow writing the position to the end while the skin only slides the newly grown content up from the bottom edge, so the status line stands still and the back-to-end button no longer has to be hidden.
- A popover's separator lines become the host's own, decided in one place, the host menu's own `[role="separator"]` and the separators the skin builds all the same 0.5px `--dsw-alias-border-l2` drawn as a top border on a zero-height box; the general rule lives in the shared shell and covers the skin's own cards together with the two host menus it repaints, and the two menu footers drop from a 1px to a 0.5px top border.

### Bug Fixes

- Deleting a conversation no longer takes its usage with it, the local account living in the plugin's own directory so a session whose log is gone keeps the days it settled on and the panel still gives those days' tokens, its model ranking and its hour histogram; the days an earlier build kept in its fold cache are migrated on the first read.
- The usage record is no longer overwritten, a record that does not parse kept in the plugin's directory as `usage.json.corrupt-<stamp>` before it is rebuilt from the session logs, every write under one `$DSH_HOME` merging the copy on disk first, and the old fold cache deleted once the record is written.
- Every plugin entry in the sidebar footer is collected into the account area, the action slot's entries and a card another plugin mounted into the footer itself standing in the account popover with the card keeping its own markup, and the footer keeping the account row alone.
- A model id carrying its provider's namespace resolves its vendor lockup, an id spelled `cn:hy3` drawing the Hunyuan lockup on its row and getting its description line in the picker's first level, a rule's segment start now accepting any character outside a letter or a digit, and an id such as `shy-mt2` staying unclaimed.
- The remaining models under that same segment start resolve their vendor lockup, the K3, M3 and o-series rules reading the segment start the Hunyuan rule reads, and the `nova` rules gaining a segment boundary so `sensenova-6.8-flash-lite` is no longer claimed as Amazon Nova.
- The sweep under the Claude brand is no longer blue, the status line, the process group header and the host's own call rows sharing one warm highlight (45% of `#faf9f5` in dark, 30% of `#141413` in light) while the DeepSeek brand keeps the host's colour.
- Scrolling or clicking in the sidebar or a subagent transcript beside the conversation no longer stops the main conversation from following, only a wheel, press or drag inside the main conversation's scroller counting as the reader leaving the end.
- The status line no longer reads a quotation as the model's own work, what stands inside a quotation (「」『』“” and the English double quote) taking no part in reading a clause and a clause not ending inside one while a quoted part the model does state is still carried as written; the Chinese 「正在」 reading is withdrawn, so reasoning in Chinese stands on the waiting word again.

### Chores

- The rules asking whether one element holds another read one mark, the pass that marks the parts writing that answer as one attribute, with the two `:has()` entries into scope and the one following focus state remaining; the build refuses a `:has()` that reads an attribute, holds every mark read to a declared relation, and checks the part names those relations name.
- Whole-document lookups in a pass or a frame read a kept answer, nine of them going through the host access module until the page's structure changes and the chat follow reading its mark inside the message column; the forty-six that remain are recorded one by one with the reason each stays, and the lint step refuses a new lookup.
- The numbers a check accepts are a record the gates verify, every numeric literal a check decides on written into `packages/testing/check-numbers.json` with `npm run checks:numbers`, so a loosened bound is visible in the diff, and the bounds that need a reason keep living in `packages/testing/bounds.json`.
- Every `!important` that stays records what it beats, each declaration proved necessary written into `packages/testing/importance-ledger.json` with the page state that decided it and the candidates that take the property over once its importance is gone; a declaration that appears or stops being needed fails the walk, and `DSH_IMPORTANCE_LEDGER=write` rewrites the record from a run.
- The build requires page evidence for every `!important`, the importance walk writing every declaration it read into `packages/testing/importance-ledger.json`, and any `!important` in the output that is not in the ledger failing the build by name.
- The bounds a check compares against live in one table, each with its reason, the limits on measured readings now in `packages/testing/bounds.json` read through `packages/testing/bounds.cjs`, so loosening one is a line in that file with its reason beside it.
- The other ten reading limits move into `packages/testing/bounds.json`, each with its own reason.
- The lookup for the host's open menu card moves into one place, the account menu's question going through the host access module, which keeps the answer until the page's structure changes, and the ledger entry recording it as debt is struck out.
- The hero picker's card trigger keeps its answer too, the workspace trigger on the composer card and the hero row served by one kept lookup re-asked only when the page's structure changes, and the ledger entry for that file drops from three lookups to two.
- The hero page reads the host's open menu card through the same lookup, using the accessor that keeps that answer, and the ledger entry for the file drops from two lookups to one.
- Both decision drafts' standing sections follow what has landed, the lookup record standing at forty-three sites, the `!important` ledger covering all five hundred and thirty-nine declarations, the bounds table holding fourteen values read through `packages/testing/bounds.cjs`, and the remaining numbers in check expressions recorded and verified in `check-numbers.json`.
- The sidebar's section labels come from the bus registry now, the labels kept by the observation bus per selector and maintained incrementally as the page changes (D40), so a pass picks from the list without walking the document and the ledger entry is struck out with forty-two sites remaining.
- Why one lookup cannot move is written down, the hero row's open pickers needing an answer invalidated by an attribute change, from a reader of its own or from the row the pass already holds.
- The opponent classification now matches the walk's own criteria in two places, a declaration counting as necessary when dropping its importance starts a transition and a longhand written beside a shorthand becoming a candidate, with the three dead ends tried recorded in the ledger's note.
- The smoke walk's settle rule now requires that no finite animation is still running, a reading waiting until every finite animation the page runs has finished, an endless one being no such thing.
- The appearance layer and its gates land, every page state of the smoke walk recording what its parts compute to (font-independent properties only) into a committed snapshot that `npm run verify`'s `appearance` gate compares item by item, and `scripts/ci-scope.mjs` refusing a push where the snapshot changed and nothing under `packages/client/src` did, carried by both cloud workflows.
- A direction is one page, each record carrying the background it answers, the decision, what follows from it and what would make it worth revisiting, and `npm run docs:index` writing `docs/adr/README.md` and the register of void numbers.

## [0.15.0] - 2026-10-15

[中文](#cn-0.15.0) | [English](#en-0.15.0)

<h3 id="cn-0.15.0">新增功能</h3>

- 设置页「动效」页新增「新文字淡入」一行，流式回答里新出现的字符是否先淡后实（约 0.12 秒）由它决定，两档各带一张预览卡、同一句样品在卡里逐字到达；这一项默认关闭，关闭时新到的字符立即是本色。
- 设置页「动效」页新增「消息气泡动画」一行，自己发的消息落到对话里时怎么出现由它决定，两张卡片各演各的——「在原地长出来」让气泡在自己的位置上从零长到满、「从输入框飞上来」把输入框卡片抬到消息那一行，默认仍是飞上来。
- 设置页「输入区」页「重绘模型选择器」下面多一项「模型描述」，默认开启，开着时一级列表的每个模型名下面写一行说明，关掉后每一行只剩模型名。

### 体验优化

- 侧栏里对话的状态标记换了一副样子，正在进行的对话改成一盏呼吸的灰灯、实心圆点每 2.4 秒从半亮到全亮一个来回，空闲对话的空心圆与它同样 6px、圈线是 1px 发丝且颜色更淡，已归档列表里的那枚空心圆跟着一起改；设置的「动画效果」选「减弱」时灯停在最亮的那一帧。
- 设置页「动效」页「光标动画」的两张预览卡改成逐字打出 `Hello World!`，光标跟着这行字往前走、打字期间一直亮着、打完停住才按原生节奏闪，两档的分别在于光标怎么到达下一个位置——「开」的那张滑过去、「关」的那张直接跳过去。
- 设置页「动效」页里，状态行与消息气泡动画各自得到一个开关，「聊天区动画效果」不再统管这两者，两张画法卡片移到各自开关下面作为不带标题与说明的子选项、开关关闭时置灰；「聊天区动画效果」改名为「聊天区滚动动画」并搬到「动效」页，只管跟随末尾、行与过程组的开合、文件操作行这三样。
- 设置页的「状态行描述」从「对话」页搬到「动效」页，落在状态行动画的开关与它的画法卡片之间，改名「精确状态行」并由分段控件改成开关，开着时状态行写具体在做什么、关掉只写状态本身，早先存下的「简洁 / 精确」照旧读得出来；开着时预览卡轮换的三条样例改成「正在阅读README.md」「Checking out current tree」「正在思考」。
- 状态行换词时不再空一拍，旧词向上淡出、模糊的同时新词从下方升入，两段动画重叠着走完，整次换词收在 0.2 秒内，计时仍贴着词尾。
- 每趟刷新少做整份文档的查找，侧栏搜索的位置与宿主搜索按钮、工作区分区的标题、输入区的首屏阶段标记都改为记住上一次的答案。
- 状态行开头的加载点随着这一轮在做什么换动作，模型思考时三颗点照旧弹跳、这一轮改去写回答或调用工具时它们各沿一条直线来回，两条动作之间旧的那一列各自淡出、新的那一列各自淡入、每颗球都在自己动作里的那一拍上开始，一个动作站满 2 秒才允许下一套接手。

### 问题修复

- 侧边栏的工作区名字过长时让位给行尾的悬停操作，工作区菜单与新建会话两个按钮始终留在栏内并可点击。
- 侧栏品牌标识悬停时不再浮出一块陶土色底板，品牌按钮从填充式 CTA 那两条规则里移出，它的外观由自己那条规则给全，深色下也不再多出一块底板。
- 工作区树模式下，行的层级缩进回来了，每一层比它的上一层再向右让出 `depth * 12px`，扁平列表与按工作区分组的列表都保持 6px。
- 侧栏收起成图标栏后，「进行中 / 已归档」控件与已归档列表随分区标题一起离开页面，宿主自己的分区按钮留在原处，侧栏重新展开时两者照旧回来。
- 「停止生成」按钮里的方块在任何显示缩放下都落在圆环正中，125% 与 150% 这类非整数缩放下也不再偏出半个像素。

<h3 id="en-0.15.0">New Features</h3>

- The Motion tab gains a New-text fade row, deciding whether the characters arriving in a streaming answer start faint and settle over about 0.12 s, its two cards each holding the same sample line arriving character by character; the row ships off, and with it off arriving characters are solid at once.
- The Motion tab gains a Message bubble animation row, deciding how a message the reader sends arrives in the conversation, its two cards each showing their own answer, Grows into its place taking the bubble from nothing at its own corner and Flies up from the composer carrying the card up to the message's row; the row ships on the flight.
- The Composer tab gains a Model descriptions switch under Redraw the model picker, on by default, each model in the picker's first level carrying a line under its name while it is on and every row keeping the model's name alone when it is off.

### Improvements

- A conversation's status mark in the sidebar is drawn differently, a running conversation breathing as a lit grey dot whose light rises from half to full and back once every 2.4 seconds while it neither moves nor changes size, and an idle one keeping a hollow circle of the same 6px with a 1px hairline stroke in the quieter neutral, the archived list's circle following them; under the Animation setting's Reduced the light holds its brightest frame.
- On the Motion tab's Composer caret motion row both preview cards now type `Hello World!` out character by character with the caret following the line, staying lit while the line is typed and blinking on the native cycle once it stands, the two cards differing in how the caret reaches each new place, gliding there or arriving at once.
- On the Motion tab the waiting line and the message bubble animation each carry a switch of their own, the chat-area switch no longer governing either, the preview cards standing under their switch as a sub-option with no title or description and greying out while the switch is off; the chat-area switch is now Chat-area scrolling animation, moved to the Motion tab, governing following the end, rows and groups folding, and the file operation rows.
- The Waiting-line detail row moves from the Conversation tab to the Motion tab, standing between the waiting line's switch and its paint cards as Precise status line, an on/off switch where on writes the specifics of a moment and off the bare states alone with a value an earlier build stored as Simple or Precise still reading; with it on, the preview card takes turns between 正在阅读README.md, Checking out current tree and 正在思考.
- The status line hands its wording over without standing empty in between, the words leaving fading and blurring upward while the ones arriving rise from below, the change done inside 0.2 s with the clock still sitting right after them.
- A pass re-reads fewer things across the whole document, the sidebar search's box and the host's search button, the workspace section's label and the composer's hero-phase marker all kept from the pass before.
- The loader at the head of the status line changes with what the turn is doing, the three dots bouncing while the model thinks and each walking a line of their own once the turn writes or works, the lane leaving fading each dot out where its own motion next turns back and the lane arriving fading each one in where that motion next carries it, and a motion standing for 2 s before the next may take it over.

### Bug Fixes

- A workspace name too long for the sidebar yields to the hover actions at the end of its row, so the workspace menu and the new-session button stay inside the column and stay clickable.
- The sidebar brand mark no longer floats a clay plate under the pointer, the brand button leaving the two filled-CTA rules so its look comes from its own rule alone and the dark theme no longer gains a plate.
- In the workspace tree a row's level indentation is back, each level standing `depth * 12px` further right than its parent while the flat list and the group-by-workspace list keep their 6px.
- With the sidebar collapsed to its icon rail, the In progress / Archived control and the archived list leave the page along with the section's heading so the host's own section buttons stay clear, and both return when the sidebar is wide again.
- The square inside the Stop button sits centred in its ring at every display scaling, including fractional scalings such as 125% and 150%.

## [0.14.2] - 2026-10-15

[中文](#cn-0.14.2) | [English](#en-0.14.2)

<h3 id="cn-0.14.2">体验优化</h3>

- 端到端通道让每个场景声明的浏览器开关真正生效，远端设置走查改用一台带名字映射（`--host-resolver-rules`）的浏览器，不论整条通道是否共用一个浏览器都跑到底。
- 重要性台账记下两种判定都算数的记录（`either`），一行只在某一帧里存在或由宿主的运行平台决定画不画时，这一趟抓到与否都算数，检查不再要求把它划掉。

### 问题修复

- 侧边栏的工作区名字过长时让位给行尾的悬停操作，工作区菜单与新建会话两个按钮始终留在栏内并可点击。

<h3 id="en-0.14.2">Improvements</h3>

- The end-to-end lane honours the browser switches a scenario declares, the remote-settings walk opening its page under the mapped name whether or not the lane shares one browser between scenarios.
- The importance ledger records the rows the walk cannot decide either way (`either`), a row that lives inside one animation frame or one the host's own platform decides to draw counting right whether this run catches it or not, so the check no longer asks for it to be struck.

### Bug Fixes

- A workspace name too long for the sidebar yields to the hover actions at the end of its row, so the workspace menu and the new-session button stay inside the column and stay clickable.

## [0.14.1] - 2026-10-15

[中文](#cn-0.14.1) | [English](#en-0.14.1)

<h3 id="cn-0.14.1">体验优化</h3>

- 会话切换更顺滑，皮肤在使用中会反复翻转的页面标记从 `<body>` 下移到最近的公共祖先元素上，会话之间、会话与首页之间的切换对 `<body>` 的属性与内联样式写入降为零，样式失效范围收敛到对应子树。
- 测试入口按档给结论，`npm run verify` 不带参数时同时跑那批检查、构建与工作树改动触及的单元测试，`--full` 加上整份冒烟、页面按 `--jobs` 一起驱动（看动效的页面一次两个），端到端通道的场景也并发起跑、整条通道共用一个浏览器、每个场景一份临时 home。
- `npm run verify` 在走整份冒烟与端到端通道那一档之前打印一句「请确认你正处于发布流程。」，起跑前先让发起的人确认自己在发布流程里。
- 皮肤不再按宿主类名的片段匹配界面，宿主声明的类名被读成皮肤自己的部件名写在元素上，样式表只按 `[data-dsh-claude-part]` 整词匹配，宿主改名时对应的规则直接静默而不误伤邻居。
- 输入光标的测量移到帧的读阶段，探针读数按内容、光标位置、End 倾向、复制样式与字体代次缓存，输入框自身的盒子每次测量只读一次。
- 工作区段落在当前视图上悬停时恢复的三个属性、以及工作区段按钮悬停时的文字颜色去掉多余的 `!important`，它们所在的规则本来就比被压过的规则多一个伪类、靠层叠顺序就能赢，`importance` 场景逐条丢弃之后 577 处 `!important` 里只有这 4 处可以去掉。
- 进程摘要的隐藏量宽元素按措辞与字体缓存，同一句措辞不再重写它并为它触发布局。
- 滑动高亮与推理档位按钮的定位改在读阶段取读数，`createSlidingPill` 分出 `measure` 与 `sync` 两个入口，会话标签、权限分段、工作区分段、搜索过滤条与设置分段五处分别在各自阶段调用。
- 输入框之外也被读取的三个取值——渐隐带高度、数字入场参数与用量色调——移到输入框门控之外（`features/composer/vars.css`），等待行与面板在输入框重绘关闭时同样拿到这些值。
- 等待行的三个圆点在关键帧里不再写圆角，动画只含 `scale` 与 `translate`，圆点不再逐帧重绘。
- 权限菜单的选中标记改用只写存在的写法，状态未变时不再落笔。
- 实时匹配表按批次扫描新增节点，同一批次里已被更早的载体带进来的节点不再单独匹配与查询。

### 问题修复

- 手机远程访问（`@linxin666/dsh-remote-web-ui` 的竖屏适配）下，输入区底行不再错位，发送与停止按钮回到输入行内并完整落在卡片里，档位选择器与上下文圆环之间只隔 16px。
- 工作区分栏控件的行为恢复，进行中时它让位给「工作区」标题、指针进入该段才浮现，切到已归档才常驻，列表区域改按部件读取、标记重新落在整个区段的根元素上。
- 首页用量面板回来了，英雄页的根元素由整页读取、规则再用宿主自己的 `data-phase` 限定到英雄页，页面布局与工作室标记都不再落空。
- 宿主菜单卡片的部件重新写上，元素因标记或类名变化成为区域锚点时整棵子树一并重读，账号弹层与英雄页的两个选择弹层按本主题的样子绘制，账号弹层里选中行改为读菜单区域自己的名字。
- 部件落定之后多跑一遍标记，写下新部件的那一批结束后主动请求再走一遍，下一遍不再写任何部件、遍历随即停下。

### 移除

- `npm run session` 随它的会话工作树机制一并移除，会话直接在仓库主树开工、改动在主树提交与推送，`session/` 分支与 `finish`、`sweep` 子命令不再存在。

### 其他变更

- 文档里带单位的数值不再进闸门，`scripts/doc-numbers.mjs` 留着按需运行（`npm run docs:numbers`），lint 不再核对它。
- `npm run verify` 先跑云端快档那批检查（lint、特性清单、决策索引、变更记录、AGENTS 表），推送前的一次运行与云端判定同一批内容。
- 端到端通道不带 `--scenario` 时走 `packages/contracts/src/timing.ts` 那张表里除停放的两个统计场景之外的全部条目，新加入表的场景默认进入云端判定，停放名单与场景表对不上时运行直接终止。
- 发版工作流在把这一版转正之前跑完快档那批检查、Windows 上的完整冒烟与端到端通道，与 pull request 判定的内容一致。
- 一次运行期间 `npm run dev` 的重建换掉了构建产物时，这次运行不写结论并判定为不通过，结论只对它真正跑过的那份产物成立。
- 持续集成先按改动的路径定下范围，只改了文档、语言包或工作流的推送跳过读页面的通道，改动落在一个功能目录内时冒烟只走那个目录的用例，其余改动才走完整冒烟，端到端的行为场景与截图捕获分成四份并行跑，分支规则只登记一个汇总任务。

<h3 id="en-0.14.1">Improvements</h3>

- Smoother conversation switches, the page marks the skin flips during normal use moved from `<body>` to the nearest element that ancestors every styled target, so a switch between conversations or between a conversation and the home page writes zero attributes and zero inline styles on `<body>` and style invalidation stays inside the subtree that changed.
- The test entry answers by tier, a bare `npm run verify` running the checks, the build and the tests the working tree's change reaches at once, `--full` adding the whole smoke walk with its pages driven `--jobs` at a time (the motion ones two at a time) and the end-to-end lane's scenarios running several at once over one browser and a scratch home each.
- `npm run verify` prints 请确认你正处于发布流程。 before a request that walks the whole smoke and the end-to-end lane, so whoever starts the release gate confirms the release process is what they are in.
- The skin stops matching the interface by fragments of the host's class names, a host class name read into the skin's own part name and written onto the element while the stylesheets match one whole `[data-dsh-claude-part]` token, so a host rename leaves the rule quiet instead of wrong.
- The composer caret's measurement runs in the frame's read phase, what its probe yields remembered per content, caret offset, End leaning, copied styles and face generation, so the input's own box is read once per measurement.
- The three properties that bring the workspace segment group back on hover, and the segment button's hover ink, drop their `!important`, their rules already carrying one pseudo-class more than the ones they beat; dropping each one leaves four of the skin's 577 `!important` declarations unnecessary.
- The process summary's hidden measuring span is cached by wording and face, so a repeated sentence neither rewrites it nor lays it out again.
- The sliding highlight and the reasoning-level trigger take their readings in the read phase, `createSlidingPill` splitting into `measure` and `sync` called from the conversation tabs, the permission segments, the workspace segments, the search filter bar and the settings segments in their own phases.
- The three sets of values the rest of the page reads — the fade band's height, the digits' entrance and the usage tones — move outside the composer gate (`features/composer/vars.css`), so the wait row and the panels hold them with the composer restyle off as well.
- The waiting line's three dots no longer write a corner radius in their keyframes, so the animation carries only `scale` and `translate` and the dots stop repainting every frame.
- The permission menu's check mark uses a presence-only write and leaves the attribute alone while its state matches.
- The live-match registry scans a batch's added nodes once, so a node an earlier carrier in the same batch already holds is neither matched nor searched again.

### Bug Fixes

- On a phone via the mobile remote plugin (`@linxin666/dsh-remote-web-ui`, portrait adaptation) the composer's bottom line no longer slips out of place, the send and stop buttons sitting back on the input's own line and inside the card and the tier trigger standing 16px from the context ring.
- The workspace section's segmented control behaves as before, stepping aside for the plain 工作区 heading while 进行中 and returning when the pointer enters the section, staying put in 已归档, with the list area read by its part so the view mark rides the section root again.
- The home page's usage panel is back, the hero page's root read page-wide and narrowed to the hero page with the host's own `data-phase`, so the page's layout and the studio mark both land.
- A host menu card's parts are written again, an element that becomes a region's anchor through a stamp or a class rewrite having its whole subtree re-read, so the account card and the hero page's two pickers draw the skin's way and the selected row in the account card reads the menu region's own name.
- A batch that writes part marks asks for one more pass once it has written them, so the next pass writes nothing and the walk settles.

### Removals

- `npm run session` goes with the session-worktree mechanism it drove, a session working in the repository's main tree and pushing from there, and the `session/` branch with the `finish` and `sweep` subcommands is gone.

### Chores

- A number with a unit in a document is no longer a gate, `scripts/doc-numbers.mjs` staying for running on demand (`npm run docs:numbers`) while lint no longer checks it.
- `npm run verify` starts with the checks the cloud's fast tier runs (lint, the feature list, the decisions index, the changelog and the AGENTS table), so the run before a push judges the same set.
- The end-to-end lane without `--scenario` walks every entry of the table in `packages/contracts/src/timing.ts` but the two parked statistics scenarios, so a scenario added to the table is judged in the cloud by default and a parked name the table does not hold stops the run.
- The release workflow runs the fast tier's checks, the full smoke on Windows and the end-to-end lane before it promotes a version, the same set a pull request is judged on.
- A run whose build output a rebuild behind `npm run dev` swapped files no verdict and reads as failed, so a recorded verdict belongs to the output that run actually drove.
- Continuous integration settles its scope from the paths a push changed, a push holding only documents, locale files or the workflow skipping the page-reading lanes, a change inside one feature directory walking that directory's smoke cases and anything else the whole smoke, with a branch rule naming one aggregate job.

## [0.14.0] - 2026-10-14

[中文](#cn-0.14.0) | [English](#en-0.14.0)

<h3 id="cn-0.14.0">新增功能</h3>

- 新增「侧栏」页的「封号彩蛋」一行，选「关闭」后账号行只显示名字，设置项 `banLocale` 多出取值 `off`。
- 支持与 [ds-bot](https://github.com/Fei2411/DeepSeek-Bot) 同时安装，侧栏顶端出现聊天 / 代码切换，聊天是 ds-bot 的 Bot 界面、本主题整个让开，代码是宿主自己的界面、由本主题绘制。
- 新增「对话」页的「状态行描述」，设置项 `statusDetail` 的取值为 `precise`（默认）与 `simple`，「精确」让命令调用说出模型为自己写下的描述。
- 让运行行说出具体的文件名，推理里出现英文进行时从句时写出模型自己那句话。
- 新增设置页的「动效」分页，其中「状态行动画」用两张实时预览的卡片代替文字，一档是现在这道扫光，另一档让状态行的文字本身流动着变色，设置项 `statusMotion` 的取值为 `sweep`（默认）与 `wash`。

### 体验优化

- 把同一个文件在同一个过程组里的多次读取、编辑与写入读成一行，图标与标题跟着最后一次操作换新，行尾的 `+n -m` 是这些改动的累计值并随每次改动逐位翻页，展开读到全部改动，只被读取过的文件读到这次读取的窗口。
- 把设置页过长的描述统一改写为简洁风格，一句说清这项设置管什么、各档位做什么，中英两版同步。
- 让每帧那一趟刷新不再为已知的宿主节点重新查询整份文档，输入卡片与它的占位、运行行、思考行、标题行、对话框、页脚、会话根、模型槽与上下文表盘都从观察总线按选择器登记的活清单里读，宿主换掉节点时才重解一次。
- 让状态行换词时说法盒子的宽度一次移动到位，盒子先按住当前宽度再写上目标宽度，由滑动高亮那一对时长与曲线带过去，旁边的计时随盒子滑到新位置。
- 让运行行的换词按 transitions.dev 的「Thinking states」合成，离场与入场同时进行，扫光带全程亮着而不从头再扫，行由一个隐藏测量层按住宽度与高度，换词期间旁边的计时不会被挤动，新词从下方升入也不会让整行变高。
- 让只落在对话消息列里的变更批次（流式输出就是这种）只叫醒读消息列的功能，页头、视图标签、侧边栏页脚、模型与档位选择器不再跟着跑一趟，任何读到整页的信号（语言、偏好、时钟、功能自己排的一帧）照旧触发完整一趟。
- 让只在另一项打开时才起作用的设置行随父项一起变灰、不能操作（重绘模型选择器与重绘权限控件随「重绘对话框」，对话统计信息位置随重绘覆盖对话页，封号彩蛋随「折叠侧栏设置区」），变灰的行仍显示你设的值，说明下面用强调色写明它在等哪一项。
- 让滚动与窗口尺寸变化重新定位浮层时一帧只派发一次，关闭着的模型卡与档位卡不再读宿主触发器的盒子，上下文数字行的合身测量只在输入卡片宽度变化时重做。
- 把「标题进入顶栏」放进设置页的「对话」页，只在 Windows 桌面端的窗口里可改、别处变灰，把「动画效果」「首页版面」「封号彩蛋」分别挪到「动效」「外观」「侧栏」，让「搜索框样式」与「对话统计信息位置」的说明写出每个选项的效果。
- 把「光标动画」简化为开与关并从「对话」页挪到「动效」页，两档各用一张预览卡呈现，开的那张光标在样例行上来回滑动，关的那张停在行首闪烁，早先存下的「只在移动时」读作开，已经用预览卡呈现选项的行不再带文字说明。
- 让皮肤里所有动效的时长、曲线、位移与模糊都由 `packages/client/src/theme/tokens.json` 的 `motion` 一组统一给出，同一作用的数值合成一档，`docs/STYLE.md` 的动效表由同一份数据生成，构建拒绝样式表里直接写出的时长与曲线、内容重复的关键帧，以及没有读者认领的动效令牌。
- 让流式回答里新文字的淡入按文本节点增量比较，一条回答里追加字符时不再把整条回答重拼成字符串、也不再逐字符重比，成本随本批新增的字符走，markdown 中途改写标记的那一段仍按同一扇窗口判定，超过预算或刚被折叠重排过就保持本色。
- 让状态行与过程组头部同读宿主 `TextShimmer` 的一档 `steps(48, end)`，每趟最后三分之一歇停，状态行的色带改用宿主的扫光色与 20% 带宽。
- 让长会话里跟着会话长度增长的三处记账收敛，进程组表头的摘要共用一条尺寸订阅，思考行的清单由变更批次增量登记、滚动不再扫整份文档，进程组跟随不再有常驻的定时器。
- 在宿主换掉自己的账户行时，把旧行上的监听与这一代登记的记录一起收走，账户菜单的绑定保持一次只有一张卡。
- 让模型、推理等级、权限、账号几张弹层卡片与新会话页的菜单从各自按钮所在的一角、由略小的尺寸长出来，收起时更快。
- 让封号彩蛋整页打开时从中心略小处放大淡入，按页上的按钮或 Esc 关掉时缩回去淡出再离开页面。
- 让设置页的开关按下后圆钮越过终点再弹回，只有按过的开关这样动，打开设置页或换回某个分页时各个开关都静止在原位。
- 让设置页切分页时新的一页从它在分页条上所在的一侧滑入并穿过一点模糊，被换下的那一页朝另一侧滑出，滑出的那张静止副本读屏与 Tab 键都碰不到。
- 在首页打开时，让品牌标志先升起、问候语晚一拍跟上，两者都从下方穿过一点模糊落到原位。
- 让设置页在极窄宽度下保持可读，一行放不下全部分页时分页条换到第二行，每个分页标签始终完整显示在一行上，一行的文字空间不足时开关、分段选择器等控件移到文字下方独占一行，说明文字保持整行排版。
- 把上下文占用的色带移到四成到八成，并改用一组低饱和度的色标，占用四成以下保持绿色，四成到八成之间依次经过浅绿、黄与橙，八成起为红色。
- 让工作室首页的用量面板把占位的底色淡去、数字从模糊里显出来，热力图的格子渐变到各自的颜色，模型列表与图表整体淡入。
- 让等待行的「暂未响应」徽标从左下方滑上这一行、从无到有弹出来，模型一开口就缩回消失。
- 在 Claude 品牌下，让轮次进行中那一行开头用主题自己的三枚 4px 加载点，各弹起 8 像素并在离地时压扁、错开周期依次起跳，DeepSeek 品牌下宿主的鲸鱼尾照旧，读屏播报也不变。
- 把「外观」页的「主色」改名「强调色」并挪到「配色」下方，配色选「跟随宿主」时它变灰、不能操作。
- 让工作台首页的权限控件与对话页一致，输入区里是一枚写着当前档位的按钮，点开是一张档位卡片，滑块式分段只留在经典首页，还没选工作区时按钮停在新会话的默认档位上、不接收点击，点它和点输入框一样打开工作区选择。
- 让中文界面下内置 Auto review 档位读「自动审查」，其它档位仍读宿主自己的中文名，界面语言不是中文时照旧读 Auto review。
- 让轮次进行中那一行等待时只说品牌自己的那一个词，Claude 品牌下是皮肤自己的「正在思考」，DeepSeek 品牌下是宿主自己的「深度求索中」，模型思考与读不出状态两种情形共用这一个词。
- 把「动效」页两张状态行动画卡片里的预览说法改为这一行真正会用的两个，即当前品牌的等待词与「正在调用工具」，换词动作与两档画法照旧。

### 问题修复

- 修复推理等级滑杆在档位未按强度下发的模型上方向反向的问题，能判定强度的档位按强度排列，判不出强度的档位留在供应商给出的位置。
- 修复 Firefox 下鼠标停留在上下文用量圆环时统计弹层反复闪烁的问题，回到入口会取消待执行的关闭任务，鼠标仍在入口上时弹层保持展开。
- 让思考行自动收起与读者的点开收起在两种宿主结构上都找得到展开体、都逐帧滚动，新出现的展开体淡入并上移两个像素进入。
- 在开启「悬停自动展开弹层」时，让悬停态下按同一个入口不再收起刚展开的弹层（侧栏账号入口、权限选择器、模型选择器、档位选择器、首页那一行的两个选择器与输入框右侧的上下文圆环），收起交给鼠标离开入口与卡片。
- 修复「状态行描述」在中文界面读英文兜底的问题，补回中文的标题、描述与两个档位名。
- 在同一运行行中有可见替代文字且宿主文案被外部隐藏时，让主题等待行自动让位并在接管结束后恢复，其他聊天动效继续运行。
- 让钉住的位置高过末尾所有可能的停靠位置，跟随末尾期间输入框上方那一行每一帧都停在同一处，推理一段段到达也不再上下抖动。
- 修复功能被关掉或整代被换下之后留下的监听、观察总线订阅、排队帧与定时器不随拆卸收走的问题，宿主账户菜单每次打开不再留住上一张已经卸载的卡片。
- 让卷帘门在末尾展开、收起的整个过程中，输入框上方那一行在读者没有自己往回翻看时停在原处不动。
- 让被合并掉的调用连同宿主给它留的间距一起离开页面，过程组里各行的间距保持一致。
- 把状态行的扫光层挂在承载文字的那个副本上，扫光带贴着字形扫过。
- 让飞行的气泡每一帧都从它按住的那一行重新取落点与高度、底色按画面上的颜色写定，真实行等它站上去并连着几帧不动之后才显形、显形瞬间两者对齐到同一像素，淡出期间它始终钉在那一行上，等待本身有上限。
- 让 Windows 桌面端飞行的气泡全程是气泡自己的颜色、与 web 端一致，这条色带同时是窗口的拖拽区，飞行期间在那一块按下鼠标也不再拖动窗口。
- 让换词时钉住的宽度与要去的宽度都按布局实际的宽度取，盒子稳住不动，计时只随说法变长而移动。
- 把飞行的竖直阻尼比调回 0.75。

### 其他变更

- 把 36 段登记在册的复制代码全部清零，分段控件、品牌图蒙版、弹层暗色卡片与表单盒型等收进共享样式表，脚本与测试工具的公共启动代码收进 `scripts/shared/` 与 `packages/testing/`，jscpd 基线文件随之删除，lint 对任何新复制段直接拒绝。
- 把压过宿主界面的 z-index 改由 `packages/client/src/theme/tokens.json` 的 `layer` 一组给出，`docs/STYLE.md` 里的层级表由同一份数据生成，构建拒绝样式表里 9 以上的 z-index 字面值与 TS 里内联写出的层级。
- 让 npm 包不再携带 source map 与 `docs/decisions/` 决策文档，包体积随之下降。
- 新增 `npm run session`，会话在自己的工作树与 `session/` 分支上开工、收尾与清理，`node_modules/` 经联接复用主树，并行会话的改动、测试锁与云端失败归属不再互相交叉。
- 把冒烟架、临时宿主、脚本化模型、端到端通道与三个在线探针全部住进 `packages/testing/`，共用一套 Playwright 浏览器栈，`scripts/` 只剩构建与文档工具。
- 把构建对浏览器半边源码的检查改在 TypeScript 语法树上进行，样式表读到的 `data-dsh-*` 属性必须真的有代码写入，经变量、联合类型与辅助函数转手也追得到，注释里的同名写法不再误报。
- 把三个微型功能并入它们服务的功能，选区镜像与输入框的空白提示并入输入区、首页问候语并入首页版面、亮暗切换的过渡抑制并入设置页，功能数量从 28 降到 25。
- 让端到端通道多一个长会话场景，先积累八轮对话，再在页内探针下流过一整条回答，逐帧记下帧间隔与长时间任务，并把每帧耗时的 p50、p95、最大值与页面节点数写进断言说明。
- 把重要性走查里标为动画中间帧的那一组记录改成「抓到与否都算数」，这一类选择器只在动画播放的那几帧存在，走查在固定时刻读页面，同一次改动这一趟读到、下一趟读不到都算数，换字退场的那个类补进这一组。
- 让 `importance` 场景在走查里多审两件事，走遍所有页面形态都没匹配到元素的选择器即失败，到不了的选择器逐条登记在 `packages/testing/importance-unreachable.json`、每条写明缘由且登记表只许变短，同一轮走查去掉八处多余的 `!important`，端到端通道的设置层每次运行前回到运行前的副本。
- 让文档里带单位的数值必须有出处，能由令牌或常量给出的一律读它，读不到的登记在 `scripts/doc-numbers.mjs` 的来源表里，数值失去出处时 `npm run lint` 与云端闸门报出。
- 让 `docs/SETTINGS.md` 与 `docs/SETTINGS.en.md` 只留设置页自己的内容（六个分页与各档、设置项之间的依赖、跨功能的几段说明），动效各自做什么由链接指向功能一览。
- 让 `docs/STYLE.md` 只留视觉规则与三张由令牌表生成的对照表，精灵的网格、格宽与帧号由 `packages/client/src/features/mascot/sheets.ts` 与精灵样式表持有。
- 让决策的「决定」一节限定篇幅，一条不超过三百字、一节不超过三千字，「现状」不超过六百字，由 `npm run lint` 判定。
- 把 `AGENTS.md` 的命令清单改由 `npm run agents` 从 `package.json` 与各脚本自己的首行生成，云端闸门用 `npm run agents:check` 核对。
- 让端到端通道的两个发送场景在替身离场之后再读一次页面自己继续采样的帧，真行是否显形、替身是否落在它身上改按这一段帧判定，慢跑机器上不再把尚未显形的行当成不可见。
- 把闸门的发起时机写明，本机默认不起闸门，开发期间的判断来自构建与在线页面，一次运行只属于推送之前那一段、取覆盖这次改动的最小集合。

<h3 id="en-0.14.0">New Features</h3>

- Add an Account-hold row to the Sidebar tab, where Off shows only the account name and the `banLocale` setting gains the value `off`.
- Support installing alongside [ds-bot](https://github.com/Fei2411/DeepSeek-Bot), adding a Chat / Code switch at the top of the sidebar where Chat is ds-bot's Bot surface with the theme standing aside and Code is the host's interface painted by the theme.
- Add Waiting-line detail to the Conversation tab (setting `statusDetail`, `precise` by default or `simple`), where Precise has a command call say the description the model wrote for it.
- Make the running line name the file a call works on, and write the model's own words when the reasoning carries an English present-continuous clause.
- Add a Motion tab to the settings page whose Waiting-line animation picks the paint with two live previews instead of text — the highlight band the line sweeps today, or a colour wash moving through the letters — with the `statusMotion` setting at `sweep` (the default) or `wash`.

### Improvements

- Read the calls on one file inside one process group as a single row whose icon and title move on with the file's last operation and whose `+n -m` tail counts those changes and turns character by character as each one lands, opening onto every change or onto the window a read-only file was read at.
- Rewrite the settings page's over-long descriptions in a concise style, one sentence naming what the setting governs and what each tier does, with the Chinese and English copies kept in step.
- Keep a pass from querying the whole document for host nodes it already knows: the composer cards and their placeholders, the running rows, the thinking rows, the title row, the dialogs, the footer, the conversation root, the model slot and the context meter are read from live per-selector registries on the observation bus, and only a node the host replaced is resolved again.
- Move the wording box's width in one move, pinned at the width it stands at and written with the width it heads for, carried there over the sliding highlight's own time and curve so the clock travels to its new place with it.
- Compose the running line's wording swap after transitions.dev's "Thinking states", with the two halves moving at once, the sweeping highlight staying lit through the swap, and a hidden sizer holding the width and height, so the clock is never shoved aside and the copy rising from below never makes the line taller.
- Wake only the features that read a change confined to the conversation column — streaming, above all: the header, the view tabs, the sidebar footer and the model and effort pickers no longer take a pass of their own, while any signal that reads the whole page (a language, a preference, the clock, a frame a feature asks for) still runs the full pass.
- Grey out settings rows that only work while another setting is on and take no input with them (the model picker and the permission control with the composer restyle, the statistics position with the restyle covering the conversation, the easter egg with the sidebar settings), a greyed row still showing the value you set, with a line in the accent colour saying what it waits for.
- Re-place fixed popovers once a frame on scroll or resize, stop a shut model or effort card reading its trigger's box, and measure the inline context line for fit only when the card's width has changed.
- Move Header in the title bar onto the settings page's Conversation tab, where it takes input on the Windows desktop window alone and greys out elsewhere, move Animation, Home layout and the Account-hold easter egg to Motion, Appearance and Sidebar, and make Search box style and Conversation statistics position say what each choice does.
- Make composer caret motion a switch of On and Off, moved from the Conversation tab to the Motion tab with each choice a preview card — the caret gliding along a sample line, or standing at its head blinking — where a stored Explicit reads as On, and a row whose preview cards already present the choice carries no description.
- Use the `motion` group of `packages/client/src/theme/tokens.json` for every duration, curve, distance and blur in the skin, one value per role, with the style guide's motion table generated from the same data and the build refusing a duration or curve written straight into a stylesheet, keyframes that repeat one the skin has, and a motion token nothing reads.
- Compare text nodes incrementally for the fade over newly arrived characters in a streaming answer, so an append no longer rejoins the whole answer into a string or walks it character by character and the cost follows the batch, while a markdown rewrite in the middle is still judged by the same window and a rewrite past its budget or one that just reflowed from a fold stays solid.
- Give the line and a process group's header the host's own `TextShimmer` gear, `steps(48, end)` with the band resting the last third, and take the line's band in the host's shimmer tint at 20% width.
- Keep three books that grew with a long session bounded, the process headers' summaries sharing one size subscription, the thinking rows registered incrementally from change batches rather than scanned for on every scroll, and the process-group follow keeping no timer when the page holds no process group.
- Keep the account menu holding one card's binding at a time, and let the listeners on a host-owned account row leave with this generation's record of it when the host replaces that row.
- Make the model, reasoning, permission and account cards and the new-conversation page's menus grow out of the corner nearest their button from a little smaller, and close faster.
- Make the account-hold page grow out of the centre as it fades in, and a control on it or Esc shrink it back as it fades before it leaves the page.
- Make a settings switch run its knob past the end and settle back, with only a switch the reader has pressed moving while opening the page or returning to a tab shows every switch at rest.
- Move a new settings tab in from the side it sits on along the strip through a short blur while the one it replaces slides out the other way, with the page sliding out a still copy that neither a screen reader nor the Tab key reaches.
- Raise the brand mark when the home page opens and then, a beat behind, the greeting, each from below through a short blur.
- Keep the settings page readable at very narrow widths, the tab strip wrapping onto a second line when one line no longer holds every tab with each label always whole on one line, and a row whose text runs out of room dropping its switch or segmented control onto a line of its own under the text.
- Move the context-occupancy colour band to two fifths through four fifths in a set of low-chroma tones, green below two fifths, through light green, yellow and orange in between, and red from four fifths on.
- Make the studio home's usage panel fade its placeholders out while the figures come out of a blur, shade the heat map's cells into their own colours and fade the model list and chart in.
- Make the waiting line's "No response yet" badge slide onto the line from below and to the left while it pops out of nothing, and shrink away as soon as the model speaks.
- Show the skin's own three 4px dots at the head of the running row under the Claude brand, each rising 8px and flattening as it leaves the floor with the three staggered into a wave, and keep the host's whale tail and the screen-reader announcement under the DeepSeek brand.
- Rename the Appearance tab's Primary colour row Accent colour and move it under Colours, greying it out and taking no input while Colours is set to Follow the host.
- Make the studio home's permission control match the conversation — one button naming the current tier and opening a card of tiers — with the slider-style segment row left to the classic home and the button resting on the preset a new session starts in and taking no input before a workspace is picked, so pressing it opens the workspace picker the same as pressing the input box.
- Show 自动审查 for the built-in Auto review tier under a Chinese interface, while the tiers the host names in Chinese keep their own words and every other interface language still reads Auto review.
- Make the line stand on one word per brand while a turn runs, the skin's own "Thinking…" under the Claude brand and the host's own "Deep diving" under the DeepSeek brand, so a model thinking and a turn whose state cannot be read use that one word and a wait no longer changes wording.
- Make the two Waiting-line animation cards on the Motion tab take turns between two wordings the line really uses, the current brand's waiting word and "Running tools…", with the same swap and the same paints.

### Bug Fixes

- Fix the effort slider running the wrong way on models whose levels arrive out of order, sorting the levels whose strength is known by strength and leaving a level whose strength is unknown where the provider put it.
- Fix the context statistics popover repeatedly flickering while the pointer rests on the context ring in Firefox, with a return to the trigger cancelling the pending close so the popover stays open while the trigger is hovered.
- Fix a thinking row's automatic fold and a reader's own press finding the expanded body on both host shapes and rolling frame by frame, with an inserted body fading in and rising two pixels.
- Fix a press on the trigger folding the popover the pointer just opened while popovers open on hover — on the sidebar account entry, the permission, model and effort pickers, the home row's two pickers and the context ring beside the composer — leaving the pointer's departure to close it.
- Read Waiting-line detail in Chinese on a Chinese interface, title, description and both tier names included.
- Make the theme yield its waiting line when a visible sibling replaces externally hidden host wording, restore it when the takeover ends and keep other chat animations running.
- Hold the line above the composer at the same spot in every frame while the tail is followed, with the pin above every place the scroll end can come to rest, so it no longer shakes with each piece of reasoning.
- Make a feature's teardown take its listeners, observation-bus subscriptions, queued frames and timers with it when it is switched off or its generation is replaced, so the host account menu no longer keeps every card it has already unmounted.
- Hold the line above the composer in place while a fold rolls open or shut at the tail, unless the reader has scrolled back.
- Make a merged-away call leave the page together with the spacing the host gave it, so the rows of a process group keep one even spacing.
- Keep the sweeping highlight on the copy holding the words, so the band sweeps across the glyphs themselves.
- Use the row the bubble holds for its landing spot and height in every frame, write its fill as the colour the screen paints, and show the real row only once the stand-in is on it and the row has held still for several frames, the two the same pixel then, with the stand-in pinned to the row through the fade and the wait bounded.
- Keep the flying bubble its own colour all the way on the Windows desktop app, alike on the web, and stop the band — also the window's drag region — turning a press there into a window drag during the flight.
- Take the pin and the width it heads for from the widths the layout really holds, so the box holds its place through a swap and the clock moves only as the wording grows.
- Set the flight's vertical damping ratio back to 0.75, bringing the drop back into place with it.

### Chores

- Remove the 36 tracked copied stretches, the segment controls, the masked brand-mark idiom, the dark popover card and the form-control boxes now living in shared sheets and the scripts' and testing tools' bootstrap in `scripts/shared/` and `packages/testing/`, with the jscpd baseline deleted with them and lint refusing any new copied stretch.
- Read a z-index that has to clear the host's interface from the `layer` group of `packages/client/src/theme/tokens.json`, with the layer table in `docs/STYLE.md` generated from the same data and the build refusing a z-index literal above 9 in a stylesheet and a stacking level written inline in TypeScript.
- Drop source maps and the `docs/decisions/` documents from the npm package, taking its size down with them.
- Add `npm run session`, which opens, finishes and sweeps a session's own worktree on a `session/` branch while reusing the main tree's `node_modules/` through a junction, so parallel sessions' edits, test locks and cloud-failure ownership no longer cross.
- Move the smoke harness, the scratch host, the scripted model service, the end-to-end lane and the three live probes into `packages/testing/` on one Playwright stack, leaving `scripts/` with the build and document tools.
- Read the build's checks on the browser half's source from its TypeScript syntax tree, where every `data-dsh-*` attribute a stylesheet reads must really be written by code, found through a variable, a union or a helper parameter, and the same spelling in a comment no longer trips the check.
- Fold three micro-features into the features they serve — the window-blur selection mirror and the composer's idle hint into the composer, the home greeting into the home layout, the theme flip's transition suppression into the settings page — taking the feature count from 28 to 25.
- Add a long-session scenario to the end-to-end lane that grows eight turns first and then streams one more answer under an in-page probe recording frame intervals and long tasks, printing the p50, p95 and worst frame times with the page's node count in the check details.
- Read the importance walk's animation-frame groups as "counted whether or not the walk catches them", since such a selector exists only inside an animation, the walk reads the page at fixed moments, and the same change may be caught in one run and missed in the next, with the swap's exit class joining that group.
- Audit two more things in the `importance` scenario's walk, where a selector that matches no element in any page state fails it and the selectors the walk cannot reach are recorded with their reasons in `packages/testing/importance-unreachable.json`, a record that may only shrink, and take eight `!important` declarations out as redundant in the same walk, with the end-to-end lane's settings layer returning to its pre-run copy.
- Give a number a document states a home, read from a token or a constant where one holds it and registered with its source in `scripts/doc-numbers.mjs` otherwise, with `npm run lint` and the cloud gates failing when one loses it.
- Keep `docs/SETTINGS.md` and `docs/SETTINGS.en.md` to the settings page's own content — the six tabs and their tiers, the dependencies between rows, the cross-cutting notes — linking to the feature list for what each effect does.
- Keep `docs/STYLE.md` to the visual rules and the three tables generated from the token table, with the sprites' grids, cell sizes and frame numbers held in `packages/client/src/features/mascot/sheets.ts` and the mascots' stylesheets.
- Hold a decision's 决定 section to a length — one bullet of at most 300 characters, a section of at most 3000, a 现状 line of at most 600 — enforced by `npm run lint`.
- Generate `AGENTS.md`'s command list with `npm run agents` from `package.json` and each script's own header line, checked in the cloud with `npm run agents:check`.
- Read the frames the page keeps sampling once the stand-in has left for the end-to-end lane's two send scenarios, judging whether the real row appeared and whether the stand-in sat on it on that stretch, so a slow runner no longer calls a row that had not appeared yet invisible.
- State plainly when a gate run belongs, with none starting on this machine by default, work in progress running on the build and the live page, and a run belonging to the stretch before a push over the smallest set covering that change.

## [0.13.3] - 2026-10-12

[中文](#cn-0.13.3) | [English](#en-0.13.3)

<h3 id="cn-0.13.3">新增功能</h3>

- 支持在选好 Claude 或 DeepSeek 主题风格后，为侧栏顶部、新会话页与账号行的兜底头像填入自己的品牌名称、标志图片与文字标志（PNG / SVG / WebP，不超过 2 MB），并指定一个主色替换按钮、选中标记、链接与焦点环的颜色，设置项新增 `brandName`、`brandInk`、`brandAccent`。

### 问题修复

- 修复等待行连带隐藏 dsh-status-rotator 等插件插入的状态行的问题，现在只隐藏宿主文案，第三方状态行保持可见。

<h3 id="en-0.13.3">New Features</h3>

- Support your own brand name, mark and wordmark images (PNG / SVG / WebP) at the top of the sidebar, on the new-conversation page and in the account row avatar once the Claude or DeepSeek style is chosen, with an accent colour for buttons, marks, links and focus rings, and the settings gain `brandName`, `brandInk` and `brandAccent`.

### Bug Fixes

- Fix the waiting line hiding status lines inserted by plugins such as dsh-status-rotator, hiding only the host wording now and leaving third-party status lines visible.

## [0.13.2] - 2026-10-11

[中文](#cn-0.13.2) | [English](#en-0.13.2)

<h3 id="cn-0.13.2">新增功能</h3>

- 新增设置页「侧栏」的「左侧栏布局」一行，「宽松」是现在的样子，「紧凑」把左侧栏的间距收小，控件的形状、字号、图标与配色不变，新增偏好 `sidebarLayout`（默认 `relaxed`）。

### 体验优化

- 把同一个文件在同一个过程组里的多次编辑与写入读成一行，这一行是这一组里最早的那一次改动，行尾的 `+n -m` 是这些改动的累计值，每到达一次改动就滚动一次，展开这一行读到全部改动，只改动过一次的文件保持原样，失败与中断的行仍各自保留裁决信息。
- 让「模型正在做什么的那一行」在跟随末尾时停在输入框上方并随「聊天区动画效果」这一开关，与这一行的说法、扫光同一处，读者自己接管滚动或跟随的滑行正持有位置时它照旧让开、回到文档位置随内容走。
- 把首页用量面板热力图的格子悬停提示改成那天的 Token 用量，与格子深浅取自同一个数字，两份数据来源都带每天的 Token 合计，提示不再随来源换口径。
- 在侧栏搜索框选「独立在品牌行下方」时，让那一行不再留内边距，盒子的左右边框与下面各行的宽度落在同两条边上。
- 让侧栏「新会话」一行右侧的快捷键提示与搜索框的按键同一套样式，每个键一个 20 像素圆角键帽、1 像素描边、12 像素次级文字，两个键之间的「+」不再出现。
- 把样式表里写死的颜色改读令牌，强调色按钮上的文字取填充自己的前景令牌，设置页里插件图标的底色取主文字令牌，并在 `docs/STYLE.md` 的形状一节补上实际使用的圆角与描边以及它们来自的那枚宿主控件。

### 问题修复

- 修复会话很多时用量汇总与内容搜索读日志占住一个核心的问题，两处都改走宿主的观察接口 `sessionQuery.observeSession`，只观察这一份存档、不先列档，观察的租约在事件到手后立即释放，只发布 `readSession` 的宿主退回按 id 读，按大小与修改时间的增量缓存不变。
- 在删除会话的请求体超过上限时先答 400，这条应答送出之后再结束连接。
- 修复成本计量账本里不是真实日期的键把本地折算的日子与会话一起丢掉、并让首页模型图表读到非法日期而报错的问题，这类键在读取时被跳过，其余日子照常合并。
- 修复机器上没有成本计量插件时用量汇总把来源报成 cost-meter+local 的问题，现在报 local，与「哪个来源作答」的定义一致。
- 修复峰谷目录的定时器在页面问过一次之后一直拉取到进程退出的问题，连续 48 小时没有请求就自己停下，下一次请求再启动。
- 修复宿主没有网页服务器服务时插件静默地一条路由也没注册、卸载时又按每一条记一次失败的问题，现在报告一次缺少的服务，路由的撤销表里只留真正的撤销函数。
- 修复会话内容检索里旧的一轮结束把新一轮的状态一起清掉、让第三轮并发读同一批会话的问题，只有仍然是最新的一轮才清状态。
- 让关闭状态的弹层卡片同时移出绘制、命中与焦点顺序，键盘读者不再停在完全看不见的行上，开关的淡入淡出照旧。
- 把进行中那一行的替身改成这一行的可读文字，读屏在这一行上收得到「模型正在做什么」「暂未响应」和计时，宿主自己的实时区域照旧播报。
- 在「动画效果」设为减弱时让工作强度滑杆顶档的点阵静止，这一档不写动画的周期与相位。
- 修复几个控件对读屏说不出自己是什么的问题，会话统计那一行有自己的名称，工作强度与模型触发器跟着菜单报告展开状态，设置页的开关取所在行的标题为名，权限弹层的当前档位写 aria-checked，输入输出箭标对读屏隐藏。
- 在手机宽度下让输入区量出手机插件度量条的高度，把输入卡片下方那一行连同上下文圆环整体抬起同样的距离，度量条出现与消失时分别抬起与落回。

### 安全

- 修复宿主没有 connection 服务时私有路由的回退栅栏只看请求方自己写的 Host 头的问题，现在先看连接的对端地址，回环地址之外一律拒绝，冒烟的宿主半边新增一条检查，局域网连接加回环 Host 必须被拒。
- 把删除会话时「目录留在会话根目录内」的判定改为比较解析符号链接之后的路径，会话根目录下有指向别处的项目目录链接时，删除不再跟着链接走到根目录之外。

### 移除

- 移除「轮次状态行」这一项，宿主自己的过程控件留在宿主给它的位置与写法上，已停止与失败的轮次显示宿主自己的「已停止」「处理失败」，用时与输出 tokens 不再显示，设置页「对话」页的「轮次状态行」一行随之消失，早先存下的取值不再被读取。

### 其他变更

- 把模型标志的 `cap` 高度回退分处两条规则，端到端的 `!important` 审计不再整条跳过这条规则，规则的每一处权重都受审计。
- 把滚动主人记「哪个来源在滑这一格」的表改用弱引用键，弹簧自己走完之后不再把已经分离的对话子树留在内存里，页脚接管挂在宿主账号行与菜单上的监听随功能的拆卸一并摘下。

<h3 id="en-0.13.2">New Features</h3>

- Add a Sidebar layout row to the settings page's Sidebar tab, where Relaxed is how the sidebar looks now and Compact takes its spacing down, with control shapes, type sizes, icons and colours unchanged and the new `sidebarLayout` preference defaulting to `relaxed`.

### Improvements

- Read the edits and writes of one file inside one process group as a single row carrying the group's earliest change, with the total of those changes in its `+n -m` tail, rolling once per change as each one lands and opening onto every change, while a file changed once is drawn as before and a failed or interrupted row keeps its own verdict.
- Make the line saying what the model is doing ride the Chat-area animations switch, together with the line's wording and sweep, holding its place above the composer while the conversation follows its tail and stepping aside — keeping its document place — while the reader owns the scroll or the follow's glide holds the position.
- Name the tokens that day spent in the home page's usage-panel heat map tip, the same figure the cell's shade is bucketed from, with both sources behind the grid carrying a per-day token total so the tip no longer changes its reading with the source.
- Give the sidebar search box on Standalone no padding of its own, so the box's two edges stand where the rows under it stand.
- Dress the shortcut hint at the right of the sidebar's New session row in the search box's own key caps — one 20px cap per key with a 1px hairline and 12px secondary text — with the `+` between the two keys gone.
- Read tokens for the literals in the stylesheets, the label on a filled accent button taking the fill's own foreground token and the settings page's plugin mark taking the primary label token, and record in the shape section of `docs/STYLE.md` the radii and strokes actually in use with the host control each copy came from.

### Bug Fixes

- Fix the usage roll-up and the content search pinning a core while reading logs with many sessions, both reading through the host's observation entry point `sessionQuery.observeSession`, which resolves one session without listing the corpus and releases each lease as soon as its events are in hand, with a host publishing only `readSession` falling back to the per-id read and the size and modification time cache unchanged.
- Answer 400 first when a session deletion's body goes past the limit, and end the connection once that answer has gone out.
- Skip a ledger key that is not a real date as the cost meter is read, so it no longer drops every day the local fold contributed along with its sessions and the home page's model chart no longer formats an invalid date.
- Report the usage roll-up's source as local with no cost-meter plugin on the machine, which is what "which source answered" means.
- Stand the peak-rate catalog's timer down after 48 hours with no request, starting it again on the next request.
- Report a missing web server service once when a host holds none, with the route disposers holding the real disposals alone.
- Clear the state only in the pass that is still current in session content search, so a full listing that replaces a tail-only pass in flight no longer lets a third pass read the same sessions alongside it.
- Take a closed popover card out of the paint, hit-testing and the tab order together, so a keyboard reader no longer lands on rows nothing is drawing, with the open and close fades unchanged.
- Make the replacement on the live turn's running row the row's readable text, so a screen reader receives what the model is doing, the wait badge and the clock, with the host's own live region still announcing the row.
- Write no duration or phase for the reasoning-effort slider's top-rung matrix under Animation set to Reduced, so the matrix stands still.
- Give several controls names a screen reader can read, the conversation-statistics line carrying its own name, the effort and model triggers reporting the open state with their menu, a settings switch taking its row's title as its name, the permission popover's current tier writing aria-checked, and the input and output arrows hidden from a reader.
- Measure the statistics strip a mobile plugin draws at phone width and lift the line under the composer card, the context ring with it, by the strip's own height, taking it up and letting it back down as the strip comes and goes.

### Security

- Check the peer address of the connection first for the private routes' fallback fence when the host holds no `connection` service, refusing anything outside loopback, with the host half's smoke run carrying the check that a LAN connection claiming a loopback Host is refused.
- Compare resolved paths for the session deletion's "directory stays inside the sessions root" check, so a project directory inside the root linked elsewhere no longer leads the removal out of the root.

### Removals

- Remove the Turn status line feature, leaving the host's own process control where the host puts it and reading as the host writes it: a stopped or failed turn shows the host's own Stopped / Failed with no elapsed time or output tokens, the Turn status line row leaves the Conversation tab of the settings page, and any stored value is no longer read.

### Chores

- Split the model mark's `cap`-height fallback into two rules, so the end-to-end `!important` audit no longer skips that rule whole and every weight in them is audited.
- Use weak keys for the scroll owner's table of which source is easing a container, so a spring that arrives on its own no longer keeps a detached conversation subtree in memory, and take the footer takeover's listeners on the host's own account row and menu off with the feature's teardown instead of stacking on every switch.

## [0.13.1] - 2026-10-10

[中文](#cn-0.13.1) | [English](#en-0.13.1)

<h3 id="cn-0.13.1">问题修复</h3>

- 修复装了 0.12.3 或 0.13.0 之后 DSH 起不来（「The application could not start or stopped unexpectedly」）的问题，把宿主本体 `@deepseek-ai/dsh` 从运行时依赖中去掉，构建拒绝 `dependencies` 里的 `@deepseek-ai/*`。

<h3 id="en-0.13.1">Bug Fixes</h3>

- Fix DSH failing to start after installing 0.12.3 or 0.13.0 ("The application could not start or stopped unexpectedly") by dropping the host itself, `@deepseek-ai/dsh`, from the runtime dependencies and declaring it in peerDependencies instead, with the build refusing `@deepseek-ai/*` in `dependencies`.

## [0.13.0] - 2026-10-10

[中文](#cn-0.13.0) | [English](#en-0.13.0)

<h3 id="cn-0.13.0">体验优化</h3>

- 把会话的统计与 Token 用量默认「收进上下文」，这些数字就在输入区上下文圆环那张弹层里，输入卡片下面只留那个圆环，想一眼看到全部读数的人仍可在设置页「对话」页把「对话统计信息位置」改回「独立成行」，已有安装的设置不会被改写。

### 问题修复

- 修复收起侧栏后「新会话」那枚加号圆片比同一栏的其它图标靠左的问题，让这一格交出那个空座位，圆片与上面的收起按钮、下面的插件与搜索图标落在同一条中线上。
- 修复手机宽度下统计数字收进上下文弹层时圆环跑出输入卡片的问题，让这一宽度下那份留白让位，圆环回到卡片右端、落在推理等级按钮之后。

<h3 id="en-0.13.0">Improvements</h3>

- Keep the session statistics and the token usage Inside the context popover by default, with the figures in the panel the composer's context ring opens and only the ring under the input card, while a reader who wants every reading at a glance can still set Conversation statistics position back to On its own line on the settings page's Conversation tab, and settings already stored are not rewritten.

### Bug Fixes

- Fix the New session chip standing left of the column's other icons with the sidebar collapsed by having the empty icon seat give up its share of the flex row, so the chip lines up with the collapse toggle above it and the plugin and search icons below.
- Fix the context ring leaving the input card at a phone's width when the numbers live in the context popover by standing the desktop reserve down at that width, so the ring returns to the card's right end, after the reasoning-level control.

## [0.12.3] - 2026-10-10

[中文](#cn-0.12.3) | [English](#en-0.12.3)

<h3 id="cn-0.12.3">体验优化</h3>

- 让推理回放窗口在宿主两版之间都能用，窗口从宿主渲染出来的 Markdown 本身认起，往上取第一个真有盒子的祖先来裁剪，滑动的仍是这段 Markdown。
- 让推理回放窗口跟着推理长高，长到它最终能占的高度（宿主给过程组正文的那个上限，标准档 400px）就停在那个高度上，文字这时才往上走两行、走到最新一行停住，上下边缘也在这时才渐隐，推理没长满之前文字照平时那样一行行往下读、不再被渐隐遮住。

### 问题修复

- 修复设置里存着早先「聊天区动画效果」档位（「增强」「重绘」「关闭」）时宿主拒绝启动本插件的问题，这一项现在同时接受开关值与早先的档位名，存着「增强」「重绘」的照旧开着，存着「关闭」的照旧关着，已经处在「启动失败」的桌面端重启一次即恢复。
- 修复手机宽度（390px 及以下）的输入区让上下文计量环压住推理等级按钮的问题，这一档为环留出它占的宽度，等级按钮落在它左边，卡片上的三个控件都不再越界。
- 让装了壁纸插件（dsh-plugin-wallpaper-engine）时配色留在 Claude 也能看到壁纸、文字照样清楚，壁纸在播时整个窗口铺一层画布色遮罩，设置窗口、弹层与卡片照旧不透明，壁纸关掉后画布原样回来。
- 修复经局域网地址或隧道打开的页面回到出厂外观的问题，页面现在显示 DSH 当前的设置，在运行 DSH 的电脑上改动后不需要刷新就跟上，设置页开头说明改动要在那台电脑上做、控件全部禁用。

<h3 id="en-0.12.3">Improvements</h3>

- Make the reasoning's streamed window work across both host versions by reading the host's rendered Markdown itself and clipping the nearest ancestor that has a box, sliding that Markdown inside it.
- Make the reasoning's replay window grow with the reasoning and stop at the height it will end up occupying (the host's own cap on a process group's body, 400px in the Standard tier), where the text begins to step up two lines behind the softened edges and stops at the newest line, read line by line and unblurred below that cap.

### Bug Fixes

- Start the plugin for a reader whose settings still hold an earlier "Chat-area animations" choice ("enhanced", "redraw" or "off") by taking both the switch value and the earlier choice names, so "enhanced" and "redraw" stay on and "off" stays off, with a desktop showing the failure recovering after one restart.
- Keep the context meter off the reasoning-level button at the right end of a phone-width composer (390px and under) by reserving the width the meter takes, the button landing before it and all three controls staying inside the card.
- Show the wallpaper under the Claude palette with the text legible when the wallpaper plugin (dsh-plugin-wallpaper-engine) is installed, covering the window with one mask in the canvas colour while a wallpaper is up, with the settings window, popovers and cards keeping their fill and the canvases returning once the wallpaper goes.
- Show DSH's own settings on a page opened through a LAN address or a tunnel (a phone reaching DSH through dsh-pocket, for example), following changes made on the computer running DSH without a reload, with the page's settings page opening with a line saying changes are made on that computer and its controls disabled.

## [0.12.2] - 2026-10-10

[中文](#cn-0.12.2) | [English](#en-0.12.2)

<h3 id="cn-0.12.2">新增功能</h3>

- 新增设置页「侧栏」页「侧栏搜索」下的「搜索框样式」三档，「覆盖品牌」（默认）把搜索框放进品牌行、「独立」在品牌行下方给它自己一行、「图标」保留 DSH 自己的搜索按钮并只把单击接管过来，切换不需要刷新页面。
- 让写在输入卡片下面那一行数字重新有自己的弹层，这一行本身就是宿主那张上下文弹层的第二个触发口，按一下在这行上方打开、再按收起，回车与空格同样开合、Esc 收起，弹层开着时这一行自己也报出展开状态。
- 新增设置页「对话」页的「对话统计信息位置」，默认把会话统计与 Token 用量写在输入卡片下面单独一行，也可以选「收进上下文」回到弹层那一份；窗口窄到这一行放不下时它按固定顺序让位，窗口宽回来时按同一顺序退回。
- 在设置对话框「Claude Style」页的标题行右端新增一枚 GitHub 标识，按一下在新的标签页里打开插件仓库（https://github.com/Nwflower/dsh-claude-style），键盘焦点落到它上面时出现一圈强调色描边，读屏念出「在 GitHub 上打开本插件」。

### 体验优化

- 让中文界面下权限选择器的档位名改用宿主自己的中文名，分段控件上的当前档位与弹层里的每一行都读宿主 `permission.access` 文案表里的原文（「仅可查看」「工作区内修改」「完全权限」），宿主调整自己的用词时皮肤跟着变，切成别的界面语言仍是皮肤的名称。
- 让侧栏搜索的会话内容搜索从秒级等待变成即答，每个会话的语料按需落一份缓存，重启后只读这些文件，存档会话里只有修订号变过的才重读，宿主开着的会话按事件序号只读新增的那一段。
- 把会话数字那一行的各段只靠行自己的间距分开，去掉各段之间的 · 符号（间距从 6px 放到 10px），一行能容下更多数字，抄出来也是一段干净的话，端到端通道与冒烟用例各新增一条读数，那一行的 DOM 里一个 · 都不出现。
- 让在搜索面板里点开一条内容命中后落到那条消息所在的一轮，面板按命中消息的事件序号从会话的整篇轮次大纲里找出它属于哪一轮，等这一轮进了已加载窗口再经宿主的刻度定位，会话历史很长时先翻页读进这一轮的记录，找不到对应轮次时停在会话本身。
- 把过程组的标题改写成这一组装了什么（「执行 2 次思考，调用 1 次工具」），没有的项不写，这一段还在进行时整行带着与宿主同样的扫光，标题放不下整句时改用简洁写法「思考×2 · 工具×1」，宽回来再换回整句。
- 让轮次进行中对话末尾那一行说出这一轮此刻在做的事（「正在思考」「正在准备工具调用」「正在调用工具」「正在写回答」），后面跟着这一轮已用的时间，模型连续 10 秒没有开口时再挂出「暂未响应」，这一行带扫光、宿主的小鲸鱼与读屏播报照旧。
- 让模型推理期间思考行里的推理文字停在四行高的窗口里、上下边缘渐隐，文字往上走两行、走到最新一行就停住，读者始终看得见推理的结尾；推理一停或读者把这一行收起时窗口撤下、位移归零，读者打开这一行读到的是完整文本，「动画」设为「减弱」时不设窗口。
- 把设置页的「品牌标识」改名为「主题风格」并从「外观」页移到「通用」页最前面，它与用户名、动画效果这些通用项排在一起，「外观」页只剩配色、字体、吉祥物与出现位置，可选的品牌、存下的设置值与切换后的效果都不变。

### 问题修复

- 让 DeepSeek 品牌下侧栏品牌区的 HARNESS 徽标重新显示，宿主的整幅标志（鲸鱼、deepseek 字样与 HARNESS 徽标）原样保留，徽标沿用 DeepSeek 蓝的胶囊底与反白字形，Claude 品牌下品牌区照旧画皮肤自己的标。
- 让输入行右端的上下文计量环不再跟着宿主的行高、空隙与药丸宽度跑偏，行高与空隙每次从输入行自己量出来，留出的宽度按停放节点与触发按钮两个盒子并起来再 +8px 算。
- 让进行中的状态行只在插件自己跟随末尾时停在输入框上方，读者接管滚动（滚轮、触摸、拖动滚动条、滚动键、页内查找，以及对话导航跳到某一轮）期间这一行的固定整个让开、随内容一起走，读者自己回到底部后跟随继续、这一行也回到输入框上方，端到端通道新增 `readerScroll` 场景核对这件事。
- 让侧栏搜索的内容匹配只收人类发出的消息（按事件自带的 `source.kind === 'user'`）与助手回答里的文本块，宿主注入的环境快照、Skill 目录、AGENTS.md 与压缩检查点、推理块、工具调用与工具结果都不进语料。
- 让会话数字的入场动画留在行内，这一行把自己裁掉（`overflow: clip`），数字变化时新字符从自己位置下方 8px 滑入不再顶大容器的可滚动高度、也不再让输入卡片与上方对话上下跳，端到端通道的 `statsPosition` 场景新增一条读数，在同一帧里写一次数字、量容器可滚动高度的增量，必须是 0。
- 让会话数字那一行让位时只让出宽度，触发按钮保持一行的高度（20px 行高加宿主自己的上下各 1px），圆环留在原位，行高不随台阶起落变化、对话也不再移动，端到端通道的 `statsPosition` 场景新增一条读数，在同一帧里量「让出读数」与「读数在位」两种情况下这一行的高度，两者必须相同。

### 移除

- 把「聊天区动画效果」改成一个开关，开启时播放本插件的这一套，关闭时把聊天区交回宿主，同时移除上一版接在「重绘」档上的会话视图、插件自己的「工作步骤展示」桥接与只为阅读视图装上的开发依赖；存下「重绘」或「增强」的读者照旧开着这一项，存下「关闭」的照旧关着、不需要重新设置。

### 其他变更

- 让端到端通道与 `packages/testing/dsh-web.cjs` 起的临时宿主随启动它的进程一起结束，启动进程无论以哪种方式结束，宿主都在随后一秒内退出。

<h3 id="en-0.12.2">New Features</h3>

- Add a Search box style choice under Sidebar search on the Sidebar tab: Cover the brand (the default) keeps the box in the brand row, Standalone gives it a row of its own under the brand row, and Icon keeps DSH's own search button in place with only its click taken over, with no reload needed.
- Give the line of numbers under the input card its own popover again as the second trigger of the host's context panel, opening above the line on a press and closing on the next, with Enter or Space doing the same, Escape closing it and the line reporting its own expanded state while the panel stands.
- Add Conversation statistics position to the settings page's Conversation tab, standing the session statistics and the token usage on a line of their own below the input card and Inside the context popover still available for the panel's own set, with a narrow window making the line give way and giving the figures back as it grows.
- End the Claude Style page's heading row in the settings dialog with a GitHub mark that opens the plugin's repository (https://github.com/Nwflower/dsh-claude-style) in a new tab, with an accent focus ring on the keyboard and an accessible name reading "Open the plugin on GitHub".

### Improvements

- Name the permission selector's tiers in the host's own Chinese words on a Chinese interface, with the trigger's current tier and every popover row reading the host's `permission.access` dictionary (仅可查看 / 工作区内修改 / 完全权限) so the skin follows the host when it rewords them, while any other interface language still reads the skin's names.
- Answer the sidebar search's session-content search at once instead of after a wait by keeping one cache file per session, read back on a restart, with a stored session re-read only when its revision moved and a session the host holds open contributing only the events appended since the last fold.
- Separate the line of session numbers' groups by the line's own gap alone, widening it from 6px to 10px and dropping the · between the turns and steps, the output speed, the tokens read in and written back and the cache-hit share, so the line fits more figures and copies out as a clean sentence, and the end-to-end lane and the smoke each gain a reading that the line's DOM carries not one ·.
- Land on the turn holding that message when a content hit is picked in the search palette, reading the message's event sequence, finding the turn it belongs to in the session's whole-log outline and positioning there through the host's marks once that turn is in the loaded window, paging the turn's records in first on a long history and stopping at the session itself when no turn can be found.
- Say what a process group holds in its header — "2 thoughts, 1 tool call" — leaving empty figures out, sweeping the whole line the way the host's words do while that piece of work runs, and falling back to the compact `Thinking×2 · Tools×1` when the header has no room and taking the sentence back when the room returns.
- Say what the turn is doing now at the end of the conversation while a turn runs — "Thinking…", "Preparing a tool call…", "Running tools…", "Writing…" — with the time the turn has taken beside it and "No response yet" once the model has been silent for ten seconds, with the line sweeping and the host's whale and announcement kept.
- Stand the reasoning text in a window four lines tall with softened edges while the model reasons, the text stepping up two lines and stopping at the newest line, with the window coming off and the offset returning to zero once the reasoning stops or the reader folds the row and no window under Reduced.
- Rename the settings page's Brand mark Theme style and move it from the top of the Appearance tab to the top of the General tab, where it stands with the general choices while the Appearance tab keeps Colours, Typefaces, Mascot and Where it appears, with the brands on offer, the stored values and what a switch does unchanged.

### Bug Fixes

- Show the HARNESS badge in the sidebar's brand area again under the DeepSeek brand, keeping the host's whole lockup — whale, deepseek wordmark and HARNESS badge — as it is drawn with the badge keeping its blue pill and reversed-out letters, while the Claude brand still draws the skin's own mark.
- Measure the composer row's height and gap from the row itself and compute the room as the union of the parked node and the trigger button plus 8px, so the context meter at the composer row's right end no longer drifts with the host's own row height, gap or pill width.
- Stand the line's pin down for the whole time the reader owns the scroll — wheel, touch, a drag of the scrollbar, the scroll keys, in-page find, and a jump to a turn — making it travel with the content and resume the follow with the line resting above the composer once the reader comes back to the bottom, checked by the end-to-end lane's new `readerScroll` scenario.
- Collect only the reader's own messages (by the event's own `source.kind === 'user'`) and the text blocks of assistant answers for the sidebar search's content match, leaving the environment snapshots, Skill catalog, AGENTS.md, compaction checkpoints, reasoning blocks, tool calls and tool results the host injects out of the corpus.
- Clip the session numbers' line (`overflow: clip`) so its entrance stays inside the row and the container's scrollable height no longer follows the numbers, keeping the input card and the conversation above it from moving as a new character slides in from 8px below, with the end-to-end lane's `statsPosition` scenario gaining a reading that the container's scrollable height grows by 0 within one frame.
- Give up width alone when the line of session numbers gives way, keeping the host's trigger at its one-line height (a 20px line inside the host's own 1px padding) and the ring where it was, so the row's height no longer follows the ladder and the conversation stays put, with the end-to-end lane's `statsPosition` scenario gaining a reading that the row measures the same with the reading given up and with it back.

### Removals

- Make Chat-area animations a switch instead of a three-way choice, on playing this plugin's set and off handing the conversation back to the host, and remove the conversation view the Redraw tier carried; a reader who stored Redraw or Enhanced keeps the setting on and one who stored Off keeps it off, with nothing to reconfigure.

### Chores

- End the scratch hosts that the end-to-end lane and `packages/testing/dsh-web.cjs` start with the process that started them, so the host exits within a second however the launcher ends.

## [0.12.1] - 2026-10-09

[中文](#cn-0.12.1) | [English](#en-0.12.1)

<h3 id="cn-0.12.1">新增功能</h3>

- 把「聊天区动画效果」的「重绘」档改为插件自己的会话视图，它占据宿主「对话」视图的位置，轮次进行中的思考、正文与工具按链收成一行并计数，轮次结束后只留最终回答与它的复制、分叉、反馈操作，历史轮次随时可以点开，「动画」设为「减弱」时一律直接落位。
- 模型选择器的每一行标出该模型此刻的倍率，峰价、谷价与限时活动各有自己的图标与距离切换的时长，鼠标停在徽章上读到此刻的判定与下一次切换，没有作息表的模型不显示徽章，设置页「输入区」页的「峰谷电表」子项关闭后各行的徽章消失。

### 体验优化

- 把设置页「对话」页的「聊天区动画效果」改为关闭、增强、重绘三档分段控件，关闭把聊天区交回宿主，增强接上跟随、自动开合与卷帘门与新文字淡入，重绘接上插件自己的会话视图，旧版本存下的开关取值照旧生效。
- 把设置页、内容搜索、吉祥物、发送动效、对话导航、上下文弹层与封号彩蛋这七个首屏可以缺席的功能移出 `lib/client.js`，各自成为由资产路由 `/dsh-claude-style/assets/` 提供的一块，页面被接管后立即请求、到达后安装。
- 设置页「侧栏」页新增「面板悬浮卡片」开关，开启（默认）时右侧栏停靠的面板是四周留 8px、16px 圆角、1px 描边与投影的悬浮卡片，关闭后铺满整列并贴住四边，分栏时每栏铺满各自那一栏，切换不需要刷新页面。
- 模型选择器每一行的说明改由一张按名字模式认领的有序规则表得出，带上日期后缀、换一种分隔写法或换一个售卖方前缀仍读到同一句，目录里的拼法各自落到所在产品线的规则上、不必再逐条登记。
- 把「重绘」档里轮次进行中的那条状态行上下各收进 30px，贴着最新一条消息读，行内文字与它的下一条内容之间也少 30px，这一行仍按内容居中、高度不变，并补一圈底色投影、抬到上方内容之上，压上去时不露出旧内容的接缝。
- 「重绘」档的思考卡片只留思考本身，卡片的边框里就是思考的文字，高度由预览高度与内容决定，跟随仍按阅读节奏走、滚回卡片末尾即重新跟随，展开一段思考仍从折叠里那行文字点开，每段思考在折叠里保持一行。
- 「重绘」档的一轮过程按宿主「工作步骤展示」的当前档位成形，插件读宿主 `ui-chat` 命名空间的档位并在每次有轮次开始时重读，读不到时按网页端缺省档「详细」。
- 模型选择器里 Grok 的规则改为匹配 Grok 4 整条产品线，`grok-4`、`grok-4.5`、`grok-4-2026` 这些拼法读到同一句，ERNIE 5 一行改为「2.4 万亿参数的原生全模态大模型。」，不再列激活比例与上下文长度。
- 插件的样式表以压缩后的文本随包发出，注释与排版只留在源文件里，页面画出的样子不变，压缩之后输入区停止按钮、侧栏进行中指示与聊天区跟随尾部上页面并不需要的 `!important` 从源样式表里去掉了，处在不成立的 `@media` / `@supports` 里的规则也不再参与判定。

### 问题修复

- 改善长会话里流式输出期间的卡顿，跟随在每一批文字到达时要问的几个问题不再落到整个文档上，会话的滚动容器与消息列读一次后保留，流式标记改在消息列里查找，宿主「回到底部」按钮的存在本身就是「跟随已关闭」的判据，同一帧里读到的高度只读一次。
- 模型选择器里当前在用的模型、在其供应商不在第一级列表里时单独占一级列表最下面一行，这一行与列表里的每一行走同一个构造，峰谷徽章、厂商标志、说明与行高内边距都一致。
- 「重绘」档里收进折叠的一段思考，展开后点它的文字同样可以收起，文字在两态都可点，一次以选中文字收尾的落点不改开合，选中文字期间推迟折叠的行为照旧。
- 进行中的状态行不再随流式内容上下跳动，滑动持有位置期间在聊天列上写下自己的标记，该行按宿主标记或滑动标记任一钉住，往回翻看历史时两个标记都不在，该行照常留在文档位置。
- 「重绘」档里轮次状态行的文字在长短之间切换时不再折成两行或溢出状态行，丈量层与被替换的两层文字都不换行，文字生长期间各行始终单行，状态行高度不再跳变。
- 修复重新编译后设置页等延后功能从设置里消失、要重新开关插件才回来的问题，资产按先写新文件、再写清单、最后删清单里没有的文件的次序落盘，`lib/client.js` 写在最后，换代的那一代要的块已经在磁盘上、也已经在清单里。

### 其他变更

- 新增构建标记 `DSH_CLAUDE_STYLE_DEBUG=1`，链接安装的检出重建时资产清单继续带着上一代仍然存在的条目并保留它们的文件，宿主在启动时读到旧主产物的页面不会因为一次重建丢掉延后的功能，发布构建与持续集成里这个标记不生效，构建日志会说明当前处于哪一档。
- 把 Deepy 帧图的矢量化结果与资产的 brotli 压缩结果按输入哈希缓存在 `.debug/build-cache/`，只改 TypeScript 后的重建更快，`lib/` 与不带缓存时逐字节相同，新增的 `npm run dev` 监听构建读取的目录并在每次保存后重新构建，构建失败时保留上一次的 `lib/` 并继续监听。

<h3 id="en-0.12.1">New Features</h3>

- Make the Redraw tier of Chat-area animations the plugin's own conversation view, which takes the place of the host's Chat view, folds a running turn's thinking, output and tools into one counted row, leaves a finished turn's answer with its copy, branch and feedback actions and opens any past turn again, landing at once under Reduced.
- Every row of the model picker carries the rate in force for that model, hovering the badge reads the judgement and the next switch, a model with no published schedule carries no badge, and the Peak rate meter sub-row under the Composer tab removes the badges when off.

### Improvements

- The Chat-area animations row on the settings page's Conversation tab is a three-way control, Off handing the conversation back to the host, Enhanced bringing the follow, the folding with its rolling door and the text fade, and Redraw the plugin's own conversation view, with an earlier build's stored value keeping its meaning.
- Move the settings page, content search, the mascot, the send animation, the conversation navigator, the context popover and the account-hold easter egg out of `lib/client.js` into chunks of their own, served by the asset route `/dsh-claude-style/assets/` and requested as soon as the page is taken.
- Add a Float docked panels switch to the Sidebar tab, on by default, which keeps the right sidebar's docked panels as floating cards 8px inside the column with a 16px radius, a hairline and an elevation, and fills the column and hugs its edges when off, each pane filling its own column while the dock is split, with no reload needed.
- Every model row's description comes from one ordered table of name-pattern rules, so a dated suffix, another separator or another reseller's prefix still reads the line's own sentence and catalog spellings land on their product line's rule without an entry of their own.
- In the Redraw tier the live status line comes in 30px closer above and below so it reads with the newest message, the distance from its text to whatever follows it shrinks by the same 30px, the line stays centred in its height, and a base-coloured shadow runs under and over it so the older content never shows at its edge.
- A thinking card in the Redraw tier holds the thought and nothing else, its frame around the thought's text with the height set by the preview and the text, the follow still running at reading pace and scrolling the card back to its end resuming it, and opening a thought still starting from its one line inside a fold.
- In the Redraw tier a turn's process takes the shape of the host's `ui-chat` Work details value, re-read whenever a turn opens and falling back to the Web client's default Detailed.
- Grok's rule claims the whole Grok 4 line, so `grok-4`, `grok-4.5` and `grok-4-2026` read one sentence, and the ERNIE 5 row reads a native omni-modal model with 2.4 trillion parameters without the activation share or the context length.
- The plugin's stylesheet ships minified with comments and formatting left in the source files and nothing it paints changes, the page's needless `!important`s on the composer's stop button, the sidebar's ongoing indicator and the chat area's follow tail leave the source sheets, and a rule inside a `@media` or `@supports` condition the page is not in is no longer judged.

### Bug Fixes

- Less jank while an answer streams in a long session, with the follow's questions kept off the document by reading the conversation's scroller and its message column once and keeping them, looking for the streaming mark inside the message column, taking the host's back-to-end button as the reading that its follow is off, and sharing one frame's reading between the two places that need it.
- In the model picker the model in force gets a row of its own at the bottom of level 1 when its provider is not listed there, built through the same row builder as the rest of the list with the same peak rate badge, vendor mark, description and row metrics.
- In the Redraw tier a thought inside a fold toggles from its text in both states, a press opening it when closed and closing it when open, a press that ended as a selection changing nothing, and a selection still holding the fold off.
- The live turn's status line no longer moves with the streaming answer, with the glide writing its own mark on the chat column while it holds a position and the row pinned under either mark, and scrolled away from the tail neither mark is present so the row keeps its document place.
- In the Redraw tier a turn's status label stays on one line while its text changes, with the sizer and both copies kept to one line so the row keeps its height.
- Fix the settings page and the other deferred features vanishing from a rebuild until the plugin was switched off and on, with new asset files landing first, the manifest after them, the files it does not name last and `lib/client.js` after all of them, so the generation a page swaps to finds its chunks already on disk and in the manifest.

### Chores

- Add the build flag `DSH_CLAUDE_STYLE_DEBUG=1` for a linked checkout, which keeps the entries an earlier build shipped and their files so a page that booted the previous bundle does not lose the deferred features to a rebuild, stays inert in a release build and in CI, and lets the build log say which mode ran.
- Cache the Deepy sheets' vectors and the assets' brotli payloads in `.debug/build-cache/` under the hash of their inputs, so a rebuild after a TypeScript-only change is faster while `lib/` stays byte-identical, and the new `npm run dev` watches what the build reads and rebuilds on every save, keeping the previous `lib/` and watching on when a build fails.

## [0.12.0] - 2026-10-07

[中文](#cn-0.12.0) | [English](#en-0.12.0)

<h3 id="cn-0.12.0">新增功能</h3>

- 在桌面端把会话标题与标题行里的控件抬进窗口顶端的标题栏，标题靠左、控件靠右排在窗口按钮之前，标题行剩下的内容左移并上提到标题下面，放不下的一侧留在标题行里。

### 体验优化

- 把浏览器每次启动都要读取并解析的插件主文件压缩到 0.8 MB（816,520 字节）。
- 把右侧栏停靠的面板改成一枚悬浮卡片，四周各留 8px、16px 圆角、1px 描边与宿主面板自己的投影，列后面的画布从缝隙里透出来，分栏后每一栏的面板各有一枚卡片，拖出来的浮动面板保持宿主自己的窗口样式。
- 把 Deepy 的 18 张帧图改为在构建期转成矢量并按内容哈希长期缓存，第一次播放不再有重建的停顿，观感一致，随包携带的帧图为 658 KB（brotli 后）。
- 在浏览器页面下给侧栏品牌行加 8px 顶部边距，品牌带上这一行自己的 8px 左内边距，鲸鱼/星芒的左缘与「新会话」的加号圆片的左缘对齐，桌面外壳（Windows 标题栏、macOS）与折叠后的窄栏不变。
- 在读者的跟随开着时把进行中的状态行钉在输入框上方，也就是跟随追上时它本来停的位置，突发的追加不再带动它，往回翻看历史时它照常留在文档位置，不会浮在读者正在读的内容上。
- 分栏的右侧栏两栏各自仍是独立的圆角卡片，中间那条分栏线不再画、拖动时的提示照旧，两栏之间的距离收到 6px，每栏到列边的距离收到 6px。
- 手机宽度下的输入框下沿让权限选择器收起下三角，权限与模型选择器按窄屏上限截断，上下文只留圆环不显示数字，模型名随行收缩、输入框下方的停靠层不再保留桌面那两份留白，圆环因此回到卡片里、也不再压在推理等级上。
- 输入框下沿的权限档位按钮在任何宽度都不再画下三角，档位名过长时在按钮内截断，已经打开的档位卡在布局移动时重新贴回它的触发按钮。
- 把宿主的「回到底部」按钮改到输入框上方的正中，按钮仍是宿主的那个，皮肤只挪位置。

### 问题修复

- 在页面载入后才在皮肤中心选中别的皮肤时，本主题让出页面，皮肤离开就接回，无论页面启动时归谁都不需要刷新。
- 让右侧栏「开始」页在项目一屏放不下时这一列自己滚动，列表短时依旧居中。
- 让发送时飞行的气泡从第一帧就是气泡的颜色（#29），底色画在那层始终等于形状的壳上，按下那一刻起就是目标气泡自己的颜色，卡片的描边与阴影照旧随形状收掉并在形状归位的那一刻写定。
- 让成本计量插件停止写入后，用量面板按日期合并两个来源，账本认识的天仍用账本的数，只有它没覆盖的日期由会话日志折算补上，面板恢复完整历史。
- 只为皮肤中心的皮肤（`html[data-dsh-skin]`）让路，壁纸在渲染时本主题照常工作，对外契约是不再读取 `body[data-we-wallpaper]`。
- 让发送的替身不再在真实消息行缺席时淡出，降落前先确认有一条行在页面上可以交接，没有就把替身停在原地、保持可见并继续跟随目标位置，真实行一到立刻交接，宿主始终没挂上行时按 2.5 秒兜底把页面交还宿主。
- 让设置页不再多出一层内边距，横向不留内边距、顶部只留宿主行自己的 16px，标题与第一行文字和其余设置页在同一条竖线上。
- 把吉祥物的分段控件放回右侧，控件与文字同占一行、靠右对齐，只有在放不下时才落到下一行并从左边开始，判定用文字列的最小宽度（220px），控件本身不收缩。
- 让欢迎语与账号区跟随登录的 DeepSeek 账号，桌面端登录后显示账号昵称，自定义用户名仍然优先，账号资料读不到时才回退到 HDSL 昵称与本机系统用户名。
- 让顶栏里的对话 / 轨迹标签条在标题与控件分列两侧时取两者之间余下空当的中线，鼠标在对话区时标签条重新能唤起。
- 让顶栏里的会话标题不再过早截断，可用宽度直接留出标签条自身的宽度与两侧的空隙，标题同时下移 2px，在标题栏里读起来才是垂直居中。
- 用对话导航跳到某一轮之后，新输出不再把位置拖回页底，跳转算读者自己选定的阅读位置，跟随与流式滑行在这一期间让开，读者自己回到页底时解除。

### 其他变更

- 公开路由改为由 `GET /dsh-claude-style/assets/<内容哈希>.svg` 提供帧图，品牌标志、厂商组合标与螃蟹帧图同样由这份构建清单决定内联进产物还是走这条路由，更新插件后需要重启宿主，早于本次构建的宿主半边没有这条路由，小鲸鱼不会出现（控制台提示一次）。
- npm 包里新增 `lib/client.js.map`，浏览器开发者工具里的报错位置与断点能对应到插件源码。
- 把 Anthropic 字体的投放点迁到 `$DSH_HOME/dsh-claude-style/fonts/`，放在这里的文件优先于包内的同名文件，随包分发的四款字体改由构建写入 `lib/fonts/`，两款 Anthropic 字体仍不随 npm 包分发。

<h3 id="en-0.12.0">New Features</h3>

- On the desktop the conversation's title and the header's controls rise into the window's caption row, the title at the left and the controls at the right before the window buttons, and what is left of the title row closes up to the left and rides up under the title while a side without room stays in the title row.

### Improvements

- The plugin's main file, which the browser reads and parses on every start, is minified to 0.8 MB (816,520 bytes).
- A panel docked in the right sidebar is a floating card 8px inside the column on every side, with a 16px radius, a 1px hairline and the host's own panel elevation, the column's canvas showing through the gap; each column of a split dock gets its own card, and a panel pulled out of the sidebar keeps the host's own floating window.
- Deepy's 18 sheets are turned into vectors at build time and cached for good under their content hash, so the first play no longer pauses to rebuild and the whale looks the same, with the sheets that ship in the package at 658 KB brotli-compressed.
- In a browser page the sidebar brand row gets 8px of top margin and the brand the row's own 8px leading inset, so the whale or starburst's left edge lands on the New session chip's, while the desktop shells (Windows titlebar, macOS) and the collapsed rail are unchanged.
- While the reader's follow is on, the running status line is pinned above the composer, which is where it comes to rest once the glide has caught up, so a burst no longer moves it and, scrolled back through history, it keeps its document place with the content being read.
- In a split right sidebar each pane stays its own rounded card, the dock draws no line between the two while the drag highlight stays, the gap comes in to 6px and each pane sits 6px from the column's edge.
- At a phone's width the composer's bottom line drops the permission control's chevron, truncates the permission and model controls at narrow-screen caps and keeps the context meter's ring without its number, and the row no longer runs past the card, so the ring lands inside it and no longer sits under the reasoning level.
- The permission tier control on the composer's bottom line drops its chevron at every width, a long tier name truncates inside the button, and an open tier card is placed again when the layout under it moves.
- The host's back-to-end button sits centred above the composer, staying the host's own button with only its placement the skin's.

### Bug Fixes

- A skin picked in the Skin Center after the page loaded takes the page too, with this theme giving the page up when a skin arrives and taking it back when the skin leaves, whichever way the page booted and without a reload.
- The right sidebar's start page scrolls its entries once the list outgrows the pane and still centres them while they fit.
- The flying bubble carries the bubble's own colour from the first frame (#29), painted on the one layer that is the shape at every step so it is the destination bubble's colour from the moment of the press, with the card's hairline and shadow leaving with the shape and written on the frame the shape settles.
- Once the cost-meter plugin stops writing, the usage panel merges the ledger and the folded session logs by date, keeping the ledger's figures for the days it knows and folding only the dates past its newest, so the panel shows the whole history again.
- Only a Skin Center skin (`html[data-dsh-skin]`) makes the theme yield, a wallpaper rendering keeps the theme working, and the external contract is that `body[data-we-wallpaper]` is no longer read.
- The send stand-in holds where it is while no message row is on the page to land on, visible and still following the destination, hands over the moment a row mounts, and gives the page back to the host after 2.5 s if no row ever comes.
- The settings page keeps no side padding of its own and only the host row's 16px on top, so its heading and first row line up with every other page's.
- The mascot's segmented control shares the row with its text and sits at the right edge, dropping to a line of its own starting at the left only when it no longer fits, decided by the text column's minimum width (220px) since the control never shrinks.
- On the desktop the welcome line and the account area show the signed-in account's nickname, a custom username still wins, and the HDSL name and the local system user remain the fallbacks for a profile that cannot be read.
- With the title and the controls on either side, the Chat / Trajectory strip takes the middle of the room left between them, and hovering the conversation brings it back.
- The session title's room in the caption row is the space up to the controls with the tab strip's own width and the air on both sides reserved, so it stops ellipsizing early, and the title sits 2px lower so it reads as vertically centred.
- After a jump to a turn from the conversation navigator, new output no longer drags the position back to the end, with the jump holding the conversation the way the reader's own wheel does and the follow and the stream glide standing down until he comes back to the end himself.

### Chores

- Serving the whale's frames moves to `GET /dsh-claude-style/assets/<content hash>.svg` while `GET /dsh-claude-style/deepy/<animation>.png` is gone, and the brand marks, the vendor lockups and the crab's sheets follow the same build manifest that decides per file between an inline form and that route; restart the host after updating, since a host half older than this build has no such route and the whale will not appear (one console message).
- The npm package carries `lib/client.js.map`, so error locations and breakpoints in the browser's developer tools map back to the plugin's sources.
- The Anthropic fonts are dropped into `$DSH_HOME/dsh-claude-style/fonts/` (`~/.dsh/dsh-claude-style/fonts/` when `DSH_HOME` is unset), where a file wins over a bundled face of the same name; the four faces the package ships are written to `lib/fonts/` by the build, and the two Anthropic faces stay outside the npm package.

## [0.11.1] - 2026-10-06

[中文](#cn-0.11.1) | [English](#en-0.11.1)

<h3 id="cn-0.11.1">新增功能</h3>

- 让 DSH 皮肤中心把本主题列为可选皮肤，选中它即把整页交给本插件，换选其他皮肤、官方默认或壁纸在跑时页面自动交还，无需刷新，让路期间不挂样式表、不安装功能，只保留设置页与偏好。

<h3 id="en-0.11.1">New Features</h3>

- The DSH Skin Center offers this theme as a selectable skin, and selecting it hands the whole page to this plugin while selecting another skin, the official default or a running wallpaper takes the page back without a reload, mounting no stylesheet and installing no feature while it keeps only its settings page and preferences.

Full Changelog: [v0.11.0...v0.11.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.11.0...v0.11.1)

## [0.11.0] - 2026-10-06

[中文](#cn-0.11.0) | [English](#en-0.11.0)

<h3 id="cn-0.11.0">新增功能</h3>

- 新增对话导航，对话区右侧的轮次短横线改由插件绘制，鼠标碰到它立刻展开成一张列表，每一轮一行、点一行页面滑到那一轮，Alt+↑ / Alt+↓ 跳到上一轮或下一轮，同时装着 dsh-plugin-msg-nav 时这两组按键留给它，设置页「对话」页新增「对话导航」开关，关闭后恢复系统自己的轮次短横线。

### 体验优化

- 让聊天区跟随的滑动从静止平稳起步、停下时不再跳动，最新一行被压在屏幕下缘的时间更短，超过 1200 像素的距离不再一帧跳过去，先到离目标 1200 像素处再滑完剩下的一段。
- 让聊天气泡动效落地更平滑，落地时真实气泡在飞行的气泡下面先显示出来，飞行的那份在 0.16 秒内淡出、文字逐渐变清晰，上浮的终点正好落在气泡上。

### 问题修复

- 让流式输出时画面不再忽而一下子顶上去、忽而往回掉，宿主的贴底在画出来之前就交给平滑跟随，正文变长时画面只会平稳上移，切换会话之后同样如此。
- 让聊天气泡飞行时的底色从输入框所在的那一块开始，随形状一起渐变成气泡的颜色，到终点时正好铺满整个气泡。
- 修复切换会话与新建会话卡住的问题，选中文字的配色只作用于对话正文与输入框里承载文字的块级元素，侧栏、设置页与弹层里的选中配色回到宿主默认。
- 装卸或更新别的插件之后，本插件的界面不再失去样式，无论别的插件如何装卸，本插件的外观都保持不变。
- 同时装着的别的插件不再丢失样式，没有归属标记的样式表在本插件看到它的当时就被标记为无主，之后任何插件的加载、重新加载与更新都不再碰它。
- 让 Deepy 的帧图顶端不再闪出灰线，任何站位、任何一段动画都不再出现，小鲸鱼的样貌与动作不变。
- 让子智能体工作室的节点详情小窗不再把会话统计与 Token 用量带走，两段仍留在输入区上下文面板里。

<h3 id="en-0.11.0">New Features</h3>

- Add a conversation navigator that draws the turn marks at the conversation's right edge, where reaching them opens a list with one row per turn and a click glides to that turn, Alt+↑ / Alt+↓ step between turns with dsh-plugin-msg-nav keeping those keys, and a Conversation navigator switch restores the host's own turn marks when off.

### Improvements

- The chat-area follow glides up from rest and comes to a stop without a hop, the newest line spends less time under the bottom edge, and a distance past 1200px goes to 1200px short of the target first and then glides the rest.
- The send flight lands more smoothly, with the real bubble showing underneath the flying one as it lands, the flying copy fading out over 0.16 s so the words sharpen into place, and the rise ending exactly on the bubble.

### Bug Fixes

- The host's pin to the end is handed to the glide before it paints, so a growing reply only ever moves the view up smoothly and no frame moves the position backwards, after switching sessions as well.
- The send flight's fill starts on the part of the card the composer paints and changes into the bubble's colour along with the shape, covering the whole bubble when it arrives.
- Selection colours apply to the blocks that carry text in the conversation and in the composer (paragraphs, lists, headings, quotes and code), so switching and starting sessions no longer stalls, and the sidebar, settings and popovers go back to the host's own selection colours.
- This plugin's appearance survives another plugin being loaded, reloaded, updated or removed.
- A stylesheet another plugin mounts without an ownership tag is marked as unowned the moment this plugin sees it, so no plugin's load, reload or update touches it afterwards.
- No line appears along the top of Deepy's frames in any position or animation, and the whale keeps its look and its animations.
- The subagent studio's node detail no longer takes the session statistics and the token usage with it, and both sections stay in the composer's context panel.

Full Changelog: [v0.10.6...v0.11.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.6...v0.11.0)

## [0.10.6] - 2026-10-05

[中文](#cn-0.10.6) | [English](#en-0.10.6)

<h3 id="cn-0.10.6">新增功能</h3>

- 新增聊天气泡动效，提交消息的那一下输入卡片原样浮起一份、落地时正好就是那条真实气泡，真实气泡在飞行期间藏着、落定后原位出现，设置页的「动画效果」选了「减弱」时不动，这一项合并在设置页「对话」页的「聊天区动画效果」开关里，默认开启。
- 新增文件变更行，从 run_code 程序里派发出去的写入与编辑按直接调用的样子显示，行尾带 `+n -m`，展开是改动卡片、路径可点开文件，失败与中断的行保留裁决信息、不再给路径链接，改动内容无法从参数推出的调用保留系统的输入 / 输出卡片，与对话区其他动画一起合并在「聊天区动画效果」开关里，默认开启。
- 新增新到文字的淡入，流式回答里新出现的字符从两成不透明度开始、约 0.12 秒内坐实到它自己的颜色，并按到达次序略作错开，整段一次到达的内容、一次几千字的突发以及刚被折叠重排过的文字保持本色，主线程忙不过来时让路、闲下来再继续，与对话区其他动画一起合并在「聊天区动画效果」开关里，默认开启。
- 新增折叠的卷帘门过渡，读者点开或收起一行或一个过程组时高度逐帧变化，下方内容被真的推开或收回，关掉「聊天区动画效果」后点开收起恢复系统自己的瞬开瞬收。
- 新增思考行与过程组的自动开合，模型还在思考时思考行自动开着、思考停下就收回，运行中的过程组自动展开、结束再收起，读者自己按过的行或组在当时的阶段里不再被改动，这一项挂在「聊天区动画效果」开关上，默认开启。
- 新增输入框插入符动效，输入框里的光标改由插件自己绘制、移动时带一段位移过渡，提问卡片的作答框与排队消息的行内编辑框同样覆盖，设置页的「对话」页新增每一格、只在移动时与关闭三档，任何一次测量失败都会把原生光标还回来。
- 让聊天区跟随交给系统自己的跟随，思考行收起、工具调用行出现这些结构时刻贴着底部的读者被交还给系统自己的跟随，流式输出期间主滚动条的跟随也交给同一条曲线，读者自己滚动离开底部之后插件不再插手。
- 在与 dsh-chat-ux 共存时让上面这几项整体让位，设置页的「对话」页把「聊天区动画效果」与「输入框插入符动效」两行的控件禁用、控件本身仍显示自己设的值，下面另起一行用强调色写明「该选项由 dsh-chat-ux 管理」，设置不会被改写，那个插件中途装卸也照常跟随。

### 体验优化

- 让权限菜单在上方容不下整张卡片时改为在控件下方展开。
- 让卷帘门过渡、聊天气泡动效、新文字淡入、插入符的滑动与闪烁、组头的流光跟随设置页解析出的「动画效果」一档，选「减弱」时关掉、选「总是」时照常运行。

### 问题修复

- 修复「更多模型」的二级弹层不随指针离开收拢的问题，指针从「更多模型」挪到一级列表的模型行上之后，二级弹层在宽限期结束后收起，一级弹层保持不动。
- 修复模型选择器打开二级弹层时沿用上一次位置的问题，现在先标记打开再定位，每次打开都落在当前位置。
- 修复插入符拆除后在途的那一帧仍会落笔的问题，这帧与队列帧一样登记在案，拆除时一并取消，回调也不再越过拆除线。
- 修复「文件变更行」的开关不起作用的问题，关掉即交还系统自己的行，打开即时接管，不需要刷新页面。
- 修复拖入附件后输入区工具栏打开的面板被附件区域遮住的问题，模型选择、思考强度这类面板现在完整显示。
- 在侧栏账号区因故障停用后把设置快捷键交还宿主，Ctrl+,（macOS 为 ⌘,，网页版宿主为 Ctrl+Alt+,）照常打开设置。

### 其他变更

- 昵称与封号页的语言只存在设置里，在宿主半边不认这两个字段时存进浏览器本地的值会在打开页面后写进插件设置、本地那份随后删除，此后两项与其他设置一样只保存在宿主的设置表单里。

<h3 id="en-0.10.6">New Features</h3>

- Add a send flight, where on submission the composer card lifts as it is and lands exactly on the real bubble, which hides while the flight is up and reappears in place when it lands; nothing flies when the animation choice is Reduced, and it rides the Chat-area animations switch, on by default.
- Add file change rows that show a write or edit dispatched from inside a run_code program like a directly called one, with the `+n -m` tail, the diff card on expansion and a path that opens the file, while a failed or interrupted row keeps its verdict and drops the path link and a call whose changed text cannot be derived from its arguments keeps the host's IN/OUT card; it rides the Chat-area animations switch, on by default.
- Add a fade for arriving text, where characters in a streaming answer start at a fifth opacity and settle to their own colour in about 0.12 s staggered by arrival order, while a block arriving whole, a burst of thousands of characters and text that just reflowed from a fold stay solid and the fade gives way while the main thread is busy; it rides the Chat-area animations switch, on by default.
- Folds roll open and shut like a door, moving the height frame by frame so the content below really moves away or comes back, and with the Chat-area animations switch off a press snaps open and shut the way the host does it.
- Thinking rows and process groups open and close by themselves, with a thinking row open while the model reasons and folded back when it stops and a running process group open and folded back when that work ends, while a row or group the reader pressed keeps what he chose; it rides the Chat-area animations switch, on by default.
- Add composer caret motion, with the composer's caret drawn by the plugin and gliding between positions, a question card's answer box and a queued message's inline editor covered as well, and Every move (the default, typing included), Explicit moves and Off offered on the Conversation tab, where a measurement that fails hands the native caret back.
- The chat area's scroll goes back to the host's own follow at the structural moments of a thinking row folding and a tool call row arriving, with the main scroller's follow walking the same curve while content streams and the plugin staying out of it once the reader scrolls away from the bottom.
- With dsh-chat-ux installed on the same machine these effects stand down whole, the Conversation tab disabling the Chat-area animations and Composer caret motion rows while each one goes on showing the value you set and a line underneath in the accent colour reads "Managed by dsh-chat-ux", your settings stay unwritten, the hand-over follows that plugin being loaded or removed mid-session, and with it gone they run on this plugin's own switches.

### Improvements

- The permission menu opens below its control when the card does not fit above, so the first rows stay clickable in a short window.
- The rolling door, the send flight, the token fade, the caret's glide and blink and the header's live-detail sweep read the resolved Animation setting, so Reduced stops them and Always runs them even while the system asks for reduced motion.

### Bug Fixes

- The More-models card folds once the pointer leaves, with a move from the More-models cell onto a model row of the first level folding the second level after the grace while the first level stays put.
- The model picker marks its second level open before placing it, so every open lands on the current position.
- The caret's teardown cancels the one-off frame that hands the transition back, so nothing draws after the teardown.
- The File change rows switch takes effect, off handing the host's own row back and on taking it over without a reload.
- A panel opened from the composer's toolbar draws in full while an attachment is in the composer.
- The settings shortcut goes back to the host after the sidebar account area fails and retires, so Ctrl+, (⌘, on macOS, Ctrl+Alt+, in the web host) opens the settings as usual.

### Chores

- The nickname and the account-hold page's language live in the settings alone, with a value kept in the browser's local storage while the host half did not know these fields yet written into the plugin settings when the page opens and the local copy removed afterwards.

Full Changelog: [v0.10.5...v0.10.6](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.5...v0.10.6)

## [0.10.5] - 2026-10-04

[中文](#cn-0.10.5) | [English](#en-0.10.5)

<h3 id="cn-0.10.5">新增功能</h3>

- 设置页新增「配色」与「字体」两项，各有「Claude」与「跟随宿主」两档，选「跟随宿主」后插件不再改写宿主的颜色或字体、只保留布局与控件，插件自己画的弹层、卡片与选择器改用宿主的颜色，同时启用壁纸插件时随它的玻璃效果变成半透明并模糊背后的画面。
- 权限分段控件、侧栏搜索、进行中 / 已归档视图、轮次状态行与对话 / 轨迹标签条各自有了开关，关闭后宿主自己的界面立刻回来，再打开立刻生效，都不需要刷新页面。
- 设置页顶部的分页条把设置项分进「通用」「外观」「输入区」「侧栏」「对话」五页，「快捷供应商」紧跟在「重绘模型选择器」下面、两项之间不画分隔线，模型选择器关闭时变灰不可操作，吉祥物关闭时「出现位置」同样变灰。
- 设置页的「吉祥物」可以单独选「跟随品牌」（默认，Claude 品牌下是螃蟹、DeepSeek 品牌下是 Deepy）、「螃蟹」、「Deepy」或「关闭」，「出现位置」可选只在首页或首页与对话页都出现（默认），螃蟹与 Deepy 一样站在输入区上沿，并随智能体的工作状态换动画，点它的左半边或右半边会被戳得往一侧躲。

### 体验优化

- 设置页十项的说明改为只说这一项改什么、各档分别是什么效果，「修改品牌标识」「重绘设置弹层」等动宾式或与其他条目不一致的标题一并统一为名词短语。
- Windows 桌面端的顶栏改为透明，侧栏和主界面各自通到窗口顶端，两者之间的分隔线从顶到底连成一条，主界面左上角的圆角去掉，三个窗口按钮直接落在页面上、打开设置时随页面一起变暗并保留悬停高亮，macOS 与 Web 端不变。

### 问题修复

- 在 DeepSeek 品牌下让 Deepy 抬高 3 像素，阴影落在目标、待办与排队卡片上，卡片上不再压着一道暗色。
- 让侧栏搜索框与它下面的按钮同为 28 像素高、与「新会话」的间隔为 6 像素，Windows 桌面端那一行为此少抬高 4 像素，搜索框整块落在顶栏下方。
- 让模型选择器在回到对话页时恢复与上下文计量环的间距。

### 其他变更

- 插件的设置表单新增 `palette`、`typeface`、`mascot`、`mascotScope`、`permissionsControl`、`workspaceView`、`sidebarSearch`、`turnStatus`、`viewTabs` 九项，宿主半边是旧版本时这几项改动保存不下来，重启宿主后恢复正常。

<h3 id="en-0.10.5">New Features</h3>

- The settings page adds Colours and Typefaces, each with Claude and Follow the host, and under Follow the host the plugin rewrites neither the host's colours nor its fonts and keeps only its layout and controls, its own popovers, cards and pickers take the host's colours, and beside a wallpaper plugin they turn translucent with its glass.
- The permission control, the sidebar search, the In progress / Archived view, the turn status line and the Chat / Trajectory tabs each have a switch of their own, so off brings the host's original back at once and on brings the feature back at once, with no reload either way.
- A tab strip at the top of the settings page sorts the settings into General, Appearance, Composer, Sidebar and Conversation, with Quick providers right under Redraw the model picker and no divider between the two, greying out while the picker is off as Where it appears does while the mascot is off.
- The settings page's Mascot offers Follow the brand (the default, the crab under Claude and Deepy under DeepSeek), Crab, Deepy or Off, and Where it appears offers the home page alone or the home page and conversations, while the crab stands like Deepy and changes its animation with the work, with a click on either half poking it aside.

### Improvements

- Every settings description says only what the setting changes and what each option does, and verb-form or inconsistent titles are unified to noun phrases.
- The Windows caption row is transparent, with the sidebar and the main area each running to the top of the window, the divider between them in one line from top to bottom, the main area's rounded top-left corner gone, and the three buttons on the page itself, dimming with it under the settings mask while keeping their hover highlight, while macOS and the web build are unchanged.

### Bug Fixes

- Under the DeepSeek brand the whale sits 3px higher when the goal, todo or queue cards push it off the composer card, so its shadow rests on the card and no dark band is stamped across it.
- The sidebar search box is 28px high like the rows below it and sits 6px above New session, the same step those rows take, and on the Windows Desktop that row rises 4px less so the whole box stays below the titlebar.
- Coming back to the conversation restores the clearance between the right end of the model trigger and the context meter.

### Chores

- The plugin's settings form gains `palette`, `typeface`, `mascot`, `mascotScope`, `permissionsControl`, `workspaceView`, `sidebarSearch`, `turnStatus` and `viewTabs`, and with an older host half still running changes to these do not save until the host restarts.

Full Changelog: [v0.10.4...v0.10.5](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.4...v0.10.5)

## [0.10.4] - 2026-10-03

[中文](#cn-0.10.4) | [English](#en-0.10.4)

<h3 id="cn-0.10.4">体验优化</h3>

- 让插件自带 Inter 与 Noto Serif（SIL OFL 1.1）代替没有装进系统或插件 `fonts/` 目录的两款 Anthropic 字体，换字体时文字不会重新换行，两款字体只含 Anthropic 字体覆盖的拉丁字符、中文照旧使用系统中文字体。
- 把设置页的品牌选项改为一排大卡片，每张卡片放对应的品牌标识（Claude 的陶土星芒、DeepSeek 的蓝鲸），当前品牌的卡片带品牌色描边，后续新增品牌只需添一张卡片。
- 让设置对话框恢复「Claude Style」标签页，与插件页渲染同一份页面、共用同一份偏好存储，一边改动另一边即时跟上，旧版宿主仍只有设置对话框一处。

### 问题修复

- 宿主「性能与用量」设置为简洁时，上下文弹层移除分组小标题，总用时、首 token 平均、输出速度与缓存命中四个指标合并为整齐的 2×2 排版。
- 同时启用 `dsh-thinking-effort` 这类自带模型菜单的插件时，菜单里的各个供应商分组按原样上下排列。
- 让 macOS 桌面端的封号彩蛋页不再画自己那套窗口按钮，星芒标与字标、「退出登录」直接排进系统标题栏那一行并让开左侧的三个按钮，按住这一行的空白处仍然可以拖动窗口。
- 让胶囊圆角只用在宿主自己的徽标与标签上（轨迹标签、自定义模型行的标签、提问里的「推荐」、快捷键按键等），两端是正圆弧，其他插件的弹层与标签保持自己的形状。

<h3 id="en-0.10.4">Improvements</h3>

- The plugin ships Inter and Noto Serif (SIL OFL 1.1) in place of the Anthropic faces when they are neither installed nor dropped into the plugin's `fonts/` directory, so text does not rewrap between them, and both carry only the Latin characters the Anthropic fonts cover so Chinese text keeps using the system's Chinese fonts.
- The settings page's brand option is a row of large cards, each carrying the brand's own mark (Claude's clay starburst, DeepSeek's blue whale) with the active card outlined in the brand accent, so a new brand is one more card.
- The settings dialog carries its Claude Style tab again, rendering the same page against the same preference store as the plugin page so a change in one appears in the other at once, while older hosts keep the dialog tab as the only seat.

### Bug Fixes

- Under the compact performance and usage row the context popover drops the section headings and places total time, average TTFT, output speed and cache hit share together in a 2x2 layout.
- A model menu another plugin puts in the composer stacks its provider groups top to bottom as that plugin draws them.
- The account-hold page on the macOS Desktop draws no window buttons of its own, with the starburst, the wordmark and the Sign out button taking their place in the titlebar row clear of the system's three buttons and the window still dragged by the empty part of that row.
- The pill radius applies only to the host's own badges and tags (trajectory tags, the custom model row tag, the Recommended mark in a question, shortcut key caps and the like) with true round arcs at the ends, so other plugins' popovers and tags keep their own shape.

Full Changelog: [v0.10.3...v0.10.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.3...v0.10.4)

## [0.10.3] - 2026-10-01

[中文](#cn-0.10.3) | [English](#en-0.10.3)

<h3 id="cn-0.10.3">体验优化</h3>

- 让上下文弹层的右缘与计量环的右缘齐平，并在窗口宽度变化、页面滚动与弹层自身高度变化时重新量。
- 让用量面板概览页「Token 总量」一格与热力图提示按模型列表的写法写「1M」「2B」「963.6k」，最多一位小数、整数不带 `.0`、`k` 小写，单位按四舍五入后的值取，刚过百万的读数不再出现「1000k」，轮次状态行的输出 tokens 也走这一套写法。
- 把首页 hero 行的工作区与预设两个弹层改到控件正上方、与控件右缘对齐并留 6px 展开，上方空间不够时翻到控件下方，快捷供应商弹层改为与模型弹层一样从右下角展开。
- 在「性能与用量」选简洁档时让上下文弹层补上总用时、首 token 平均、输出速度与缓存命中比例，详细档给出宿主那两组全部的行。

### 问题修复

- 让推理档位触发控件在重建后回到模型名旁边，档位照常可选。
- 让输入框下方那一行里的上下文计量环与这一行其余控件同线。

### 其他变更

- 把两份 README 改成同一套骨架，英文版删去功能清单与「停用与卸载」两节，小鲸鱼 Deepy 的八张动图移进预览一节，安装步骤两份都读作插件页、终端、插件市场三步。
- 让发行包不再包含 README 截图，`package.json` 的 `files` 只带 `docs/STYLE.md` 与 `docs/architecture.md` 两篇文档，八张截图留在仓库里，GitHub 与 npm 页面上的 README 图片照常显示。

<h3 id="en-0.10.3">Improvements</h3>

- The context popover lines its right edge up with the meter's, re-read on window resizes, page scrolls and changes to the panel's own height.
- The usage panel's numbers read the way the model list writes them, printing `1M`, `2B` and `963.6k` with one decimal at most, a whole number without its `.0`, a lowercase k and the unit picked on the rounded value, so a count just past a million never reads `1000k`, and the turn status line's output tokens print through the same formatter.
- The home page's workspace and preset cards open over their control, right-aligned with it and 6px above it, flipping below when the viewport leaves no room, and the quick-provider popover grows from its bottom-right corner like the model picker.
- With the compact performance and usage row the context popover adds the total time (the model's time plus the tool calls'), the first-token average, the output speed and the cache-hit share, while the detailed row keeps the host's whole set.

### Bug Fixes

- The reasoning-effort trigger returns beside the model name after a rebuild, with the levels selectable again.
- The context meter sits on the same line as the rest of the composer's control row.

### Chores

- Both READMEs share one skeleton, with the English one dropping its feature list and its Disabling and uninstalling section, Deepy's eight GIFs moving into the preview, and installation reading as three steps in both languages.
- The npm package ships only the two documents under `docs/` (`STYLE.md` and `architecture.md`), leaving the eight README screenshots in the repository while the README keeps showing its images on GitHub and npm.

Full Changelog: [v0.10.2...v0.10.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.2...v0.10.3)

## [0.10.2] - 2026-09-30

[中文](#cn-0.10.2) | [English](#en-0.10.2)

<h3 id="cn-0.10.2">新增功能</h3>

- 设置页新增「动画效果」，「随系统」跟随 Windows 自己的「显示动画」设置，「减弱」把动画停在代表帧上并把界面过渡压到瞬时，「总是」无论系统怎么设置都播放动画；系统设置中途变化时立即按新值生效，后台任务的转圈在三种设置下都照常转动。

### 体验优化

- 小鲸鱼 Deepy 的帧图改为浏览器端矢量化播放，任意屏幕缩放比例下都清晰；转换结果以表图自己的内容戳为键缓存，转换失败的表按原 PNG 播放。
- 流式输出期间界面的每帧开销减半，思考档位开关只在档位文字变化时量一次位置、位置值不变就不写，上下文计量环只在百分比读数或重绘范围变化时才量宽度，其余功能的刷新维持只读必要节点、只写变化值。
- 小鲸鱼 Deepy 的换帧改为胶片条 transform 平移加 WAAPI steps 关键帧，循环动画播放期间主线程没有 JS 运行、换帧只走合成器，状态机、减弱动态效果下的静止帧与点击戳刺、抬起反应的行为不变。
- DeepSeek 档的亮色配色调淡，画布为 `#FAFBFF`，侧栏 `#F7F9FF`，各层底色、分段控件与开关底板、表头、滚动条一并调淡，整页的蓝只是白底上的一层色调，暗色配色不变。
- 会话的数字收进上下文计量环的弹层，输入卡片下方那行数字及其悬停展开的卡片一并移除，数字改排在宿主自己的上下文明细下方并跟着会话实时更新；弹层跟随「悬停打开弹层」偏好，指针离开即收起，点击打开照旧。

### 问题修复

- 已归档列表的会话标题静止时与进行中的会话一样用次级灰，指针停在行上或键盘焦点进入行时才用主文字色。
- 桌面端的封号彩蛋页不再画自己那套窗口按钮，最小化、最大化、关闭三个按钮由 Windows 系统层画出的顶栏那一行承担，星芒标与字标、「退出登录」直接排进那一行，那一行跟着页面换成象牙白或暖黑，按住这一行的空白处仍可拖动窗口。
- 封号彩蛋页在 DeepSeek 档下也画完整的 Claude 字标，星芒与文字一并出现。
- 账号弹层在皮肤的行进入并摆位完成之前不上色，入场动画从卡片最终的高度与位置开始播放，不再先贴着底部出现再往上跳。

### 移除

- 移除 Anthropic 品牌档，设置页「修改品牌标识」只剩 DeepSeek 与 Claude 两档，已经存过的 `anthropic` 读作 Claude。

### 其他变更

- README 的小鲸鱼介绍附上八张 GIF，分别是空闲、思考、写回答与调用工具、指挥子代理、等你操作、失败、完成与睡着，仓库里的 Deepy 展示页因体积过大移除，全部 20 个动画的 GIF 仍在 `showcase/gifs/`。

<h3 id="en-0.10.2">New Features</h3>

- Add an Animation setting with three choices, where Follow the system keeps Windows' own "show animations" setting in charge, Reduced holds every animation on its still frame and takes the interface's transitions down to nothing, and Always plays them whatever the system says; a change to the system setting lands immediately and the background-work ring turns in all three.

### Improvements

- Play Deepy's animation sheets as vectors generated in the browser, sharp at every display scale; vectors are cached under each sheet's own content stamp, and a sheet that fails to convert plays as the PNG it came from.
- Halve the per-frame cost of streaming, with the effort control measuring its placement once when the level's label changes and writing only moved values, the context meter re-measuring its width only when the percentage reading or the restyle scope changes, and the other feature refreshes keeping to reading only the nodes they need and writing only changed values.
- Play Deepy's frame changes on the browser's animation engine as a filmstrip translated by WAAPI steps keyframes, so no JS runs on the main thread while a loop plays and frames only composite, with the state machine, the still frames under reduced motion and the poke and lift reactions behaving as before.
- Make the DeepSeek brand's light palette paler, with the canvas at `#FAFBFF` and the sidebar at `#F7F9FF`, and the raised layers, segmented-control and switch plates, table headers and scrollbars stepping back with them, so the blue reads as a tint on white; the dark palette is unchanged.
- Move the session's numbers into the context meter's popover and drop the line under the input card along with the card it opened on hover, so they sit under the host's own context rows and follow the session; the popover follows the "open popovers on hover" preference, folds away when the pointer leaves and still opens on a click.

### Bug Fixes

- Keep an archived conversation's title in the same grey as running sessions, taking the primary ink only while the pointer is on its row or the keyboard focus is in it.
- Stop the account-hold page on the Desktop from drawing its own set of window buttons, so the system's titlebar row keeps minimize, maximize and close while the starburst, the wordmark and the Sign out button line up in that row, which takes the page's ivory or warm black and still drags the window by its empty part.
- Draw the full Claude lockup on the account-hold page under the DeepSeek brand too, starburst included.
- Keep the account popover unpainted until the skin's rows are in it and its placement has settled, so its entrance animation plays from the card's final height and place instead of appearing low and jumping up.

### Removals

- Remove the Anthropic brand choice, leaving DeepSeek and Claude on the settings page's Brand mark row, and read a stored `anthropic` as Claude.

### Chores

- Show Deepy moving in the README with eight GIFs under the Deepy item in Features — idle, thinking, answering and calling tools, conducting subagents, waiting on you, failed, finished and asleep — and remove the repository's Deepy showcase page for its size, with GIFs of all 20 animations still in `showcase/gifs/`.

Full Changelog: [v0.10.1...v0.10.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.1...v0.10.2)

## [0.10.1] - 2026-09-28

[中文](#cn-0.10.1) | [English](#en-0.10.1)

<h3 id="cn-0.10.1">其他变更</h3>

- README 预览换成 Claude 与 DeepSeek 两套配色的截图，每套配色各有工作台首页与一段带标题、列表、任务清单、表格、代码高亮与引用的 Markdown 对话的亮暗截图，共八张，截图里的工作区、会话、用量与昵称都是示例数据。
- README 新增鸣谢，注明像素小鲸鱼 Deepy 的动画帧图出自 calmly-eating-bugs 绘制的 Deepy 小鲸鱼主题包、经作者许可随插件分发，并附上仓库 `showcase/` 目录里展示页与 GIF 原件的入口；展示页只在 GitHub 仓库里，npm 包的内容与体积不变。

<h3 id="en-0.10.1">Chores</h3>

- Show both the Claude and the DeepSeek palettes in the README previews, with eight shots where each palette carries the Studio home page and a Markdown conversation with headings, lists, task lists, a table, highlighted code and a quote in light and dark, and keep the workspaces, sessions, usage and nickname in them as sample data.
- Add README acknowledgements crediting Deepy's animation frames to the Deepy whale theme pack drawn by calmly-eating-bugs and shipped by the author's permission, with pointers to the showcase page and GIF originals under the repository's `showcase/` folder; the showcase lives only in the GitHub repository and the npm package's contents and size are unchanged.

Full Changelog: [v0.10.0...v0.10.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.10.0...v0.10.1)

## [0.10.0] - 2026-09-28

[中文](#cn-0.10.0) | [English](#en-0.10.0)

<h3 id="cn-0.10.0">新增功能</h3>

- 品牌选 DeepSeek 时，输入框上的螃蟹换成像素小鲸鱼 Deepy，动画逐帧取自 Deepy 主题包；它的动作跟着智能体走，模型思考、写回答、调用工具、等你操作各有动作，点它的脸或尾巴能戳它，减少动态效果时每个状态停在一张代表帧上；插件新增公开路由 `GET /dsh-claude-style/deepy/<动作>.png` 提供帧图。

### 体验优化

- 品牌标识的「关闭」改名为 DeepSeek，整套配色换成 DeepSeek 蓝色系，设置值由 `off` 改为 `deepseek`，已经存下的 `off` 照样读作 DeepSeek；强调色为 DeepSeek 的品牌蓝 `#4D6BFE`，亮色画布带一点天蓝、暗色画布为蓝黑，账号行与轮次状态行改用 DeepSeek 的鲸鱼标。
- 已归档列表里删除被拒时改用宿主自己的 Toast 说明原因，会话仍被本应用占用时提示「会话仍被本应用占用，重启后再删除」，其余拒绝提示「删除失败：原因」，行保持原样。

<h3 id="en-0.10.0">New Features</h3>

- Add Deepy the pixel whale on the composer under the DeepSeek brand, whose frames come from the Deepy theme pack one for one; its animation follows the agent, reacting to each thing it does, with reduced motion holding each state on one frame; a new public route, `GET /dsh-claude-style/deepy/<animation>.png`, serves the frames.

### Improvements

- Rename the brand mark's "Off" choice to DeepSeek and move the whole palette to DeepSeek blue, with the setting's value changing from `off` to `deepseek` and a stored `off` still reading as DeepSeek; the accent is DeepSeek's brand blue `#4D6BFE`, both palettes turn cool, and the account row and turn status line take DeepSeek's whale.
- Show the host's own Toast when the archived list refuses a delete, reading "The conversation is still held open by this app; restart it, then delete again" while the app holds the conversation open and "Delete failed: \<reason\>" for every other refusal, with the row left as it is.

Full Changelog: [v0.9.1...v0.10.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.9.1...v0.10.0)

## [0.9.1] - 2026-09-27

[中文](#cn-0.9.1) | [English](#en-0.9.1)

<h3 id="cn-0.9.1">问题修复</h3>

- 修复已归档列表里的会话删不掉，删除成功时该会话在同一请求里移出归档集合，存储目录已消失的条目也按删除成功处理，浏览器随即重拉一次会话列表基线，已删除的会话不再顶在已归档列表或会话树里。

<h3 id="en-0.9.1">Bug Fixes</h3>

- Fix archived sessions refusing to disappear when deleted, so a successful delete drops the session from the archive set in the same request and the browser re-pulls the session baseline right after, keeping a deleted session off the archived list and the session tree.

Full Changelog: [v0.9.0...v0.9.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.9.0...v0.9.1)

## [0.9.0] - 2026-09-26

[中文](#cn-0.9.0) | [English](#en-0.9.0)

<h3 id="cn-0.9.0">新增功能</h3>

- 新增侧栏搜索框与搜索面板，鼠标移到侧栏上时品牌标志淡出换成搜索按钮，点它或按宿主的搜索快捷键（桌面端 Ctrl+K，Web 端 Ctrl+Alt+K）都能在窗口上方打开面板；面板能搜历史会话、项目、插件、当前会话可用的 Skill 与快捷键，顶部切换分类，↑↓ 选择、Enter 打开、Esc 关闭。
- 进行中、已停止与失败的轮次改用 Claude Code 式的状态行，跟在这一轮工作的末尾，转动的火花标记后跟「用时 · 输出 tokens · 当前动作」，停止或失败后火花静止，正常结束的一轮仍是宿主的「用时 N 秒」。

### 体验优化

- 工作台首页输入卡片上的螃蟹改用 Claude Code 自己的敲代码动画，逐帧照搬，动作有眨眼、掏出笔记本电脑放到卡片边沿、跳一下侧过身敲一阵键盘、收起电脑转回正面，像素边缘清晰，电脑仍用随主题变化的灰色，触发方式（点击、指针移开、闲置时自己来一次，减少动态效果时只认点击）不变。
- 对话中输入框的发送键改用按 Claude Code 画的回车箭头，上沿一小段、沿右侧向下、再沿底边向左到箭头，线条清晰，输入框有内容时用正文墨色，空着时仍是浅灰。
- 桌面端侧栏的品牌行上移 10px，品牌行连同其下的新会话、插件与会话列表一起上移，悬停时换上的搜索框仍整个露在 40px 高的标题栏下方，与标题栏里的收起按钮也不重叠；Web 端不变。
- 用量面板的倍数趣味行从二十九本书扩到六十五本，补入《黄色壁纸》《变形记》《浮士德》《悲惨世界》等三十六本，长度按全文以 o200k_base 分词器计；书与书排得更密，趣味行落到的那本书离实际用量更近。

### 问题修复

- 修复开启「自动弹出弹层」后从账号菜单打开封号彩蛋页会立刻退出，皮肤代宿主菜单按下的 Escape 现在只送达宿主菜单，彩蛋页开着时悬停收起同时停摆、页面保持打开，退出后侧栏与账号菜单恢复进入前的样子。
- 修复启用皮肤后带输入框的会话页上快捷键失灵，皮肤常驻页面的模型选择器、推理强度与权限弹层卡片的 `role="menu"` 标注改为随卡片开合写入与撤销、只在卡片打开时存在，快捷键的仲裁恢复如常。

<h3 id="en-0.9.0">New Features</h3>

- Add a sidebar search box and search palette, opened by the search button the brand mark fades into or by the host's search shortcut (Ctrl+K on the desktop, Ctrl+Alt+K on the web), searching past sessions, projects, plugins, skills and keyboard shortcuts, with a category row, ↑↓ to move, Enter to open and Esc to close.
- Use a Claude Code style status line for running, stopped and failed turns at the end of the turn's work, a turning spark carrying elapsed time, output tokens and what the model is doing while it runs and a still spark once it stops or fails, with a turn that finishes normally keeping the host's own "Took N s".

### Improvements

- Play Claude Code's own laptop animation for the pixel crab on the Studio home page's composer card, frame for frame — a blink, a laptop pulled out onto the card's edge, a hop into a side-on stance to type away, the laptop put away as it turns back — with crisp pixel edges, the laptop keeping its theme-following grey and what sets it off (a click, the pointer leaving it, on its own while idle, only a click under reduced motion) unchanged.
- Use Claude Code's drawn return arrow for the in-conversation composer's send button — a short stub along the top, down the right side, back along the bottom to the arrowhead — in crisp strokes, in the body ink once the box holds text and still pale grey while it is empty.
- Move the desktop sidebar's brand row 10px higher, together with the New session, Plugins and session list below it, so the search box that takes its place on hover stays wholly below the 40px titlebar and clear of the collapse button there; the web build is unchanged.
- Grow the usage panel's yardstick line from twenty-nine to sixty-five books, adding thirty-six titles such as The Yellow Wallpaper, Metamorphosis, Faust and Les Misérables, each sized by feeding its full text to the o200k_base tokenizer; with the books set closer together the one the line lands on sits nearer the real usage.

### Bug Fixes

- Fix the account-hold easter egg closing itself right after it opens from the account menu while "Open popovers on hover" is on, so the Escape dispatched on the host's behalf reaches only the host's menu, the hover close stands down while the page is open, and the sidebar and its account menu come back as they were once the page is dismissed.
- Fix shortcuts going dead on conversation pages with an input box while the skin is enabled, so the `role="menu"` mark on the model picker, reasoning-effort and permission popover cards the skin keeps in the page rides the card's open state and exists only while a card is open, leaving shortcut arbitration as it was.

Full Changelog: [v0.8.0...v0.9.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.8.0...v0.9.0)

## [0.8.0] - 2026-09-26

[中文](#cn-0.8.0) | [English](#en-0.8.0)

<h3 id="cn-0.8.0">体验优化</h3>

- 对话 / 轨迹 / 上下文切换时同一块高亮从原标签滑到新标签，宽度随标签文字一起变化，标签文字颜色同步过渡，滑动不受系统「减少动态效果」设置影响，Windows 关掉了「在 Windows 中显示动画」时照样滑动。
- 权限分段（只读 / 编辑 / 自动 / Yolo）、侧栏的进行中 / 已归档与设置页里的各组分段控件切换时，高亮块都从上一段滑到新的一段，与对话视图标签同一套动画。
- 页面持续变化时插件的每帧开销大幅下降，流式输出、打字机效果这类每帧都改动页面内容的场景下浏览器每帧的样式重算与主线程总耗时都大幅减少，界面外观不变。
- 工作区选择菜单改用 Claude Code 的文件夹菜单样式，窄卡片里的纯文字行排得更紧，不画文件夹图标与「添加工作区…」前的加号，当前工作区仍以强调色勾号标出，档位菜单保持原样。
- 用量面板的倍数趣味行从十一本书扩到二十九本，补入《道德经》《爱丽丝漫游奇境》《德古拉》《三体》等中外书目，整份书单从《道德经》排到《追忆似水年华》，长度按全文或出版字数以 o200k_base 分词器计；英文界面的这一行改为 “You've used ~N× the tokens in <书名>.”。
- 账号弹层卡片改用象牙白底色，浅色模式下与主画布同为 `#FCFCFB`，靠细边框和阴影与侧栏区分，暗色模式不变。

### 问题修复

- 修复侧栏「已归档」显示「没有已归档的会话」，列表跟随宿主的归档记录与会话列表实时更新，收录的会话与宿主自带「仅已归档」筛选一致，每行显示宿主给出的标题。
- 修复点击已归档行没有任何反应，现在与宿主会话树里点已归档会话一样，在窗口顶部弹出宿主自己的提示「已归档对话暂时无法查看，请取消归档后查看」。
- 修复英文界面下「排队发送」「插话发送」按钮的外观与中文界面不一致，回复进行中且草稿非空时这两个按钮同样显示强调色与悬停底色；输入框里各按钮改为按它们在宿主界面中的位置识别，不再依赖按钮文字，宿主改动按钮文案或切换界面语言都不影响样式。

### 其他变更

- 页面标出正在运行的构建，`<body>` 上的 `data-dsh-claude-style` 属性写着已加载的包的构建编号（`npm run build` 会打印同一个编号），报告问题时即使页面经过多次热重载、从未刷新也能说清运行的是哪一版。

<h3 id="en-0.8.0">Improvements</h3>

- Slide one highlight between the Chat / Trajectory / Context tabs, resizing to the new label as it goes with the labels' colours crossing over; the slide ignores the system's reduced-motion setting and still plays with Windows' "Show animations in Windows" turned off.
- Slide the highlight on the permission segments (Read / Edit / Auto / Yolo), the sidebar's Active / Archived and every segmented control on the settings page from the old segment to the new one, with the same motion as the conversation view tabs.
- Cut the plugin's per-frame cost sharply while the page keeps changing, so with streaming output or a typewriter effect the browser's style recalculation and the main thread's total work per frame both come down, while nothing on screen looks different.
- Give the workspace picker the look of Claude Code's folder menu — a narrow card of plain text rows set closer together, with no folder glyph and no plus sign on "Add workspace…" — while the current workspace keeps the accent check and the preset menu is unchanged.
- Grow the usage panel's yardstick line from eleven to twenty-nine books, adding Dracula and the Chinese classics among others, the whole list spanning Tao Te Ching to In Search of Lost Time and lengths measured with the o200k_base tokenizer; the English line now reads "You've used ~N× the tokens in <book>".
- Give the account popover's card the ivory canvas fill in light mode, sharing `#FCFCFB` with the main canvas and set off from the sidebar by its hairline and shadow; dark mode is unchanged.

### Bug Fixes

- Fix the sidebar's Archived view reading "No archived conversations" by following the host's archive record and session list live, holding the same conversations as the host's own "Archived only" filter and carrying the host's title on each row.
- Fix clicking an archived row doing nothing, so it raises the host's own notice at the top of the window, "Archived sessions cannot be opened. Unarchive it to view.", the same one the host's session tree shows for an archived session.
- Fix the Queue message and Steer message buttons looking unlike the Chinese UI, so in English with a reply running and a non-empty draft they show the accent colour and the hover fill too; the composer's buttons are now recognised by where they sit in the host's markup rather than by their text, so a host wording change or a switch of the UI language leaves their styling intact.

### Chores

- State which build the page is running, with the `data-dsh-claude-style` attribute on `<body>` carrying the build id of the loaded bundle (`npm run build` prints the same id), so a bug report can name the exact build even after hot reloads that never reloaded the page.

Full Changelog: [v0.7.2...v0.8.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.2...v0.8.0)

## [0.7.2] - 2026-09-25

[中文](#cn-0.7.2) | [English](#en-0.7.2)

<h3 id="cn-0.7.2">新增功能</h3>

- 把账号行的头像改为玩家在启动器里导入的皮肤，宿主半边以只读路由提供这张规范化贴图，浏览器按启动器账号列表的裁法取方形头部，取不到图时显示 Claude 徽标。
- 把权限控件改为按宿主的 `permissionPresets` 目录构建，分段控件与弹层只出现目录里有的档位，第三方插件注册的档位也成为一等公民，切换仍走宿主的 `/permission <preset>`。

### 体验优化

- 在还没选工作区的工作台首页上也显示用量面板与权限分段，输入框下方的 Read / Edit / Auto / Yolo 停在新会话的默认权限上，点它和点输入框一样打开工作区选择。
- 把工作台首页「先选工作区」的虚线框改为只框住单行输入框，指针移上去时变色的提示不变。

### 问题修复

- 修复选中划过行内代码时代码段显示为一块偏浅的独立高亮，芯片内的选中色预先抵消那层半透明罩色，整段选区呈现统一的选中色。
- 修复窗口较矮时工作台首页被用量面板撑出窗口，面板在问候语与输入框之间自己滚动、底边渐隐，滚到底时渐隐消失，问候语、上下文行与输入框都留在窗口内。

<h3 id="en-0.7.2">New Features</h3>

- Show the account row's mark as the player's own imported skin, served by the host half over a read-only route and cropped square the way the launcher's account list crops it, with the Claude mark when no picture can be served.
- Build the permission control from the host's `permissionPresets` catalog, so its segments and rows offer exactly the tiers a deployment serves and a tier a third-party plugin registers takes its own slot, with switching still going through the host's `/permission <preset>`.

### Improvements

- Show the usage panel and the permission segments on the Studio home before a workspace is picked, the Read / Edit / Auto / Yolo segments resting under the input box on a new session's default and opening the workspace picker when pressed.
- Draw the Studio home's dashed "pick a workspace" ring on the single-line input box alone, still changing colour under the pointer.

### Bug Fixes

- Fix inline code showing a separate, lighter highlight when selected, pre-compensating the chip's wash so a selection crossing it reads as one even colour, focused or blurred, dark or light.
- Fix the usage panel pushing the Studio home past a short window, scrolling between the greeting and the composer with a fading bottom edge that lifts at the end of the scroll, so the greeting, the context row and the input box stay in the window.

Full Changelog: [v0.7.1...v0.7.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.1...v0.7.2)

## [0.7.1] - 2026-09-25

[中文](#cn-0.7.1) | [English](#en-0.7.1)

<h3 id="cn-0.7.1">体验优化</h3>

- 把工作台改为默认首页版面，没在设置里选过版面时新会话页用工作台版面，问候在左上、输入卡片贴住窗口底边、中间是用量面板、卡片上沿站着像素螃蟹，经典版面仍可在设置页随时切回，已经选过版面的不受影响。

<h3 id="en-0.7.1">Improvements</h3>

- Make Studio the default home layout, so a new-conversation page with no layout chosen in the settings opens in the Studio layout, the greeting at the top left, the composer on the window's bottom edge, the usage panel in between and the pixel crab on the card, while Classic stays one switch away in the settings page.

Full Changelog: [v0.7.0...v0.7.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.7.0...v0.7.1)

## [0.7.0] - 2026-09-25

[中文](#cn-0.7.0) | [English](#en-0.7.0)

<h3 id="cn-0.7.0">新增功能</h3>

- 新增「首页版面」设置项，选「经典」时沿用居中大标题加输入卡片，选「工作台」时标题移到左上角、输入框改用对话内的单行样式贴住窗口底部，用量面板贴着输入框左缘排布；面板的「全部 / 30 天 / 7 天」过滤数字格、趣味行与模型排行，只在新会话页出现。
- 新增只读路由 `GET /dsh-claude-style/usage`（与用户名路由同一同源护栏），装了 `dsh-cost-meter` 时读它的账本缓存、否则读本机会话日志自行汇总，两种来源都给出每个模型的四类 token 与每天按模型拆分的 token，汇总不可用时改用宿主会话列表自带的投影值出数。
- 新增先画骨架再填数的用量面板，数字到达前先画好外框、占位数字、空热力格与模型行的占位条，到达后只替换文字、格子颜色与条长，整个版面不跳动，取不到数据的格子画破折号。
- 在工作台版面的新会话页上，输入卡片上沿靠右站着 Claude Code 的像素螃蟹，点它、指针从它身上移开、以及页面开着时每隔 25–45 秒，它照 Claude Code 的样子敲一次代码，系统要求减少动态效果时只有点它才播放，只有螃蟹本身接收指针。
- 新增热力图的日期提示，指针停在某一天上立刻浮出 Claude Code 样式的深色提示，写着日期和当天的消息数，靠两端的几列贴着格子外沿、不伸出面板。
- 新增经典首页的更多问候，早上、午间、下午、晚上、深夜各有一组，另有几句不分时段，每次回到新会话页随机换一句，同一次停留里不会跳动。
- 新增接入 HDSL 启动器的账号昵称与头像，昵称依次回退到官方账号昵称、HDSL 昵称与系统用户名，头像依次回退到官方账号头像、HDSL 头像与 Claude 徽标，宿主半边新增两条只读私有路由 `GET /dsh-claude-style/hdsl` 与 `GET /dsh-claude-style/hdsl-skin.png`。

### 体验优化

- 打开模型选择器、推理强度、权限、账户抽屉、会话统计卡片或工作台新会话页的工作区菜单时，之前打开的那张卡片立即收起，宿主自带的工作区菜单与账户菜单一并参与。
- 把悬停停留延长到 100 毫秒，指针以平常速度扫过触发器不再展开卡片，停在触发器上仍立即展开；模型选择器的收起宽限与会话统计卡片的展开停留保持各自的例外值。

### 问题修复

- 修复浅色模式下聊天记录顶部「加载更早」按钮几乎看不见，悬停底与文字回到可读的对比度，同族令牌下的工作区重命名输入框在浅色里也不再是深色方块。
- 修复设置页「账号与余额」的「充值」按钮文字与底色几乎同色，统一点链接色不再覆盖这类实心按钮链接，旁边的「查询用量」回到描边按钮样式。
- 修复实心主按钮悬停时底色跳出陶土色系，悬停色与底色现在同族。
- 修复工作区选择器弹层打开时先跳到触发器下方再弹回，弹层从打开的第一帧起就停在触发器旁边的正确位置。
- 修复切换到 Yolo 或 Auto 后权限停留在原档位，任何档位都直接请求宿主的 `/permission` 命令完成切换，点击后权限立即生效，皮肤控件与宿主按钮同步显示新档位。
- 修复权限弹层随重建在页面里残留，每次安装弹层先清扫文档里已有的弹层、功能卸载时一并扫除，页面上始终只有当前这一颗。
- 修复已归档行的时间被操作按钮顶离右缘，静止时按钮不占位、时间与行右缘对齐，悬停或键盘聚焦行时时间让位，两颗按钮出现在原位置。
- 修复页面加载后第一次修改设置提示「设置存储不可用，改动不会被保存」，设置表单等宿主的命名空间登记完成后再绑定，晚到时也会立即绑定并读回取值，第一次修改即可保存。
- 修复新会话页把鼠标从预设模式快速移到工作文件夹时两个弹层同时打开并闪烁，一行里的两个选择器只会有一个打开，移到另一个触发器时先收起前一个。

<h3 id="en-0.7.0">New Features</h3>

- Add a Home layout preference, with "Classic" keeping the centered headline over the composer card and "Studio" pinning the greeting to the top left, docking the composer at the window's bottom edge and setting a usage panel against its left edge, the panel's All / 30d / 7d pills filtering the tiles, the multiplier line and the model list.
- Add the read-only route `GET /dsh-claude-style/usage` behind the username route's same-origin fence, reading `dsh-cost-meter`'s ledger cache when installed and folding the local session logs otherwise, both answering each model's token buckets and per-day tokens, with the panel falling back to the projection block host session rows carry.
- Add a skeleton drawn before the numbers arrive, the frame, number placeholders, an empty heat grid and stand-in model bars first, so arriving values replace only the text, the cell colours and the bar lengths and nothing shifts, with a dash for a figure no source can answer.
- Add Claude Code's pixel crab on the composer card's top edge near its right end on the Studio layout's new-conversation page, playing its laptop routine when clicked, when the pointer leaves it and every 25–45 seconds while the page is in view, with a click the only trigger under reduced motion and only the crab taking the pointer.
- Add dark Claude Code day tips on the heat grid, naming the date and that day's messages as soon as the pointer rests on a day and lining up with the cell's outer edge over the columns at either end.
- Add more greetings to the classic home page, a pool for each of morning, midday, afternoon, evening and night plus a few lines for any hour, drawn fresh each time the new-conversation page comes back and holding still while the reader stays.
- Add HDSL launcher accounts for the nickname and the picture, each falling back through the signed-in account, HDSL and the Claude mark, with two read-only private routes, `GET /dsh-claude-style/hdsl` and `GET /dsh-claude-style/hdsl-skin.png`.

### Improvements

- Keep one popover card up at a time by folding whatever card was up before it whenever the model picker, the reasoning-effort card, the permission menu, the account drawer, the session-stats card or the studio new-conversation page's workspace menu opens, with the host's own workspace and account menus joining on the same terms.
- Move the hover dwell to 100 ms, so a pointer crossing a trigger at an ordinary pace no longer unfolds a card and a pointer parked on the trigger still opens at once, with the model picker's close grace and the stats card's open dwell keeping their own values.

### Bug Fixes

- Fix the "load earlier" button at the top of the transcript being nearly invisible in light mode, giving it a light-gray solid hover fill and readable contrast and keeping the workspace rename field on the same token family out of its dark-block look in light mode.
- Fix the "Top up" button in Settings → Account & balance showing its label in the same colour as its fill, so the shared link ink no longer overrides filled-button anchors and the neighbouring "View usage" returns to the outlined treatment.
- Fix a filled primary button's hover fill jumping out of the accent family, which now stays in the fill's family.
- Fix the workspace picker card jumping below its trigger and back as it opens, holding its correct position beside the trigger from the first frame.
- Fix the preset staying on its old tier after switching to Yolo or Auto, with every tier now requested directly through the host's `/permission` command so the switch takes effect at once and the skin control and the host button agree on the new tier.
- Fix the permission popover stranding in the document across rebuilds, with each install sweeping every popover already in the document before appending its own and teardown sweeping the rest.
- Fix the archived rows' time being pushed off the row's right edge by the action buttons, which now reserve nothing at rest, so the time right-aligns with the row and steps aside on hover or keyboard focus while the two buttons take its place.
- Fix the first settings change after a page load reporting "The settings store is unavailable, so changes will not be saved.", with the settings form binding as soon as the host's namespace registration arrives and reading the value back.
- Fix both popovers on the new-conversation page opening at once, and flickering, when the pointer moved quickly from the preset mode to the workspace folder, since only one of the row's two pickers is open at a time.

Full Changelog: [v0.6.4...v0.7.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.4...v0.7.0)

## [0.6.4] - 2026-09-24

[中文](#cn-0.6.4) | [English](#en-0.6.4)

<h3 id="cn-0.6.4">问题修复</h3>

- 修复刚启动、账号抽屉还没展开过时页脚里的插件条目留在账户行旁边，隐藏条目现在每次同步都跑，只有镜像需要抽屉容器。
- 修复底栏统计弹层偶尔只剩一段，读取按面板自身的标记判定类型、等待拉长并在读失败时重试一次，缺的那段由一次补读补上，已经打开的卡片不会被一次失败的读取改小。
- 修复 0.1.7-rc.2 上工作区会话行的状态圈消失，圆圈现在也挂在空的槽位出口上，座位里带运行状态点时仍由状态点自己绘制。
- 修复账户抽屉收起时它的行与图标停在账户行上方，收起状态改用 `visibility` 隐藏并保留布局，展开时恢复可见。

<h3 id="en-0.6.4">Bug Fixes</h3>

- Fix the footer's plugin entries staying beside the account row after a fresh start until the drawer has been opened once, with the hiding now running on every sync and only the mirroring needing the drawer's container.
- Fix the stats card occasionally showing only one section, identifying each panel by its own marker, waiting longer and retrying once, and filling a missing section in through one late re-read so a card on screen only ever grows.
- Fix the workspace session rows' status circle disappearing on 0.1.7-rc.2, hanging the circle on the empty slot outlet as well while a seat carrying the running status dot keeps the dot's own paint.
- Fix the account drawer's rows and icons parked above the account row while it is closed, hiding them with `visibility` so the layout and the closing fade survive and restoring them when open.

Full Changelog: [v0.6.1...v0.6.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.1...v0.6.4)

## [0.6.1] - 2026-09-24

[中文](#cn-0.6.1) | [English](#en-0.6.1)

<h3 id="cn-0.6.1">新增功能</h3>

- 支持 DSH 0.1.7 内置自动审查（Auto review），分段控件与权限菜单增加审查模式，分段控件显示为 `Auto`、弹层与当前状态显示为 `Auto review`，原 `Auto`（完全权限）更名为 `Yolo`，审查档位只在宿主的 `permissionPresets` 目录携带 `auto` 时显示，目录读不到时整个权限控件交还宿主的访问模式按钮。
- 让已归档会话的删除按钮恢复可用，插件的宿主半边新增私有路由 `POST /dsh-claude-style/session-delete` 删除本机会话目录，只接受 POST 与同源请求，id 必须匹配宿主自身的会话 id 形状，正在打开的会话拒绝删除，目录解析后必须留在会话根目录内。

<h3 id="en-0.6.1">New Features</h3>

- Support DSH 0.1.7's built-in Auto review, adding review mode to the permission segmented control and popover as `Auto` in the segments and `Auto review` in the menu and current status, renaming the former `Auto` (Full access) segment `Yolo`, and showing the review tier only while the host's `permissionPresets` catalog carries `auto`, with the whole permission control handing the host's access-mode button back when the catalog cannot be read.
- Make the archived rows' delete button work again through the host half's new private route `POST /dsh-claude-style/session-delete`, which removes the local session directory, takes POST and same-origin requests only, requires the id to match the host's own session id shape, refuses an open session and keeps the resolved directory inside the sessions root.

Full Changelog: [v0.6.0...v0.6.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.6.0...v0.6.1)

## [0.6.0] - 2026-09-24

[中文](#cn-0.6.0) | [English](#en-0.6.0)

<h3 id="cn-0.6.0">问题修复</h3>

- 修复会话切换或卸载时移动 React 插槽节点带来的浏览器卡死与 DOM 异常，会话统计药丸与上下文计量器改为纯样式定位覆盖，节点保留在 React 虚拟树里的原生父子归属。
- 修复权限控件或会话统计出错时整个输入区样式被一并关闭，出错只关掉权限控件本身，交还宿主的访问模式按钮、统计弹窗与统计行，输入区其余样式照常。

### 移除

- 移除 0.1.5 及更早宿主的适配，偏好读写只走宿主官方的 `configForms` 表单，插件自建的 `/prefs` 路由删掉，最低宿主版本提高到 0.1.7。

### 其他变更

- 把输入区的布局工作收进独立的 composer 特性，推理强度滑块的点阵与账号行各自拆成独立碎片，重复的宿主查询与残留节点清理合并成共用函数，调度器不再点名具体特性。
- 让 smoke / probe / probe-timing / shoot 共用一套无头浏览器启动，浏览器配置目录改放 `.debug/`，调试端口由浏览器自选，`--cdp-port` 参数取消，probe 打开已有会话、跳过「新会话」。

<h3 id="en-0.6.0">Bug Fixes</h3>

- Fix browser freezes and DOM exceptions during session switching or unmounting, keeping the session stats pills and context meter in place through a CSS overlay so they hold their native parent-child place in the React virtual tree.
- Fix the whole composer restyle switching off when the permission control or the session stats fail, with a failure switching off only the permission control and handing the host's access-mode button, statistics dialogs and statistics row back.

### Removals

- Remove the adaptation for hosts 0.1.5 and earlier, with preference reads and writes going only through the host's `configForms` form, the plugin's own `/prefs` route dropped and the minimum host version raised to 0.1.7.

### Chores

- Move the composer's layout work into a composer feature of its own, the reasoning-effort slider's dot matrix and the account rows into fragments of their own and repeated host lookups and leftover-node sweeps into shared helpers, with the scheduler no longer naming individual features.
- Use one headless-browser launcher for smoke / probe / probe-timing / shoot, keeping the browser profile under `.debug/` and letting the browser pick its own debugging port, with the `--cdp-port` option gone and probe opening an existing session.

Full Changelog: [v0.5.3...v0.6.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.3...v0.6.0)

## [0.5.3] - 2026-09-23

[中文](#cn-0.5.3) | [English](#en-0.5.3)

<h3 id="cn-0.5.3">新增功能</h3>

- 把账号区改为在宿主账号弹层里追加插件自己的行，宿主自带的账号行就是入口，弹层里依次是账号头部、其它插件的页脚条目与宿主自己的设置 / 意见反馈 / 退出登录，宿主没有账号区的环境先由插件自建账号区再追加同样的行。

### 体验优化

- 让账号弹层用一套外观，卡片改用纯白背景、宽度与侧栏一致，并去掉底部的横向滚动条，宿主账号菜单套用插件的行、图标、分隔线与悬停底色。
- 在桌面 Windows 标题栏模式下让对话 / 轨迹控件居中常显，控件移到标题栏那一行，点击不再被标题栏的拖拽区域吞掉。

### 问题修复

- 修复关闭插件或关掉「折叠侧栏设置区」后桌面端自带的账号区没有还原，交出页脚时摘掉插件打在宿主账号行上的标记，宿主行恢复自带的外观与点击。
- 修复 Ctrl+, 无法打开设置，该组合键重新由插件接管。
- 修复收起侧栏后新会话按钮在顶栏出现横贯的悬停底色，收起状态交由宿主自己的图标控件承载，插件不再绘制悬停底色。

### 移除

- 移除设置行的 Ctrl+, 提示文案，设置行保留，点击仍可打开设置。

<h3 id="en-0.5.3">New Features</h3>

- Add the plugin's own rows into the host's account popover, with the host's own account row as the entry and the popover listing the account header, the other plugins' footer entries and the host's own Settings / Feedback / Sign out, and with the plugin building an account area first on a host that has none.

### Improvements

- Keep one look for the account popover, a pure white card spanning the sidebar's width with no horizontal scrollbar at its foot, and let the host's account menu take the plugin's row, icon, separator and hover treatment.
- Keep the Conversation / Trajectory control centred and visible in the desktop Windows titlebar row, where its clicks are no longer swallowed by the titlebar's drag region.

### Bug Fixes

- Fix the desktop's own account area not coming back after the plugin is disabled or "Collapse the sidebar settings area" is turned off, dropping the plugin's marker from the host's account row so it returns to its shipped look and click behavior.
- Fix Ctrl+, no longer opening settings, with the key combination handled by the plugin again.
- Fix a full-width hover plate on the New session button in the titlebar once the sidebar is collapsed, with the collapsed state carried by the host's own icon control and no hover plate painted by the plugin.

### Removals

- Remove the settings row's Ctrl+, hint text, keeping the row and its click to open settings.

Full Changelog: [v0.5.2...v0.5.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.2...v0.5.3)

## [0.5.2] - 2026-09-23

[中文](#cn-0.5.2) | [English](#en-0.5.2)

<h3 id="cn-0.5.2">新增功能</h3>

- 新增冒烟测试的 `desktop` 桌面端页脚用例，覆盖 0.1.7 桌面端页脚接管、抽屉镜像与账号资料首帧读取。

### 问题修复

- 修复切到插件页后档位触发器浮在页面上，座位消失时隐藏触发器并归还预留边距。
- 修复窗口宽度变化时档位触发器慢半拍，随 resize 与卡片尺寸变化和 CSS 同帧重定位。
- 修复按住滑块拖出卡片边界时卡片提前收起，悬停关闭改看物理按住，松开按键才收起。
- 修复模型名、档位与后续控件间距忽大忽小，统一到该行自身的 12px 节奏。
- 修复桌面端 Ctrl+, 弹出账号菜单而非设置，快捷键与抽屉设置行共用入口，改为驱动宿主菜单。
- 修复账号抽屉的登出图标跑到左上角，图标位自己作定位参照，按宿主尺寸绘制。
- 修复登录时账号资料请求被中止，等服务就绪并订阅账号状态流，只在首帧、登录与登出读取。
- 修复桌面端从抽屉打不开设置，设置行只认宿主设置按钮，桌面端让位给镜像的宿主设置行。
- 修复宿主账号行叠在皮肤账号行上，选择器穿过插槽锚点整行隐藏。

### 其他变更

- 把超限碎片拆开，调度器改由 `entry.js` 的 FEATURES 表统一安装与排序。

<h3 id="en-0.5.2">New Features</h3>

- Add a `desktop` footer smoke-test case covering the 0.1.7 desktop footer takeover, drawer mirroring and the first account-profile read.

### Bug Fixes

- Fix the effort trigger lingering on the plugins page, hiding it with its seat and giving the reserved margin back.
- Fix the effort trigger lagging on window resize, repositioning it in the same frame as CSS on resize and card-size changes.
- Fix the card closing while the slider is still held, tracking the physical press and closing only on release.
- Fix uneven spacing between the model, effort and later controls, unifying them on the row's own 12px rhythm.
- Fix Ctrl+, opening the account menu instead of settings on desktop, with the shortcut and the drawer row sharing one entry that drives the host menu.
- Fix the sign-out icon landing in the drawer's top-left corner, with the icon slot as its own positioning context drawn at the host's size.
- Fix the account profile request being aborted at sign-in, waiting for the service and subscribing to the account state stream so reads happen on the first frame, sign-in and sign-out only.
- Fix settings not opening from the drawer on desktop, with the settings row accepting only the host settings button and yielding to the mirrored host row.
- Fix the host account row stacking over the skin's row, reaching through the slot anchor and hiding the whole row.

### Chores

- Split the oversized fragments, and install and order the scheduler's passes from a FEATURES table in `entry.js`.

Full Changelog: [v0.5.1...v0.5.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.1...v0.5.2)

## [0.5.1] - 2026-09-23

[中文](#cn-0.5.1) | [English](#en-0.5.1)

<h3 id="cn-0.5.1">新增功能</h3>

- 新增冒烟测试 `npm run smoke`，零依赖检查宿主路由栅栏与浏览器半边的启动、空闲、teardown 不变量。
- 让账号行显示真实头像与昵称，桌面端登录后取官方资料，正圆头像与昵称以 60 秒轮询保持新鲜。
- 让账号抽屉接管宿主账号菜单，动态镜像宿主菜单条目并直连官方行为。

### 体验优化

- 把档位名换档改成交换动画，旧名向上模糊淡出、新名自下模糊淡入，拖动中也逐档滚动。
- 让档位两端文案随语境本地化，中文显示「更快 / 更强」，英文仍是 `Faster` / `Smarter`。
- 把最高档的点阵动画改为纯哈希粒子，羽流形状由逐块静态透明度承担。
- 让座位里模型与档位两枚触发器靠拢，名字与档位之间只剩 4px。
- 把推理等级拆成独立的触发器与弹层，新碎片 `effort-picker.js` 只向 `ui.model` 要座位、档位与提交。
- 让推条的圆角收小、按住放大 10%、档位点加阻尼。
- 把推理推条换成 Claude Desktop 同款，填充段加档位刻点加胶囊旋钮，最高档触发点阵动画。
- 把输入框底部阴影改为由座位自绘的横条与渐变，座位高度即横条高度。
- 把模型介绍文案整体校订一轮，修中英语义冲突与生硬措辞，统一单位与术语。

### 问题修复

- 修复 0.1.7 设置页选项能显示但存不进去，命名空间改从 `configForms` 已服务的名单挑选，失败回落自建路由。
- 修复斜杠命令 / @ 提及菜单打开时回车直接发送，皮肤不再拦截回车，交给宿主处理。
- 修复关掉插件或热重载后皮肤又画了回来，teardown 取消排队中的那一帧，之后的 `schedule()` 一律不生效。
- 修复一个特性出错导致整张皮半挂，teardown 最先注册，每个特性单独安装与同步、失败即退役。
- 修复调度器空闲时仍每帧跑 pass，账号行按需重建、排序只挪错位项，空闲时的 pass 降为 0。
- 修复非桌面端把「在应用中打开」菜单收进抽屉，改按账号标签匹配触发器。
- 修复「设置」行变成账号名并弹出账号菜单，只接受带 `aria-haspopup="dialog"` 的按钮。
- 修复图标型登出按钮没被排除，同时读 `aria-label` / `title` / 类名，并跳过宿主账号区。
- 修复设置存储误报不可用，读路径不再做可用性判定，仅写入失败才提示。
- 修复松开推条后旋钮弹回原档位再跳回，等待回声期间不跟随滞后快照，超时或换梯后恢复。
- 修复松手瞬间档位名连跳两下，footer 只换推条以外的节点，且先提交再只画一次。
- 修复拖动时滑块冲出终点线并与填充脱开，位移改用独立 `translate` 属性，填充右端改为直角。
- 修复点击两档之间可能让档位选择器崩溃，目录未 settle 期间不摘触发器也不关卡片。
- 修复点击滑槽其他位置时滑块瞬移，把按下与拖动拆成两个状态，按下时仍有过渡动画。

### 安全

- 把用户名、昵称、头像与插件条目一律以文本写入，不再拼进 HTML，头像改用真正的 `<img>`。
- 让设置与用户名路由先过宿主请求栅栏，并限制内容类型、体积与数组长度。

<h3 id="en-0.5.1">New Features</h3>

- Add the smoke test `npm run smoke`, a dependency-free check of the host route fence and the browser half's boot, idle and teardown invariants.
- Show the real avatar and nickname on the account row, reading the official profile after desktop sign-in and keeping the round avatar and nickname fresh by polling every 60s.
- Make the account drawer take over the host account menu, mirroring the host menu's entries and driving the official actions directly.

### Improvements

- Swap effort names on a change, blurring the old name upward and the new one in from below and scrolling step by step while dragging.
- Localize the effort end labels by context, showing 更快 / 更强 in Chinese and keeping `Faster` / `Smarter` in English.
- Make the apex dot animation pure hashed particles, with the plume shape carried by per-block static opacity.
- Move the model and effort triggers in the seat closer, leaving only 4px between the model name and the effort name.
- Split reasoning effort into its own trigger and popover, with the new `effort-picker.js` asking `ui.model` only for the seat, effort and commit.
- Improve the slider's feel with smaller corners, a 10% scale-up while held and damping around each step.
- Restyle the effort slider to match Claude Desktop, a fill, step ticks and a capsule knob with the apex step triggering the dot animation.
- Move the composer's bottom shadow to the seat's own bar and gradient, the seat height being the bar height.
- Give the model descriptions a full copy-editing pass, fixing CN/EN conflicts and awkward wording and unifying units and terms.

### Bug Fixes

- Fix settings showing but not saving on 0.1.7, picking the namespace from the namespaces `configForms` serves and falling back to the plugin route.
- Fix Enter sending half-typed text while the slash or @ menu is open, removing the skin's Enter interception so the host handles it.
- Fix the skin repainting itself after disable or hot reload, cancelling the queued frame in teardown so later `schedule()` calls no longer take effect.
- Fix one failing feature leaving the whole skin half-mounted, registering teardown first and installing and syncing each feature alone so a failure retires it.
- Fix the scheduler running a pass every frame while idle, rebuilding the account row only on change and moving only misplaced entries so idle passes drop to 0.
- Fix the "Open in app" menu being pulled into the drawer on non-desktop, matching triggers by the account label.
- Fix the settings row turning into the account name and opening the account menu, accepting only buttons with `aria-haspopup="dialog"`.
- Fix icon-only sign-out buttons not being excluded, reading `aria-label` / `title` / class names and skipping the host account area.
- Fix settings storage falsely reporting unavailable, with the read path no longer judging availability and only a failed write warning.
- Fix the knob snapping back to the old step after release, not following the lagging snapshot while waiting for the echo and resuming on echo, ladder change or timeout.
- Fix the effort name jumping twice on release, replacing only non-slider nodes in the footer and committing before a single paint.
- Fix the knob overshooting the track end and detaching from the fill while dragging, using the standalone `translate` property and a square right end on the fill.
- Fix clicking between two steps sometimes crashing the effort picker, neither removing the trigger nor closing the card while the catalog has not settled.
- Fix the knob teleporting when clicking elsewhere on the track, splitting press and drag into two states so a press still animates.

### Security

- Write usernames, nicknames, avatars and plugin entries as text with the avatar in a real `<img>`, so no value reaches the document as markup.
- Put the settings and username routes behind the host request fence, capping content type, body size and array length.

Full Changelog: [v0.5.0...v0.5.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.5.0...v0.5.1)

## [0.5.0] - 2026-09-22

[中文](#cn-0.5.0) | [English](#en-0.5.0)

<h3 id="cn-0.5.0">新增功能</h3>

- 插件页有了自己的图标，`package.json` 填陶烬橙星芒的相对路径，构建期复制到 `lib/`。
- 插件卡片有了本地化的标题与描述，`locale/*.json` 提供 `meta.title` 与描述，`exports` 用通配避免降级。
- 侧栏「工作区」改为进行中与已归档的分段控件，驱动宿主筛选并从树里读回选中态，归档行挂删除按钮。

### 体验优化

- 把推理等级改成一级弹层底部的推条，无极滑动、松手对齐最近档位，键盘可用，二级弹层只剩「更多模型」。
- 把 `model-picker.js` 拆成推条与文案解析两块，回到停止线内，二级档位状态一并删除。
- 让推条的滑槽与旋钮几乎等高，滑槽改为 14px 圆角槽，对齐 Claude 真机比例。
- 把弹层的悬停时间统一为停留 50ms 打开、离开 100ms 关闭，统计卡片仍 300ms 打开。
- 把「更多模型」二级弹层收口到底边、不重复供应商，没得列就整行去掉，不支持思考时不画推条。

### 问题修复

- 修掉真圆被画成鹅卵石，给六处真圆与滑槽补上 `corner-shape: round`。
- 修掉全屏面板下顶栏标签与后台任务数浮在面板之上，该行 `z-index` 降到 9。
- 修掉热重载后模型选择器失去点击效果，弹层节点在为空或已脱离文档时重建并重置渲染签名。
- 修掉热重链后宿主半边资产路由整代失联，路由改为无条件经 `ctx.inject(['webServer'])` 注册。
- 修掉推条拖动掉帧与不跟手，拖动位移并入每帧一次 rAF，并对同值写入加护栏。
- 修掉二级弹层悬停打开后不随指针移开收起，指针离开入口即收起。
- 修掉切换档位后模型选择器一段时间不可用，只在解析不出席位且无分组时才显示加载行。
- 修掉 composer 获焦时 `ui.heroMenu.close` 抛错，调用前补存在性护栏。
- 修掉 0.1.7 上上下文标记被落在第二层，新增 `mergeContextMeterIntoRow()` 归位到模型触发器右侧。
- 让 composer 底行的三种控件共用同一字体、13px、500 字重与 20px 行高。
- 让统计句盒子贴合文字，改用 `flex: 0 1 auto` 与自动外边距。
- 修掉 0.1.7 上设置静默失效，设置按宿主世代分流到官方表单或旧注册制。
- 修掉统计卡片内容缺块、关不掉与易误触发，只认真实点击，悬停需停留 300ms，并按世代清扫遗留卡片。
- 修掉软链安装下 schemastery 解析不到，改按 harness 自己的解析基准取 schemastery。
- 修掉 0.1.7 上输入框的「＋」失去皮肤样式与位置，标签列表补子串匹配，恢复 24px 与顺序。
- 让侧栏两行形状一致，统一度量、静止透明与 hover 铺底色，图标盒统一为 20px。
- 修掉侧栏两行图标 hover 转 90°，加 `transition: transform .25s` 让指针离开自动转回。

### 移除

- 移除模型行的厂商字体，字体资产、子集化脚本、令牌与 `@font-face` 一并删除。

<h3 id="en-0.5.0">New Features</h3>

- Add an icon for the plugins page, with `package.json` pointing at the clay starburst's relative path, copied into `lib/` at build time.
- Add localized title and description for the plugin card, with `locale/*.json` supplying `meta.title` and the description and `exports` using a wildcard to avoid a downgrade.
- Move the sidebar "Workspaces" title to an Active / Archived segmented control that drives the host filter and reads selection back from the tree, with a delete button on archived rows.

### Improvements

- Make reasoning effort a slider at the bottom of the first-level popover, sliding freely and snapping on release, keyboard-accessible, with the submenu holding only "More models".
- Split `model-picker.js` into a slider fragment and a copy-lookup fragment, returning it under the stop line, with the submenu effort state removed.
- Make the slider track and knob nearly the same height, turning the track into a 14px rounded groove that matches Claude's real proportions.
- Unify hover timing across popovers at 50ms dwell to open and 100ms to close, with the stats card keeping its 300ms open dwell.
- Tighten the "More models" submenu against the bottom edge, with no repeated providers, no empty row and no slider when the model lacks reasoning.

### Bug Fixes

- Fix circles rendering as pebbles by giving six true circles and the slider track `corner-shape: round`.
- Fix the header preset label and background-task count floating above a fullscreen panel by dropping that row's `z-index` to 9.
- Fix the model picker losing its click effect after hot reload by rebuilding popover nodes when null or detached and resetting the render signature.
- Fix host-side asset routes losing a whole generation after a hot re-chain by registering routes unconditionally through `ctx.inject(['webServer'])`.
- Fix the effort slider dropping frames and lagging while dragging by batching moves into one rAF per frame and guarding same-value writes.
- Fix the submenu staying open after the pointer moves away by closing it once the pointer leaves the entry.
- Fix the model picker being unusable for a while after an effort change by showing the loading row only when no seat and no groups can be resolved.
- Fix `ui.heroMenu.close` throwing on every composer focus with an existence guard before the call.
- Fix the context meter dropping to a second layer on 0.1.7 with a new `mergeContextMeterIntoRow()` returning it to the model trigger's right.
- Make the composer's bottom-row controls share one font at 13px / 500 / 20px line height.
- Make the stats sentence box shrink-wrap its text with `flex: 0 1 auto` and auto margins.
- Fix settings silently failing on 0.1.7 by splitting settings by host generation between the official form and the old registry.
- Fix the stats card missing content, refusing to close and misfiring by accepting only trusted clicks, requiring a 300ms dwell and sweeping stale cards per generation.
- Fix schemastery not resolving under a symlinked install by resolving it from the harness's own resolution base.
- Fix the composer "+" losing its skin styling and position on 0.1.7 with substring label matches restoring its 24px size and order.
- Make the sidebar's two rows match with shared metrics, transparent until hover and a uniform 20px icon box.
- Fix the sidebar rows' icons rotating 90° on hover with `transition: transform .25s` so they turn back on pointer leave.

### Removals

- Remove the model row's vendor font, deleting the font asset, subsetting script, token and `@font-face`.

Full Changelog: [v0.4.0...v0.5.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.4.0...v0.5.0)

## [0.4.0] - 2026-09-21

[中文](#cn-0.4.0) | [English](#en-0.4.0)

<h3 id="cn-0.4.0">新增功能</h3>

- 设置页新增快捷供应商多选弹层，勾选者的模型直接列进一级弹层，按供应商分组、组名领在分隔线前。
- 当前模型行让供应商由自己的分隔线承载，席位不在已列供应商时在列表末尾补一行，二级弹层高度随内容自适应。
- 设置页新增模型选择器开关（默认开），关掉后交回宿主自己的模型菜单，只影响弹层。
- 首页目录与预设弹层改用皮肤弹层样式，触发器展开时给卡片打标记并重绘。
- `docs/STYLE.md` 新增「多选一弹层」的卡片、行、分隔与页脚度量表及类名匹配纪律。
- hero 弹层改从触发器旁边弹出、底边对齐并向上生长，视口不够时翻到左侧，滚动缩放时重算。
- 首页弹层纳入自动弹出，悬停触发器即展开、移开即收起，与对话框重绘门控一致。
- 快捷供应商清单始终不列官方服务，残留的已下线供应商带「已移除」标记，取消勾选即从存储清除。
- `focusin` 落进对话卡片时关闭权限、模型、会话统计、账户抽屉、hero 菜单与快捷供应商弹层。

### 体验优化

- 一级弹层只滚动模型列表，分隔线与「推理程度 / 更多模型」钉在卡片底部，高度随内容自适应。
- 自动弹出分关闭 / 仅账号区 / 全部（默认全部）三档，旧布尔值读取时归一。
- 账户抽屉、会话统计与权限弹层改用规范的行高、圆角、间距、最小宽度与 `z-index`。

### 问题修复

- 修掉热重载重复渲染，账户区与模型席位改为 DOM 幂等，更新前清扫上一代同名节点。

### 其他变更

- 清理开发期痕迹，删除未调用的 `applyBrand`、未用参数与过时注释，行为无变化。

<h3 id="en-0.4.0">New Features</h3>

- Add a quick-provider multi-select popover to settings, listing the picked providers' models directly in the first-level popover, grouped with the provider name leading each divider.
- Give the current-model row its own divider per provider, appending a row at the end when the current seat is outside the listed providers, with the popover's height adapting to its content.
- Add a model picker toggle in settings (on by default) that hands the model menu back to the host when off, affecting only the popovers.
- Restyle the hero directory and preset popovers in the skin's popover language, marking the card when the trigger expands and redrawing.
- Add the card, row, divider and footer metrics plus the class-name matching rules for a "pick-one popover" to `docs/STYLE.md`.
- Place hero popovers beside their trigger, growing upward from a bottom-aligned edge, flipping left when the viewport is short and repositioning on scroll or zoom.
- Bring hero popovers under auto-popover, opening on trigger hover and closing on leave, gated like the composer restyle.
- Keep official services out of the quick-provider list and flag a leftover retired provider as removed until it is unchecked and cleared from storage.
- Close the permission, model, session stats, account drawer, hero menu and quick-provider popovers when a `focusin` lands inside the chat card.

### Improvements

- Scroll only the model list in the first-level popover, pinning the divider and "Reasoning effort / More models" to the card bottom, with the height adapting to its content.
- Give auto-popover three levels — Off, Account area only and All (the default) — normalizing old booleans on read.
- Align the account drawer, session stats and permission popover with the spec's row height, radius, spacing, min width and `z-index`.

### Bug Fixes

- Fix duplicate renders on hot reload by making the account area and model seat DOM-idempotent and sweeping the previous generation's nodes before updating.

### Chores

- Remove dev leftovers, deleting the unused `applyBrand`, an unused parameter and stale comments with no behavior change.

Full Changelog: [v0.3.2...v0.4.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.2...v0.4.0)

## [0.3.2] - 2026-09-21

[中文](#cn-0.3.2) | [English](#en-0.3.2)

<h3 id="cn-0.3.2">新增功能</h3>

- 让会话统计跟随自动弹出，与账户、模型、权限三个弹层同一套开关，关闭后悬停不再弹出。
- 更多模型弹层的列间距、分组间距与分组标题上边距各收到 4px。
- 没有规则命中的模型不画锁定标，未用到的品牌一并删除。
- 新增 `longcat` 品牌并补 `mimo` → `xiaomimimo` 规则，OpenCode 的 MiMo 与 LongCat 现在命中。
- vendoring 清掉本地资产里带 `fill` 的内联 style 并补 `currentColor`，OpenAI 标可见。
- 更多模型的行内边距收到 3px，同供应商模型按 id 升序排列。
- 修掉锁定标的 Meta 漂移与混元高光，补上 `hy-mt2` 解析与 Gemma / Nano Banana 两个品牌。
- 按 Lobe 的合成比例生成 `combine/<厂商>.svg`，图标与字标合为一件图形，自建字标与供应商图标删除。
- Claude 行改画 Claude 自己的字标，`anthropic` 仍作 `anthropic` 路由兜底。
- 新增 `gemma` 与 `nano-?banana` 两条家族规则，各用官网口径文案，不再掉到档位规则。
- 新增 Fable 与 Mythos 两款模型的官网定位句，不再掉到兜底文案。

### 问题修复

- 更新 DeepSeek 下线版本、Grok 4.5、文心 5.0 与 `kimi-for-coding` 的过时文案。
- 修掉插件加载即崩，清掉对已删除 `WORDMARK_SVGS` 的加载期引用，并补一条加载校验脚本。
- 让锁定标的占位显示出来，把根的绘制属性重新包一层 `<g>`，并去掉会变提示的 `<title>`。
- 修掉当前模型行丢供应商，格式定为 `模型 (供应商)`，描述只在第一级显示，一级那行补上描述。
- 修掉冷启动后选择器空等，会话一解析出来就预热模型目录，把等待挪进启动过程。
- 修掉 Grok 行显示 xAI 标识，把 `brands.models` 改指 Grok 自己的标记，provider 分组标题仍用 xAI。
- 修掉当前模型行显示 id 串，改用与其他行同一套外显名与厂商标记逻辑，无名字才退回 id。

### 其他变更

- 抽出 `model-brand.js`，把品牌判定整块搬进新碎片，`model-picker.js` 回落到停止线以内。
- 字标扫描改预置数组，加载时构建词表，并新增 `scripts/probe-timing.cjs` 分项计时。
- 重写模型简介，19 条精确条目与 54 条家族规则逐条按官网改写，家族文案不写最高级与版本数字。
- 文案改按线映射，DeepSeek 删除旧版精确条目，改为 Flash / Pro / 其余三条线级文案。
- 去掉档位前缀，不再用「旗舰档：」等自家定位话术，改用厂商自己的定位句。
- 描述不再重复模型名，共 50 条去掉「X 系列：」式开头。
- 规格条目补用途，10 条只剩参数与价格的条目按「面向…的…」形状并回官网用途句。

<h3 id="en-0.3.2">New Features</h3>

- Bring session stats under auto-popover to match the account, model and permission popovers, so hover no longer opens it with the setting off.
- Tighten the more-models popover to 4px for column, group and group-title spacing.
- Draw no lockup for a model with no matching rule and drop unused brands.
- Add a `longcat` brand and a `mimo` → `xiaomimimo` rule so OpenCode's MiMo and LongCat resolve.
- Make the OpenAI mark visible by stripping inline `fill` styles from local assets during vendoring and adding `currentColor`.
- Order more-models rows with 3px padding and each provider's models sorted by id.
- Fix Meta drift and the Hunyuan highlight in lockups and add `hy-mt2` lookup plus the Gemma and Nano Banana brands.
- Generate `combine/<vendor>.svg` from Lobe's own ratios, merging icon and wordmark, with hand-built wordmarks and provider icons gone.
- Draw Claude's own wordmark on the Claude row, keeping `anthropic` as the fallback for the `anthropic` route.
- Add `gemma` and `nano-?banana` family rules using each vendor's official wording instead of falling through to tier rules.
- Add Fable and Mythos entries using each model's official positioning line instead of the generic fallback.

### Bug Fixes

- Update stale copy for retired DeepSeek versions, Grok 4.5, ERNIE 5.0 and `kimi-for-coding`.
- Fix the plugin crashing on load by clearing the load-time reference to the removed `WORDMARK_SVGS` and adding a load-check script.
- Make lockups show by re-wrapping root paint attributes in a `<g>` and dropping the tooltip-making `<title>`.
- Fix the current-model row losing its provider by labelling it `model (provider)`, showing descriptions only at the first level and adding one to that row.
- Fix the model picker waiting after a cold start by warming the catalog as soon as a session resolves and folding the wait into startup.
- Fix the Grok row showing xAI's mark by pointing `brands.models` at Grok's own while provider group headers still use xAI.
- Fix the current-model row showing an id string by using the same display-name and brand logic as other rows and falling back to the id only when unnamed.

### Chores

- Extract `model-brand.js`, moving the whole brand-resolution block into a new fragment and bringing `model-picker.js` back under the stop line.
- Prebuild the wordmark scan into an array, building the word list at load time, and add `scripts/probe-timing.cjs` for per-stage timings.
- Rewrite model blurbs from vendor sites, matching 19 exact entries and 54 family rules to official pages with no superlatives or version numbers in family copy.
- Map copy by line, replacing DeepSeek's old exact entries with Flash, Pro and a shared line-level blurb.
- Remove tier prefixes, dropping "flagship tier:" framing in favour of vendor positioning.
- Stop blurbs repeating the model name, dropping the "X series:" prefix from 50 entries.
- Give spec-only blurbs a purpose, leading the 10 entries that had only specs with the official use case.

Full Changelog: [v0.3.1...v0.3.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.1...v0.3.2)

## [0.3.1] - 2026-09-21

[中文](#cn-0.3.1) | [English](#en-0.3.1)

<h3 id="cn-0.3.1">新增功能</h3>

- 新增最低运行时的声明，`package.json` 写入最低宿主版本，仓库根新增 `screenshots.json` 供商店取图。
- Gemini 行改用 Google Sans Flex，子集随包分发，家族名改为 `Google Sans Flex Picker`，按 `data-brand` 挂载。

### 问题修复

- 修掉贴图时 hint 发黑跑位，给 hero 兜底节点补上宿主的定位与墨色，hint 回到输入框首行。
- 修掉聚焦底纹盖住输入框，底纹从 rail 移到卡片，与 hero 卡片同一位置。
- 修掉封号彩蛋语言选不动，`banLocale` 走浏览器本地兜底，宿主不认该键时先本地保存渲染，待其重启后补写。

### 其他变更

- 亮暗切换先色后样，翻转瞬间抑制过渡并取消进行中的绘制动画，约 0.3s 后恢复。
- composer 形态改由 JS 写 `data-composer-variant`、CSS 直接读的属性，降低流式重算开销。
- 设置页 Tab 图标用 CSS 蒙版把通用齿轮换成 Claude 星芒，亮暗各自取色。
- 亮色背景层级调优为一级 `#FCFCFB`、二级 `#FBFBF9`、三级 `#F9F9F6`，设置面板与画布同色。
- 清理临时调试日志与历史规划文档，移除残留编号与重复注释，精简 README。

<h3 id="en-0.3.1">New Features</h3>

- Declare the minimum runtime with a new minimum host version in `package.json` and a root `screenshots.json` feeding store screenshots.
- Set the Gemini row in Google Sans Flex, shipping a subset with the package under the family name `Google Sans Flex Picker`, mounted by `data-brand`.

### Bug Fixes

- Fix the hint turning dark and escaping the box on image-only drafts by giving the hero fallback node the host's positioning and ink, returning the hint to the first line.
- Fix the focus underlay painting over the inline input by moving the underlay from the rail to the card, matching the hero card.
- Fix the ban-page language refusing to change by falling back to `localStorage` for `banLocale`, rendering locally and writing back once the host half restarts.

### Chores

- Flip theme colour before style, suppressing transitions and cancelling running paint animations during the flip and restoring after about 0.3s.
- Write the composer variant as a `data-composer-variant` attribute from JS for CSS to read, cutting restyle cost during streaming.
- Swap the settings tab's generic gear for Claude's starburst with a CSS mask, coloured per theme.
- Tune the light-theme layer tones to `#FCFCFB`, `#FBFBF9` and `#F9F9F6`, with the settings panel matching the canvas.
- Remove temporary debug logs and old planning docs along with stale numbering and duplicated comments, and trim the README.

Full Changelog: [v0.3.0...v0.3.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.3.0...v0.3.1)

## [0.3.0] - 2026-09-20

[中文](#cn-0.3.0) | [English](#en-0.3.0)

<h3 id="cn-0.3.0">新增功能</h3>

- 账户弹层顶部用户名横条可点开完整复刻的 Claude 封号页，全为明确退出动作，品牌偏好同样生效。
- 新增封号彩蛋语言设置，可选中/英（默认英文），改动立刻重建页面并切换时间戳制式。

### 问题修复

- 让引用块恢复中性灰文字、灰底灰条，块内链接与代码各自保持材质。
- 让文件引用改用链接色与同款下划线，代码片本身不动。
- 删掉全局表格覆盖，首末单元格恢复内边距，窄表不再被拉满。

### 其他变更

- 把封号页的锁按参考图墨迹逐锚点描摹成三条贝塞尔曲线路径，映射到 24 单位格。
- 把 `banSvg` 的粗细改为形参只发一条属性，让覆盖不再静默失效。
- 让点击展开的弹层不再即关，改由点击别处或移出整个底栏关闭，悬停展开保持原逻辑。
- 把账号横线改为账号行的兄弟节点，hover 底板只覆盖账号名那行。
- 让封号页内容列水平居中，页头整体下移 30px。
- 让行内代码片自带 `line-height: 1.2`，行盒收到 18px，上下不再虚胖。

<h3 id="en-0.3.0">New Features</h3>

- Open a full replica of Claude's account-hold page from the username strip at the top of the account popover, with explicit exits and the brand preference honoured.
- Add a ban-page language setting with Chinese or English (default English) that rebuilds the open page and switches its timestamp format on change.

### Bug Fixes

- Return blockquotes to neutral grey text, background and bar, leaving inner links and code with their own material.
- Give file mentions the link colour and underline, leaving the code chip unchanged.
- Remove the global table overrides so first and last cells regain padding and narrow tables are no longer stretched.

### Chores

- Redraw the ban-page lock as three Bézier paths traced anchor by anchor from the reference ink and mapped to the 24-unit grid.
- Emit `banSvg`'s stroke width as one parameter attribute so the override no longer silently fails.
- Close a click-opened popover on an outside click or on leaving the footer, keeping the old hover delay.
- Make the account divider a sibling of the account row so the hover surface covers only the name.
- Centre the ban page's content column and drop its header 30px.
- Give inline code chips `line-height: 1.2` and an 18px line box, removing the extra vertical padding.

Full Changelog: [v0.2.7...v0.3.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.7...v0.3.0)

## [0.2.7] - 2026-09-20

[中文](#cn-0.2.7) | [English](#en-0.2.7)

<h3 id="cn-0.2.7">新增功能</h3>

- 模型行显示所属厂商标识，由 `brands.providers` / `brands.models` 驱动，构建期校验。

### 其他变更

- 非官方选中模型在官方与更多模型之间单独一行显示，触发器去掉箭头。
- 引用块共用链接蓝文字与下划线，底纹与竖条取淡色。
- 文本选区在聚焦时蓝底白字、失焦时灰底黑字，由 `selection.js` 镜像焦点态。
- 接入 cc-switch 的 107 个供应商图标并新增宿主路由，选择器优先使用它们、缺失回退 Lobe。
- 供应商标签滚动时被下一个 section 推上去。
- 移除附件轨 focus 时的 1px 内圈阴影，消除图片区与文字区的分界。
- 更多模型子弹层提高弹层高度，供应商标签改为 sticky 顶部条。
- provider 分组标题改为黑底白字的圆角矩形，暗色反相。
- 删掉模型触发器 trailing 下的额外 hover 规则，只留一层背景。
- 标题的 SERIF 栈移除 CJK 衬线回退，西文仍用 Anthropic Serif。
- 把两个宿主统计弹层合并为一个自定义弹层，上下两区块各 2×2 网格。
- 统计弹层改为 hover 打开，控件仅在指针位于对话窗口内时显示，统计行居中。
- 会话与 token 统计并成一条居中紧凑文本，隐藏宿主图标与标签。

<h3 id="en-0.2.7">New Features</h3>

- Show each model row's vendor mark, driven by `brands.providers` / `brands.models` and validated at build time.

### Chores

- Show a non-official selected model on its own row between official and more models and drop the trigger's arrow.
- Give blockquotes the link blue and underline with a tinted background and bar.
- Render text selection in two solid states — blue on white when focused and grey on black when blurred — mirrored by `selection.js`.
- Wire in 107 cc-switch provider icons with a new host route, preferred over Lobe with a fallback when missing.
- Push each provider label up as the next section scrolls into it.
- Remove the 1px focus inset shadow on the attachment rail, erasing the divider between the image and text areas.
- Raise the more-models submenu's height and turn provider labels into sticky headers.
- Turn provider group headers into rounded black-on-white blocks, inverted in dark mode.
- Drop the extra hover rule under the model trigger's trailing area, leaving one background.
- Drop the CJK serif fallback from the heading SERIF stack while Latin keeps Anthropic Serif.
- Merge the host's two stats popovers into one custom popover with two 2×2 blocks.
- Open the stats popover on hover, showing controls only while the pointer is inside the chat window and centring the stats row.
- Merge session and token stats into one centred compact line, hiding the host's icons and labels.

Full Changelog: [v0.2.6...v0.2.7](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.6...v0.2.7)

## [0.2.6] - 2026-09-20

[中文](#cn-0.2.6) | [English](#en-0.2.6)

<h3 id="cn-0.2.6">新增功能</h3>

- 宿主半边新增 `/dsh-claude-style/fonts/*` 字体路由，把 JetBrains Mono 以 `@font-face` 注册为 webfont，缺失时改用系统字体栈。
- 把两个 Anthropic 字体文件放进插件的 `fonts/`，即以 webfont 提供，缺失时返回 404 并回退。

### 其他变更

- 行内代码与代码块字号减 1px，边框移到外层容器，表格字号与圆角上调，与 Claude 对齐。
- 设置页新增自定义用户名输入框，输入停顿后自动保存，宿主未重载时在本地兜底。
- 链接下划线静止时 60%、悬停时 100% 并加粗到 1.5px，行内代码改用 JetBrains Mono，与 Claude 对齐。
- 代码块改用随插件分发的 JetBrains Mono Variable 含 Italic，保留 SIL OFL。
- 权限弹层在悬停分段按钮时打开，移入弹层取消关闭，移出延迟关闭，`autoPopover` 关闭时仍可点击打开。

<h3 id="en-0.2.6">New Features</h3>

- Add a host `/dsh-claude-style/fonts/*` route and register JetBrains Mono with `@font-face`, falling back to the system stack when absent.
- Serve the two Anthropic font files as webfonts once they are dropped into the plugin's `fonts/`, falling back on a 404.

### Chores

- Shrink inline code and code blocks by 1px, move borders to the outer container and raise table size and radius to match Claude.
- Add a custom-username field to settings that autosaves after a pause, with a local fallback until the host half reloads.
- Thin link underlines sit at 60% and reach 100% on hover at 1.5px, and inline code moves to JetBrains Mono to match Claude.
- Move code blocks to the JetBrains Mono Variable shipped with the plugin, italics included, under SIL OFL.
- Open the permission popover when the pointer hovers a segment, cancel closing on entering it, delay closing on leaving it, and keep clicking working with `autoPopover` off.

Full Changelog: [v0.2.5...v0.2.6](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.5...v0.2.6)

## [0.2.5] - 2026-09-20

[中文](#cn-0.2.5) | [English](#en-0.2.5)

<h3 id="cn-0.2.5">新增功能</h3>

- 模型文案改由宿主按请求读取的数据文件提供，浏览器半边按需缓存。
- 为榜单上未收录的模型线补写家族规则，未收录的仍回退目录文本。

### 体验优化

- 模型文案按 shell locale 取语言，每行只渲染一条，切换语言即时重绘。

### 问题修复

- 修复模型文案的两处误判，锚定激活参数与稠密规则，并补上 `north`、`gpt-oss` 规则。
- 修复塌缩态底栏插件控件压住 Claude 标，塌缩时隐藏设置区内的按钮与触发器行。
- 修复塌缩态账户弹层被侧栏容器裁掉，弹层改 `position: fixed`，坐标由脚本解析。
- 修复设置页文字整页消失，折叠拆开，设置区不再继承零字号，文本恢复自然行高。

### 其他变更

- 把 `overrides`、`context` 与 CSS 拆成独立文件，调度器改走 `ui` 句柄。

<h3 id="en-0.2.5">New Features</h3>

- Serve model copy from a data file the host reads per request, with on-demand caching in the browser half.
- Add family rules for model lines the leaderboard has not listed, still falling back to catalog text for unknown lines.

### Improvements

- Pick the model copy's language from the shell locale, render one line per row and redraw at once on a switch.

### Bug Fixes

- Fix two model-copy misreads by anchoring the active-parameter and dense rules and adding `north` / `gpt-oss` rules.
- Fix a collapsed-sidebar plugin control covering the Claude mark by hiding the settings-area buttons and trigger row while collapsed.
- Fix the collapsed-sidebar account popover being clipped by the sidebar container by taking `position: fixed` with script-resolved coordinates.
- Fix the whole settings page's text disappearing by splitting the collapse so the settings area no longer inherits zero font size.

### Chores

- Split `overrides`, `context` and CSS into separate files, with the scheduler using the `ui` handle.

Full Changelog: [v0.2.4...v0.2.5](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.4...v0.2.5)

## [0.2.4] - 2026-09-19

[中文](#cn-0.2.4) | [English](#en-0.2.4)

<h3 id="cn-0.2.4">体验优化</h3>

- 深色输入框的焦点描边与晕边改用亮象牙，聚焦时明显亮起。
- 权限弹层的行间距由 2px 加宽到 6px，预设说明不再糊成整块。
- 两组会话统计 pill 移入输入框工具栏、居中排列，输入区由三行压为两行。
- 统计 pill 平时隐藏但保留占位，指针移入对话窗口时淡入。
- 以负外边距闭合附件轨与输入框之间的间隙，卡片总高不变。
- 底部输入区仅在对话页签激活时显示，宿主底部留白随之归零。
- 模型选择触发器只留模型名，弹层一级直列官方模型、二级旁侧展开，悬停即开。

### 问题修复

- 修复权限切换在 dsh 0.2+ 上完全失效，当前会话改从 `uiSession` 主视图读取，兼容裸值投影。
- 修复亮色用户消息气泡发蓝，气泡底色改用皮肤的悬停灰，深色保持不变。
- 修复模型选择弹层永远停在「正在加载模型…」，改走 `modelDir.store` 读写快照，并补上 rejection 处理。
- 修复深色强调色回到陶烬橙，深色盘限定到 `[data-ds-dark-theme]`，不再被宿主蓝色盖掉。

<h3 id="en-0.2.4">Improvements</h3>

- Brighten the dark-mode input focus with bright ivory on the outline and halo.
- Widen the permissions popover's row spacing from 2px to 6px so the preset descriptions no longer blur together.
- Move both session-stat pills into the composer toolbar, centered, cutting the composer to two rows.
- Keep the stats pills hidden with their space reserved and fade them in when the pointer enters the conversation.
- Close the gap between the attachment rail and the input with a negative margin, leaving the card height unchanged.
- Show the composer only on the active conversation tab, which removes the host's reserved bottom space.
- Leave only the model name on the picker trigger, list official models on the first level and open the second beside it on hover.

### Bug Fixes

- Fix permission switching failing entirely on dsh 0.2+ by reading the current session from the `uiSession` main view and tolerating bare-value projections.
- Fix the light-mode user bubble reading blue by using the skin's hover grey, with dark mode unchanged.
- Fix the model popover staying on "Loading models…" by reading and writing snapshots through `modelDir.store` and handling rejections.
- Fix the dark accent returning to clay orange by scoping the dark palette to `[data-ds-dark-theme]` so the host's blue no longer wins.

Full Changelog: [v0.2.3...v0.2.4](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.3...v0.2.4)

## [0.2.3] - 2026-09-19

[中文](#cn-0.2.3) | [English](#en-0.2.3)

<h3 id="cn-0.2.3">问题修复</h3>

- 修复账户抽屉弹层在刷新时 hover 与点击失效，弹层打开期间镜像内容保持静止，点击目标在点击瞬间解析。

<h3 id="en-0.2.3">Bug Fixes</h3>

- Fix the account drawer popover losing hover and click on a refresh by keeping the mirrored content still while it is open and resolving click targets at click time.

Full Changelog: [v0.2.2...v0.2.3](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.2...v0.2.3)

## [0.2.2] - 2026-09-19

[中文](#cn-0.2.2) | [English](#en-0.2.2)

<h3 id="cn-0.2.2">新增功能</h3>

- 对话内的输入框压为一条单行卡片，随内容增高，权限、附件与模型选择合并到下方同一行。
- 输入框获得焦点时描边转为中性色细线，外扩 1px 同色晕边并加深投影。
- 首页欢迎语按本地时间轮换，跨过整点时每 60 秒刷新。
- 模型思考状态收录 Claude Code 的 185 种思考动词，扫光改为陶土橙与蜜桃暖色。
- 工作区运行中的侧栏加载动画改为 Windows 11 Fluent 风格的圆形圆弧旋转。
- 设置页新增 Claude Style 分区，在 Claude 与 Anthropic 两套品牌标识间切换并本地保存。

### 问题修复

- 修复对话内输入框的多处布局问题，现在吸附底部、随内容增高，附件区不再出现双层边框。
- 修复上下文用量弹层被误压缩，弹层不再被挤扁，排版恢复正常。
- 修复账户抽屉的多项问题，非按钮控件与富控件条目正常收纳，图标、顺序与点击位置对齐。
- 修复 `dsh-agy-link` 的 run_code 工具卡片排版异常，卡片头部与代码预览恢复正常。

### 其他变更

- 源码拆到 `src/`，`lib/client.js` 改为构建产物，并新增无头回归探针。
- 把三个 Anthropic 字体文件放进 `fonts/`，随 Git 分发但不随 npm 包分发。

<h3 id="en-0.2.2">New Features</h3>

- Compress the in-conversation composer into a single-line card that grows with content, with permissions, attachments and the model picker merged onto one row below.
- Turn the composer outline into a neutral hairline on focus, with a 1px same-color halo and a deeper shadow.
- Rotate the home greeting with local time and refresh it every 60 seconds across an hour boundary.
- Include Claude Code's 185 thinking verbs and turn the sweep clay-orange and peach.
- Turn the sidebar loading animation for a running session into a Windows 11 Fluent-style circular arc spinner.
- Add a Claude Style section to settings that switches between the Claude and Anthropic marks and saves the choice locally.

### Bug Fixes

- Fix several composer layout issues so it sticks to the bottom, grows with content and loses the double border in the attachment area.
- Fix the context-usage popover being wrongly compressed so it lays out correctly again.
- Fix several account drawer issues so non-button and rich controls are collected properly and icons, order and click targets line up.
- Fix the broken `dsh-agy-link` run_code tool card layout so the card header and code preview render correctly.

### Chores

- Move the source into `src/`, make `lib/client.js` a build artifact and add a headless regression probe.
- Provide three Anthropic font files in `fonts/` that ship with Git but not with the npm package.

Full Changelog: [v0.2.1...v0.2.2](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.1...v0.2.2)

## [0.2.1] - 2026-09-19

[中文](#cn-0.2.1) | [English](#en-0.2.1)

<h3 id="cn-0.2.1">新增功能</h3>

- 账户抽屉支持悬停展开与延迟关闭，移入弹层不打断浏览。

### 体验优化

- 权限控制器的首段由 Plan 改名为 Read，与它映射的只读预设名称一致。
- 新会话按钮改为与会话行同高的窄条，左对齐加号图标并常驻悬停底色。
- 会话行标题默认为次级灰，悬停或选中时回到主文字色。
- 账户底栏改为全宽分割线布局，分割线贯通侧栏。

### 问题修复

- 修复 LICENSE 版权署名缺失与 README 中无效的 patch 配置示例，补齐署名并修正示例。

<h3 id="en-0.2.1">New Features</h3>

- Support hover opening and delayed closing for the account drawer, so moving into the popover does not interrupt browsing.

### Improvements

- Rename the permissions control's first segment from Plan to Read so it matches the read-only preset it maps to.
- Make the new-session button a narrow bar matching the session-row height, with a left-aligned plus icon and a persistent hover fill.
- Default session row titles to secondary grey and return them to the primary text color on hover or selection.
- Make the account footer a full-width divider layout whose divider spans the sidebar.

### Bug Fixes

- Fix the missing LICENSE attribution and the invalid patch sample in the README by adding the attribution and correcting the sample.

Full Changelog: [v0.2.0...v0.2.1](https://github.com/Nwflower/dsh-claude-style/compare/v0.2.0...v0.2.1)

## [0.2.0] - 2026-09-19

[中文](#cn-0.2.0) | [English](#en-0.2.0)

<h3 id="cn-0.2.0">新增功能</h3>

- 从配色皮肤升级为完整的 Claude Code Desktop 视觉与交互复刻主题。
- 新增 Plan / Edit / Auto 行内三段式权限控制器，支持快捷切换会话权限。
- 在侧栏底部集成账户按钮与弹出菜单，可打开设置与管理插件。
- 新增专属问候语、输入框引导文案与品牌星芒标识。

### 体验优化

- 亮色画布取 `#FCFCFB`，侧栏取 `#FBFBF9`。

### 其他变更

- 项目重命名为 `dsh-claude-style`，与上游 `claude-style-skin` 区分。

<h3 id="en-0.2.0">New Features</h3>

- Upgrade the color skin into a full Claude Code Desktop visual and interaction replica theme.
- Add a Plan / Edit / Auto inline three-segment permission control for quick session permission switching.
- Integrate an account button and popup menu at the sidebar bottom that open settings and plugin management.
- Add dedicated greetings, composer placeholder copy and the brand star mark.

### Improvements

- Use `#FCFCFB` for the light canvas and `#FBFBF9` for the sidebar.

### Chores

- Rename the project to `dsh-claude-style` to distinguish it from the upstream `claude-style-skin`.

Full Changelog: [v0.1.0...v0.2.0](https://github.com/Nwflower/dsh-claude-style/compare/v0.1.0...v0.2.0)

## [0.1.0] - 2026-08-22

[中文](#cn-0.1.0) | [English](#en-0.1.0)

<h3 id="cn-0.1.0">新增功能</h3>

- 初始版本，提供暖调象牙白与暖黑双画布以及陶烬橙强调色。

<h3 id="en-0.1.0">New Features</h3>

- Ship the initial release with warm ivory and warm black dual canvas and a clay-orange accent.
