# D108. 特性自己的生成样式表随特性挂载

## 背景

主样式表是一张：构建把主题表、各特性的样式表与生成表按 rank 拼成一份文本，入口挂一次，页面上从此只有这一张皮肤表。关掉一个特性只卸载它的脚本与观察器，它的规则仍留在主表里，继续参与每一次样式重算。

逐字淡入的步进规则是生成表（`scripts/build/feature-sheets.mjs` 的 `reveal-steps`），只服务 `chatReveal` 一个特性；若留在主表里，读者关闭逐字淡入后仍要为这组规则支付样式重算开销。

## 决定

- 特性清单的 `stylesheets` 可以给生成表标 `scope: 'feature'`（packages/client/src/core/feature.ts 的 `FeatureStylesheetGenerated`）。
- 构建把这类表从主表里分出来，按生成器名装进 `FEATURE_STYLESHEETS`（scripts/build/css.mjs 的 `buildStylesheet`，scripts/build/build.mjs 的生成模块）。
- 特性自己挂载与撤下这张表：features/chat-reveal/chat-reveal.ts 在引擎创建时 `mountStylesheet(REVEAL_STYLE_ID, FEATURE_STYLESHEETS['reveal-steps'], REVEAL_PLUGIN_CSS)`，引擎撤下时一并撤下；引擎因浏览器缺 Custom Highlight API 而不启动时，表也不挂。
- 只有生成表能这样分出来。文件型表与主题表共用一套 rank 排序（scripts/build/build.mjs 的 `styleFiles`），拆开要重排全部 rank；生成表没有文件、没有 gate，拆出来不影响任何排序。

## 后果

- 关掉逐字淡入、或把动效设为减弱时，页面上没有这几条步进规则，样式重算回到没有它们的地板。
- 表在特性挂载时解析一次，之后 `refinish` 只重写这张小表，不碰主表。
- 页面上多一个 `style` 元素，带 `data-plugin` 与 `data-plugin-css`（`dsh-claude-style/reveal.css`）：宿主的皮肤样式表清理、让路与 teardown 都按 `data-plugin` 认表，与其余表一致。
- 步进规则不能再回到主表：回到主表等于让关掉特性的页面继续付这笔样式重算。

## 重审条件

- 宿主提供按特性启用样式表的接口时，这层分桶交给宿主。
- 步进规则不再用 `::highlight()`（D107 的重审条件之一）时，这张表没有存在的理由，生成器与 `scope: 'feature'` 一起删掉。
