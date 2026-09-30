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
