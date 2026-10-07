# D19. 宿主契约与构建编号

- **状态**：已实施
- **分组**：宿主边界
- **关联**：D3、D43、D44

## 决定

- 下面这些契约的字面写在 `src/contracts/dom.ts`，条目在 `src/contracts/table.ts`（D44）；契约测试按这份表逐条核对真实宿主（D45 的端到端环境搭好之前由冒烟检查的替代宿主页面复现）。
- 插槽定位点：宿主渲染器保证每个插槽外面有 `[data-slot="<key>"]` 包装层（ui-renderer 的 scoped-slots），供外部定位。例如访问模式按钮按 `[data-slot="conversation.input.permission"]` 查找，跳过插件自己插进去的按钮。
- 控件标记：输入框按宿主 InputBar 的结构给按钮打 `data-dsh-claude-control`——`commands`（工具行里唯一打开 listbox 的按钮）、`stop` / `send`（提交区的主按钮，按图标区分：停止画 rect，提交箭头画 path；排队与插话是同一个提交按钮换了文字）、`access`（权限插槽里的按钮）。样式写成 `button[data-dsh-claude-control="…"]`。
- 弹层角色随开合写撤：宿主把文档里每个 `[role="menu"]`（ui-primitives 的 `modalSelector`，与 `[role="dialog"][aria-modal="true"]` 同列）当作占据前景的菜单，快捷键派发、`closeTopModal`、Esc-Esc 停止序列与 dock 标签菜单都按它判定。皮肤为量宽高而常驻 `<body>` 的弹层卡片关闭时只是视觉上藏起来，所以 `role="menu"` 经 `setMenuPopoverOpen`（`src/shared/popover.ts`）与 `data-open` 同写同撤，卡片开着才持有这个角色；`quickProviders` 的卡片本就开时挂载、关时摘除，不经过它。
- 构建编号：构建取产物内容的哈希写成 `BUILD_ID`，运行时写到 `<body data-dsh-claude-style>` 的值上；页面跑的是哪一版以它为准。热重载替换插件代码而不重新加载页面，页面的加载时间说明不了代码版本。

## 理由

- 界面文字与哈希类名随语言、版本变化，结构与契约更稳定。
- 关闭的卡片若持有 `role="menu"`，宿主会把整套快捷键判给一个看不见的菜单。

## 代价

- 结构判断依赖宿主 InputBar 的现状，宿主改版时需要核对。
- 宿主按 `modalSelector` 判定快捷键这一侧，测试只查皮肤自己的不变量：关闭的弹层卡片不持有 `role="menu"`。

## 重审条件

- 宿主给这些控件提供自己的 `data-*` 标记时，直接读宿主的标记。
