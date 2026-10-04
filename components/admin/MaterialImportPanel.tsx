"use client";

import Link from "next/link";
import { useState } from "react";
import { KnowledgeCategory } from "@prisma/client";
import { extractMaterialAction, importMaterialAction, previewMaterialAction } from "@/features/material-import/actions";
import { MAX_MATERIAL_BYTES, suggestMaterialSlug, suggestMaterialTitle, type ExtractedMaterial } from "@/features/material-import/extract";
import type { MaterialDraft } from "@/features/material-import/schema";

const categoryLabels: Record<KnowledgeCategory, string> = { CONCEPT: "概念", THEOREM: "定理", FORMULA: "公式", ALGORITHM: "算法", CIRCUIT: "电路", SYSTEM: "系统", PROTOCOL: "协议", DEVICE: "器件", METHOD: "方法", EXPERIMENT: "实验", OTHER: "其他" };
type Props = { courses: Array<{ id: string; name: string; slug: string }> };
type MaterialPreview = {
  snapshot: string;
  summary: { knowledgePoints: { create: number; update: number } };
  courseName: string;
  title: string;
  slug: string;
  category: KnowledgeCategory;
  source: string;
  contentLength: number;
  sourceBook?: string;
  sourceChapter?: string;
  sourcePage?: string;
};

export function MaterialImportPanel({ courses }: Props) {
  const [fileKey, setFileKey] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedMaterial | null>(null);
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [preview, setPreview] = useState<MaterialPreview | null>(null);
  const [result, setResult] = useState<{ id: string; slug: string; title: string; source: string | null } | null>(null);
  const [error, setError] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function clearFeedback() { setPreview(null); setResult(null); setError([]); setMessage(""); }
  function updateDraft(field: keyof MaterialDraft, value: string) { setDraft((current) => current ? { ...current, [field]: value } : current); clearFeedback(); }
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearFeedback();
    setExtracted(null);
    setDraft(null);
    const file = event.currentTarget.files?.[0];
    if (file && file.size > MAX_MATERIAL_BYTES) {
      event.currentTarget.value = "";
      setError(["文件超过 2 MB。"]);
    }
  }
  async function extract(formData: FormData) {
    setPending(true); clearFeedback();
    const response = await extractMaterialAction(formData);
    setPending(false);
    if (!response.ok) { setError(response.errors); return; }
    const item = response.extracted;
    setExtracted(item);
    setDraft({ courseSlug: "", title: suggestMaterialTitle(item.originalFileName), slug: suggestMaterialSlug(item.originalFileName), category: "CONCEPT", source: item.originalFileName, sourceBook: "", sourceChapter: "", sourcePage: "", content: item.text });
  }
  async function previewDraft() {
    if (!draft) return;
    setPending(true); clearFeedback();
    const response = await previewMaterialAction(draft);
    setPending(false);
    if (!response.ok) { setError(response.errors); return; }
    const course = courses.find((item) => item.slug === draft.courseSlug);
    setPreview({ snapshot: response.snapshot, summary: response.summary, courseName: course?.name ?? draft.courseSlug, title: draft.title, slug: draft.slug, category: draft.category, source: draft.source, contentLength: draft.content.length, sourceBook: draft.sourceBook || undefined, sourceChapter: draft.sourceChapter || undefined, sourcePage: draft.sourcePage || undefined });
    setMessage("预览通过：当前确认内容将创建 1 个新知识点。");
  }
  async function confirmImport() {
    if (!draft || !preview) return;
    if (!window.confirm("确认将当前人工确认后的资料创建为新的知识点草稿？\n\n原始上传文件不会被 EE Knowledge 保存；\n只保存当前确认后的正文与来源字段；\n不会创建学习、复习或练习记录；\n已有 slug 不会被覆盖。")) return;
    setPending(true); setError([]); setMessage("");
    const response = await importMaterialAction(draft, preview.snapshot);
    setPending(false);
    if (!response.ok) { setError(response.errors); return; }
    setResult(response.created); setMessage("创建成功。");
  }
  function reset() { setFileKey((value) => value + 1); setExtracted(null); setDraft(null); setPreview(null); setResult(null); setError([]); setMessage(""); }

  return <div className="material-import-stack">
    {!draft && <form className="card material-import-card" action={extract}><h2>选择文本资料</h2><p className="subtitle">支持 UTF-8 编码的 Markdown 或 TXT，单文件不超过 2 MB。原始文件仅用于本次文本提取，EE Knowledge 不会保存原始文件。</p><input key={fileKey} name="file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={handleFileChange} required /><button className="primary-button" type="submit" disabled={pending}>{pending ? "读取中…" : "读取资料"}</button></form>}
    {extracted && draft && !result && <div className="card material-import-card"><div className="material-import-file"><strong>{extracted.originalFileName}</strong><span>{extracted.format.toUpperCase()} · {extracted.byteSize} bytes</span></div><div className="form-grid">
      <label>所属课程<select value={draft.courseSlug} onChange={(event) => updateDraft("courseSlug", event.target.value)}><option value="">请选择已有课程</option>{courses.map((course) => <option value={course.slug} key={course.id}>{course.name}</option>)}</select></label>
      <label>知识点标题<input value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} /></label>
      <label>slug<input value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} /></label>
      <label>知识类别<select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>来源名称<input value={draft.source} onChange={(event) => updateDraft("source", event.target.value)} /></label>
      <label>来源教材（可选）<input value={draft.sourceBook ?? ""} onChange={(event) => updateDraft("sourceBook", event.target.value)} /></label>
      <label>来源章节（可选）<input value={draft.sourceChapter ?? ""} onChange={(event) => updateDraft("sourceChapter", event.target.value)} /></label>
      <label>来源页码（可选）<input value={draft.sourcePage ?? ""} onChange={(event) => updateDraft("sourcePage", event.target.value)} /></label>
    </div><label className="material-import-content">可编辑正文<textarea rows={16} value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} /></label><div className="transfer-actions"><button className="primary-button" type="button" onClick={previewDraft} disabled={pending}>{pending ? "处理中…" : "预览导入"}</button><button className="secondary-button" type="button" onClick={reset}>重新选择</button></div>
    {preview && <div className="import-preview"><h3>导入预览</h3><div className="preview-row"><span>目标课程</span><strong>{preview.courseName}</strong></div><div className="preview-row"><span>知识点标题</span><strong>{preview.title}</strong></div><div className="preview-row"><span>slug</span><strong>{preview.slug}</strong></div><div className="preview-row"><span>知识类别</span><strong>{categoryLabels[preview.category]}</strong></div><div className="preview-row"><span>来源名称</span><strong>{preview.source}</strong></div><div className="preview-row"><span>正文字符数</span><strong>{preview.contentLength}</strong></div>{preview.sourceBook && <div className="preview-row"><span>来源教材</span><strong>{preview.sourceBook}</strong></div>}{preview.sourceChapter && <div className="preview-row"><span>来源章节</span><strong>{preview.sourceChapter}</strong></div>}{preview.sourcePage && <div className="preview-row"><span>来源页码</span><strong>{preview.sourcePage}</strong></div>}<div className="preview-row"><span>KnowledgePoint</span><strong>创建 {preview.summary.knowledgePoints.create} / 更新 {preview.summary.knowledgePoints.update}</strong></div><button className="primary-button" type="button" onClick={confirmImport} disabled={pending}>确认创建</button></div>}</div>}
    {result && <div className="card material-import-card"><h2>创建成功</h2><p>{result.title}</p><p className="subtitle">来源：{result.source ?? "未填写"}</p><div className="transfer-actions"><Link className="primary-button" href={"/knowledge/" + result.slug}>查看知识点</Link><Link className="secondary-button" href={"/admin/knowledge/" + result.id + "/edit"}>编辑知识点</Link><button className="secondary-button" type="button" onClick={reset}>继续导入</button></div></div>}
    {message && <p className="transfer-success" role="status">{message}</p>}{error.length > 0 && <pre className="transfer-error" role="alert">{error.join("\n")}</pre>}
  </div>;
}
