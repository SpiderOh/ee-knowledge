"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteKnowledgePoint } from "@/features/content-management/actions";

export function KnowledgeListActions({ id, title, formulaCount, exampleCount, relationCount, chapterCount }: { id: string; title: string; formulaCount: number; exampleCount: number; relationCount: number; chapterCount: number }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState("");
  return <span className="inline-action"><button type="button" disabled={pending} onClick={() => { if (!window.confirm(`即将删除：${title}\nFormula：${formulaCount}\nExample：${exampleCount}\nRelation：${relationCount}\n教材关联：${chapterCount}\n\n确认删除？`)) return; setError(""); startTransition(async () => { const result = await deleteKnowledgePoint({ id }); if (!result.ok) setError(result.error); else router.refresh(); }); }}>删除</button>{error && <small className="action-error">{error}</small>}</span>;
}
