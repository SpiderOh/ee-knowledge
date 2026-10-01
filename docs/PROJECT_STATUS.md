# PROJECT_STATUS.md

## 当前版本

`v0.1.0-rc.1`

## 当前阶段

第八轮 Release Candidate 完成 MVP 全链路稳定性、SQLite 安全工具和发布检查。正式 `v0.1.0` 还需要代码审查、合并和最终版本确认。

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
- AppShell 与知识点页移动端导航
- 中文 KnowledgeCategory 展示、稳定 sibling 排序和主要空状态
- `docs/BACKUP_RESTORE.md`、`docs/RELEASE_CHECKLIST.md`

## 部分完成

- 搜索课程与教材过滤已提供基础 UI
- 章节树支持递归和折叠，移动端使用顶部上下文导航，教材目录仍以内容区域展示
- 学习工具为单用户本地数据，尚未接入登录和云同步
- 当前版本继续限定在 MVP 结构与内容管理，不扩展复习中心或 AI 功能
- 图片仅支持 Markdown 引用和显示接口，尚未接入上传与媒体库
- `/admin` 当前没有身份认证，仅适合本地使用或可信网络；公网部署前必须增加 Authentication

## 未完成

- v0.1.0 RC 代码审查、阻塞问题修复、合并和最终版本确认
- 真正图片上传、MediaAsset 数据模型和对象存储
- 复习中心、间隔复习和学习统计（v0.2.0）
- Tailwind CSS、shadcn/ui（当前项目使用原生 CSS，尚未初始化）
- AI、RAG、复试训练和多用户能力

## 依赖状态

- Zod：已安装并用于搜索参数校验
- KaTeX：已安装并通过 `remark-math`、`rehype-katex` 配置
- Markdown：已安装 `react-markdown`、`remark-gfm`
- shadcn/ui：尚未初始化

## 下一步

- RC 代码审查、阻塞问题修复、合并和最终版本确认
- v0.2.0 再构建复习中心和更完整的学习统计

## 已知问题

- Windows 环境可能出现 Next.js SWC 原生模块 fallback 警告；只要 build 最终退出码为 0，不影响本轮发布检查。
- `/admin` 尚未接入 Authentication，仅适合本地使用或可信网络。
- 移动端教材目录仍是内容区域中的可折叠目录，没有独立抽屉交互。
- 图片仍只支持 Markdown 引用和显示接口，尚未接入上传与媒体库。

## 数据库

本轮未修改 `prisma/schema.prisma`，没有新增 migration。Knowledge Bundle 不包含 Book、Chapter 或用户学习数据。
