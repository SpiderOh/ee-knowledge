# Changelog

## 0.1.0-rc.1 - 2026-10-01

### Added

- 新增非破坏性的 `npm run db`、明确的 `npm run db:setup` 和 Demo Seed 边界说明。
- 新增隔离 SQLite 的 `verify:mvp`、只读 `db:check`、`release:check` 以及 SQLite CLI 备份/恢复。
- 新增统一错误边界、移动端导航、RC 发布清单和完整数据库备份说明。

### Fixed

- 移除外部 Google Fonts 运行时依赖，校准 README、架构和项目状态中的实际技术栈。
- 补充主要空状态、中文知识类别和稳定的课程/教材排序。
- 修复 RC 导航重复入口，统一课程、搜索、收藏和管理入口，并补齐移动端管理入口。
- 修复管理教材章节无效参数的 404、课程/教材/知识点/管理空状态和 404 快捷入口。
- 统一审核状态标签，补充章节折叠控件 ARIA、表单错误提示和键盘焦点样式。
- README 与发布清单改用 `npm ci`，明确真实数据库检查、备份和恢复步骤。

## 0.1.0-alpha.6 - 2026-10-01

### Added

- 新增 SubjectArea、Course、Book 管理和 `/admin/structure`。
- 新增递归 Chapter 树形管理、创建、编辑、移动和删除。
- 新增搜索课程与教材筛选 UI、未分类 Course 展示和 `verify:structure`。

### Safety

- SubjectArea 有 Course、Course 有 Book/KnowledgePoint、Book 有 Chapter、Chapter 有子章节或知识点关联时禁止删除。
- 增加 Chapter parent cycle、跨 Book parent、descendant level 和 Book/KnowledgePoint Course 一致性校验。

### Fixed

- 统一校验 KnowledgePoint 换课、教材换课、章节关联和 Knowledge Bundle 预览/导入中的 Course 一致性，并在导入事务内二次复核。
- 移除 StructureForm 的不安全类型断言，补充 ChapterAdminTree 循环数据兜底和结构验证覆盖。

## 0.1.0-alpha.5 - 2026-09-30

### Added

- 新增内容管理后台 `/admin` 和 KnowledgePoint 分页管理。
- 新增 KnowledgePoint 创建、编辑、安全删除以及 Formula、Example、Relation 和教材章节关联管理。
- 新增 Knowledge Bundle v1 的 JSON 校验、预览、Merge/Upsert 导入和稳定导出。
- 新增 `docs/CONTENT_FORMAT.md`、Bundle 示例和 `npm run verify:content`。

### Safety

- 管理后台当前未认证，仅适合本地或可信网络。
- 知识点存在学习记录、收藏、笔记或复习记录时禁止删除。
- Knowledge Bundle 不包含用户学习数据，不删除 Bundle 缺失内容。
- 导入内容默认保留 AI 草稿审核状态，不自动标记为 VERIFIED。

### Fixed

- 修复 Markdown Preview 状态下保存导致五个 Markdown 字段被清空的问题。
- 将 Import Confirmation 绑定到已成功预览的 JSON 内容，JSON 改变后必须重新预览。
- 修复已有 Course、SubjectArea 未在 Bundle 中重复声明时的引用导入。
- 加固 Formula、Example、Relation 和 ChapterKnowledgePoint 的 ownership 校验。
- 加固 Formula、Example 的 `db:` key，禁止劫持其他知识点的记录。
- 修复空 Course 导出，并按 sourceSlug、relationType、targetSlug 稳定排序关系。
- 修复管理后台空 `reviewStatus` 清空 q/course 筛选的问题，非法状态也不会覆盖合法筛选条件。
- 修复跨数据库 `db:` key 使用确定性 fallback 后预览 create/update 计数不一致的问题。
- 加固 Formula、Example 确定性 fallback ID 的 ownership 校验，并保持原知识点归属。
- 明确 Bundle 部分更新语义：字段省略保留原值，显式 null 清除可空字段，新增记录的 sortOrder 默认为 0。
- 配置 Server Action 传输上限为 3 MB，使 2 MB Knowledge Bundle 应用限制可以正常生效。
- 修正 PROJECT_STATUS 中 v0.1.0 MVP 与 v0.2.0 复习阶段的边界。

## 0.1.0-alpha.4 - 2026-09-30

### Added

- 新增统一 `MarkdownRenderer`，支持 Markdown、GFM、代码、表格、链接和 KaTeX 数学公式。
- 新增结构化 Formula、Example、KnowledgeRelation 展示组件。
- 新增 `KnowledgeImage` 和 `MediaProvider` 图片显示接口。
- 扩展 Demo Seed，增加 KCL/KVL 公式、KCL 示例和少量知识关系，并保持幂等。
- 新增 `docs/MEDIA.md`。

### Changed

- KnowledgePoint 正文统一通过 Markdown 内容渲染层显示。
- 项目版本更新为 `v0.1.0-alpha.4`。

### Fixed

- 修复对称知识关系重复显示，并清理 Demo 中反向 RELATED 镜像。
- 加固 Markdown 链接和图片 URL 的安全判断。
- 调整知识点正文中的公式、物理意义和工程意义展示顺序。

### Not included

- 本轮未实现图片上传、MediaAsset 表、对象存储、AI、RAG 或复习中心。

## 0.1.0-alpha.3 - 2026-09-30

### Fixed

- 修复新增笔记使用客户端假 ID，创建成功后直接使用数据库返回的真实记录。
- 修复知识点间导航时学习状态、收藏和笔记组件的客户端状态串页。
- 修复编辑笔记后未按 `updatedAt desc` 移动到列表顶部的问题。
- 修复笔记操作 pending 时仍可重复编辑或删除的问题。

### Added

- 新增知识点学习状态操作，并记录学习次数和最近学习时间。
- 课程进度改为按已开始学习的知识点计算。
- 新增知识点收藏、`/favorites` 收藏列表和首页收藏入口。
- 新增个人笔记的创建、编辑和删除。
- 首页新增已学习知识点、需要复习和最近学习数据。
- 新增 ADR-006，记录 MVP 学习进度算法。

### Changed

- 知识点查询包含收藏和按更新时间倒序的笔记上下文。
- 项目版本更新为 `v0.1.0-alpha.3`。

## 0.1.0-alpha.2 - 2026-09-30

### Fixed

- 修复 Demo Seed 重复的 `ChapterKnowledgePoint` 关联。
- 清理 Demo 教材的 Seed 历史残留，保持重复执行幂等。
- 修复章节 `sortOrder`，明确教材阅读顺序。
- 修复跨章节上一/下一知识点导航。
- 修复教材知识点数量按唯一 `KnowledgePoint` 统计。
- 修复无效 `bookId` 不应覆盖合法知识点上下文的问题。
- 移除教材页和知识点页的双重类型断言。

### Added

- 新增教材稳定深度优先阅读顺序查询。
- 新增 `/search` 全局搜索页面。
- 支持 KnowledgePoint、Course、Book 搜索。
- 支持课程过滤。
- 使用 Zod 校验搜索参数。
- 新增 `npm run verify:demo` Demo 数据验证脚本。
- 修复空筛选参数导致合法搜索词被清空的问题。

## 0.1.0-alpha.1 - 2026-09-30

- 修正项目状态，正式版本仍等待 MVP 主链完成。
- 新增课程列表、课程详情、教材详情和知识点详情路由。
- 新增按专业方向分组的课程浏览和学习进度展示。
- 新增支持 `Chapter.parentId` 的递归、可折叠章节树。
- 扩充电路原理演示数据为 4 个章节和 10 个知识点。
- 抽离课程、教材、知识点查询函数与基础展示组件。
