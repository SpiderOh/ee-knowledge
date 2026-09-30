# PROJECT_STATUS.md

## 当前版本

`v0.1.0-alpha.4`

## 当前阶段

第五轮开发完成专业知识内容展示层。正式 `v0.1.0` 仍等待内容管理、公式编辑和复习能力完成。

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

## 部分完成

- 搜索支持课程过滤，教材过滤参数和查询能力已保留，但当前界面未提供教材筛选入口
- 章节树支持递归和折叠，移动端暂时隐藏左侧目录
- 学习工具为单用户本地数据，尚未接入登录和云同步
- 当前 PR 修复已限定为状态一致性和笔记 CRUD 稳定性，不扩展新的学习功能
- 图片仅支持 Markdown 引用和显示接口，尚未接入上传与媒体库

## 未完成

- 知识点 CRUD、管理后台、JSON 导入导出
- 公式、示例和关系的内容编辑工作流
- 真正图片上传、MediaAsset 数据模型和对象存储
- 复习中心、间隔复习和学习统计
- shadcn/ui
- AI、RAG、复试训练和多用户能力

## 依赖状态

- Zod：已安装并用于搜索参数校验
- KaTeX：已安装并通过 `remark-math`、`rehype-katex` 配置
- Markdown：已安装 `react-markdown`、`remark-gfm`
- shadcn/ui：尚未初始化

## 下一步

- 完善搜索教材筛选 UI
- 构建复习中心和更完整的学习统计
- 增加知识点内容管理工作流

## 已知问题

构建时 Next.js 原生 SWC 模块在当前 Windows Node 环境不可加载，会自动回退 WASM 编译；构建结果正常。

## 数据库

本轮未修改 `prisma/schema.prisma`，没有新增 migration。
