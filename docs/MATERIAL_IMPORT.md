# Personal Material Import

v0.5.0-alpha.1 提供一个受控的个人资料导入基础流程，入口为 /admin/material-import。

## 支持范围

- .md、.markdown 和 .txt
- UTF-8 编码，可带 BOM
- 单文件最多 2 MB
- 现有 Course 选择
- 标题、slug、类别、正文和来源元数据人工编辑

## 流程

1. 选择文件并提取文本。
2. 手工确认课程、标题、slug、正文和来源。
3. 预览 Knowledge Bundle v1 变化。
4. 确认后创建一个新的 KnowledgePoint。

已有 slug 会被拒绝，不会覆盖原有知识点。预览绑定当前草稿，草稿变化后必须重新预览。应用不会持久化原始文件，导入不写入学习数据，也不自动创建 Book、Chapter 或教材关联。

PDF、DOCX、OCR、批量导入和 AI 整理留到后续版本。
