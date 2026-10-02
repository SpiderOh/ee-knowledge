# DATABASE.md

## 1. 核心实体

### SubjectArea
专业方向。

### Course
课程。

### Book
教材。

### Chapter
教材章节，支持多级父子结构。

### KnowledgePoint
知识点，系统核心实体。

### ChapterKnowledgePoint
教材章节与知识点之间的多对多关系。

### Formula
知识点公式。

### Example
知识点例子。

### KnowledgeRelation
知识点之间的关系。

### InterviewQuestion
复试问题。

### InterviewAnswer
复试回答。

### PracticeQuestion
练习题。

### PracticeQuestionOption
选择题选项，按题目和 key 唯一。

### PracticeAttempt
不可变的用户作答记录，保存提交答案、服务端判定和时间。

### StudyProgress
学习状态与掌握程度。

### ReviewRecord
复习记录。

### Note
笔记。

### Favorite
收藏。

### School
目标院校。

### SchoolInterviewQuestion
院校历年复试问题。

## 2. 关键规则

### Rule A：同一知识点不因教材不同而重复创建

错误：

```text
傅里叶变换（教材A）
傅里叶变换（教材B）
```

正确：

```text
KnowledgePoint: 傅里叶变换

Chapter A ↔ 傅里叶变换
Chapter B ↔ 傅里叶变换
```

### Rule B：用户数据与知识内容分开

知识数据：

- Course
- Book
- Chapter
- KnowledgePoint
- Formula
- Relation
- InterviewQuestion
- PracticeQuestion
- PracticeQuestionOption

用户学习数据：

- StudyProgress
- ReviewRecord
- Note
- Favorite
- PracticeAttempt

后续导入导出也建议分开。

Knowledge Bundle 不是数据库备份。它只交换 SubjectArea、Course、KnowledgePoint、Formula、Example 和 KnowledgeRelation，不包含 Book、Chapter、ChapterKnowledgePoint、PracticeQuestion、PracticeQuestionOption，也不包含 StudyProgress、ReviewRecord、PracticeAttempt、Note、Favorite。导入采用 Merge / Upsert，不会因为缺失项删除现有内容。

结构管理采用应用层保守删除规则：有 Course 的 SubjectArea 禁删；有 Book 或 KnowledgePoint 的 Course 禁删；有 Chapter 的 Book 禁删；有子章节或 KnowledgePoint 关联的 Chapter 禁删。虽然部分 Prisma 关系使用 Cascade 或 SetNull，Admin 不直接利用这些删除行为。Book 更换 Course 或建立 ChapterKnowledgePoint 关联时，应用层要求 Book、Chapter 与 KnowledgePoint 属于同一 Course。

### Rule C：AI 内容必须有审核状态

推荐：

```text
AI_DRAFT
REVIEWED
VERIFIED
```

练习题客观答案由 Server Action 根据题目选项空间独立验证，客户端控件不构成数据边界。PracticeAttempt 的最近记录按 `attemptedAt DESC, id DESC` 确定性排序。

## 3. 数据迁移原则

优先：

- 新增表
- 新增 nullable 字段
- 新增关系

谨慎：

- 改名
- 删除字段
- 更改主键
- 改变唯一约束

任何破坏性修改必须说明：

- 旧数据如何迁移
- 如何回滚
- 如何验证

## ReviewRecord 复习计划

`ReviewRecord` 保存每次复习结果（0 忘记、1 模糊、2 记得、3 熟练）和下一次复习时间。产品交互中的 GOOD/EASY 都属于成功结果，AGAIN/HARD 都会重置成功 streak。`StudyProgress.status=REVIEW` 表示用户手动加入复习中心或当前需要复习；复习结果保存后会同步为 `MASTERED`（记得/熟练）或 `REVIEW`（忘记/模糊）。

同一知识点只允许一个有效复习计划，即 `nextReviewAt IS NOT NULL` 的记录最多一条。新结果写入前会清空旧计划，再创建新的 `ReviewRecord`。简单调度使用 1、3、7、14、30 天间隔，不改变核心数据模型，也不引入 FSRS 或 SM-2。

## 学习统计数据语义

学习统计不新增事件表。`StudyProgress` 只表示知识点当前状态，课程进度继续按 `status != NOT_STARTED` 计算；复习历史只读取 `ReviewRecord.reviewedAt`，练习历史只读取 `PracticeAttempt.attemptedAt`。最近 14 天活动不会把 `StudyProgress.lastStudiedAt` 当作历史事件。当前错题按每道 PracticeQuestion 最新一次作答（`attemptedAt DESC, id DESC`）判定，复习待办和逾期数量复用复习中心的 `getReviewOverview` 语义。
