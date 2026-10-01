# v0.1.0 Release Candidate Checklist

## 发布前检查

- `git status --short`，确认没有 `.env`、`node_modules`、`.next`、`*.db`、`*.db-journal`、`*.tsbuildinfo` 或 `backups/`。
- `npm ci`
- 真实 `DATABASE_URL` 先执行 `npm run db:backup`，再运行 `npm run db`，最后 `npm run db:check`。

## 自动检查

- `npm run db:check`
- `npm run verify:mvp`
- `npm run release:check`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

`verify:mvp` 使用 `prisma/verify-mvp.db`，完成后自动清理，不会对真实 `DATABASE_URL` 执行 Seed。需要调试时可设置 `KEEP_VERIFY_DB=1`。

## 手工回归

- 首页 → 课程 → 教材 → 章节 → 知识点，验证上一/下一知识点。
- 搜索 `q/course/book` 组合筛选，检查无效教材参数不会 500。
- 知识点学习状态、收藏、笔记新增/编辑/删除。
- 内容管理和结构管理的 CRUD、Bundle Preview/Import/Export。
- 约 390px 宽度下，首页、课程、搜索、收藏和知识点页仍可导航。
- 不存在的课程、教材、知识点和管理详情页显示统一 404。
- `npm run db:backup` 与 disposable SQLite 数据库的完整 `npm run db:restore -- backups/example.db --confirm` 往返验证。

## 发布边界

- 版本：`v0.1.0-rc.1`
- Schema changed：No
- New migration：No
- 不创建正式 `v0.1.0` tag，不自动合并 PR。
