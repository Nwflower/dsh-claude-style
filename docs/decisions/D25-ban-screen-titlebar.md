# D25. 封号彩蛋页在桌面端骑在系统标题栏那一行上

- **状态**：已实施
- **关联**：D28

## 决定

- 两个桌面平台都把窗口最上面一条交给系统层，彩蛋页不画自己的最小化 / 还原 / 关闭，顶栏骑在这条横带上：`ban-screen.ts` 打开时问一次 `desktopBand()`（D28），把横带高度与窗口控件占用的宽度写成 `--dsh-ban-caption-height` / `--dsh-ban-caption-controls`，把控件所在的一端写成 `data-dsh-ban-controls`，并给浮层打 `data-dsh-ban-titlebar`；样式表据此把字标与「退出登录」排进这一行，并在控件那一端让出宽度（Windows 在右，macOS 在左）。
- Windows 的横带跟着页面走：浮层打开期间把页面的 `--dsh-ban-canvas` 写到 `<body>` 的 `--dsw-specific-sidebar-fill` 上（桌面壳的探针读这个令牌，`<body>` 的 style 一变就重画横带），关闭时撤掉。只在 Windows 调用：macOS 的横带是系统的半透明材质，页面写不到。
- 这一行是窗口的拖拽区，浮层盖住了宿主自己的拖拽区，所以顶栏声明 `-webkit-app-region: drag`，只有「退出登录」写 `no-drag`。
- 这页始终画 Claude 自己的星芒加字标，与品牌偏好无关。

## 理由

- 桌面端的系统标题栏是原生层，页面既盖不住也画不上；把这一行接过来，整窗浮层才像一整个窗口。

## 代价

- 依赖 `data-windows-titlebar` 与 `data-platform="darwin"`、`--dsh-frame-top-clearance`、Windows 的 `--dsw-specific-sidebar-fill` 探针与 Window Controls Overlay API 的现状；桌面壳不再量这些时横带保持主题色，页面顶端的字标会被横带盖住。

## 重审条件

- 宿主或桌面壳给出整窗浮层的插槽，或允许浮层隐藏标题栏时，改用那个。
