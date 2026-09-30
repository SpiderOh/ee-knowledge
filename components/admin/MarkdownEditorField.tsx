"use client";

import { useState } from "react";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

export function MarkdownEditorField({ label, name, defaultValue, hint }: { label: string; name: string; defaultValue?: string | null; hint?: string }) {
  const [preview, setPreview] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  return <div className="editor-field"><div className="editor-label-row"><label htmlFor={name}>{label}</label><div><button className={`editor-tab ${!preview ? "active" : ""}`} type="button" onClick={() => setPreview(false)}>编辑</button><button className={`editor-tab ${preview ? "active" : ""}`} type="button" onClick={() => setPreview(true)}>预览</button></div></div>{preview ? <div className="markdown-preview">{value.trim() ? <MarkdownRenderer content={value} /> : <span className="empty">暂无内容</span>}</div> : <textarea id={name} name={name} value={value} onChange={(event) => setValue(event.target.value)} rows={6} />}{hint && <small className="field-hint">{hint}</small>}</div>;
}
