"use client";

import Link from "next/link";
import { useState } from "react";
import { KnowledgeCategory } from "@prisma/client";
import { extractMaterialAction, importMaterialAction, previewMaterialAction } from "@/features/material-import/actions";
import { suggestMaterialSlug, suggestMaterialTitle, type ExtractedMaterial } from "@/features/material-import/extract";
import type { MaterialDraft } from "@/features/material-import/schema";

const categoryLabels: Record<KnowledgeCategory, string> = { CONCEPT: "概念", THEOREM: "定理", FORMULA: "公式", ALGORITHM: "算法", CIRCUIT: "电路", SYSTEM: "系统", PROTOCOL: "协议", DEVICE: "器件", METHOD: "方法", EXPERIMENT: "实验", OTHER: "其他" };

type Props = { courses: Array<{ id: string; name: string; slug: string }> };

export function MaterialImportPanel({ courses }: Props) {
  const [fileKey, setFileKey] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedMaterial | null>(null);
  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [preview, setPreview] = useState<{ snapshot: string; summary: { knowledgePoints: { create: number; update: number } } } | null>(null);
  const [result, setResult] = useState<{ id: string; slug: string; title: string; source: string | null } | null>(null);
  const [error, setError] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function clearFeedback() { setPreview(null); setResult(null); setError([]); setMessage(""); }
  function updateDraft(field: keyof MaterialDraft, value: string) { setDraft((current) => current ? { ...current, [field]: value } : current); clearFeedback(); }
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
    setPreview({ snapshot: response.snapshot, summary: response.summary });
    setMessage("预览通过：将创建 1 个新知识点。");
  }
  async function confirmImport() {
    if (!draft || !preview) return;
    if (!window.confirm("确认创建这个知识点吗？已存在的 slug 不会被覆盖。")) return;
    setPending(true); setError([]); setMessage("");
    const response = await importMaterialAction(draft, preview.snapshot);
    setPending(false);
    if (!response.ok) { setError(response.errors); return; }
    setResult(response.created); setMessage("创建成功。");
  }
  function reset() { setFileKey((value) => value + 1); setExtracted(null); setDraft(null); setPreview(null); setResult(null); setError([]); setMessage(""); }

  return <div className="material-import-stack">
    {!draft && <form className="card material-import-card" action={extract}><h2>选择文本资料</h2><p className="subtitle">支持 UTF-8 编码的 Markdown 或 TXT，单文件不超过 2 MB。文件只在本次请求中读取，不会写入磁盘。</p><input key={fileKey} name="file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" required /><button className="primary-button" type="submit" disabled={pending}>{pending ? "读取中…" : "读取资料"}</button></form>}
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
    {preview && <div className="import-preview"><h3>导入预览</h3><div className="preview-row"><span>创建知识点</span><strong>{preview.summary.knowledgePoints.create}</strong></div><div className="preview-row"><span>更新知识点</span><strong>{preview.summary.knowledgePoints.update}</strong></div><button className="primary-button" type="button" onClick={confirmImport} disabled={pending}>确认创建</button></div>}</div>}
    {result && <div className="card material-import-card"><h2>创建成功</h2><p>{result.title}</p><p className="subtitle">来源：{result.source ?? "未填写"}</p><div className="transfer-actions"><Link className="primary-button" href={"/knowledge/" + result.slug}>查看知识点</Link><Link className="secondary-button" href={"/admin/knowledge/" + result.id + "/edit"}>编辑知识点</Link><button className="secondary-button" type="button" onClick={reset}>继续导入</button></div></div>}
    {message && <p className="transfer-success" role="status">{message}</p>}{error.length > 0 && <pre className="transfer-error" role="alert">{error.join("\\n")}</pre>}
  </div>;
}
