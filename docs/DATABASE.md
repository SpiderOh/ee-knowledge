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

用户学习数据：

- StudyProgress
- ReviewRecord
- Note
- Favorite

后续导入导出也建议分开。

Knowledge Bundle 不是数据库备份。它只交换 SubjectArea、Course、KnowledgePoint、Formula、Example 和 KnowledgeRelation，不包含 Book、Chapter 或 ChapterKnowledgePoint，也不包含 StudyProgress、ReviewRecord、Note、Favorite。导入采用 Merge / Upsert，不会因为缺失项删除现有内容。

### Rule C：AI 内容必须有审核状态

推荐：

```text
AI_DRAFT
REVIEWED
VERIFIED
```

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
