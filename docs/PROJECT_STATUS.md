# PROJECT_STATUS.md

## 当前版本

`v0.6.0`

## 当前阶段

第一阶段 Knowledge Base MVP、v0.3.0 Mobile & Personal Cloud、v0.4.0 Knowledge Learning Polish 与 v0.5.0 Personal Material Import 已完成并正式发布。v0.6.0-alpha.1 Data Safety & Restore Regression、v0.6.0-alpha.2 Mobile & Self-host 与 v0.6.0-rc.1 Full-system Regression & Documentation 已完成。当前为 v0.6.0 Stable Promotion，等待 stable PR 合并和最终 main CI。

## 已完成

- 首页、课程、教材、递归章节树和知识点阅读链
- Demo Seed 幂等同步，仅清理 `demo-circuit-book` 的旧章节关联
- Demo 章节 `sortOrder` 和稳定深度优先教材阅读顺序
- 跨章节上一/下一知识点导航
- 教材唯一知识点计数
- 无效 `bookId` 上下文忽略处理
- 基础全局搜索：KnowledgePoint、Course、Book
- 搜索 `course` 过滤
- Zod 搜索参数校验与长度限制
- Demo 数据验证脚本 `npm run verify:demo`
- 学习状态操作：未学习、学习中、已掌握、需要复习
- 按已开始学习的知识点计算课程进度
- 知识点收藏、收藏列表 `/favorites`
- 个人笔记新增、编辑、删除，按更新时间倒序展示
- 首页已学习知识点、需要复习和最近学习
- 知识点查询包含收藏与笔记上下文
- 笔记创建返回真实数据库记录，编辑后按更新时间重新排序
- 知识点切换时学习状态、收藏和笔记组件按知识点 ID 重建
- 统一 Markdown + GFM 内容渲染
- KaTeX 行内和块级公式渲染
- 结构化 Formula、Example、KnowledgeRelation 展示
- KnowledgeImage 图片渲染接口和 DirectMediaProvider 抽象
- Demo Formula、Example、Relation 幂等 Seed 与验证
- 修复对称知识关系重复展示及 Markdown、图片 URL 安全边界
- 内容管理首页和 single-user Authentication 保护的 `/admin`
- KnowledgePoint 分页、搜索、课程过滤、审核状态过滤和 CRUD
- 编辑页 Formula、Example、KnowledgeRelation CRUD
- ChapterKnowledgePoint 关联和移除
- Knowledge Bundle v1 的 Zod 校验、预览、Merge/Upsert 导入和稳定导出
- KnowledgePoint 易错点、掌握标准、常见问法与简短/标准/深入回答 CRUD
- 学习内容搜索、前台 Markdown 展示和隔离学习内容验证
- 快速学习 `/quick-learn`：按 REVIEW > LEARNING > NOT_STARTED > MASTERED 选择知识点，支持课程范围、排除当前知识点和随机偏移
- 移动端 Learning Info 前置、移动端教材目录上下文和窄屏学习操作优化
- Quick Learning course scope consistency：仅保留与当前 KnowledgePoint 课程一致的范围
- 常见问法 summary 窄屏换行与上一/下一知识点移动端触控布局
- `npm run verify:content` 内容传输验证
- PR #4 稳定性修复：Markdown Preview 保存保护、Import Preview 内容绑定、已有 Course/SubjectArea 引用导入、子实体 ownership、`db:` key 防劫持、空 Course 导出和关系稳定排序
- PR #4 本轮修复：管理后台空 reviewStatus 参数归一化、跨数据库 identity 预览计数、确定性 Formula/Example ownership、Bundle 部分更新与 sortOrder 默认语义
- SubjectArea、Course、Book CRUD 与 `/admin/structure`
- Chapter 树形 CRUD、parent/level 一致性和循环防护
- 结构实体保守删除保护
- Book 与 KnowledgePoint 的 Course 一致性校验
- KnowledgePoint 换课、教材换课、章节关联和 Knowledge Bundle 预览/导入共用 Course 一致性校验，并在导入事务内二次复核
- StructureForm 使用结构化输入类型，ChapterAdminTree 增加循环数据兜底
- 搜索课程与教材筛选 UI，未分类 Course 前台和后台可见
- `npm run verify:structure` 结构验证脚本
- `npm run db` 仅执行 Prisma migration，`npm run db:setup` 明确执行 migration + Demo Seed
- 隔离 SQLite 的 `npm run verify:mvp` 和统一 `npm run release:check`
- 只读数据库完整性检查 `npm run db:check`
- SQLite CLI 备份和显式确认恢复：`npm run db:backup`、`npm run db:restore`
- 全局 `app/not-found.tsx` 和 `app/error.tsx`
- RC 导航、课程/教材/知识点/管理空状态、无效管理章节参数 404 和移动端管理入口已完成
- 统一 KnowledgeCategory 与 ReviewStatus 标签，并补充键盘焦点和树形控件 ARIA
- AppShell 与知识点页移动端导航
- 中文 KnowledgeCategory 展示、稳定 sibling 排序和主要空状态
- `docs/BACKUP_RESTORE.md`、`docs/RELEASE_CHECKLIST.md`、`docs/RELEASE_NOTES.md`
- 复习中心 `/review`、到期和手动复习队列、复习会话与知识点复习历史
- ReviewRecord 写入、结果校验、学习状态同步和单一有效复习计划约束
- 简单间隔调度：忘记/模糊 1 天，记得按连续熟练次数 1/3/7/14/30 天，熟练推进间隔
- 隔离数据库复习验证 `npm run verify:review`，并纳入 `npm run verify:mvp`
- 练习中心 `/practice`、练习会话、客观题服务端判分和主观题自评
- PracticeAttempt 历史记录、最近一次错题本 `/wrong-answers` 与 PracticeQuestion 管理
- PracticeQuestionOption、作答后的题目语义锁、删除保护与 5 道固定 ID Demo 题
- `npm run verify:practice` 隔离数据库验证
- 学习统计页 `/statistics`：知识点状态、复习/练习次数与成功率、当前错题、最近 14 天活动和课程统计
- 学习统计查询与聚合工具，零分母比例返回 null，课程进度沿用学习状态算法
- 复习中心与练习中心互相联动，知识点复习页显示练习入口，错题和错误结果可回到复习
- `npm run verify:statistics` 隔离数据库统计验证，并纳入 `npm run verify:mvp`
- PWA manifest、Android 安装元数据和 192/512/maskable 图标
- 移动端 safe-area、standalone spacing、触摸区域和动态内容溢出保护
- `npm run verify:pwa` PWA manifest 与 PNG 资源验证
- Next.js `15.5.26` → `15.5.27` Maintenance LTS patch
- 环境变量密码 hash、签名 HttpOnly session cookie 和 30 天默认 TTL
- `middleware.ts` private-by-default 路由策略，页面未认证跳转登录，API 未认证返回 401
- `/login`、`/api/auth/login`、`/api/auth/logout` 和 AppShell 退出登录
- `crypto.scrypt` 密码 hash、认证 secret 生成脚本和 `verify:auth`
- PWA manifest、图标和 Next 静态资源保持公开
- Native Node + systemd + Caddy 的 Linux self-host deployment 基础
- `start:prod` 只监听 `127.0.0.1:3000`
- 生产环境模板 `/etc/ee-knowledge/ee-knowledge.env` 与绝对 SQLite 路径 `/var/lib/ee-knowledge/ee-knowledge.db`
- 只读生产环境检查 `npm run deploy:check` 和静态部署验证 `npm run verify:deploy`
- `docs/SELF_HOST.md`：Debian/Ubuntu、ARM64 Orange Pi/RK3588 和 x86_64 VPS 部署流程
- SQLite online scheduled backup：主应用运行时生成一致性快照
- daily systemd backup service/timer，使用 `EnvironmentFile` 和独立失败状态
- Primary backup retention，严格只清理识别的 scheduled backup 文件
- optional mounted Secondary backup destination，配置后要求不同 filesystem
- Secondary `.partial`、SHA-256、SQLite `integrity_check` 和 Primary 保留保护
- `npm run db:backup:live`、`npm run backup:check`、`npm run backup:scheduled`、`npm run verify:backup`
- `npm run verify:runtime`：使用 disposable SQLite 启动生产构建并验证公开、私有、登录、认证 API、unsafe next 和退出登录
- `.github/workflows/ci.yml`：Node 20、SQLite CLI、migration、db:check 与 release:check CI
- `docs/V0.3_RC_CHECKLIST.md` 与 `docs/V0.3_RELEASE_NOTES.md`
- `docs/V0.4_RC_CHECKLIST.md` 与 `docs/V0.4_RELEASE_NOTES.md`

- 个人资料导入 /admin/material-import：Markdown/TXT、PDF、DOCX 提取，2 MB / 10 MB 限制、人工编辑预览、来源元数据和创建型 KnowledgePoint 导入
- PDF 使用 server-only `pdf-parse` 文本提取，DOCX 使用 `mammoth.extractRawText`；不做 OCR、图片、表格或原始文件持久化
- npm run verify:material-import：文本、PDF、DOCX 安全边界、真实解析器、预览绑定和无学习副作用验证
- v0.5.0-rc.1 回归：资料导入安全边界、create-only 竞态、Bundle v1 合并兼容性和运行时鉴权检查
- v0.5.0 stable code/docs promotion：Personal Material Import stable 范围、Node.js 运行时门禁和发布文档已校准
- v0.5.0 formal release：Tag `v0.5.0`、GitHub Release `EE Knowledge v0.5.0` 和 stable main `3673932602177abf89e1719fe7e3be48fa9267b6` 已验证
- v0.6.0-alpha.1 restore regression：source integrity、sidecar fail-closed、pre-restore backup、staged restore、post-restore integrity 和隔离失败清理已覆盖
- v0.6.0-alpha.2 production preflight：将 `deploy:check` 核心规则抽为可注入 helper，并覆盖有效配置、Node/NODE_ENV/DATABASE_URL/路径/parent/auth 失败分支
- v0.6.0-alpha.2 runtime smoke：覆盖认证后的首页、课程、复习、练习、错题、统计、搜索、收藏、管理和 `/quick-learn` 合法响应契约
- v0.6.0-alpha.2 mobile regression：保留 PWA manifest/icon 验证，固定移动导航 href、安全区、44px 触控区、代码/KaTeX/统计表溢出和窄屏网格 contract
- v0.6.0-alpha.2 target acceptance：新增 Orange Pi/RK3588、systemd、Caddy、backup、Android PWA 和 USB/NAS 人工验收清单；真实目标环境仍未测试
- v0.6.0-rc.1 full-system regression：内容、学习内容、快速学习、复习、练习、统计、认证、部署、备份、PWA、资料导入、MVP、构建和 runtime smoke 已纳入 RC 矩阵
- v0.6.0-rc.1 release documentation：新增 `docs/V0.6_RC_CHECKLIST.md` 与 `docs/V0.6_RELEASE_NOTES.md`
- v0.6.0 stable code/docs promotion：版本、稳定状态、路线图和发布文档已校准，等待 stable PR 合并与最终 main CI
- Node.js 运行时门禁与自托管文档已对齐 `20.x >= 20.16.0` 或 `>= 22.3.0`，并明确排除 Node.js 21.x；新增 RC checklist/release notes

## 部分完成

- 当前无 v0.2.0 未完成阻塞项；图表、每日学习时长和更细粒度复习算法属于后续增强
- v0.3.0 已完成 scheduled backup、secondary backup destination、GitHub CI 和隔离运行时回归；真实 USB/NAS 和 systemd timer 仍需目标环境验收

## 未完成

- v0.6.0：Tag + GitHub Release
- v1.0.0：稳定的长期个人电子信息专业知识系统
- Post-v1 / Optional Local AI：Local AI、AIProvider、RAG、Embedding、Vector DB、复杂知识图谱、独立复试题库、模拟复试、目标院校专区、多用户、商业 SaaS、语音面试、全国院校数据库、FSRS 和复杂推荐算法

## 依赖状态

- Zod：已安装并用于搜索参数校验
- KaTeX：已安装并通过 `remark-math`、`rehype-katex` 配置
- Markdown：已安装 `react-markdown`、`remark-gfm`
- PDF/DOCX：已安装 `pdf-parse` 2.4.5 与 `mammoth` 1.13.0，仅由服务端解析模块使用
- shadcn/ui：尚未初始化

## 下一步

- v0.6.0：Tag + GitHub Release

## 已知问题

- Windows 环境可能出现 Next.js SWC 原生模块 fallback 警告；只要 build 最终退出码为 0，不影响本轮发布检查。
- 真实公网 HTTPS、systemd 服务和 Android 安装仍需在目标服务器上分别验收；本仓库只提供模板和静态检查。
- 移动端教材目录使用内容区域中的原生可折叠目录，后续不默认引入独立抽屉。
- 图片仍只支持 Markdown 引用和显示接口，尚未接入上传与媒体库。
- 真实 Orange Pi/NAS、systemd timer、Caddy HTTPS、Android PWA 和 backup E2E regression 仍需目标环境验收；本机隔离运行时回归已完成。

## 数据库

v0.5.0 未新增 Prisma Schema 或 migration；v0.6.0-alpha.1、v0.6.0-alpha.2、v0.6.0-rc.1 与 stable code/docs promotion 也不新增 Prisma Schema、migration 或 seed；`pdf-parse` 2.4.5 与 `mammoth` 1.13.0 保持冻结，仅用于服务端文档文本提取；复用现有 KnowledgePoint source/sourceBook/sourceChapter/sourcePage 字段和 Knowledge Bundle v1 导入服务。学习统计只读取 StudyProgress 当前状态、ReviewRecord 复习事件和 PracticeAttempt 作答事件，不引入 StudyEvent、StudySession 或 LearningLog；Knowledge Bundle 仍不包含用户学习数据。升级前请先执行 `npm run db:backup`，再执行 `npm run db` 和 `npm run db:check`。

Authentication 使用环境变量凭证和签名 cookie，不写入 SQLite，不新增 User 或 Session 表。
