# D28. 桌面标题带只在一处读取

- **状态**：已实施
- **分组**：宿主边界
- **关联**：D25

## 决定

- `packages/client/src/core/desktop-band.ts` 的 `desktopBand()` 是皮肤读取桌面标题带的唯一入口，一次回答三个问题：横带在不在、多高、窗口控件占哪一端，返回 `{ platform, height, controls: { side, size } }`，没有横带时返回 `null`。
- 判据全部取宿主的契约：标记用 `data-windows-titlebar` 与 `data-platform="darwin"`；高度用 `--dsh-frame-top-clearance`（两个平台都写；Windows 上它是 `--dsh-windows-titlebar-height` 的别名，经计算样式解开）；Windows 的控件宽度以 Window Controls Overlay API 为准、取不到时回落到 140px；macOS 的控件在左端、宽度取宿主 leading seat 的起点 88px。
- macOS 全屏时窗口控件收起，答 `null`；`data-fullscreen` 不参与 Windows 的分支。

## 理由

- 判据写在每个读者里，两个平台的三处分歧就要在每一处重复一遍。

## 代价

- 每次调用多一次 `getComputedStyle`；`--dsh-frame-top-clearance` 缺席时回落到模块内的常数（macOS 48px、Windows 40px）。

## 重审条件

- 宿主给出统一的标题带插槽或平台无关的度量接口时改读宿主的接口。
