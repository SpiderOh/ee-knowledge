"use client";

import { useTransition } from "react";
import { deleteBook, deleteChapter, deleteCourse, deleteSubjectArea } from "@/features/structure-management/actions";

export function StructureDeleteButton({ kind, id, label }: { kind: "area" | "course" | "book" | "chapter"; id: string; label: string }) { const [pending, startTransition] = useTransition(); return <button className="text-button danger-text" type="button" disabled={pending} onClick={() => { if (!window.confirm(`确认删除${label}？`)) return; startTransition(async () => { const result = kind === "area" ? await deleteSubjectArea(id) : kind === "course" ? await deleteCourse(id) : kind === "book" ? await deleteBook(id) : await deleteChapter(id); if (!result.ok) window.alert(result.error); else window.location.reload(); }); }}>{pending ? "处理中…" : "删除"}</button>; }
