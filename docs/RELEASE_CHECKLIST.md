# v0.2.0 Release Checklist

## 1. Scope

- 当前候选版本：`v0.2.0-rc.1`。
- v0.2.0 功能范围已冻结：复习中心、简单间隔复习、练习题、错题本、学习统计和基础联动。
- 本 RC 不新增业务功能，不进入 v0.3.0，不创建 Tag、GitHub Release 或执行 Merge。

## 2. Pre-release

- 使用 `release/v0.2.0-rc.1` 分支，确认 `package.json` 和 `package-lock.json` 版本为 `0.2.0-rc.1`。
- `git status` 必须 clean。
- 执行 `npm ci`，确认 lockfile 可复现安装。
- 确认 `prisma/schema.prisma` 未修改，`prisma/migrations` 未新增或修改。
- 确认依赖图和 Knowledge Bundle v1 未变化。
- 检查 `.env`、`.env.local`、数据库文件、备份目录、`node_modules` 和 `.next` 不会进入提交。

## 3. Database safety

已有数据库升级顺序：

```powershell
npm run db:backup
npm run db
npm run db:check
```

- `npm run db` 只执行 `prisma migrate deploy`。
- `db:setup` 只用于初始化新数据库（migration + Demo Seed）。
- 禁止使用 `prisma migrate reset` 升级真实数据库。
- 不在本轮对真实数据库执行 seed 或 restore。
- restore round-trip 只能使用 disposable SQLite，恢复前自动备份并要求 `--confirm`。
- `db:check` 只读，不修复、删除或更新数据。

## 4. Automated verification

- `npm ci`
- `npm run db:check`
- `npm run verify:demo`
- `npm run verify:content`
- `npm run verify:admin-query`
- `npm run verify:structure`
- `npm run verify:review`
- `npm run verify:practice`
- `npm run verify:statistics`
- `npm run verify:mvp`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run release:check`

`release:check` 已包含隔离 `verify:mvp`、typecheck、lint 和 build，不会对真实数据库自动 Seed。

## 5. Manual smoke test

- Desktop：`/` → `/courses` → `/courses/circuit-theory` → `/books/demo-circuit-book` → `/knowledge/kirchhoff-current-law?bookId=demo-circuit-book`。
- 检查首页、课程、教材、递归章节树、阅读顺序、上一/下一知识点、Markdown、KaTeX、Formula、Example、Relation、StudyStatus、Favorite、Note、Review 和 Practice 入口。
- 检查 `/search` 的 KnowledgePoint、Course、Book 搜索及课程/教材过滤。
- 检查 `/admin`、`/admin/knowledge`、`/admin/structure`、`/admin/import-export` 和 Bundle export/preview/import Merge/Upsert。
- 检查 `/review`、`/review/[slug]`、`/practice`、筛选、全部题型、客观题服务端判分、主观题自评、错题本和 `/statistics`。
- 约 390px 宽度检查首页、课程、知识点、复习、练习、错题本、统计、搜索、收藏和管理导航；统计课程表应可横向滚动，底部导航可横向滚动。
- 检查不存在的 Course、Book、KnowledgePoint、PracticeQuestion 和 Review Point 均返回合理 404。

## 6. Release gate

- Release PR base：`main`。
- Release PR head：`release/v0.2.0-rc.1`。
- PR 必须先完成 Review。
- 合并前不得创建 `v0.2.0-rc.1` Tag、GitHub Release 或执行 Merge。

## Release boundary

- Version：`v0.2.0-rc.1`
- Schema changed：No
- New migration：No
- Existing migration modified：No
- Knowledge Bundle v1 changed：No
- Dependencies upgraded：No
- Product：single-user personal system
- v0.3：PWA、Android 安装体验、单用户 Authentication、self-hosted deployment、server-side SQLite、scheduled backup
- Post-v1 / Only if Needed：RAG、Vector DB、复杂知识图谱、多用户、语音面试和复杂推荐
