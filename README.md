<div align="center">

# DSH Claude Style

**为 DeepSeek Harness 复刻 Claude Code Desktop 风格与交互体验的主题插件。**

> **在 DSH 里，就是 Claude Code Desktop 的样子。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md) [![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)
[![dsh.so install](https://www.dsh.so/badge/install/dsh-claude-style.svg)](https://www.dsh.so/artifact/dsh-claude-style/)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## 预览

本插件提供了两种主题。通过插件设置，可以在 Claude 与 DeepSeek 两套配色之间切换，亮暗跟随系统颜色模式。

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> Claude品牌主题，原汁原味。工作台首页（上），对话界面（下），浅色（左），深色（右）

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> DeepSeek品牌主题，拥有特色宠物小鲸鱼Deepy。工作台首页（上），对话界面（下），浅色（左），深色（右）
>
> <table>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="空闲" /><br />空闲</td>
>     <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="思考" /><br />思考</td>
>     <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="写回答、调用工具" /><br />写回答、调用工具</td>
>     <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="指挥子代理" /><br />指挥子代理</td>
>   </tr>
>   <tr>
>     <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="等你操作" /><br />等你操作</td>
>     <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="失败" /><br />失败</td>
>     <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="完成" /><br />完成</td>
>     <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="睡着" /><br />睡着</td>
>   </tr>
> </table>

## 安装

1. 官方插件页，添加以下插件即可快速安装

```
dsh-claude-style
```

2. 通过终端安装

```bash
dsh plugin --profile web add dsh-claude-style                  # npm 包（推荐）
```

3. 通过[插件市场](https://github.com/dsh-market/dsh-market)安装

同一时刻建议只启用一个主题。安装后推荐重启 `DeepSeek Harness`以获得完整能力。

## 功能与设置

本插件的功能与设置说明都在文档里：[功能一览](docs/FEATURES.md)、[设置说明](docs/SETTINGS.md)。

## 字体

> 本插件使用的字体如下。
>
> Anthropic Sans/Serif 字体版权归 Anthropic 所有，仅供个人使用，不适用 MIT 许可。
>
> **重要：Anthropic 字体不随 npm 包分发，仅在仓库 [`packages/assets/src/fonts/anthropic/`](packages/assets/src/fonts/anthropic/) 供下载**。

| 字体 | 用途 | 文件 |
|---|---|---|
| Anthropic Sans Web Text | 界面 / UI | [`packages/assets/src/fonts/anthropic/AnthropicSansWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/anthropic/AnthropicSansWebText.ttf) |
| Anthropic Serif Web Text | 对话正文 / Markdown | [`packages/assets/src/fonts/anthropic/AnthropicSerifWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/anthropic/AnthropicSerifWebText.ttf) |
| JetBrains Mono Variable | 代码 / 代码块 | [`packages/assets/src/fonts/JetBrainsMonoVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/JetBrainsMonoVariable.ttf)、[`packages/assets/src/fonts/JetBrainsMonoItalicVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/JetBrainsMonoItalicVariable.ttf) |
| Inter | 没有 Anthropic Sans 时的界面字体 | [`packages/assets/src/fonts/InterVariable.woff2`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/InterVariable.woff2) |
| Noto Serif | 没有 Anthropic Serif 时的正文字体 | [`packages/assets/src/fonts/NotoSerifVariable.woff2`](https://github.com/Nwflower/dsh-claude-style/raw/main/packages/assets/src/fonts/NotoSerifVariable.woff2) |

JetBrains Mono、Inter 与 Noto Serif 采用 SIL Open Font License 1.1，随 npm 包分发，无需任何操作。Inter 与 Noto Serif 的字高、字宽与两款 Anthropic 字体几乎一致，没有启用 Anthropic 字体时由它们代替，界面与正文的排版不会因此变样；两者只含 Anthropic 字体覆盖的拉丁字符，中文照旧使用系统中文字体。

Anthropic 字体启用（二选一）：

① 安装到系统——Windows 双击 `.ttf` → 「安装」，macOS 用「字体册」导入；

② 免安装——把 `.ttf` 复制到 `$DSH_HOME/dsh-claude-style/fonts/`（没有设置 `DSH_HOME` 时是 `~/.dsh/dsh-claude-style/fonts/`）。完成后刷新页面生效。

## 皮肤中心交接

在 DSH 皮肤中心里，这套主题同时以**皮肤**的身份出现。选它即把整页交给本插件；换选别的皮肤或官方默认时，
页面在不需要刷新的情况下交还回来。

- 判定从第一帧就成立：皮肤中心把 `html[data-dsh-skin]` 注入服务端 HTML，因此带着皮肤启动的页面不会先闪过
  一帧本主题。
- 别的皮肤在画时，本主题不挂样式表、不安装任何功能、不占用任何文档属性；皮肤离开时立刻接管，皮肤回来
  时再次让出，页面启动之后才选的皮肤也一样。
- 壁纸插件不算另一个属主：壁纸在渲染时本主题照常工作，见[设置说明](docs/SETTINGS.md)里的「与其他主题插件同时使用」。
- 交接期间设置页与所有偏好都还在：别的皮肤占屏不等于卸载，关掉皮肤中心也不丢这里配过的东西。
- `body` 上的 `data-dsh-claude-style-handoff` 标记支持交接的构建；皮肤中心只在这一属性存在时才提供该选项。

## 文档

| 文档 | 说明 |
| --- | --- |
| [设计令牌](docs/STYLE.md) | 调色板、字体、形状，源码结构与宿主选择器纪律（英文） |
| [架构决策](docs/decisions/README.md) | 每条决策一个文件：构建与源码、宿主边界、运行时与各个功能的取舍，以及正在进行的架构迁移 |
| [更新日志](CHANGELOG.md) | 版本历史 |
| [贡献指南](CONTRIBUTING.md) | 如何从 `packages/client/src/` 构建、提交规范与截图/回归工具（英文） |

## 鸣谢

对话导航的展开列表、快捷键跳转与落点横线参考了 SherUnlocked-4869 的 [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav)（MIT）。

像素小鲸鱼 Deepy 的动画帧图来自 calmly-eating-bugs（[@wp3171216237](https://github.com/wp3171216237)）绘制的 Deepy 小鲸鱼主题包。

像素螃蟹（Clawd）是 Anthropic 的角色形象，相关权利归 Anthropic 所有。螃蟹掏出电脑敲代码的动画取自 Claude Code，其余各个状态的动画由本项目按这一形象绘制。螃蟹的帧图不适用 MIT 许可（见 [LICENSE](LICENSE)）。本插件是非官方的爱好者作品，与 Anthropic 没有关联，也未获其认可。

## 友链

> 想把 Claude Code / Codex 等外部代理的会话历史导入 DSH 接着聊？推荐作者的另一个插件 [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
