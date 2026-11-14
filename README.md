<div align="center">

# DSH Claude Style

**为 DeepSeek Harness 复刻 Claude Code Desktop 风格与交互体验的主题插件。**

> **你的下一个 Claude Code Desktop ，何必是Claude Code。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md)
[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)
[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)

</div>

## 预览

Claude 与 DeepSeek 品牌在插件设置里切换，亮暗跟随系统。外观设置提供 Claude、DeepSeek、羊皮纸、森林、暮色、蔷薇六套配色预设，可编辑预设，也可新建、复制、重命名与删除多套配色方案。

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude 档编程首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude 档编程首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> 编程首页（上），对话界面（下）；浅色在左，深色在右。

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek 档编程首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek 档编程首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> 输入框上沿站着宠物小鲸鱼 Deepy，八个状态：

<table>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="空闲" /><br />空闲</td>
    <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="思考" /><br />思考</td>
    <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="写回答、调用工具" /><br />写回答、调用工具</td>
    <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="指挥子代理" /><br />指挥子代理</td>
  </tr>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="等你操作" /><br />等你操作</td>
    <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="失败" /><br />失败</td>
    <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="完成" /><br />完成</td>
    <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="睡着" /><br />睡着</td>
  </tr>
</table>
## 安装

官方插件页添加这个包名，或从终端安装：

```
dsh-claude-style
```

```bash
dsh plugin --profile web add dsh-claude-style                    # npm 包（推荐）
dsh plugin --profile web add Nwflower/dsh-claude-style#dist      # GitHub 发布分支
```

也可从[插件市场](https://github.com/dsh-market/dsh-market)或 dsh-web-all 的皮肤中心安装。同一时刻只启用一个主题；

需要 dsh ≥ 0.2.2-rc.1，装好后重启 DeepSeek Harness。

## 声明式外观配置

插件配置中的 `paletteSchemes` 和 `brandingPresets` 同时接受嵌套 YAML 对象与既有 JSON 字符串记录。下面的片段只展示插件字段，不是完整的 Harness 配置：

```yaml
palette: claude
paletteColors: company-ocean
paletteSchemes:
  - id: company-ocean
    name: Company Ocean
    base: deepseek
    accent: "#2855d9"
    background:
      light: "#f7f9ff"
      dark: "#111827"
    code:
      light: "#173f99"
      dark: "#b8ceff"

brandingPreset: company-primary
brandingPresets:
  - id: company-primary
    name: Company Primary
    mark:
      light: "./branding/primary-mark-light.svg"
      dark: "./branding/primary-mark-dark.svg"
    wordmark: "./branding/primary-wordmark.svg"

modelOrder: custom
modelOrderRows:
  - deepseek-official/deepseek-v4.1-pro
  - sensenova/sensenova-6.8-flash
```

- 配色记录沿用现有种子模型，支持 `accent`、`background`、`text`、`code`、`link` 和 `edges`。内置预设及“跟随品牌”继续可用。
- 标志预设包含稳定的 `id`、可选的 `name`、以及 `mark` / `wordmark`。图片写成单个字符串时两种外观共用；写成 `light` / `dark` 对时按当前外观选择，缺少的一侧回退到另一侧。
- 相对图片路径以 `$DSH_HOME/dsh-claude-style/` 为根目录，只能引用该目录内的 PNG、SVG 或 WebP 文件，单张不超过 2 MB。UI 上传使用 `branding/presets/<id>/` 下的托管资源；切换预设不需要再次上传。
- 外观设置可以新建、复制、重命名、选择和删除标志预设，也可分别替换明暗图片。`brandingPreset` 留空时继续使用此前的全局上传图片，配色与标志选择互不影响。
- UI 修改通过插件的 `appearance-overlays.json` 持久化，按 `id` 与基础 YAML 合并。UI 创建或修改的记录及选择覆盖优先；文件后来新增的记录继续并入，UI 删除的基础记录不会因重载恢复。手动修改配置并重载后，未冲突的记录以文件为准，发生冲突的字段以最近一次 UI 修改为准。
- 无法解析的记录会被报告并跳过，其余记录继续生效。缺失或无效图片只影响对应图片，不会移除其它预设或使设置页失效。
- `modelOrder` 可取 `id`、`brand`、`catalog`、`custom`。`brand` 把可识别品牌排在前面，未识别行不显示副标题；`custom` 按 `modelOrderRows` 中的 `provider/model` 顺序排列，未列出的模型按标识排在后面。

## 字体

> Anthropic 没有公开发行这三款字体；本仓库只提供下载与研究的[副本](https://github.com/Nwflower/dsh-claude-style/tree/master/packages/assets/src/fonts/anthropic)。


启用时二选一：装进系统，或把 `.ttf` 复制到 `$DSH_HOME/dsh-claude-style/fonts/`（刷新页面后生效）。

## 文档

| 文档 | 说明 |
| --- | --- |
| [设计令牌](docs/STYLE.md) | 配色、字体、形状、动效与层级 |
| [架构决策](docs/adr/README.md) | 每条方向一页：背景、决定、后果与重审条件 |
| [更新日志](docs/CHANGELOG.md) | 版本历史 |
| [贡献指南](CONTRIBUTING.md) | 修复优先的贡献流程与变更记录格式 |

## 许可

除特别说明，本仓库以 MIT 授权。

钠（Sodium）渲染引擎以 [PolyForm Shield 1.0.0](packages/client/src/features/sodium/LICENSE) 授权。

## 鸣谢

- 「钠 / Sodium」取名致敬 Minecraft 的 [Sodium](https://github.com/CaffeineMC/sodium) 渲染优化模组，本插件与它无关。
- 消息导航参考 SherUnlocked-4869 的 [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav)（MIT）。
- Deepy 和鲸鱼娘的动画帧图来自 calmly-eating-bugs（[@wp3171216237](https://github.com/wp3171216237)）绘制的主题包。
- 聊天区的增强动效改自 [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux)（MIT）。
- Clawd是 Anthropic 的角色形象。本插件是非官方爱好者作品，与 Anthropic 没有关联。

## 友链

> 想把 Claude Code / Codex 等外部代理的会话历史导入 DSH 接着聊？推荐作者的另一个插件 [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
