"use client";

import { StudyStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { updateStudyStatus } from "@/features/study/actions";

const options = [
  [StudyStatus.NOT_STARTED, "未学习"],
  [StudyStatus.LEARNING, "学习中"],
  [StudyStatus.MASTERED, "已掌握"],
  [StudyStatus.REVIEW, "需要复习"],
] as const;

export function StudyStatusControl({ knowledgePointId, initialStatus }: { knowledgePointId: string; initialStatus: StudyStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="status-control"><label htmlFor="study-status">学习状态</label><select id="study-status" value={status} disabled={pending} onChange={(event) => { const next = options.find(([value]) => value === event.target.value)?.[0]; if (!next) return; setError(""); startTransition(async () => { const result = await updateStudyStatus({ knowledgePointId, status: next }); if (result.ok) setStatus(next); else setError(result.error); }); }}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{pending && <small>更新中……</small>}{error && <small className="action-error">{error}</small>}</div>;
}
