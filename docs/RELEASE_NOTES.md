# EE Knowledge v0.2.0

## 简介

v0.2.0 是 EE Knowledge 的第二个稳定公开版本，完成了从知识浏览到复习、练习、错题本和学习统计的个人学习闭环。项目保持 single-user personal system 和 local-first 定位，不以 SaaS 或多人平台为目标。

## Highlights

- 复习中心与简单间隔复习
- 练习中心、客观题判分和主观题自评
- 当前错题本与历史作答记录
- 学习统计和课程统计
- Review ↔ Practice 联动
- 数据安全和完整发布验证

## Review Center

Review Result 包含：

- 忘记
- 模糊
- 记得
- 熟练

简单间隔调度使用 1、3、7、14、30 天间隔，并保留 ReviewRecord 历史记录。系统支持到期、手动、逾期和未来 7 天复习队列，每个知识点保持单一有效 schedule。

## Practice Center

Practice Center 支持：

- SINGLE_CHOICE
- MULTIPLE_CHOICE
- TRUE_FALSE
- FILL
- SHORT_ANSWER
- CALCULATION
- COMPREHENSIVE

客观题由服务端判分，主观题由用户自评。PracticeAttempt 采用 append-only 作答历史，当前错题由最新一次 PracticeAttempt 确定。

## Wrong Answers

当前错题本按 latest PracticeAttempt 判断。答对后题目会移出当前错题本，旧 Attempt 记录继续保留，便于回顾历史错误。

## Learning Statistics

统计页提供：

- 学习状态
- Review statistics
- Practice statistics
- Current wrong
- 最近 14 天活动
- Course statistics

14 天活动只基于 `ReviewRecord.reviewedAt` 和 `PracticeAttempt.attemptedAt`，不代表完整学习时长或完整每日浏览记录。

## 安装与数据库升级

新数据库：

```powershell
npm ci
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

已有 v0.1 数据库升级前先备份，再执行迁移和只读检查：

```powershell
npm run db:backup
npm run db
npm run db:check
```

不要使用 `db:setup` 升级已有个人数据库，也不要使用 `prisma migrate reset`。`db:setup` 只用于初始化新数据库。

正常版本升级不需要执行 restore。发布验证中的 restore round-trip 仅使用 disposable SQLite。若真实个人数据库需要灾难恢复，请先停止 Next.js、Prisma 等写入进程，按照 [`BACKUP_RESTORE.md`](BACKUP_RESTORE.md) 运行：

```powershell
npm run db:restore -- 'backups/<backup>.db' --confirm
npm run db:check
```

请将 `<backup>` 替换为实际备份文件名。恢复前工具会自动创建 pre-restore backup。

## 数据库变更

v0.2.0 使用 additive migration 新增：

- `PracticeQuestionOption`
- `PracticeAttempt`

已有 migration 未修改。Knowledge Bundle v1 不包含个人学习数据、PracticeAttempt、ReviewRecord、Note 或 Favorite，Bundle 边界保持不变。

## 数据安全

- `npm run db` 只执行 Prisma migration。
- `npm run db:check` 只读，不修复或删除数据。
- `npm run db:backup` 创建 SQLite 完整备份。
- `npm run db:restore` 恢复前自动备份，并要求 `--confirm`。
- 验证使用隔离 SQLite，不对真实个人数据库执行 seed、restore 或 reset。

## 当前边界

项目是 single-user personal system，`/admin` 尚未接入 Authentication，仅适合本机或可信网络。当前没有 PWA、Android、个人云端、自动备份服务、offline writes、图片上传、MediaAsset、RAG、Vector DB、复杂知识图谱、多用户或语音面试。这些属于 v0.3+ 或 Post-v1 产品边界，不是 v0.2.0 缺陷。

## 下一阶段

v0.3.0 Mobile & Personal Cloud：PWA、Android install、single-user Authentication、self-hosted deployment、server-side SQLite、scheduled backup，以及桌面和手机访问同一个 canonical data source。第一版不实现双向离线 SQLite 合并同步。
