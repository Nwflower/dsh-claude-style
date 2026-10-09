# 架构决策

本文件由 `npm run docs:index` 从各决策文件生成，勿手改。

决策每条一个文件，模板与维护规则见 [D48](D48-documentation.md)。编号是稳定标识，代码注释按编号引用；被推翻的编号作废、不复用。

状态为「待实施」的决策写着现状：迁移完成之前，以现状为准修改代码。

## 构建与源码

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [D4](D4-composer-gate.md) | 输入框样式的构建期门控 | 已实施 |
| [D5](D5-model-copy.md) | 模型文案是数据，不进产物 | 已实施 |
| [D9](D9-style-performance.md) | 样式性能：结构判断写成属性，`:has()` 只放在最后一段 | 已实施 |
| [D36](D36-modules-and-bundling.md) | TypeScript 与 ES 模块，esbuild 打出单文件产物 | 已实施 |
| [D38](D38-assets.md) | 资源只有一条路径：内容哈希清单与通用资产路由 | 已实施 |
| [D39](D39-on-demand-loading.md) | 按需加载：首屏用不到的功能拆成单独的块 | 已实施 |
| [D46](D46-monorepo.md) | monorepo 布局，对外仍是一个插件 | 已实施 |
| [D47](D47-build-output.md) | 构建产物不进主分支，发布分支提供 git 安装 | 部分实施 |
| [D51](D51-css-toolchain.md) | CSS 工具链：语法树上的检查与一份令牌数据 | 已实施 |

## 宿主边界

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [D3](D3-host-selectors.md) | 宿主选择器纪律 | 已实施 |
| [D10](D10-settings-transport.md) | 设置传输只走官方 Config 表单 | 已实施 |
| [D11](D11-private-routes.md) | 私有路由借宿主的请求栅栏；外来字符串只以文本上屏 | 已实施 |
| [D19](D19-host-contracts.md) | 宿主契约与构建编号 | 已实施 |
| [D28](D28-desktop-band.md) | 桌面标题带只在一处读取 | 已实施 |
| [D30](D30-palette-and-typeface.md) | 配色与字体可以交给宿主 | 已实施 |
| [D31](D31-windows-titlebar.md) | Windows 桌面顶栏透明，各列延伸到窗口顶端 | 已实施 |
| [D33](D33-stylesheet-ownership.md) | 皮肤样式表带上本包自己的归属标记，兄弟包的样式表不认领 | 已实施 |
| [D43](D43-overlay-and-upstream.md) | 覆盖层定位与等待扩展点 | 已实施 |
| [D44](D44-contract-module.md) | 宿主契约模块与契约测试 | 已实施 |

## 运行时

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [D12](D12-fail-fast.md) | 快速失败与功能隔离 | 已实施 |
| [D26](D26-motion-preference.md) | 动画效果偏好：一处解析，两处读同一个值 | 已实施 |
| [D29](D29-feature-switches.md) | 功能开关：每个功能声明开关或不设开关的理由 | 已实施 |
| [D35](D35-selection-scope.md) | 选区样式的作用范围 | 已实施 |
| [D40](D40-observation-bus.md) | 观察总线与帧管线 | 已实施 |
| [D41](D41-scroll-owner.md) | 聊天区的滚动位置只有一个写入者 | 已实施 |
| [D42](D42-feature-manifest.md) | 功能清单 | 已实施 |
| [D53](D53-usage-merge.md) | 用量两个来源按日期合并 | 已实施 |

## 功能

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [D14](D14-account-surface.md) | 账号表面：一套行模型，两个挂载点 | 已实施 |
| [D15](D15-hdsl-contract.md) | HDSL 账号契约：宿主半边转发，浏览器半边只认一条回退顺序 | 已实施 |
| [D16](D16-popover-baseline.md) | 弹层基准：一套外壳、一个停留时长、一次只开一张 | 已实施 |
| [D17](D17-permission-presets.md) | 权限档位以宿主目录为准，皮肤只做表现层 | 已实施 |
| [D20](D20-sliding-pill.md) | 分段控件共用滑动高亮 | 已实施 |
| [D21](D21-archived-list.md) | 已归档列表跟随宿主的两份客户端数据 | 已实施 |
| [D22](D22-search-panel.md) | 搜索面板：宿主的 Modal、宿主的数据与导航 | 已实施 |
| [D23](D23-turn-status.md) | 轮次状态行：宿主的控件、宿主的数据 | 已实施 |
| [D24](D24-mascot.md) | 吉祥物：宿主的状态、一套播放器、两个角色 | 已实施 |
| [D25](D25-ban-screen-titlebar.md) | 封号彩蛋页在桌面端骑在系统标题栏那一行上 | 已实施 |
| [D27](D27-context-stats.md) | 会话数字收进上下文弹层 | 已实施 |
| [D32](D32-chat-interactions.md) | 搬来的聊天区交互：自己的前缀、自己的偏好、对上游让位 | 已实施 |
| [D34](D34-turn-navigator.md) | 对话导航：皮肤画导航条，跳转按宿主自己的刻度 | 已实施 |
| [D49](D49-visual-yield.md) | 让路：皮肤占用页面时收掉整套视觉，留下设置页 | 已实施 |
| [D50](D50-brand.md) | 品牌两档：配色切换只靠令牌 | 已实施 |
| [D52](D52-header-band.md) | 会话标题与顶栏控件抬进桌面端标题栏，放不下就留在原行 | 已实施 |
| [D54](D54-peakrate-meter.md) | 峰谷电表：作息表是数据源的快照，判定在浏览器按真实时刻做 | 已实施 |
| [D57](D57-reader-view.md) | 重绘档是插件自己的会话视图 | 部分实施 |

## 分发与流程

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| [D7](D7-one-package.md) | 行为层与皮肤对外是一个插件 | 已实施 |
| [D45](D45-testing.md) | 三层测试与持续集成 | 已实施 |
| [D48](D48-documentation.md) | 文档流程 | 已实施 |

## 作废的编号

D1（由 D36 取代）、D2（由 D43 取代）、D6（由 D40 取代）、D8（由 D46 取代）、D13（由 D42 取代）、D18（由 D46 取代）、D37（由 D51 取代）、D55（由 D57 取代）、D56（由 D57 取代）。
