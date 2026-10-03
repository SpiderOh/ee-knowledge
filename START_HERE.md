# START_HERE

如果你把这个项目交给新的 AI，请先阅读：

> `README.md`、`AGENTS.md`、`docs/MASTER_SPEC.md`、`docs/PROJECT_STATUS.md`、`docs/ARCHITECTURE.md`、`docs/DATABASE.md`、`docs/UI.md`、`docs/DECISIONS.md`。

这是一个已经初始化并持续开发中的 Next.js + Prisma 知识库项目，不要重新初始化或重设计数据库。先检查当前 Git 分支和状态，再根据 `docs/PROJECT_STATUS.md` 的下一步继续开发。

当前版本：

`v0.5.0-alpha.1`

已完成：

- 首页、课程、教材、章节树和知识点阅读
- 稳定的 Demo Seed 与教材阅读顺序
- 基础全局搜索和课程过滤
- 学习状态、收藏、个人笔记和课程学习进度
- 首页已学习知识点、需要复习和最近学习
- Markdown、GFM、KaTeX、结构化公式、示例和知识关系展示
- KnowledgeImage 与 MediaProvider 基础接口
- 内容管理后台、KnowledgePoint 及结构化内容 CRUD
- Knowledge Bundle v1 的 JSON 校验、预览、导入和导出
- 结构管理、Chapter 树形管理和保守删除保护
- SQLite Backup / Restore、`db:check`、`verify:mvp` 和 `release:check`
- 复习中心、到期复习队列、复习会话、复习历史和 1/3/7/14/30 天简单间隔调度
- 练习中心、客观题判分、主观题自评、作答历史、错题本和练习题管理
- 学习统计、课程进度统计、复习/练习成功率和最近 14 天活动
- 复习与练习互相跳转，错题和知识点复习页可进入对应学习操作
- 单用户 Authentication、登录/退出和私有默认路由保护
- 环境变量密码 hash、签名 HttpOnly session 和 `verify:auth`
- Linux self-host deployment、systemd、Caddy HTTPS 和 server-side SQLite
- `deploy:check`、`verify:deploy` 和自托管部署文档
- SQLite online scheduled backup、daily systemd timer、Primary retention 和可选独立 Secondary backup
- Secondary same-filesystem fail-closed、SHA-256 与 SQLite integrity_check 验证
- GitHub Actions CI 与 production runtime verification
- `/quick-learn` 快速学习入口、课程范围和学习状态优先级选择
- 移动端 KnowledgePoint 学习信息、教材上下文和窄屏操作 polish

下一步：

- v0.4.0：Knowledge Learning Polish stable
- v0.5.0-alpha.1：个人资料 Markdown/TXT 导入基础
- 下一步：v0.5.0-alpha.2 PDF/DOCX 文本提取；发布边界见 `docs/V0.4_RELEASE_NOTES.md`
