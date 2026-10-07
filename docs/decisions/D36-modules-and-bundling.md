# D36. TypeScript 与 ES 模块，esbuild 打出单文件产物

- **状态**：已实施
- **分组**：构建与源码
- **关联**：取代 D1；D39、D46、D51

## 决定

- 源码全部是 TypeScript 与 ES 模块，用显式的 `import` / `export` 表达依赖；`tsconfig.json` 打开 `strict`。构建先跑 `tsc`，再查打包后的导入图：漏引、循环依赖、使用尚未初始化的常量都在构建时报错，一个没有任何模块导入的源文件也报错。
- 宿主服务与快照里的值在契约模块（D44）给出类型之前统一写成 `HostValue`；其余类型照常写全。
- esbuild 打包，`react` 与宿主包标为 external，产物是满足 DSH 加载器的单文件：CommonJS 主体包进 `__ModuleLoader__.load` 的工厂，id 与包名一致（D33），压缩，并附 `lib/client.js.map`。零运行时依赖由 external 设定保证。
- 构建时才有的数据（样式表文本、厂商组合标、帧图的内容戳与内联地址、构建编号）经一个生成模块 `virtual:dsh-claude-style/generated` 进入源码，类型写在 `packages/client/src/generated.d.ts`。构建编号是产物内容哈希的前 12 位（D19），打包后写进等长的占位，source map 因此不受影响。
- 原有构建检查各有去处：
  - 「每个源文件都在清单里」由模块导入图保证。
  - 构建期常量直接 import，样式表不带占位；输入框门控（D4）、`:has()` 位置（D9）、配色与字体门（D30）与皮肤属性的检查由 `scripts/css.mjs` 在语法树上执行（D51）。
  - 模型文案的结构由 `packages/client/data/model-descriptions.schema.json`（JSON Schema）声明，构建用 Ajv 校验；文档内的引用、厂商组合标是否存在与语言数由构建补查（D5）。
  - 吉祥物帧图与登记表的对应关系、帧数、裁切框、静止帧的合法性交给 D38 的资源清单生成。
  - 功能注册表与开关声明（D29）由功能清单的类型（D42）保证，在那之前由构建核对 `FEATURES` 表与各功能的主模块。
  - 两半偏好默认值的逐键核对随 `packages/contracts` 的单一声明取消（D10、D46）。
  - 产物仍检查能被解析。

## 理由

- DSH 加载器没有相对 `require`、没有资产 URL，这只限制产物的形态；构建时用打包器同样能产出一个零依赖的单文件。
- 共享作用域靠命名前缀与片段顺序维持依赖，片段数到几十个、源码到几万行时已经很难看清；`build.mjs` 也越长越像一个手写的打包器。

## 代价

- 开发依赖多了 TypeScript、esbuild、Ajv 与 React 的类型包。
- 产物里的名字被压缩，排查线上问题依赖 source map。
- `HostValue` 在 D44 之前不受类型检查，宿主结构的改变仍要靠冒烟与真实实例发现。

## 重审条件

- DSH 加载器原生支持 ES 模块的相对导入与资产 URL 时，产物不再需要打成单文件，改为按模块与资源分发。
