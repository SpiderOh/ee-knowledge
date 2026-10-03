# MASTER_SPEC.md

## 1. 项目定位

项目名称暂定：**研电 · EE Knowledge**

这是一个面向个人长期使用的电子信息专业知识与学习系统。项目定位为 single-user personal system，优先简单、稳定、数据安全和低维护成本，不以 SaaS、多人平台或商业知识管理系统为目标。

核心用途：

1. 本科专业知识系统复习
2. 考研复试准备
3. 专业面试
4. 查漏补缺
5. 长期积累嵌入式、AI 与端侧 AI 知识

## 2. 核心知识范围

初始方向：

- 电路与电子技术
- 信号处理
- 通信
- 自动控制
- 嵌入式
- 计算机基础
- 人工智能

课程示例：

- 电路原理
- 模拟电子技术
- 数字电子技术
- 信号与系统
- 数字信号处理
- 通信原理
- 高频电子线路
- 电磁场与电磁波
- 自动控制原理
- C语言
- 数据结构
- 计算机网络
- 操作系统
- Linux
- 单片机
- STM32
- 微机原理
- 嵌入式系统
- FPGA / Verilog
- 数字图像处理
- 机器学习
- 深度学习
- 计算机视觉
- 嵌入式 AI
- 端侧 AI

## 3. 关键设计思想

### 3.1 知识与代码分离

知识内容必须存放在数据库、Markdown、JSON 或其他数据源中，不能写死在前端组件。

### 3.2 KnowledgePoint 是核心实体

系统真正管理的是知识点，而不是 PDF 页码。

### 3.3 教材是知识点的一种组织方式

同一知识点可以出现在多本教材中，不应重复创建。

推荐关系：

```text
Course
  ↓
KnowledgePoint
  ↕
ChapterKnowledgePoint
  ↕
Chapter
  ↓
Book
```

### 3.4 双视图

教材视图：

```text
课程 → 教材 → 章节 → 知识点
```

知识体系视图：

```text
方向 → 课程 → 概念关系 → 知识点
```

### 3.5 知识点表达与问答训练

每个知识点不仅有定义和公式，还要能包含：

- 一句话定义
- 标准定义
- 通俗理解
- 核心原理
- 物理意义
- 工程意义
- 核心公式
- 易错点
- 对比概念
- 常见问法
- 简短/标准回答
- 深入理解（可选）
- 自测题
- 掌握标准

## 4. 页面

主要页面：

- 首页
- 知识库
- 课程
- 教材
- 知识点
- 搜索
- 收藏
- 笔记
- 复习中心
- 错题本
- 学习统计
- 管理后台
- 设置

## 5. 第一阶段 MVP

必须实现：

1. 首页
2. 课程管理
3. 教材管理
4. 树形章节
5. 知识点 CRUD
6. Markdown 内容展示
7. LaTeX 展示
8. 搜索
9. 收藏
10. 笔记
11. 学习状态
12. 学习进度
13. 管理后台
14. JSON 导入导出

不做：

- RAG
- 向量数据库
- 语音面试
- PDF 自动拆书
- OCR
- 复杂知识图谱
- 多用户
- 云同步

## 6. v0.2.0 学习闭环

- 复习中心、简单间隔复习和复习历史
- 练习题、客观题服务端判分、主观题自评和错题本
- 学习统计、课程统计与复习/练习联动

## 7. v0.3.0 Mobile & Personal Cloud

- alpha.1 已完成 PWA manifest、Android 安装基础和移动端体验基线
- alpha.2 已完成 single-user Authentication、私有默认路由和登录/退出
- alpha.3 已完成 Native Node + systemd + Caddy 的 self-host deployment 基础、HTTPS reverse proxy 和 server-side SQLite 生产路径
- alpha.4 已完成 SQLite online scheduled backup、daily systemd timer、Primary retention 和可选独立 Secondary backup destination
- PWA 和 mobile UX
- Android 安装体验，稳定后再评估 Capacitor wrapper / APK
- single-user Authentication
- 桌面与手机访问同一个服务器 canonical data source

第一版个人云端不维护手机 SQLite，不实现双向离线数据库合并同步，也不承诺 offline-first edits。

## 8. v0.4.0 Knowledge Learning Polish

- KnowledgePoint 常见问法、标准回答、易错点和掌握标准
- 复用 InterviewQuestion/InterviewAnswer 保存通用知识问答；不建设独立复试题库
- alpha.2 已完成只读快速学习入口 `/quick-learn`
- 快速学习优先选择 `REVIEW > LEARNING > NOT_STARTED > MASTERED`；缺少 `StudyProgress` 的知识点按 `NOT_STARTED` 处理
- 快速学习支持课程范围、排除当前知识点和同一优先级内的随机偏移，不写入学习、复习、练习、收藏或笔记数据
- 零碎时间学习入口与移动端学习流程优化

不建设独立复试题库、模拟复试、追问链系统化流程或院校专区。

## 9. v0.5.0 个人资料导入

- Markdown、TXT、PDF 文本提取和 Word 文本提取
- 人工确认与来源记录

## 10. v0.6.0 / RC 稳定化

- 数据安全、移动端回归、自托管回归、备份恢复回归和文档

## 11. v1.0.0 长期个人版

目标是稳定的长期个人电子信息专业知识系统，继续积累 Linux、ARM、驱动开发、RK3588、NPU、ONNX、RKNN、TensorRT、模型量化、模型剪枝和端侧推理等知识。

v1.0 不要求多用户、商业 SaaS、AI Assistant、RAG、Vector DB、复杂知识图谱、独立复试系统或全国院校数据库。

## 12. Post-v1 / Only if Needed

以下能力只有在产生真实需求后再评估：Local AI、AIProvider、RAG、Embedding、Vector DB、复杂知识图谱、多用户、注册与 RBAC、商业云同步、复杂对象存储、实时同步协议、独立复试题库、模拟复试、院校专区、语音面试、全国院校数据库、FSRS 和复杂推荐算法。

## 13. 跨 AI 原则

项目必须能由不同 AI 继续开发。

任何新 AI 只要阅读仓库中的文档，就应能理解：

- 项目目标
- 当前架构
- 数据模型
- 已完成内容
- 正在开发内容
- 重大历史决策
- 下一步任务

所有长期状态不得只存在于某个聊天窗口。
