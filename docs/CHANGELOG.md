# Changelog
## 0.3.0-alpha.4 - 2026-10-02

### Added

- SQLite online scheduled backup，不停止运行中的主应用。
- daily systemd backup service/timer、Primary retention 和 `verify:backup`。
- 可选 mounted Secondary backup destination，使用同一文件名复制。
- Secondary SHA-256、SQLite `integrity_check` 和 `.partial` 原子完成流程。
- 分离 cold、人工 live 与 scheduled backup filename namespace，避免 retention 误删手动备份。

### Safety

- 配置的 Secondary 与 Primary 位于同一 filesystem 时 fail closed。
- Secondary 失败时保留已完成的 Primary backup。
- Primary-only systemd 不再要求可选 Secondary 挂载点；Secondary 复制前重新检查 filesystem，并清理失败的本轮 `.partial`。
- 不自动 restore；retention 只清理严格匹配的 scheduled backup 文件名。
- 未引入 S3、WebDAV、rclone 或其他 cloud SDK。

### Database

- 未修改 Prisma Schema、migration 或 Knowledge Bundle。

### Next

- v0.3.0-rc.1：Mobile & Personal Cloud End-to-End Regression。

## 0.3.0-alpha.3 - 2026-10-02

### Added

- Native Node + systemd self-host deployment template，使用非 root `ee-knowledge` 服务用户。
- Caddy HTTPS reverse proxy 模板，Next.js 生产服务只监听 `127.0.0.1:3000`。
- production environment template、absolute server SQLite 路径和 `deploy:check` / `verify:deploy`。
- `docs/SELF_HOST.md`，覆盖 Debian/Ubuntu、ARM64 Orange Pi/RK3588 和 x86_64 VPS。
- 修复 production EnvironmentFile 与手动命令边界，补齐 `/var/backups/ee-knowledge` 权限说明。
- 明确 Next dotenv literal `$` 与 systemd raw password hash 的区别，并增加 `--dotenv` 输出。

### Database

- 生产 SQLite 位于仓库外的 `/var/lib/ee-knowledge/ee-knowledge.db`。
- 未修改 Prisma Schema 或 migration；生产启动不自动 seed。

### Not included

- scheduled backup、secondary backup destination、Docker、Kubernetes、PM2、PostgreSQL 和 Local AI。

### Next

- v0.3.0-alpha.4：Scheduled Backup + Secondary Backup Destination。

## 0.3.0-alpha.2 - 2026-10-02

### Added

- single-user Authentication、登录/退出和 `verify:auth`。
- 环境变量密码 hash、HMAC-SHA256 签名 HttpOnly session cookie 和认证配置脚本。

### Security

- private-by-default middleware，页面未认证跳转登录，API 未认证返回 401。
- safe `next` redirect，密码不写入明文存储、URL 或日志。
- 修复认证成功后的 safe `next` redirect。
- 修复 password hash CLI 的 Unicode 输入和 non-TTY 双行读取。

### Product Scope

- v1.0 聚焦长期知识学习、复习、练习和个人自托管使用。
- 独立复试题库、模拟复试和目标院校专区退出 v1.0 主路线。
- AI Assistant 移到 Post-v1 / Optional Local AI。
- KnowledgePoint 常见问法和标准回答保留为后续轻量内容增强。

### Next

- v0.3.0-alpha.3：Self-host Deployment + HTTPS + Server SQLite。

## 0.3.0-alpha.1 - 2026-10-02

### Added

- App Router PWA manifest 和 Android 安装图标资源（192x192、512x512、maskable）。
- 移动端 / PWA metadata、standalone display 和 `verify:pwa` 验证脚本。
- `docs/PWA_ANDROID.md`，说明 Web PWA、Android 安装、服务器数据和离线边界。

### Changed

- 增加移动端 safe-area、standalone spacing、触摸区域和动态内容溢出保护。
- Next.js 从 15.5.26 更新到 15.5.27 Maintenance LTS patch。

### Not included

- Authentication、server deployment、scheduled backup、offline writes、Capacitor / APK 和多用户。

### Next

- v0.3.0-alpha.2：Single-user Authentication。

## 0.2.0 - 2026-10-02

### Highlights

- 完成复习、练习、错题和统计组成的个人学习闭环。
- 保持 single-user / local-first 产品边界。
- 完成 v0.2 数据安全与发布验证。

### Review

- Review Center 支持到期、手动、逾期和未来 7 天复习队列。
- 支持忘记、模糊、记得、熟练结果与 1/3/7/14/30 天简单间隔。
- 保留 ReviewRecord 历史，并保持单一有效 schedule。

### Practice

- Practice Center 支持 SINGLE_CHOICE、MULTIPLE_CHOICE、TRUE_FALSE、FILL、SHORT_ANSWER、CALCULATION 和 COMPREHENSIVE。
- 客观题服务端判分，主观题用户自评。
- PracticeAttempt 采用 append-only 历史。

### Wrong Answers

- 当前错题按最新 PracticeAttempt 判断。
- 答对后自动移出当前错题本，历史错误记录保留。

### Statistics

- 提供学习状态、复习统计、练习统计、当前错题、最近 14 天活动和课程统计。

### Data Safety

- 保持 PracticeQuestionOption / PracticeAttempt additive migration。
- 提供 db:backup、db:restore、db:check 和隔离验证。
- Knowledge Bundle 边界保持不变。

### Next

- v0.3.0 Mobile & Personal Cloud。

## 0.2.0-rc.1 - 2026-10-02

### Changed

- 冻结 v0.2.0 功能范围，完成 RC 全量回归与发布文档更新。
- 将长期 Roadmap 收敛为 single-user personal system，定义 v0.3.0 Mobile & Personal Cloud。
- 明确 SQLite 继续适用于 single-user self-hosting，不因部署自动引入 PostgreSQL。

### Verified

- 完成 v0.1 知识库工作流、Review、Practice、错题本、Statistics、数据库安全和移动端回归检查。

### Database

- 无新的 Schema 变更。
- 无新的 migration，现有 PracticeQuestionOption / PracticeAttempt additive migration 保持不变。

## 0.2.0-alpha.3 - 2026-10-02

### Added

- 新增学习统计页 `/statistics`，展示知识点状态、复习/练习次数与成功率、当前错题、最近 14 天活动和课程统计。
- 新增统计聚合与隔离数据库验证 `verify:statistics`，并纳入 `verify:mvp`。

### Changed

- AppShell 增加学习统计导航，首页增加统计、练习和错题本快捷入口。
- 复习知识点页显示对应练习题数量和练习入口；错误练习结果与错题本增加返回知识点复习入口。

### Safety

- 不修改 Prisma Schema、migration 或用户学习数据结构。统计历史只使用 ReviewRecord.reviewedAt 与 PracticeAttempt.attemptedAt，当前错题使用最新作答确定性排序。

## 0.2.0-alpha.2 - 2026-10-01

### Added

- 新增 `/practice`、`/practice/[id]` 和 `/wrong-answers`，支持课程、题型、难度和知识点筛选。
- 新增 PracticeAttempt、PracticeQuestionOption、客观题服务端判分、主观题自评、作答历史和最近一次错题判定。
- 新增 KnowledgePoint 管理页练习题编辑、作答后的题目语义锁和删除保护。
- 新增 5 道稳定 ID Demo 题与 `verify:practice` 隔离数据库验证。

### Database

- 仅新增 PracticeQuestionOption、PracticeAttempt 两张表及索引，保留现有 PracticeQuestion 字段和 Knowledge Bundle v1 边界。

### Safety

- PracticeAttempt 只追加不覆盖，错题本依据同一题最近一次作答；练习不会写入 StudyProgress 或 ReviewRecord。

## 0.2.0-alpha.1 - 2026-10-01

### Added

- 新增复习中心 `/review`、到期复习队列、手动加入队列和未来 7 天安排。
- 新增复习会话 `/review/[slug]`、主动回忆、复习结果按钮和复习历史。
- 新增 ReviewRecord 写入与简单 1/3/7/14/30 天间隔调度，连续记忆结果推进间隔，忘记后重置。
- 新增 `verify:review` 隔离数据库验证，并纳入 `verify:mvp`。

### Safety

- 不修改 Prisma Schema 或 migration；每个知识点只保留一个有效 `nextReviewAt` 计划。
- 复习结果写入同时更新 StudyProgress，真实数据库检查保持只读。

## 0.1.0 - 2026-10-01

### Highlights

- 完成电子信息专业本地优先知识库 MVP，覆盖 Course → Book → Chapter → KnowledgePoint 阅读链。
- 提供搜索、收藏、笔记、学习状态和课程进度，以及内容管理和结构管理。

### Knowledge System

- 支持 SubjectArea、Course、Book、递归 Chapter Tree、KnowledgePoint、Formula、Example、KnowledgeRelation 和 ChapterKnowledgePoint。
- 提供稳定教材阅读顺序和上一/下一知识点导航，正文支持 Markdown、GFM 和 KaTeX。

### Learning Tools

- 支持 StudyStatus、Favorite、Note、Course Progress 和 Recent Study。
- 完整复习中心、练习题和学习统计规划在 `v0.2.0`。

### Administration

- 支持 KnowledgePoint、Formula、Example、Relation、教材章节关联，以及 SubjectArea、Course、Book、Chapter Tree 管理。
- 提供安全删除和 Course consistency invariant。

### Data Portability

- 提供 Knowledge Bundle v1 的校验、Preview、Merge/Upsert 和稳定导入导出。

### Data Safety

- `npm run db` 仅执行 Migration，Demo Seed 显式执行。
- 提供 `db:check`、`db:backup`、`db:restore`、恢复前备份和隔离验证数据库。
- Knowledge Bundle 不包含用户学习数据，也不替代完整 SQLite 备份。

### Release Quality

- 提供统一 404、Error Boundary、移动端导航、主要空状态、中文 Enum 和基础 Accessibility。
- 保持 local-first，不依赖运行时 Google Fonts。

### Known Limitations

- `/admin` 当前无 Authentication，仅用于本机或可信网络。
- 暂无图片上传、MediaAsset、复习中心、AI 和 RAG；这些属于后续产品路线。

## 0.1.0-rc.1 - 2026-10-01

### Added

- 新增非破坏性的 `npm run db`、明确的 `npm run db:setup` 和 Demo Seed 边界说明。
- 新增隔离 SQLite 的 `verify:mvp`、只读 `db:check`、`release:check` 以及 SQLite CLI 备份/恢复。
- 新增统一错误边界、移动端导航、RC 发布清单和完整数据库备份说明。

### Fixed

- 移除外部 Google Fonts 运行时依赖，校准 README、架构和项目状态中的实际技术栈。
- 补充主要空状态、中文知识类别和稳定的课程/教材排序。
- 修复 RC 导航重复入口，统一课程、搜索、收藏和管理入口，并补齐移动端管理入口。
- 修复管理教材章节无效参数的 404、课程/教材/知识点/管理空状态和 404 快捷入口。
- 统一审核状态标签，补充章节折叠控件 ARIA、表单错误提示和键盘焦点样式。
- README 与发布清单改用 `npm ci`，明确真实数据库检查、备份和恢复步骤。

## 0.1.0-alpha.6 - 2026-10-01

### Added

- 新增 SubjectArea、Course、Book 管理和 `/admin/structure`。
- 新增递归 Chapter 树形管理、创建、编辑、移动和删除。
- 新增搜索课程与教材筛选 UI、未分类 Course 展示和 `verify:structure`。

### Safety

- SubjectArea 有 Course、Course 有 Book/KnowledgePoint、Book 有 Chapter、Chapter 有子章节或知识点关联时禁止删除。
- 增加 Chapter parent cycle、跨 Book parent、descendant level 和 Book/KnowledgePoint Course 一致性校验。

### Fixed

- 统一校验 KnowledgePoint 换课、教材换课、章节关联和 Knowledge Bundle 预览/导入中的 Course 一致性，并在导入事务内二次复核。
- 移除 StructureForm 的不安全类型断言，补充 ChapterAdminTree 循环数据兜底和结构验证覆盖。

## 0.1.0-alpha.5 - 2026-09-30

### Added

- 新增内容管理后台 `/admin` 和 KnowledgePoint 分页管理。
- 新增 KnowledgePoint 创建、编辑、安全删除以及 Formula、Example、Relation 和教材章节关联管理。
- 新增 Knowledge Bundle v1 的 JSON 校验、预览、Merge/Upsert 导入和稳定导出。
- 新增 `docs/CONTENT_FORMAT.md`、Bundle 示例和 `npm run verify:content`。

### Safety

- 管理后台当前未认证，仅适合本地或可信网络。
- 知识点存在学习记录、收藏、笔记或复习记录时禁止删除。
- Knowledge Bundle 不包含用户学习数据，不删除 Bundle 缺失内容。
- 导入内容默认保留 AI 草稿审核状态，不自动标记为 VERIFIED。

### Fixed

- 修复 Markdown Preview 状态下保存导致五个 Markdown 字段被清空的问题。
- 将 Import Confirmation 绑定到已成功预览的 JSON 内容，JSON 改变后必须重新预览。
- 修复已有 Course、SubjectArea 未在 Bundle 中重复声明时的引用导入。
- 加固 Formula、Example、Relation 和 ChapterKnowledgePoint 的 ownership 校验。
- 加固 Formula、Example 的 `db:` key，禁止劫持其他知识点的记录。
- 修复空 Course 导出，并按 sourceSlug、relationType、targetSlug 稳定排序关系。
- 修复管理后台空 `reviewStatus` 清空 q/course 筛选的问题，非法状态也不会覆盖合法筛选条件。
- 修复跨数据库 `db:` key 使用确定性 fallback 后预览 create/update 计数不一致的问题。
- 加固 Formula、Example 确定性 fallback ID 的 ownership 校验，并保持原知识点归属。
- 明确 Bundle 部分更新语义：字段省略保留原值，显式 null 清除可空字段，新增记录的 sortOrder 默认为 0。
- 配置 Server Action 传输上限为 3 MB，使 2 MB Knowledge Bundle 应用限制可以正常生效。
- 修正 PROJECT_STATUS 中 v0.1.0 MVP 与 v0.2.0 复习阶段的边界。

## 0.1.0-alpha.4 - 2026-09-30

### Added

- 新增统一 `MarkdownRenderer`，支持 Markdown、GFM、代码、表格、链接和 KaTeX 数学公式。
- 新增结构化 Formula、Example、KnowledgeRelation 展示组件。
- 新增 `KnowledgeImage` 和 `MediaProvider` 图片显示接口。
- 扩展 Demo Seed，增加 KCL/KVL 公式、KCL 示例和少量知识关系，并保持幂等。
- 新增 `docs/MEDIA.md`。

### Changed

- KnowledgePoint 正文统一通过 Markdown 内容渲染层显示。
- 项目版本更新为 `v0.1.0-alpha.4`。

### Fixed

- 修复对称知识关系重复显示，并清理 Demo 中反向 RELATED 镜像。
- 加固 Markdown 链接和图片 URL 的安全判断。
- 调整知识点正文中的公式、物理意义和工程意义展示顺序。

### Not included

- 本轮未实现图片上传、MediaAsset 表、对象存储、AI、RAG 或复习中心。

## 0.1.0-alpha.3 - 2026-09-30

### Fixed

- 修复新增笔记使用客户端假 ID，创建成功后直接使用数据库返回的真实记录。
- 修复知识点间导航时学习状态、收藏和笔记组件的客户端状态串页。
- 修复编辑笔记后未按 `updatedAt desc` 移动到列表顶部的问题。
- 修复笔记操作 pending 时仍可重复编辑或删除的问题。

### Added

- 新增知识点学习状态操作，并记录学习次数和最近学习时间。
- 课程进度改为按已开始学习的知识点计算。
- 新增知识点收藏、`/favorites` 收藏列表和首页收藏入口。
- 新增个人笔记的创建、编辑和删除。
- 首页新增已学习知识点、需要复习和最近学习数据。
- 新增 ADR-006，记录 MVP 学习进度算法。

### Changed

- 知识点查询包含收藏和按更新时间倒序的笔记上下文。
- 项目版本更新为 `v0.1.0-alpha.3`。

## 0.1.0-alpha.2 - 2026-09-30

### Fixed

- 修复 Demo Seed 重复的 `ChapterKnowledgePoint` 关联。
- 清理 Demo 教材的 Seed 历史残留，保持重复执行幂等。
- 修复章节 `sortOrder`，明确教材阅读顺序。
- 修复跨章节上一/下一知识点导航。
- 修复教材知识点数量按唯一 `KnowledgePoint` 统计。
- 修复无效 `bookId` 不应覆盖合法知识点上下文的问题。
- 移除教材页和知识点页的双重类型断言。

### Added

- 新增教材稳定深度优先阅读顺序查询。
- 新增 `/search` 全局搜索页面。
- 支持 KnowledgePoint、Course、Book 搜索。
- 支持课程过滤。
- 使用 Zod 校验搜索参数。
- 新增 `npm run verify:demo` Demo 数据验证脚本。
- 修复空筛选参数导致合法搜索词被清空的问题。

## 0.1.0-alpha.1 - 2026-09-30

- 修正项目状态，正式版本仍等待 MVP 主链完成。
- 新增课程列表、课程详情、教材详情和知识点详情路由。
- 新增按专业方向分组的课程浏览和学习进度展示。
- 新增支持 `Chapter.parentId` 的递归、可折叠章节树。
- 扩充电路原理演示数据为 4 个章节和 10 个知识点。
- 抽离课程、教材、知识点查询函数与基础展示组件。
