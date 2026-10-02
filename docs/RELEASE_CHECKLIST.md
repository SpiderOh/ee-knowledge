# v0.2.0 Final Release Checklist

## 1. Scope

- 正式版本：`v0.2.0`。
- 发布分支：`release/v0.2.0`。
- v0.2.0 功能范围已完成：复习中心、简单间隔复习、练习题、错题本、学习统计和基础联动。
- 本轮只完成正式版本元数据、发布文档和完整验证，不新增业务功能，不进入 v0.3.0。

## 2. Pre-release

- `git status` 必须 clean。
- `package.json`、`package-lock.json` 顶层和 `packages[""].version` 均为 `0.2.0`。
- 执行 `npm ci`，确认 lockfile 可复现安装。
- `prisma/schema.prisma` 未修改，`prisma/migrations` 未新增或修改。
- 依赖图和 Knowledge Bundle v1 未变化。
- `.env`、`.env.local`、数据库文件、备份目录、`node_modules` 和 `.next` 不进入提交。

## 3. Database safety

已有个人数据库升级顺序：

```powershell
npm run db:backup
npm run db
npm run db:check
```

- `npm run db` 只执行 `prisma migrate deploy`。
- `db:setup` 只用于初始化新数据库（migration + Demo Seed）。
- 禁止使用 `prisma migrate reset` 升级真实数据库。
- 本轮发布验证不对真实数据库执行 seed 或 restore；真实灾难恢复按 `docs/BACKUP_RESTORE.md` 操作。
- 发布验证中的 restore round-trip 只能使用 disposable SQLite，恢复前自动备份并要求 `--confirm`。
- `db:check` 只读，不修复、删除或更新数据。

## 4. Automated verification

- `npm ci`
- `npm run db:check`
- `npm run verify:mvp`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run release:check`

可单独执行的验证包括 `verify:demo`、`verify:content`、`verify:admin-query`、`verify:structure`、`verify:review`、`verify:practice` 和 `verify:statistics`；`verify:mvp` 已包含完整隔离验证。

## 5. Manual smoke test

- Desktop：`/` → `/courses` → `/courses/circuit-theory` → `/books/demo-circuit-book` → `/knowledge/kirchhoff-current-law?bookId=demo-circuit-book`。
- 检查 Home、Courses、Books、KnowledgePoint、Search、Favorites、Notes、Admin、Structure、Bundle、Review、Practice、Wrong Book 和 Statistics。
- 检查 Markdown、KaTeX、Formula、Example、Relation、StudyStatus、Favorite、Note、Review 和 Practice 操作。
- 约 390px 宽度检查首页、知识点、复习、练习、错题本、统计和底部导航。
- 检查不存在的 Course、Book、KnowledgePoint、PracticeQuestion 和 Review Point 均返回合理 404。

## 6. Release gate

- Release PR base：`main`。
- Release PR head：`release/v0.2.0`。
- Release PR title：`chore: release v0.2.0`。
- PR 合并前不得创建 `v0.2.0` Tag、GitHub Release 或执行 Merge。

## Release boundary

- Version：`v0.2.0`
- Schema changed：No
- New migration：No
- Existing migration modified：No
- Knowledge Bundle v1 changed：No
- Dependencies upgraded：No
- Product：single-user personal system
- v0.3：PWA、Android 安装体验、单用户 Authentication、self-hosted deployment、server-side SQLite、scheduled backup
- Post-v1 / Only if Needed：RAG、Vector DB、复杂知识图谱、多用户、语音面试和复杂推荐

## 7. Post-merge steps

PR 合并后：

```powershell
git checkout main
git pull origin main
git status
git log -1 --oneline
```

确认 main 版本为 `0.2.0` 后创建并推送 Tag：

```powershell
git tag -a v0.2.0 -m "EE Knowledge v0.2.0"
git push origin v0.2.0
```

然后创建 GitHub Release：

- Tag：`v0.2.0`
- Title：`EE Knowledge v0.2.0`
- Release body：`docs/RELEASE_NOTES.md`
- `draft: false`
- `prerelease: false`

不得移动、删除或修改既有 `v0.1.0` Tag 和 Release。
