# v0.1.0 Release Checklist

## 1. Pre-release

- `git status` 必须 clean。
- 使用 `release/v0.1.0` 分支，确认 `package.json` 和 `package-lock.json` 版本为 `0.1.0`。
- 执行 `npm ci`。
- 确认 `prisma/schema.prisma` 未修改、`prisma/migrations` 未新增。
- 检查 `.env`、`.env.local`、数据库文件、备份目录、`node_modules` 和 `.next` 不会进入提交。

## 2. Automated verification

- `npm run db:check`
- `npm run verify:mvp`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run release:check`

`release:check` 已包含隔离 `verify:mvp`、typecheck、lint 和 build。不要为了检查真实数据库运行 `db:seed` 或 `db:setup`。

## 3. Manual smoke test

- `/` → `/courses` → `/courses/circuit-theory` → `/books/demo-circuit-book` → `/knowledge/kirchhoff-current-law?bookId=demo-circuit-book`。
- 检查 Chapter Tree、Markdown、KaTeX、Formula、Example、Relation、StudyStatus、Favorite、Note 和上一/下一知识点。
- 检查 `/search?q=基尔霍夫` 及课程、教材筛选。
- 检查 `/admin`、`/admin/knowledge`、`/admin/structure`、`/admin/import-export`。
- 约 390px 宽度检查首页、课程、教材、知识点、搜索、收藏和管理导航。
- 检查 `/courses/not-exist`、`/books/not-exist`、`/knowledge/not-exist`、`/admin/books/not-exist/chapters` 统一 404。

## 4. Database safety

- 真实数据库只执行 `npm run db:check`、必要时执行 `npm run db:backup` 和 `npm run db`。
- 禁止 `migrate reset`。
- 禁止对真实数据库执行 `npm run db:seed` 或 `npm run db:setup`，除非用户明确要求同步 Demo Fixture。
- 不在本轮对真实数据库执行 restore；restore round-trip 使用 disposable SQLite 数据库验证。
- 确认 `verify:mvp` 完成后没有残留 `prisma/verify-mvp.db`、journal、wal 或 shm 文件。

## 5. Merge gate

- 正式 Release PR 的 base 为 `main`，head 为 `release/v0.1.0`，标题为 `chore: release v0.1.0`。
- PR 必须先完成 Code Review。
- PR 合并前不得创建正式 Tag、GitHub Release 或执行 Merge。

## 6. Post-merge Tag

合并后再执行：

```bash
git checkout main
git pull origin main
git status
git log -1 --oneline
git tag -a v0.1.0 -m "EE Knowledge v0.1.0"
git push origin v0.1.0
```

确认 `main` 已包含 `chore: release v0.1.0` 后再创建 Tag。

## 7. GitHub Release

Tag 创建后再创建 GitHub Release：

- Tag：`v0.1.0`
- Title：`EE Knowledge v0.1.0`
- Release body：使用 `docs/RELEASE_NOTES.md`

本轮不执行 Tag、Merge 或 GitHub Release。

## Release boundary

- Version：`v0.1.0`
- Schema changed：No
- New migration：No
- Knowledge Bundle v1 changed：No
- Dependencies upgraded：No