# DECISIONS.md

用于记录重大架构决策。

---

## ADR-001：第一阶段使用 Next.js 单体应用

状态：Accepted

原因：

- 项目初期规模小。
- 开发者不是专业全栈工程师。
- 降低部署和维护成本。
- AI 更容易整体理解项目。

未来：

如果出现真实扩展需求，可再拆分服务。

---

## ADR-002：第一阶段使用 SQLite

状态：Accepted

原因：

- 本地优先。
- 单用户。
- 零运维。
- 容易备份。

未来：

部署或多用户后迁移 PostgreSQL。

---

## ADR-003：KnowledgePoint 作为核心实体

状态：Accepted

原因：

同一知识点可存在于不同教材中。

教材只是知识组织方式，不应决定知识实体唯一性。

---

## ADR-004：AI Provider 必须抽象

状态：Accepted

原因：

项目不能绑定 ChatGPT/OpenAI。

未来应能替换 Claude、Gemini 或本地模型。

---

## ADR-005：第一阶段不做 RAG

状态：Accepted

原因：

先把结构化知识库做好。

RAG 是增强功能，不应反过来决定核心数据结构。

---

## ADR-006：MVP 学习进度按学习状态计算

状态：Accepted

规则：

- 课程进度 = `status != NOT_STARTED` 的课程知识点数 / 课程知识点总数 × 100，并四舍五入为整数。
- 第一次设置为非 `NOT_STARTED` 时创建学习记录，`studyCount` 为 1，并写入 `lastStudiedAt`。
- 状态切换到另一个非 `NOT_STARTED` 状态时增加 `studyCount` 并更新 `lastStudiedAt`。
- 重复设置相同状态不增加次数；切回 `NOT_STARTED` 只更新状态并保留历史次数和最近学习时间。

原因：

本轮先提供可理解、可验证的学习浏览链。掌握度和间隔复习需要独立的复习记录与算法，暂不混入 MVP 进度指标。

---

## ADR-007：专业内容采用 Markdown 与结构化实体混合模式

状态：Accepted

规则：

- 定义、原理、物理意义等长文本使用 Markdown 保存和渲染。
- `Formula`、`Example`、`KnowledgeRelation` 继续作为结构化实体保存。
- Markdown 不启用原始 HTML 解析，统一通过安全渲染组件输出。

原因：

Markdown 能支持公式、表格、代码和列表等专业内容；结构化实体便于公式速查、案例筛选和关系导航，两者职责不同，应同时保留。

---

## ADR-008：图片先建立渲染与 Provider 抽象

状态：Accepted

规则：

- 图片引用通过 `KnowledgeImage` 渲染。
- 媒体来源通过 `MediaProvider` 接口解析，当前使用直接 URL Provider。
- 第一阶段不建立 `MediaAsset` 表，不实现上传和对象存储。

原因：

当前图片的复用、版权、来源和上传需求还未稳定。先隔离渲染层和存储层，避免过早绑定数据库或云厂商。

---

## ADR-009：Knowledge Bundle v1 使用 slug 作为知识实体标识

状态：Accepted

跨系统内容使用 SubjectArea、Course、KnowledgePoint 的 slug，以及 Formula、Example 的 package-local key。Bundle 不暴露内部 cuid，避免导入格式绑定某个数据库。

---

## ADR-010：知识导入采用 Merge / Upsert

状态：Accepted

导入只创建或更新 Bundle 明确提供的内容，不删除 Bundle 缺失的数据。这样可以安全接收部分 AI 生成文件，避免不完整文件误删已有知识。

---

## ADR-011：Book / Chapter 不进入 Knowledge Bundle v1

状态：Accepted

当前教材和章节没有稳定的跨库自然标识。本轮 Bundle 只处理知识内容；教材结构未来由独立 Library Bundle 设计，不为导入格式修改 Book 或 Chapter Schema。

---

## ADR-012：结构实体后台采用保守删除策略

状态：Accepted

虽然数据库存在 Cascade 或 SetNull，Admin 删除结构实体前必须检查下游结构和业务内容。只有没有下游依赖的空结构实体才允许删除，避免误操作破坏教材树、知识关联或用户学习数据。

---

## ADR-013：Book 与章节知识点保持 Course 一致

状态：Accepted

ChapterKnowledgePoint 建立关联，以及 Book 更换 Course 时，应用层要求 KnowledgePoint.courseId 与 Chapter.book.courseId 一致。该规则不引入数据库约束，保证课程浏览、教材上下文和搜索筛选的语义一致。

该一致性是应用层 invariant，而不是某个页面或单一操作的 UI 规则。所有可修改 `Book.courseId`、`KnowledgePoint.courseId` 或 `ChapterKnowledgePoint` 的写路径都必须遵守它：章节关联、教材换课、知识点换课和 Knowledge Bundle 更新已有知识点课程时统一查询该知识点的全部章节关联；任一关联教材属于其他课程时拒绝写入。Bundle 预览可以按课程 slug 提前检查，真正导入必须在事务内再次检查；任何路径都不得自动解除章节关联或自动移动教材。

---

## ADR-014：v0.2 复习中心采用 ReviewRecord 加简单间隔调度

状态：Accepted

规则：

- 复习中心从 `ReviewRecord.nextReviewAt` 和 `StudyProgress.status=REVIEW` 生成到期与手动队列。
- 每次复习写入一条 `ReviewRecord`，并清空同一知识点旧的有效计划，保证只有一个有效计划。
- 结果使用 0 忘记、1 模糊、2 记得、3 熟练；间隔使用 1/3/7/14/30 天，连续熟练结果推进间隔，忘记或模糊重置为 1 天。
- 复习结果同步 `StudyProgress`，但不改变 `ReviewRecord`、`PracticeQuestion` 或用户数据的核心关系。

原因：

先提供可验证的 Review Center 基础闭环，保持数据模型稳定，待后续版本再评估 FSRS、SM-2、练习题和统计需求。
