# EE Knowledge v0.1.0

## 简介

这是《研电 · EE Knowledge》的第一个正式 MVP，面向电子信息专业知识管理、教材学习和复试知识积累。项目采用 local-first 设计，数据保存在本地 SQLite 数据库中。

## 核心能力

- 课程、教材、递归章节目录和知识点阅读。
- Markdown、GFM、KaTeX、公式、案例和知识关系。
- 全局搜索、收藏、笔记、学习状态、课程进度和最近学习。
- 内容管理与结构管理，包括知识点、教材和章节树维护。
- Knowledge Bundle v1 的 JSON 校验、预览、Merge/Upsert 和稳定导入导出。
- SQLite 完整备份、恢复前备份、数据库完整性检查和隔离验证。

## 本地安装

```powershell
npm ci
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

已有数据库升级时使用 `npm run db:backup`、`npm run db`、`npm run db:check`，不要使用 `db:setup`。

## 数据安全

- SQLite 是本地数据源，`npm run db` 只执行 Migration。
- Demo Seed 需要显式执行。
- 使用 `npm run db:backup` 和 `npm run db:restore -- backups/example.db --confirm` 管理完整 SQLite 备份。
- Knowledge Bundle 只用于知识内容交换，不包含用户学习数据，也不是完整数据库备份。

## 当前限制

- `/admin` 当前没有 Authentication，仅用于本机或可信网络。
- 暂未实现图片上传和 MediaAsset。
- 移动端教材目录暂时没有独立 Drawer。
- 复习中心、练习题、AI 和 RAG 尚未实现。

这些是 v0.1.0 的产品边界，不是发布阻塞问题。

## 下一阶段

`v0.2.0` 将进入复习与练习，包括复习中心、简单间隔复习、练习题和学习统计。
