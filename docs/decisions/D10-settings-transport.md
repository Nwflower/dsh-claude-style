# D10. 设置传输只走官方 Config 表单

- **状态**：已实施
- **分组**：宿主边界
- **关联**：D29、D46
- **迁移**：偏好字段已改在 `packages/contracts/src/prefs.ts` 声明一次：宿主半边的 `Config` 与浏览器半边的初值都读它，构建期的两半逐键核对随之取消

## 决定

- 浏览器半边只有 `configForms` 一条传输：绑定宿主实际提供的命名空间（候选依次为加载器入口 id、包名、`cordis.patch.yml` 插入的 id，以宿主的命名空间目录为准），读写都经表单控制器（值、写队列、修订号栅栏）。命名空间晚到时订阅目录，到达即绑定。
- 宿主半边导出 `Config` 作为 schema，只有 `.volatile()` 字段进表单。schemastery 以顶层 await 加守卫导入，解析不到时 `Config` 为 `undefined`、皮肤照常加载——这是「导入不包 try/catch」规定的唯一例外。
- 设置席位注册为 `plugins.bundle.config`（键为包名）；宿主没有 `configForms` 时才注册整页的 `settings.section`。
- 偏好字段只有一份声明：`packages/contracts/src/prefs.ts` 的 `PREFS_DEFAULT`。宿主半边 `packages/host/src/settings.ts` 用它生成 `Config`（宿主构建把 contracts 的值内联进产物，contracts 不进 npm 包）；浏览器半边的默认值与取值集合给出表单答复之前的初值与读到值时的规整。
- 偏好只存在宿主的表单里：早先存进浏览器本地存储的昵称与封号页语言，在表单第一次带值时写进表单，表单持有自己的值后删掉本地那份。

## 理由

- 官方表单自带写队列与修订号，皮肤不重复实现一套同步。

## 代价

- `Config` 的顶层 await 让宿主半边晚一步求值（加载器本就等待导入，无实际影响）。

## 重审条件

- 宿主提供不依赖 `Config` 的设置注册方式，或 `configForms` 契约再变。
