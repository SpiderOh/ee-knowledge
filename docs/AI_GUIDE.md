# AI_GUIDE.md

## 1. AI 使用目标

AI 是辅助层，不应成为系统唯一数据源。

主要用途：

- 生成知识卡
- 整理教材
- 检查专业内容
- 生成复试问题
- 模拟追问
- 评价回答
- RAG 问答

## 2. AI 可替换

不得把 OpenAI 逻辑散落在业务代码中。

所有 AI 请求统一通过 Provider。

## 3. 内容审核

AI 生成内容默认：

```text
AI_DRAFT
```

人工审核后：

```text
REVIEWED
```

高可信确认后：

```text
VERIFIED
```

## 4. 来源信息

后续教材导入时尽量记录：

- source
- sourceBook
- sourceChapter
- sourcePage
- confidence
- reviewStatus

## 5. Prompt 管理

提示词统一保存在：

```text
lib/ai/prompts/
```

并在 `docs/PROMPTS.md` 保留面向人工使用的标准版本。

不要把关键提示词只存在聊天记录里。
