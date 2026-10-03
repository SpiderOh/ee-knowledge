# DECISIONS.md

用于记录重大架构决策。

---

## ADR-001：第一阶段使用 Next.js 单体应用

状态：Accepted

原因：

- 项目初期规模小。
- 开发者不是专业全栈工程师。
- 降低部署和维护成本。
- AI 更容易整体理解项目。

未来：

如果出现真实扩展需求，可再拆分服务。

---

## ADR-002：第一阶段使用 SQLite

状态：Accepted

原因：

- 本地优先。
- 单用户。
- 零运维。
- 容易备份。

未来：

SQLite 继续适合 single-user self-hosted deployment。只有真实并发、multi-user 或 SQLite 成为瓶颈时才考虑 PostgreSQL。

---

## ADR-003：KnowledgePoint 作为核心实体

状态：Accepted

原因：

同一知识点可存在于不同教材中。

教材只是知识组织方式，不应决定知识实体唯一性。

---

## ADR-004：AI Provider 必须抽象

状态：Accepted

原因：

项目不能绑定 ChatGPT/OpenAI。

未来应能替换 Claude、Gemini 或本地模型。

---

## ADR-005：第一阶段不做 RAG

状态：Accepted

原因：

先把结构化知识库做好。

RAG 是增强功能，不应反过来决定核心数据结构。

---

## ADR-006：MVP 学习进度按学习状态计算

状态：Accepted

规则：

- 课程进度 = `status != NOT_STARTED` 的课程知识点数 / 课程知识点总数 × 100，并四舍五入为整数。
- 第一次设置为非 `NOT_STARTED` 时创建学习记录，`studyCount` 为 1，并写入 `lastStudiedAt`。
- 状态切换到另一个非 `NOT_STARTED` 状态时增加 `studyCount` 并更新 `lastStudiedAt`。
- 重复设置相同状态不增加次数；切回 `NOT_STARTED` 只更新状态并保留历史次数和最近学习时间。

原因：

本轮先提供可理解、可验证的学习浏览链。掌握度和间隔复习需要独立的复习记录与算法，暂不混入 MVP 进度指标。

---

## ADR-007：专业内容采用 Markdown 与结构化实体混合模式

状态：Accepted

规则：

- 定义、原理、物理意义等长文本使用 Markdown 保存和渲染。
- `Formula`、`Example`、`KnowledgeRelation` 继续作为结构化实体保存。
- Markdown 不启用原始 HTML 解析，统一通过安全渲染组件输出。

原因：

Markdown 能支持公式、表格、代码和列表等专业内容；结构化实体便于公式速查、案例筛选和关系导航，两者职责不同，应同时保留。

---

## ADR-008：图片先建立渲染与 Provider 抽象

状态：Accepted

规则：

- 图片引用通过 `KnowledgeImage` 渲染。
- 媒体来源通过 `MediaProvider` 接口解析，当前使用直接 URL Provider。
- 第一阶段不建立 `MediaAsset` 表，不实现上传和对象存储。

原因：

当前图片的复用、版权、来源和上传需求还未稳定。先隔离渲染层和存储层，避免过早绑定数据库或云厂商。

---

## ADR-009：Knowledge Bundle v1 使用 slug 作为知识实体标识

状态：Accepted

跨系统内容使用 SubjectArea、Course、KnowledgePoint 的 slug，以及 Formula、Example 的 package-local key。Bundle 不暴露内部 cuid，避免导入格式绑定某个数据库。

---

## ADR-010：知识导入采用 Merge / Upsert

状态：Accepted

导入只创建或更新 Bundle 明确提供的内容，不删除 Bundle 缺失的数据。这样可以安全接收部分 AI 生成文件，避免不完整文件误删已有知识。

---

## ADR-011：Book / Chapter 不进入 Knowledge Bundle v1

状态：Accepted

当前教材和章节没有稳定的跨库自然标识。本轮 Bundle 只处理知识内容；教材结构未来由独立 Library Bundle 设计，不为导入格式修改 Book 或 Chapter Schema。

---

## ADR-012：结构实体后台采用保守删除策略

状态：Accepted

虽然数据库存在 Cascade 或 SetNull，Admin 删除结构实体前必须检查下游结构和业务内容。只有没有下游依赖的空结构实体才允许删除，避免误操作破坏教材树、知识关联或用户学习数据。

---

## ADR-013：Book 与章节知识点保持 Course 一致

状态：Accepted

ChapterKnowledgePoint 建立关联，以及 Book 更换 Course 时，应用层要求 KnowledgePoint.courseId 与 Chapter.book.courseId 一致。该规则不引入数据库约束，保证课程浏览、教材上下文和搜索筛选的语义一致。

该一致性是应用层 invariant，而不是某个页面或单一操作的 UI 规则。所有可修改 `Book.courseId`、`KnowledgePoint.courseId` 或 `ChapterKnowledgePoint` 的写路径都必须遵守它：章节关联、教材换课、知识点换课和 Knowledge Bundle 更新已有知识点课程时统一查询该知识点的全部章节关联；任一关联教材属于其他课程时拒绝写入。Bundle 预览可以按课程 slug 提前检查，真正导入必须在事务内再次检查；任何路径都不得自动解除章节关联或自动移动教材。

---

## ADR-014：v0.2 复习中心采用 ReviewRecord 加简单间隔调度

状态：Accepted

规则：

- 复习中心从 `ReviewRecord.nextReviewAt` 和 `StudyProgress.status=REVIEW` 生成到期与手动队列。
- 每次复习写入一条 `ReviewRecord`，并清空同一知识点旧的有效计划，保证只有一个有效计划。
- 结果使用 0 忘记、1 模糊、2 记得、3 熟练；GOOD/EASY 都属于连续成功结果并推进阶段，EASY 比 GOOD 快一档；AGAIN/HARD 重置为 1 天。
- 复习结果同步 `StudyProgress`，但不改变 `ReviewRecord`、`PracticeQuestion` 或用户数据的核心关系。

原因：

先提供可验证的 Review Center 基础闭环，保持数据模型稳定，待后续版本再评估 FSRS、SM-2、练习题和统计需求。

---

## ADR-015：PracticeAttempt 只追加，错题本使用最近一次作答

状态：Accepted

每次提交都写入一条 PracticeAttempt，不更新或删除历史记录。错题本只显示同一题最近一次作答为错误的题目；重新答对后，题目从当前错题本消失但历史仍保留。

## ADR-016：有作答记录的练习题锁定语义字段

状态：Accepted

题目已有 PracticeAttempt 后，题型、题干、标准答案和选择项不可修改，也不可删除；解析和难度仍可调整。这样可以保证历史判定在内容变更后仍可解释。

客观题提交必须由 Server Action 验证合法选项；最近一次作答统一使用 `attemptedAt DESC, id DESC` 排序，避免相同时间戳导致错题本结果不确定。

---

## ADR-017：学习统计使用现有学习数据语义

状态：Accepted

规则：

- `StudyProgress` 只用于当前状态与课程进度，不作为历史事件流。
- 最近 14 天活动只统计 `ReviewRecord.reviewedAt` 与 `PracticeAttempt.attemptedAt`。
- 当前错题按每道题最新一次 `PracticeAttempt`（`attemptedAt DESC, id DESC`）确定。
- 复习待办与逾期数量复用 `getReviewOverview`，避免统计页和复习中心产生两套语义。

原因：

在不修改 Prisma Schema、不引入 StudyEvent/StudySession/LearningLog 的前提下，提供可解释且可验证的学习统计。

---

## ADR-018：复习与练习通过知识点上下文联动

状态：Accepted

规则：

- 复习知识点页只在存在练习题时显示 `/practice?knowledgePoint=<slug>` 入口。
- 练习错误结果和错题本回到 `/review/<knowledgePointSlug>`。
- 统计页展示复习与练习汇总，但不写入额外学习事件。

原因：

保持 ReviewRecord、PracticeQuestion、PracticeAttempt 和 KnowledgePoint 的现有关系，先完成基础学习闭环，再由后续版本评估更复杂的推荐和历史模型。

---

## ADR-019：个人版采用服务器单一数据源

状态：Accepted

规则：

- EE Knowledge 定位为 single-user personal system，不为假想 SaaS 增加多用户、注册、组织或 RBAC 复杂度。
- v0.3 的个人云端使用服务器端 SQLite 作为 canonical data source，桌面浏览器和 Android PWA 作为客户端。
- 远程访问通过 single-user Authentication 保护个人服务器；Android 应用卸载不会删除服务器数据。
- 第一版个人云端不是手机 SQLite 与服务器 SQLite 的双向离线合并同步；offline-first edits 不是强制目标。
- 部署到服务器不自动引入 PostgreSQL，只有真实并发、multi-user 或 SQLite 瓶颈出现时才重新评估。

原因：

这是个人长期维护项目。优先保持简单、稳定、可备份和低维护成本，把 PWA、Android 安装体验、自托管和自动备份放入 v0.3，避免提前建设商业平台基础设施。

---

## ADR-020：Personal v1.0 聚焦长期知识学习，不建设独立复试/AI 子系统

状态：Accepted

规则：

- v1.0 目标是利用闲暇时间长期、全面地学习电子信息专业知识。
- 常见问法、标准回答和易错点属于 KnowledgePoint 内容增强。
- 不建设独立复试题库、模拟复试或目标院校专区作为 v1.0 主路线。
- AI Assistant、AI Provider 和云端 AI API 移到 Post-v1 / Optional Local AI。
- 已存在的 School / Interview 相关 Schema 暂时保留，避免无收益的破坏性 migration。

原因：

个人版应优先完成稳定的知识积累、复习、练习和学习统计闭环，避免把独立的复试与 AI 子系统提前变成长期维护负担。

---

## ADR-021：使用环境变量凭证与无状态签名 Session 实现单用户认证

状态：Accepted

规则：

- 只支持一个个人账户，不建立 User、Account、Session、Role 或 Permission 表。
- 密码使用 Node 内置 `crypto.scrypt` 生成 hash，服务端只读取 `EE_AUTH_PASSWORD_HASH`。
- Session 使用 HMAC-SHA256 签名的 `ee_session` HttpOnly cookie，默认有效期 30 天。
- Session 签名同时依赖 `EE_AUTH_SESSION_SECRET` 和密码 hash，任一配置改变都会使旧 session 失效。
- middleware 只做 Edge-compatible path 与 session 校验，不查询 Prisma，不执行业务逻辑。
- 缺少或无效配置时 fail closed；登录、退出和公开 PWA 资源保持最小公开例外。

原因：

单用户 self-hosted 场景不需要注册、多用户、OAuth 或数据库 session。环境变量凭证和无状态 cookie 能保持部署简单，并且不改变现有个人数据模型。

---

## ADR-022：Personal self-host 使用 Native Node、systemd 与 Caddy

状态：Accepted

规则：

- 应用代码部署到 `/opt/ee-knowledge`，由非 root `ee-knowledge` 用户运行。
- 生产环境变量放在 `/etc/ee-knowledge/ee-knowledge.env`，生产 SQLite 放在 `/var/lib/ee-knowledge/ee-knowledge.db`，数据库不进入仓库。
- Next.js 只监听 `127.0.0.1:3000`，Caddy 负责公网 HTTPS 和反向代理。
- systemd 启动前依次执行 `deploy:check`、`db` 和 `db:check`，禁止自动执行 `db:seed`、`db:setup` 或 `migrate reset`。
- 本轮不引入 Docker、Kubernetes、PM2、PostgreSQL 或云厂商 SDK；scheduled backup 属于下一 alpha。

原因：

Native Node + systemd + Caddy 能覆盖 Debian/Ubuntu、ARM64 Orange Pi/RK3588 和 x86_64 VPS，同时保持 single-user personal system 的低维护成本和服务器 SQLite 单一数据源。

---

## ADR-023：Scheduled backup 使用 SQLite online backup 与 mounted secondary filesystem

状态：Accepted

规则：

- 现有 `db:backup` 保持 cold manual backup 语义；scheduled backup 使用系统 `sqlite3` CLI 的 online backup 能力，不直接复制正在使用的生产数据库。
- scheduled backup 先写入 `.partial`，通过 SQLite `integrity_check` 后再原子重命名为 Primary final backup。
- Primary 可以与生产 SQLite 位于同一主盘，用于误删、逻辑损坏和错误更新前恢复。
- `EE_BACKUP_SECONDARY_DIR` 为空时只执行 Primary；配置后必须存在、可写且位于不同 filesystem，复制后同时验证 SHA-256 和 SQLite integrity。
- Secondary 使用 Linux mounted filesystem 作为外部存储抽象，不内置 S3、WebDAV、rclone、SSH 或其他云协议。
- retention 只删除严格匹配的 scheduled backup 文件；任何失败都不自动 restore、替换生产库或停止主应用。

原因：

个人 single-user self-host 需要每日可靠备份和可选独立存储，但不需要备份数据库模型或远程存储协议。systemd service/timer 将备份故障与主服务故障隔离，同时让失败进入 journal。


---

## ADR-024：KnowledgePoint 学习内容复用现有问答关系

状态：Accepted

`commonMistakes` 与 `masteryCriteria` 作为 KnowledgePoint 可选正文列；常见问法复用现有 `InterviewQuestion`/`InterviewAnswer` 关系，按 `SHORT_30S`、`MEDIUM_1MIN`、`DEEP` 映射用户可见回答。管理端嵌入 KnowledgeEditor，前台只读展示，不建设独立复试题库或新的问答数据模型。Bundle v1 通过可选字段和 `questions` 扩展保持向后兼容。

---

## ADR-025：快速学习保持只读并按学习状态优先级选择

状态：Accepted

规则：

- `/quick-learn` 只读取 KnowledgePoint、Course 和 StudyProgress，不写入 StudyProgress、ReviewRecord、PracticeAttempt、Favorite 或 Note。
- 选择优先级固定为 `REVIEW > LEARNING > NOT_STARTED > MASTERED`；没有 StudyProgress 行的知识点属于 `NOT_STARTED`。
- 每个非空分桶只查询一条记录，使用 `count + skip` 进行可注入的随机偏移；支持课程范围和排除当前知识点，排除后无候选时最多重试一次。

原因：

快速学习服务于零碎时间入口，应能立即打开一个可读知识点，同时保持现有学习记录语义稳定，不引入推荐历史、学习事件或新的数据模型。

## ADR-026：个人资料导入先做文本基础层

状态：Accepted

- v0.5.0-alpha.1 只支持 Markdown 和 TXT，统一走 UTF-8 文本提取。
- 文件大小上限为 2 MB，拒绝 NUL 和无效 UTF-8，原始文件不落盘。
- 用户必须手工确认课程、标题、slug、类别、正文和来源元数据。
- 课程只能选择已有 Course；不从个人资料自动创建课程、教材或章节。
- 预览生成草稿快照，确认时必须匹配当前草稿。
- 个人资料导入只允许创建新 KnowledgePoint，已有 slug 直接阻止，不覆盖正式内容。
- 复用 Knowledge Bundle v1 preview/import 服务，不改 Prisma schema，不写学习数据；PDF/DOCX 留到 alpha.2。
