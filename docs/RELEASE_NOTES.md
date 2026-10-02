# EE Knowledge v0.2.0 Draft

## 简介

v0.2.0 完成了从知识浏览到复习、练习和学习统计的基础学习闭环。项目仍是 local-first、single-user personal system，数据保存在本地 SQLite 中。

## 核心能力

- Review Center：到期、手动、逾期和未来 7 天队列。
- 简单间隔复习：1、3、7、14、30 天调度，保留 ReviewRecord 历史。
- Practice Center：课程、题型、难度和知识点筛选。
- 客观题服务端判分，主观题参考答案与用户自评。
- PracticeAttempt append-only 作答历史和最近一次错题本。
- Learning Statistics：知识状态、复习统计、练习统计、课程统计和最近 14 天活动。
- Review ↔ Practice navigation：错误练习、错题本和复习知识点之间的明确入口。

## 本地安装与升级

新数据库：

```powershell
npm ci
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

已有数据库升级：

```powershell
npm run db:backup
npm run db
npm run db:check
```

不要使用 `db:setup` 升级已有数据库，也不要使用 `prisma migrate reset`。restore 只能对 disposable SQLite 使用，并需要明确的 `--confirm`。

## 数据库变更

v0.2.0 的 additive migration 新增：

- `PracticeQuestionOption`
- `PracticeAttempt`

本 RC 不新增 Schema 或 migration，不修改已有 migration。Knowledge Bundle v1 不包含 Book、Chapter、ChapterKnowledgePoint、PracticeQuestion、PracticeQuestionOption、StudyProgress、ReviewRecord、PracticeAttempt、Note 或 Favorite。

## 数据安全

- `npm run db` 只执行 migration。
- `npm run db:check` 只读。
- `npm run db:backup` 创建 SQLite 完整备份。
- `npm run db:restore` 恢复前自动备份，并要求 `--confirm`。
- 统计历史只使用 ReviewRecord 与 PracticeAttempt 时间字段，不把 `StudyProgress.lastStudiedAt` 当作每日事件。

## 当前边界

- 项目是 single-user personal system，`/admin` 尚未接入 Authentication，仅适合本机或可信网络。
- 当前没有 PWA、Android、个人云端、自动备份服务或 offline writes。
- 当前没有图片上传、MediaAsset、RAG、Vector DB、复杂知识图谱、多用户或语音面试。

## 下一阶段

v0.3.0 Mobile & Personal Cloud：PWA、Android 安装体验、单用户 Authentication、自托管部署、服务器端 SQLite、scheduled backup，以及桌面和手机访问同一个 canonical data source。第一版不实现双向离线 SQLite 合并同步。
