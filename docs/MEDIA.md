# MEDIA.md

## 当前能力

- Markdown 图片语法通过 `KnowledgeImage` 统一渲染。
- 支持站内相对路径，例如 `/media/circuit/kcl.png`。
- 支持 HTTPS URL；开发环境也允许 HTTP URL。
- 图片失败时保留替代文本并显示“图片加载失败”。
- 图片使用响应式 `max-width: 100%`，不会主动造成移动端横向滚动。

## 当前不支持

- 图片上传、删除和媒体库管理
- 对象存储、CDN 和具体云厂商 SDK
- 图片 AI 生成和 OCR
- `MediaAsset` 数据表
- SVG 源码注入或 `dangerouslySetInnerHTML`

## Provider 抽象

`lib/media/types.ts` 定义 `MediaAssetRef` 和 `MediaProvider`，当前由 `DirectMediaProvider` 原样解析图片 URL。未来可以替换为本地文件、对象存储或远程媒体 Provider，而不改变内容渲染组件的接口。

## 未来建议

如果图片需要复用、版权、来源、排序或上传管理，再单独设计 `MediaAsset`、`StorageProvider` 和 `ImageUploadService`。
