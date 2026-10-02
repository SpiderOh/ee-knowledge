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
- 原生 CSS 组件样式
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
  practice/
  statistics/
```

已有 `features/interview` / `features/ai` 目录若存在可以保留；它们不是 Personal v1.0 必需模块，不在当前主路线继续扩展。

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

`/admin`、个人学习页面和管理 API 默认由 `middleware.ts` 保护。当前使用环境变量密码 hash 与签名 HttpOnly cookie 的 single-user Authentication；项目不设计注册、多人组织、RBAC 或商业 SaaS 权限体系。

认证相关代码集中在 `lib/auth/`：密码 hash 使用 Node `crypto.scrypt`，session 校验使用 Edge-compatible Web Crypto。Authentication 不写入 Prisma 或 SQLite。

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

## 3.4 Structure Management Layer

```text
Admin Structure UI
   ↓
Structure Management Actions
   ↓
SubjectArea / Course / Book / Chapter
   ↓
ChapterKnowledgePoint
```

结构管理使用独立 Feature 边界。KnowledgePoint 仍是核心实体；结构层只维护课程、教材、章节和教材关联。

## 4. AI 架构（Post-v1 / Optional Local AI）

AI 不属于 Personal v1.0 必需能力。未来如产生真实需求，业务层不得直接依赖 OpenAI、Anthropic 或 Google SDK。

统一定义：

```ts
export interface AIProvider {
  chat(input: ChatInput): Promise<ChatOutput>
  explainKnowledgePoint(
    input: KnowledgePointExplanationInput
  ): Promise<KnowledgePointExplanation>
  generatePracticeQuestions(
    input: PracticeQuestionGenerationInput
  ): Promise<PracticeQuestionDraft[]>
}
```

实现放到：

```text
lib/ai/providers/
```

示例（未来参考）：

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

## 7. RAG（Post-v1 / Only if Needed）

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
- SQLite 路径由 `DATABASE_URL` 解析，验证、备份和恢复脚本不硬编码 `prisma/dev.db`。
- 重大结构调整要求 Migration 和 Decision Record。
## 9. v0.3.0 Mobile & Personal Cloud 方向

v0.3 的推荐拓扑：

```text
Browser / Android PWA
          ↓
        HTTPS
          ↓
       Single-user Authentication
          ↓
       Next.js
          ↓
       Prisma
          ↓
       SQLite
          ↓
Cloud Server / Orange Pi
          ↓
Scheduled Backup
```

服务器端 SQLite 是 canonical data source。桌面浏览器和 Android PWA 都是客户端，不维护独立的业务数据库；手机卸载或清除本地数据不会删除服务器数据。PWA 可以缓存 shell 和静态资源，但 offline write sync 不是 v0.3 的强制需求。当前 alpha.2 完成 single-user Authentication；HTTPS、self-host deployment、server SQLite 和 backup 属于后续 alpha。部署到服务器不自动要求 PostgreSQL，只有真实并发、多用户或 SQLite 成为瓶颈时才重新评估。
