# Changelog

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
