# 排查性能与内存

这份指南写给「页面变慢」或「内存越用越多」的排查。它只写方法与判据，数字留在提交说明、工单与日志里：读数会过时，方法不会。

## 临时实例

真实宿主上的读数与替身页不同：宿主自己的 React 重渲染、会话日志与窗口化都在替身页之外。

- `node packages/testing/dsh-web.mjs` 在 `.debug/runs/e2e/` 下起一个独立的 `$DSH_HOME` 并把本检出链进去，打印地址；它不占验证锁，可以与其他车道并存。
- 桌面窗口用桥读：`node D:\DSH\dsh-gui-bridge\bin\bridge.cjs "<表达式>"`。窗口在后台时动画帧暂停，等帧的探针会挂住。
- 页面在跑哪一份构建，只看 `document.body.getAttribute('data-dsh-claude-style')`，`npm run build` 打印它写下的编号。热重载会换包而不会刷页面，经过多次热重载的页面先刷新再当证据。

## 同页交替对照

同一页面、同一操作，改动前后各测一轮再比较；两台机器、两个窗口之间的读数不可比。

- 实时页面用本次会话提供的浏览器工具读：`browser_navigate` 打开地址，`browser_snapshot` 读结构与文字，`browser_screenshot` 存图，`browser_console` 与 `browser_network` 读报错与请求。页面内的表达式、按功能关掉一块、清场后的图与明暗轮换仍用下面这些入口。
- 替身页：`node packages/testing/behaviour.mjs --open <page>` 起一个页面并打印地址，`--eval --at <地址> "<表达式>"` 在同一个页面里跑脚本，`--shot --at <地址> [--dark]` 落一张清场后的图，`--pass --at <地址>` 让页面立即排一趟（不必去改宽度或等下一次自然排趟）。
- 端到端：`node packages/testing/e2e.mjs --scenario <名字>` 自带宿主与脚本化模型，`--headed` 观察过程。同一场景在同一台机器上重跑两次，差值超过容差就有东西变了。
- 时间读 `performance.now()` 与 `PerformanceObserver` 的长任务；内存读 `performance.memory`（Chrome）或宿主进程的堆。两者都只在同条件的两轮之间比较。

## 功能二分

先确认成本落在哪个功能里，再读那个功能的代码。

- 替身页上按功能名关掉一个功能：`node packages/testing/behaviour.mjs --open <page> --off <功能>[,<功能>…]`，名单在页面启动前交给入口，该功能这一代不安装；功能名是清单里的 `id`（驼峰，如 `chatWait`、`questionCard`）。
- 替身页上按偏好关掉一个功能：`window.__pushForm({ <功能>: false })`，同一操作再测一轮。偏好清单在功能清单里；改动的功能名与清单键一致。
- 关掉一个功能后读数没变，说明成本在宿主或其他功能里，不要在皮肤里继续找。
- 一次只关一个功能：两个功能同时关掉，读数下降归不到谁身上。
- 名单只跳过安装，不卸载已经装上的功能；改动功能代码之后要重开一页。

## 脱离节点

内存留存最常见的形状是「节点离开文档，但某个集合还按它当键」。

- 在页面里查：`--eval --at <地址> "document.querySelectorAll('<选择器>').length"`，与文档里实际可见的数量对照；差出来的就是被持有但已脱离的节点。
- 按元素为键的集合有记录：`packages/testing/data/element-collections.json` 列出每一处及其数量，`npm run element-collections` 重新生成；数量只收缩，新增一处要写明它的持有期限（`docs/ARCHITECTURE.md` 的四级）。
- 会话切换后的状态由引擎的 `observeSession` 广播释放（D91）。新功能不要自己判断「容器还在不在文档里」，向广播登记即可。

## 长会话的三条基线

长会话的成本分三段，各自有检查与阈值，新增长会话路径时对照这里：

| 基线 | 由谁量 | 阈值 |
| --- | --- | --- |
| 流式期间每帧的成本 | `node packages/testing/e2e.mjs --scenario longSession` 的 p95 帧时增长检查 | `longSessionGrowthRatio`、`longSessionGrowthSlack`、`longSessionGrowthFloorMs` |
| 切回一段已看过的长转写（挂载） | 同一场景的切回一档 | `longSessionMountLongTaskMs` |
| 对对话栏的整栏查询 | 同一场景的整栏查询增长检查与页面计数 | `longSessionColumnQuerySlack` |

阈值与理由都在 `packages/testing/data/bounds.json`；读数随每次运行的检查输出打印。整份文档查询另有一份按文件的记录（`packages/testing/data/document-lookups.json`，`npm run lint` 对照），元素为键的集合在 `element-collections.json`。

## 记下结论

- 读数与推导进提交说明或工单，不进代码注释。
- 方法上的一条新教训写进这一页；一条新的不变量写进 `docs/ARCHITECTURE.md` 或对应决定页。
