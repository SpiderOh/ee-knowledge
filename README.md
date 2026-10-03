# EE Knowledge / 研电

这是一个单用户、个人使用、长期维护的电子信息专业知识与学习系统。它服务于知识积累、复习、练习和个人学习，不以 SaaS 或多人平台为目标。

## 项目目标

把电子信息专业本科阶段和考研复试可能涉及的知识，整理成可长期维护、可检索、可复习、可训练、可由多种 AI 持续扩展的软件系统。

系统不是 PDF 阅读器，而是：

- 专业知识库
- 教材目录系统
- 知识点数据库
- 学习进度系统
- 复习系统
- 知识点问法与标准回答增强（后续轻量内容增强）
- 个人 PWA 与自托管访问
- 资料导入（后续）

## 开发前必读

任何开发者或 AI Agent 在修改代码前，必须依次阅读：

1. `docs/MASTER_SPEC.md`
2. `docs/PROJECT_STATUS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md`
5. `docs/DECISIONS.md`
6. `AGENTS.md`

不得在未理解现有架构的情况下重建项目或大规模重构。

## 第一阶段技术栈

- Next.js
- TypeScript
- 原生 CSS 组件样式（当前未初始化 Tailwind 或 shadcn/ui）
- SQLite
- Prisma ORM
- Zod
- Markdown
- KaTeX

## 当前版本

`v0.5.0-alpha.1`

v0.2.0 已正式发布。v0.3.0 已完成 Mobile & Personal Cloud：PWA、single-user Authentication、Linux self-host、server-side SQLite、scheduled backup、GitHub CI 与 production runtime regression。

## 第一阶段 MVP

v0.1.0 已完成的第一阶段 MVP：

> 打开网页 → 选择课程 → 选择教材 → 浏览树形目录 → 阅读知识点 → 搜索 → 收藏 → 做笔记 → 标记学习状态 → 查看学习进度。

第一阶段不做：

- RAG
- 向量数据库
- OCR
- 语音面试
- 知识图谱可视化
- 多用户
- 云同步
- 复杂权限系统

## 项目文档

详见 `docs/`。

## 本地初始化与数据库安全

```powershell
npm ci
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

已有个人数据库按以下顺序升级：

```powershell
npm run db:backup
npm run db
npm run db:check
```

`npm run db` 只执行 Prisma migration，不会自动同步 Demo Fixture。`db:setup` 只用于新数据库初始化；需要明确初始化或刷新 Demo 数据时才运行 `npm run db:seed`。

Knowledge Bundle 是知识内容交换格式，不是个人完整备份。SQLite 完整备份和恢复流程见 [`docs/BACKUP_RESTORE.md`](docs/BACKUP_RESTORE.md)。

## 管理后台安全提示

single-user Authentication 已加入，个人页面、管理后台和管理 API 默认需要登录。远程公网部署通过 Caddy 提供 HTTPS。Linux self-host deployment 的完整流程见 [`docs/SELF_HOST.md`](docs/SELF_HOST.md)。

## 长期路线

当前阶段是 v0.5.0-alpha.1 Personal Material Import。手机与电脑访问同一个服务器数据库，不维护独立的离线业务数据库。

v0.5.0-alpha.1 已完成 Markdown/TXT 文本提取、人工确认、来源记录和创建型 KnowledgePoint 导入；下一步是 v0.5.0-alpha.2 PDF/DOCX 文本提取。不建设独立复试题库、模拟复试或目标院校专区。v0.5.0-alpha.1 处理 Markdown/TXT 个人资料导入，AI Assistant 属于 Post-v1 / Optional Local AI。

RAG、向量数据库、复杂知识图谱、多用户、复杂同步和语音面试属于 v1.0 之后仅在产生真实需求时评估的能力。
