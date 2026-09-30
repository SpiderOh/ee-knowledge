# ARCHITECTURE.md

## 1. 总体架构

第一阶段使用单体 Web 应用。

```text
Next.js UI
   ↓
Feature / Application Layer
   ↓
Domain / Service Layer
   ↓
Repository / Prisma
   ↓
SQLite
```

暂不拆分前后端服务。

## 2. 前端

推荐：

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- KaTeX

## 3. 模块边界

推荐：

```text
features/
  knowledge/
  books/
  courses/
  search/
  review/
  interview/
  ai/
```

页面组件负责展示。

Feature 层负责业务。

数据库访问集中到 `lib/db` 或对应 Repository。

## 3.1 内容渲染层

知识点正文和结构化内容通过统一渲染层输出：

```text
KnowledgePoint Data
        ↓
MarkdownRenderer
├─ Markdown / GFM
├─ Math / KaTeX
├─ Code
└─ KnowledgeImage
```

`Formula`、`Example` 和 `KnowledgeRelation` 保持结构化查询，分别由独立组件展示。图片只依赖规范化媒体引用；未来可以通过 `MediaProvider` 接入本地文件或对象存储。

## 3.2 Content Management Layer

```text
Admin UI
   ↓
Content Management Server Actions
   ↓
Prisma
```

`/admin` 当前未配置身份认证，仅适合本地使用或可信网络。公开部署前必须增加 Authentication。

## 3.3 Content Transfer Layer

```text
External JSON
   ↓
Knowledge Bundle Zod Schema
   ↓
Validation / Preview
   ↓
Import Service
   ↓
Prisma Transaction
```

导入导出服务与 NextRequest、React 和 UI 组件解耦。Bundle 只处理知识内容，不处理教材结构或用户学习数据。

## 4. AI 架构

业务层不得直接依赖 OpenAI、Anthropic 或 Google SDK。

统一定义：

```ts
export interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>
  generateKnowledgePoint(
    input: KnowledgeGenerationInput
  ): Promise<KnowledgePointDraft>
  evaluateInterview(
    input: InterviewEvaluationInput
  ): Promise<InterviewEvaluation>
}
```

实现放到：

```text
lib/ai/providers/
```

示例：

- openai.ts
- anthropic.ts
- gemini.ts
- local.ts

## 5. 知识内容

正式知识数据存数据库。

Markdown 只是内容表现形式之一。

AI 生成内容默认状态为：

```text
AI_DRAFT
```

必须允许人工审核后变为：

```text
REVIEWED
VERIFIED
```

## 6. 搜索

第一阶段：

- 标题搜索
- 正文关键字搜索
- 按课程过滤
- 按教材过滤

未来再增加：

- 模糊搜索
- 拼音搜索
- 全文索引
- 语义搜索
- 向量搜索

## 7. RAG

RAG 只能作为知识检索层，不得替代正式知识实体。

```text
KnowledgePoint
   ↓
Chunk
   ↓
Embedding
   ↓
Vector Index
   ↓
AI
```

KnowledgePoint 仍是正式数据源。

## 8. 可维护性原则

- 领域数据与 UI 分离。
- Provider 与业务分离。
- 导入格式与内部数据库结构分离。
- 学习数据与知识数据可独立备份。
- 重大结构调整要求 Migration 和 Decision Record。
