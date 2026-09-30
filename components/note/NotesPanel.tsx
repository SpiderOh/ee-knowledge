"use client";

import { useState, useTransition } from "react";
import { createNote, deleteNote, updateNote } from "@/features/notes/actions";

export type NoteView = { id: string; content: string; createdAt: string; updatedAt: string };

export function NotesPanel({ knowledgePointId, initialNotes }: { knowledgePointId: string; initialNotes: NoteView[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submitNew = () => { setError(""); startTransition(async () => { const result = await createNote({ knowledgePointId, content: draft }); if (result.ok) { setNotes((current) => [{ id: `new-${Date.now()}`, content: draft.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...current]); setDraft(""); } else setError(result.error); }); };
  const saveEdit = (noteId: string) => { setError(""); startTransition(async () => { const result = await updateNote({ noteId, content: editingContent }); if (result.ok) { setNotes((current) => current.map((note) => note.id === noteId ? { ...note, content: editingContent.trim(), updatedAt: new Date().toISOString() } : note)); setEditingId(null); } else setError(result.error); }); };
  const remove = (noteId: string) => { if (!window.confirm("确定删除这条笔记吗？")) return; setError(""); startTransition(async () => { const result = await deleteNote({ noteId }); if (result.ok) setNotes((current) => current.filter((note) => note.id !== noteId)); else setError(result.error); }); };
  return <section className="notes-panel"><h2>我的笔记</h2><label htmlFor="new-note">添加笔记</label><textarea id="new-note" value={draft} maxLength={10000} onChange={(event) => setDraft(event.target.value)} placeholder="记录你对这个知识点的理解……" /><button type="button" className="primary-button note-save" disabled={pending || !draft.trim()} onClick={submitNew}>保存笔记</button>{error && <p className="action-error">{error}</p>}<div className="notes-list">{notes.map((note) => <article className="note-card" key={note.id}>{editingId === note.id ? <><textarea aria-label="编辑笔记" value={editingContent} maxLength={10000} onChange={(event) => setEditingContent(event.target.value)} /><div className="note-actions"><button type="button" disabled={pending} onClick={() => saveEdit(note.id)}>保存</button><button type="button" disabled={pending} onClick={() => setEditingId(null)}>取消</button></div></> : <><p>{note.content}</p><div className="note-footer"><time>{new Date(note.updatedAt).toLocaleString("zh-CN")}</time><div className="note-actions"><button type="button" onClick={() => { setEditingId(note.id); setEditingContent(note.content); }}>编辑</button><button type="button" onClick={() => remove(note.id)}>删除</button></div></div></>}</article>)}</div></section>;
}
