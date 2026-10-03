# ROADMAP.md

## v0.1.0：Knowledge Base Foundation

- 首页、课程、教材、递归章节和知识点阅读
- Markdown、LaTeX、搜索、收藏、笔记和学习状态
- 内容管理、结构管理和 Knowledge Bundle v1

## v0.2.0：Learning Loop

- 复习中心与简单间隔复习
- 练习题、客观题判分、主观题自评和错题本
- 学习统计、课程统计和复习/练习联动

## v0.3.0：Mobile & Personal Cloud

- alpha.1：PWA、Android 安装基础、Mobile UX 和部署前安全基线
- alpha.2：single-user Authentication、私有默认路由和登录/退出
- alpha.3：Linux self-host deployment、HTTPS reverse proxy 和 server-side SQLite
- alpha.4：scheduled backup 与 secondary backup destination（complete）
- rc.1：Mobile & Personal Cloud End-to-End Regression（complete）
- stable：v0.3.0 正式发布（complete）
- PWA 与 mobile UX
- Android 安装体验，后续再评估 Capacitor wrapper / APK
- 单用户 Authentication
- self-hosted deployment、HTTPS 和 server-side SQLite
- 桌面和手机访问同一个服务器 canonical data source

本阶段不承诺 offline-first edits、双向 SQLite synchronization、multi-user、RBAC 或 PostgreSQL migration。

## v0.4.0：Knowledge Learning Polish

- alpha.1：KnowledgePoint 常见问法、标准回答、易错点和掌握标准
- alpha.2：移动端学习流程与零碎时间学习入口（complete）
- alpha.3：Mobile Learning Polish（complete）
- rc.1：Release Regression & Documentation（complete）
- stable：v0.4.0 正式发布（complete）
- 掌握标准与知识点内容增强
- “随便学一个”/零碎时间学习入口
- 移动端学习流程优化

本阶段不建设独立复试题库、模拟复试或目标院校复试专区。

## v0.5.0：Personal Material Import

- alpha.1：Markdown/TXT 提取、人工确认、来源记录和创建型 KnowledgePoint 草稿导入（complete/current）
- alpha.2：PDF/DOCX 文本提取，复用同一人工确认与导入管线（next）
- rc.1：资料导入回归、数据安全和文档
- stable：v0.5.0 正式发布

## v0.6.0 / RC：Stabilization

- 数据安全、移动端回归和自托管回归
- 备份/恢复回归、UI polish 和文档

## v1.0.0：Stable Personal EE Knowledge System

- 稳定的长期个人电子信息专业知识系统
- 面向长期积累、复习和个人自托管使用

## Post-v1 / Only if Needed

以下能力只有在产生真实需求后再评估：

- Local AI、AI Assistant、AIProvider、RAG、Embedding、Vector DB
- 复杂知识图谱
- 多用户、注册、RBAC 和商业 SaaS
- 复杂对象存储与实时同步协议
- 复试题库、模拟复试、目标院校专区、语音面试、全国院校数据库、FSRS 和复杂推荐算法
