<div align="center">

# DSH Claude Style

**为 DeepSeek Harness Web 复刻 Claude Code Desktop 风格与交互体验的主题插件。**

> **在 DSH 里，就是 Claude Code Desktop 的样子。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md) [![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

[![version](https://img.shields.io/npm/v/dsh-claude-style?style=flat&label=version&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![downloads](https://img.shields.io/npm/dm/dsh-claude-style?style=flat&label=downloads&color=D97757)](https://www.npmjs.com/package/dsh-claude-style)
[![GitHub stars](https://img.shields.io/github/stars/Nwflower/dsh-claude-style?style=flat&label=%E2%98%85&color=08C)](https://github.com/Nwflower/dsh-claude-style)
[![dsh.so install](https://www.dsh.so/badge/install/dsh-claude-style.svg)](https://www.dsh.so/artifact/dsh-claude-style/)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## 预览

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/light.png" alt="亮色画布 —— 暖调象牙" /></td>
    <td align="center" width="50%"><img src="./docs/dark.png" alt="暗色画布 —— 暖调黑" /></td>
  </tr>
</table>

> 亮色：象牙白画布 `#FCFCFB` 与浅色侧栏 `#FBFBF9`；暗色：暖黑 `#141413`。主题遵循系统亮暗模式切换，陶烬橙 `#D97757` 是两套画布唯一的操作强调色。

## 字体

> **重要：Anthropic 字体不随 npm 包分发，仅在仓库 [`fonts/`](fonts/) 供下载**——既可以直接安装到系统，也可以免安装：把两个 `.ttf` 放进插件包的 `fonts/` 目录，宿主会以同样的 webfont 方式提供它们（两种方式的字体文件完全一致，效果相同）。生效均需刷新 / 重启 web。

| 字体 | 用途 | 文件 |
|---|---|---|
| Anthropic Sans Web Text | 界面 / UI | [`fonts/AnthropicSansWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/AnthropicSansWebText.ttf) |
| Anthropic Serif Web Text | 对话正文 / Markdown | [`fonts/AnthropicSerifWebText.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/AnthropicSerifWebText.ttf) |
| JetBrains Mono Variable | 代码 / 代码块 | [`fonts/JetBrainsMonoVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/JetBrainsMonoVariable.ttf)、[`fonts/JetBrainsMonoItalicVariable.ttf`](https://github.com/Nwflower/dsh-claude-style/raw/main/fonts/JetBrainsMonoItalicVariable.ttf) |

Anthropic 字体启用（二选一）：

① 安装到系统——Windows 双击 `.ttf` → 「安装」，macOS 用「字体册」导入；

② 免安装——把 `.ttf` 复制到插件包的 `fonts/` 目录。完成后刷新页面生效。

> Anthropic Sans/Serif 字体版权归 Anthropic 所有，仅供个人使用，不适用 MIT 许可。

## 安装

> 需要 dsh ≥ 0.1.7

1. 通过终端安装

```bash
dsh plugin --profile web add dsh-claude-style                  # npm 包（推荐）
dsh plugin --profile web add Nwflower/dsh-claude-style         # GitHub 源
```

2. 通过[插件市场](https://github.com/dsh-market/dsh-market)安装

同一时刻建议只启用一个主题。安装后**重启 `dsh web`** 并刷新页面即生效。

## 特点

1. **主题** —— 安装即全局生效，无需配置。亮色象牙白 `#FCFCFB`、暗色暖黑 `#141413`，两套画布共用同一个操作强调色陶烬橙 `#D97757`；亮暗跟随系统颜色模式切换。
2. **输入框** —— 输入框整块重做：权限分段控件（只读 / 编辑 / 自动 / Yolo）与它下方的档位列表、带品牌锁定标的模型触发器、工具栏与状态统计同一行排版，发送键与停止键统一成 7px 圆角。统计句与模型触发器共用一套字号与颜色。权限档位取自宿主的权限目录：宿主配置了哪几档就画哪几档，第三方插件注册的档位（例如 auto mode 插件的 `auto-mode`）会自动出现在列表里并占用「自动」那一格；列表保持纯文字，档位自己声明的图标不画。
3. **模型选择器** —— 全新的两级弹层：一级列官方服务与设置页勾选的快捷供应商，「更多模型」二级按供应商分组；每行带厂商锁定标与说明文案，底部是推理等级推条（无极滑动，松手对齐最近档位）与「更多模型」入口。二级底边与一级对齐，一级已显示的供应商不再重复；模型不支持思考时不画推条。悬停停留 100ms 打开、离开 150ms 关闭，两卡之间的空隙不算离开。
4. **工作区** —— 侧栏「工作区」标题改成 **进行中 / 已归档** 分段控件：进行中沿用宿主的会话树，已归档是皮肤自己的平铺列表（标题、时间、每行「取消归档」与「删除」两个图标按钮）。行排版与宿主的会话行逐项一致（行 x=12 / 宽 251 / 高 28 / 标题起点 x=36）。
5. **侧栏** —— 新会话与插件两行取 Claude 真机形状：默认无底色、hover 才有底色，新会话的「＋」套一枚圆形底，两行图标 hover 顺时针转 90°（四重对称图形，转回原位）；底部账户抽屉、封号彩蛋一并保留。
6. **账号区** —— 昵称与头像各走一条固定顺序。昵称：自定义昵称 → 官方账号昵称 → HDSL 启动器昵称 → 上次探测到的系统用户名 → 本次探测到的系统用户名 → `User`；头像：官方账号头像 → HDSL 启动器头像 → Claude 徽标。官方账号资料只在启动、热重载、登录与登出时向服务器读取，不轮询；HDSL 契约由宿主半边读一次后经两条只读路由转发（`GET /dsh-claude-style/hdsl` 回账号元数据、`GET /dsh-claude-style/hdsl-skin.png` 回头像图片，都不含头像文件的绝对路径，并过宿主的请求栅栏），契约版本读不到或不认识时整组忽略，头像文件被删除时回落到徽标。启动器给的是皮肤贴图而不是成品头像，因此账号位置的头像由贴图裁出：脸部 8×8 贴图块按盒子 1/18 内缩、帽子层铺满整盒，方形绘制不被圆角裁切。账号弹层沿用宿主自带的那一个：宿主的账号行就是入口，弹层里依次是账号头部、其它插件的页脚条目与宿主自己的「设置 / 意见反馈 / 退出登录」，各行的文案、顺序与点击行为保持宿主原样；宿主没有账号区的环境（Web）由插件自建同样外观的弹层。弹层卡片为纯白背景、宽度与侧栏一致。
7. **对话视图** —— 对话 / 轨迹控件在桌面 Windows 标题栏模式下居中常显在标题栏那一行（与新会话按钮同一行）；宽窗口且标题较短时它停在标题那一行，否则留在标题下方自己那一行。
8. **首页版面** —— 新会话页有两套版面，默认是工作台，在设置页随时切换：**经典**是居中大标题加输入卡片，标题按时段从一组问候里抽一句（早上、午间、下午、晚上、深夜各有几句，另有几句不分时段），每次回到新会话页换一句；**工作台**把标题移到左上并固定为一句「What's up next, 用户名？」，输入框改用对话内的单行样式贴住窗口底部、上方一行细边框上下文胶囊，标题与一块 480px 窄栏用量面板贴着输入框左缘排布：概览页签是六个数字格（会话数、消息数、Token 总量、活跃天数、高峰时段、最常用模型）与 26 周按天热力图（等分列方格），模型页签是每天一根按模型颜色堆叠的柱子加一份模型排行（色块、模型名、输入与输出、占比，超过六行折成「再显示 N 个」，展开后可「收起」），右上角的「全部 / 30 天 / 7 天」切换统计范围（高峰时段与趣味行一并跟随）；所选范围内的用量超过一本书时，热力图下方出现倍数趣味行，书目共十一本（《动物农场》到《追忆似水年华》），每次回到新会话页随机换一本。数据由插件的宿主半边汇总：装了 `dsh-cost-meter` 时直接读它的账本缓存（只读，不写对方文件），没有时读本机会话日志自己算，并按日志的文件大小与修改时间增量缓存；两种来源都按模型给出四类 token、按天给出各模型的 token，同一模型经不同提供方的用量合成一行；账本不记小时，高峰时段始终由本机会话日志按天算出；汇总不可用时面板改用宿主会话列表每行自带的投影值。数字没到之前面板先画骨架，位置在填充前后不变。
9. **像素螃蟹** —— 工作台版面的新会话页上，输入卡片上沿、靠右的位置站着 Claude Code 的像素螃蟹（经典版面没有）。点它一下、或指针从它身上移开时（页面开着时也会每隔二三十秒自己来一次），它会照 Claude Code 的样子钓一次鱼：半转身眨眼，举起鱼竿甩到卡片边上，侧身钓一会儿，再收竿转回正面，前后约三秒。系统要求减少动态效果时（例如 Windows 关掉了「在 Windows 中显示动画」），它只在被点击时才动。

## 停用与卸载

不停用安装、先暂停主题 —— 在 profile 的 `cordis.patch.yml`（`~/.dsh/profiles/web/cordis.patch.yml`）中加入：

```yaml
- id: ui-skin-claude-style
  disabled: true
```

保存后约 1 秒内热生效，刷新页面即回到原生外观。

```bash
dsh plugin --profile web remove dsh-claude-style   # 卸载
```

然后重启 `dsh web`；若曾在 `cordis.patch.yml` 手工添加过本主题的条目，一并删除。

## 文档

| 文档 | 说明 |
| --- | --- |
| [设计令牌](docs/STYLE.md) | 调色板、字体、形状，源码结构与宿主选择器纪律（英文） |
| [架构决策](docs/architecture.md) | 单文件拼接、单一调度器、特性契约、账号表面等决策与权衡 |
| [更新日志](CHANGELOG.md) | 版本历史 |
| [贡献指南](CONTRIBUTING.md) | 如何从 `src/` 构建、提交规范与截图/回归工具（英文） |

## 友链

> 同时启用多个主题？推荐 [dsh-skin-manager](https://github.com/xiaoyangcheng84-svg/dsh-skin-manager)，在其设置页一键切换所有已安装主题。

> 想把 Claude Code / Codex 等外部代理的会话历史导入 DSH 接着聊？推荐作者的另一个插件 [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Nwflower/dsh-claude-style&type=Date)](https://star-history.com/#Nwflower/dsh-claude-style&Date)
