# PROJECT_STATUS.md

## 当前版本

`v0.2.0-alpha.3`

## 当前阶段

第一阶段 Knowledge Base MVP 已完成。系统已经具备课程、教材、章节、知识点阅读，学习工具，内容与结构管理，Knowledge Bundle、SQLite 数据保护和正式发布验证能力。`v0.2.0` 功能范围基本完成，当前处于 `alpha.3`，下一阶段进入 RC 稳定性与发布准备。

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
- 内容管理首页和未认证的本地管理入口 `/admin`
- KnowledgePoint 分页、搜索、课程过滤、审核状态过滤和 CRUD
- 编辑页 Formula、Example、KnowledgeRelation CRUD
- ChapterKnowledgePoint 关联和移除
- Knowledge Bundle v1 的 Zod 校验、预览、Merge/Upsert 导入和稳定导出
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

## 部分完成

- ReviewRecord 数据层、复习中心、练习中心和学习统计已完成；图表、每日学习时长和更细粒度复习算法属于后续增强，不是当前 `v0.2.0` 必需项

## 未完成

- v0.3.0：复试训练
- v0.4.0：AI Provider、知识生成与 AI 学习能力
- v0.5.0：PDF / Word 等资料自动化
- v0.6.0：RAG
- v0.7.0：知识图谱
- v0.8.0：院校复试资料
- 后续能力：图片上传、MediaAsset、对象存储、Authentication、多用户和云同步

## 依赖状态

- Zod：已安装并用于搜索参数校验
- KaTeX：已安装并通过 `remark-math`、`rehype-katex` 配置
- Markdown：已安装 `react-markdown`、`remark-gfm`
- shadcn/ui：尚未初始化

## 下一步

- v0.2.0-rc.1：回归验证、发布前文档与数据安全检查

## 已知问题

- Windows 环境可能出现 Next.js SWC 原生模块 fallback 警告；只要 build 最终退出码为 0，不影响本轮发布检查。
- `/admin` 尚未接入 Authentication，仅适合本地使用或可信网络；这是当前版本的产品边界。
- 移动端教材目录仍是内容区域中的可折叠目录，没有独立抽屉交互。
- 图片仍只支持 Markdown 引用和显示接口，尚未接入上传与媒体库。

## 数据库

本轮未修改 Prisma Schema 或 migration。学习统计只读取 StudyProgress 当前状态、ReviewRecord 复习事件和 PracticeAttempt 作答事件，不引入 StudyEvent、StudySession 或 LearningLog；Knowledge Bundle 仍不包含用户学习数据。升级前请先执行 `npm run db:backup`，再执行 `npm run db` 和 `npm run db:check`。
