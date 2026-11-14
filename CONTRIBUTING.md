# 贡献指南

感谢你帮助改进 `dsh-claude-style`！

## 修复问题

本插件面向使用编程 Agent的用户。因此，我们非常推荐使用PR而非issue提出改进。遇到缺陷、性能问题或需要改进的交互体验时，请让 Agent 复现并定位问题，然后提交包含修复的 PR。这些改进优先通过 PR 贡献。

PR 应说明问题症状、定位到的原因和修改如何解决，并列出运行过的检查及其结果。性能改进附相同场景下修改前后的测量数据；测量方法见[性能排查](docs/DEBUGGING.md)。

如果暂时无法完成修复，请让 Agent 调查问题后提交 issue。调查结论应包括：

- 复现步骤、预期行为和实际行为。
- 问题出现时的主题（亮色 / 暗色）和视口大小。
- DSH 版本、安装来源和皮肤的构建编号；构建编号的读取方法见[临时实例](docs/DEBUGGING.md#临时实例)。
- 已定位的原因，或现有证据最支持的推断，以及相关源文件、日志和跟踪记录。
- 尝试过的修复或实验及其结果；性能问题附测量数据或性能跟踪记录。
- 已有的修改方案、预期产生的行为和发现的取舍。

不需要附截图或录屏。

## 讨论较大改动

新功能、新设置或布局重构先提交说明理由的 issue，得到答复后再开始编写代码。目标明确且范围局部的交互体验改进可以直接提交 PR。

## 开始修改

开发依赖、构建、真实页面验证和测试入口见 [AGENTS.md 的命令表](AGENTS.md#commands) 与[性能排查](docs/DEBUGGING.md)；测试范围和云端判定见[测试分层](docs/adr/D92-testing-evidence-and-selection.md)。代码结构、跨模块约束、外观规则和方向决策分别见[架构](docs/ARCHITECTURE.md)、[设计令牌](docs/STYLE.md)和[架构决策索引](docs/adr/README.md)。提交格式见 [Git 与发布约定](AGENTS.md#git-and-release)。

改动初具形态后创建草稿 PR，CI 会运行完整矩阵；具体通道见 [CI 工作流](.github/workflows/ci.yml)。

提交到 Sodium 渲染引擎（`packages/client/src/features/sodium/`、`packages/engine/src/sheet-rewrite.ts`）的代码采用 PolyForm Shield License 1.0.0 授权；仓库其余部分仍采用 MIT 授权。

## 描述改动

读者能够观察到的行为改动，在 `docs/changes/` 下新增一个 `<slug>.json`：

```json
{
  "at": "2026-11-14",
  "group": "fixes",
  "order": 0,
  "external": true,
  "zh": "修复……",
  "en": "Fix ..."
}
```

`group` 可取 `new`、`improvements`、`fixes`、`security`、`removals` 或 `chores`；`order` 是从 0 开始的整数。`zh` 和 `en` 各写一行，行内不写冒号。`external` 在外部贡献时为 `true`，维护者提交时为 `false`。格式由 `npm run changelog:check` 校验，完整字段定义见[变更记录校验脚本](scripts/release/changelog.mjs)。

待发布的改动不要手动写入 `docs/CHANGELOG.md`。两份 README 的修改规则见[改动流程](AGENTS.md#change-workflow)；功能说明写入 `docs/changes/`，由发布说明读取。
