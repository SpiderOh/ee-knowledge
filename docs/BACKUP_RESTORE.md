# SQLite 备份与恢复

## Knowledge Bundle 与完整数据库备份

Knowledge Bundle v1 用于知识内容交换、AI 生成内容导入和跨环境迁移。它不包含教材结构、ChapterKnowledgePoint、学习状态、笔记、收藏或复习记录。

SQLite Full Database Backup 是当前 MVP 的完整本地数据备份，包含知识内容、教材结构和用户学习数据。它适用于同一应用版本的灾难恢复，不是跨重大版本迁移格式。

## Cold manual backup

备份前停止 `npm run dev` 或其他会写入数据库的进程。然后运行：

```bash
npm run db:check
npm run db:backup
```

默认备份保存到 `backups/ee-knowledge-<timestamp>.db`。命令会检查 SQLite 文件头，并在检测到 `.db-journal`、`.db-wal` 或 `.db-shm` 时拒绝复制。已有同名备份不会被覆盖。

## Live backup

运行中的主应用可以使用系统 `sqlite3` CLI 执行 SQLite online backup：

```bash
npm run db:backup:live
```

该命令写入 `EE_BACKUP_DIR`，先创建 `.partial`，通过 `PRAGMA integrity_check` 返回严格的 `ok` 后再重命名为最终 `.db`。它不会通过 `fs.copyFile` 直接复制 live database，也不会停止主应用。没有 `sqlite3` CLI 时会失败并提示安装系统包。

## Scheduled backup

```bash
npm run backup:check
npm run backup:scheduled
```

`backup:check` 只读验证 `DATABASE_URL`、Primary 目录、retention、sqlite3 和可选 Secondary。`backup:scheduled` 每轮创建 Primary online backup，默认保留最新 14 个严格命名的 scheduled backup；`EE_BACKUP_SECONDARY_DIR` 为空时打印 `Secondary: disabled` 并成功结束。

配置 Secondary 后，它必须是真正挂载的独立 filesystem，不能只是主盘上的普通目录。Secondary 使用与 Primary 相同的文件名，复制到 `.partial` 后比较 SHA-256，再运行 SQLite integrity check，最后原子重命名。Secondary 失败时保留 Primary 并返回非零状态；不会自动 restore。

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

生产自托管使用绝对 Linux 路径，例如 `DATABASE_URL="file:/var/lib/ee-knowledge/ee-knowledge.db"`。生产数据库位于仓库外，由 `/etc/ee-knowledge/ee-knowledge.env` 提供路径；`npm run deploy:check` 会验证路径、凭证和目录权限。完整部署流程见 [`docs/SELF_HOST.md`](SELF_HOST.md)。

## Demo Seed 边界

`npm run db` 只执行 migration。新开发环境需要 Demo 数据时运行 `npm run db:setup`，它等价于 migration 加 `npm run db:seed`。`db:seed` 会同步 Demo 课程、知识点、Demo 教材章节和章节关联；如果这些 Demo 记录已被改成正式内容，不要随意再次执行 Seed。
