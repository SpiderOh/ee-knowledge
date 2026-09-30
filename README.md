# EE Knowledge / 研电

电子信息专业知识库、考研复试训练系统与 AI 学习助手。

## 项目目标

把电子信息专业本科阶段和考研复试可能涉及的知识，整理成可长期维护、可检索、可复习、可训练、可由多种 AI 持续扩展的软件系统。

系统不是 PDF 阅读器，而是：

- 专业知识库
- 教材目录系统
- 知识点数据库
- 学习进度系统
- 复习系统
- 复试题库
- 模拟面试
- AI 学习助手
- 目标院校复试资料系统

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
- Tailwind CSS
- shadcn/ui
- SQLite
- Prisma ORM
- Zod
- Markdown
- KaTeX

## 第一阶段 MVP

v0.1.0 目标：

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
