# D33. 皮肤样式表带上本包自己的归属标记，兄弟包的样式表不认领

- **状态**：已实施
- **关联**：D32、D36

## 决定

- 皮肤的样式表挂载时写两个标记：`data-plugin` 是本包的包名 `dsh-claude-style`，`data-plugin-css` 是本包的键 `dsh-claude-style/client.css`（`PACKAGE_NAME` 与 `STYLE_PLUGIN_CSS`）。
- 挂载在 `src/core/stylesheet.js` 的 `mountStylesheet()`：同名元素已存在时就地刷新（重写标记，内容不同才重写内容），没有才新建并挂到 `<head>`；拆卸只在自己仍是最后一代挂载者时移除。
- `parkForeignSheets()` 把文档中所有未打标签、又不是本包那张的 `<style>` 标成 `dsh-claude-style/foreign-sheet`（`FOREIGN_SHEET_TAG`）。它定义在 `src/core/stylesheet.js`，在两个时机执行：`src/entry.js` 的模块作用域里，以及随页面一直活着的 `<head>` 观察者回调（`src/shared/peer-plugin.js` 的 `checkPeerPresence`）。
- `data-plugin` 的值、`package.json` 的包名、产物里 `__ModuleLoader__.load` 的 id、profile 里的条目名四者必须一致；换用 esbuild（D36）后同样如此。

## 理由

- 宿主客户端模块系统按属性给样式表记账（`claimStyles` 与 `removeOwnedStyles`）：某个包物化时，把文档里所有未打标签的 `<style>` 盖上自己的 id；这个包重载、换代或被剪除时，删掉带这个 id 的全部标签。没有标记的样式表会被下一个物化的兄弟包认领，再随它的重载被删掉，页面继续运行，规则却整份消失。
- 两个时机各管一段：认领扫描在本包工厂返回之后跑，模块作用域里的那次是唯一赶在它前面的动作；本包之后才出现的样式表（兄弟包在自己的 `apply()` 或懒加载块里挂，`dsh-meme` 与 `dsh-chat-import` 都这样）只有 `<head>` 观察者能在被认领之前看到——观察者回调是微任务，物化是之后的任务。

## 代价

- 本包的样式表由宿主按这个 id 管理：重载时宿主先删掉它，再由新的 `apply()` 重新挂上，一次重载失败会让页面回到宿主自己的外观。
- 被标成 `foreign-sheet` 的样式表此后不再被宿主收走：指望宿主在重载时替它收走旧表的插件，会留下新旧两份并存。

## 重审条件

- 宿主提供公开的客户端样式声明方式（在包清单里声明 CSS、由宿主带标记注入），或把认领扫描收窄到该次物化真正新建的标签时，改用它。
