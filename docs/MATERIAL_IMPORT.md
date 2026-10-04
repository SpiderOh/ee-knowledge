# Personal Material Import

v0.5.0-rc.1 提供一个受控的个人资料导入流程，延续 alpha.1/alpha.2 的冻结导入边界并完成 RC 回归，入口为 `/admin/material-import`。

## 支持范围

- `.md`、`.markdown`、`.txt`：UTF-8，可带 BOM，单文件最多 2 MB
- `.pdf`：服务端 `pdf-parse` 提取文本，单文件最多 10 MB
- `.docx`：服务端 `mammoth.extractRawText` 提取纯文本，单文件最多 10 MB
- 现有 Course 选择
- 标题、slug、类别、正文和来源元数据人工编辑

PDF 与 DOCX 只读取纯文本，不做 OCR、图片、表格、版式或旧版 `.doc` 转换。扫描版 PDF、需要密码的 PDF、损坏文件和空文本会被拒绝。原始上传文件只用于本次提取，不落盘。

## 流程

1. 选择 Markdown/TXT、PDF 或 DOCX 文件并提取文本。
2. 手工确认课程、标题、slug、正文和来源。
3. 预览 Knowledge Bundle v1 变化。
4. 确认后创建一个新的 KnowledgePoint。

每个文件只创建一个 KnowledgePoint；不会自动拆分章节或知识点。已有 slug 会被拒绝，不会覆盖原有知识点。预览绑定当前草稿，草稿变化后必须重新预览。导入不写入学习数据，也不自动创建 Book、Chapter 或教材关联。

## 安全边界

- 文本文件上限 2 MB，PDF/DOCX 上限 10 MB；Server Action 传输上限为 12 MB。
- 解析器只在服务端加载，浏览器端仅做扩展名和大小预检。
- 原始文件、二进制内容和解析器临时文件不会持久化。
