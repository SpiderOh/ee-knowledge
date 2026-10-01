# Knowledge Bundle v1

`ee-knowledge-content`、`schemaVersion: "1.0"` 是用于交换正式知识内容的 JSON 格式。它不是 SQLite 备份，也不包含用户学习数据。

## 顶层结构

```json
{
  "kind": "ee-knowledge-content",
  "schemaVersion": "1.0",
  "exportedAt": "2026-09-30T00:00:00.000Z",
  "subjectAreas": [],
  "courses": [],
  "knowledgePoints": [],
  "relations": []
}
```

Bundle 包含 SubjectArea、Course、KnowledgePoint、Formula、Example 和 KnowledgeRelation。不包含 Book、Chapter、ChapterKnowledgePoint，也不包含 Note、Favorite、StudyProgress、ReviewRecord。教材结构未来由独立 Library Bundle 处理。

Knowledge Bundle v1 的应用级输入上限为 **2 MB**。Server Action 的传输上限设置为 **3 MB**，仅用于容纳请求序列化和协议开销，不改变 2 MB 的业务限制。

## 标识与 Merge 语义

- SubjectArea、Course 和 KnowledgePoint 使用 slug 作为跨系统业务标识。
- Formula 和 Example 在同一知识点内使用稳定 `key`。导出数据库原生记录时使用 `db:<record-id>`；其他 key 通过知识点 slug 和 key 生成确定性导入 ID。
- Relation 使用 `sourceSlug`、`targetSlug` 和 `relationType`，不导出内部数据库 ID。
- 导入只做 Merge / Upsert。Bundle 没有出现的旧数据保持不变，不执行 Replace 或 Delete Missing。
- 更新时只覆盖 JSON 明确提供的字段；字段省略（`undefined`）表示保留原值，显式 `null` 表示清空可空字段，显式值表示更新该字段。
- `sortOrder` 省略时更新记录保留原排序；新建 SubjectArea、Course、Formula、Example 的 `sortOrder` 默认为 `0`。
- Course 的 `subjectAreaSlug` 省略时保留原专业方向，显式 `null` 清除关联，显式 slug 建立关联。
- `reviewStatus` 缺失时默认为 `AI_DRAFT`，导入不会自动提升为 `VERIFIED`。
- 对称关系 RELATED、SIMILAR、DIFFERENT 不创建镜像记录；自关联会被拒绝。

## 内容字段

KnowledgePoint 的正文和 Formula、Example 的 Markdown 内容原样保存。图片只保存 Markdown URL，例如 `![节点图](/media/circuit/kcl.png)` 或 `![节点图](https://cdn.example.com/kcl.png)`。系统不下载图片，不嵌入二进制，也禁止 `data:image/...;base64,...`。

KnowledgePoint 的 `category`、`reviewStatus`、`importance`、`interviewImportance`、`difficulty` 和 `confidence` 在导入时经过 Zod 校验。slug 使用小写英文、数字和连字符。

## 版本兼容

当前只接受 `kind = "ee-knowledge-content"` 和 `schemaVersion = "1.0"`。未知版本必须先经过格式升级，不会被系统静默猜测或导入。
