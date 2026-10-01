# SQLite 备份与恢复

## Knowledge Bundle 与完整数据库备份

Knowledge Bundle v1 用于知识内容交换、AI 生成内容导入和跨环境迁移。它不包含教材结构、ChapterKnowledgePoint、学习状态、笔记、收藏或复习记录。

SQLite Full Database Backup 是当前 MVP 的完整本地数据备份，包含知识内容、教材结构和用户学习数据。它适用于同一应用版本的灾难恢复，不是跨重大版本迁移格式。

## 备份

备份前停止 `npm run dev` 或其他会写入数据库的进程。然后运行：

```bash
npm run db:check
npm run db:backup
```

默认备份保存到 `backups/ee-knowledge-<timestamp>.db`。命令会检查 SQLite 文件头，并在检测到 `.db-journal`、`.db-wal` 或 `.db-shm` 时拒绝复制。已有同名备份不会被覆盖。

## 恢复

恢复会替换当前 `DATABASE_URL` 指向的 SQLite 文件。先停止应用，再运行：

```bash
npm run db:restore -- backups/ee-knowledge-<timestamp>.db --confirm
npm run db:check
npm run dev
```

`--confirm` 是强制要求的显式确认。恢复前会自动创建 `backups/pre-restore-<timestamp>.db`；源备份不会移动或删除。恢复不会自动运行 migration，也不会自动清理 journal、wal 或 shm 文件。

## 数据库路径

CLI 按 Prisma 语义解析 `DATABASE_URL`。例如 `DATABASE_URL="file:./dev.db"` 对应 `<repo>/prisma/dev.db`。当前 CLI 只支持 `file:` SQLite URL；未来使用 PostgreSQL 时必须使用对应的数据库工具。

## Demo Seed 边界

`npm run db` 只执行 migration。新开发环境需要 Demo 数据时运行 `npm run db:setup`，它等价于 migration 加 `npm run db:seed`。`db:seed` 会同步 Demo 课程、知识点、Demo 教材章节和章节关联；如果这些 Demo 记录已被改成正式内容，不要随意再次执行 Seed。
