"use client";

import { useState, useTransition } from "react";
import type { PracticeQuestionType } from "@prisma/client";
import { deletePracticeQuestion, savePracticeQuestion } from "@/features/practice/actions";
import { isObjectiveQuestionType, practiceQuestionTypeLabels } from "@/features/practice/constants";

type Question = NonNullable<Awaited<ReturnType<typeof import("@/features/content-management/queries").getKnowledgePointAdmin>>>["practiceQuestions"][number];

function optionText(question?: Question) { return question?.options.map((option) => `${option.key}|${option.content}`).join("\n") ?? ""; }

export function PracticeQuestionEditor({ knowledgePointId, questions }: { knowledgePointId: string; questions: Question[] }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = questions.find((question) => question.id === selectedId);
  const [type, setType] = useState<PracticeQuestionType>(selected?.type ?? "SINGLE_CHOICE");
  const [question, setQuestion] = useState(selected?.question ?? "");
  const [answer, setAnswer] = useState(selected?.answer ?? "");
  const [explanation, setExplanation] = useState(selected?.explanation ?? "");
  const [difficulty, setDifficulty] = useState(String(selected?.difficulty ?? 3));
  const [optionsText, setOptionsText] = useState(optionText(selected));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const load = (id: string) => { const next = questions.find((item) => item.id === id); setSelectedId(id); setType(next?.type ?? "SINGLE_CHOICE"); setQuestion(next?.question ?? ""); setAnswer(next?.answer ?? ""); setExplanation(next?.explanation ?? ""); setDifficulty(String(next?.difficulty ?? 3)); setOptionsText(optionText(next)); setError(""); };
  const submit = () => { setError(""); startTransition(async () => { const result = await savePracticeQuestion({ id: selectedId || undefined, knowledgePointId, type, question, answer, explanation: explanation || null, difficulty: Number(difficulty), optionsText }); if (!result.ok) setError(result.error); else window.location.reload(); }); };
  const remove = () => { if (!selected || !window.confirm("确认删除这道练习题？")) return; setError(""); startTransition(async () => { const result = await deletePracticeQuestion({ id: selected.id, knowledgePointId }); if (!result.ok) setError(result.error); else window.location.reload(); }); };
  const locked = Boolean(selected && selected._count.attempts > 0);
  return <section className="card editor-section practice-admin-section"><h2>练习题</h2>{questions.length > 0 && <div className="practice-admin-list">{questions.map((item) => <button type="button" className={item.id === selectedId ? "selected" : ""} key={item.id} onClick={() => load(item.id)}>{practiceQuestionTypeLabels[item.type]} · {item.question.slice(0, 50)}<small>{item._count.attempts} 次作答</small></button>)}</div>}<div className="practice-admin-form"><div className="form-grid"><label>题型<select value={type} onChange={(event) => setType(event.target.value as PracticeQuestionType)} disabled={locked}>{Object.entries(practiceQuestionTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>难度（1-5）<input type="number" min="1" max="5" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} /></label></div><label>题干（Markdown）<textarea rows={5} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={locked} /></label>{isObjectiveQuestionType(type) && type !== "TRUE_FALSE" && <label>选项（每行 KEY|内容，内容支持 Markdown）<textarea rows={5} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} disabled={locked} placeholder="A|选项内容\nB|选项内容" /></label>}{type === "TRUE_FALSE" ? <label>标准答案<select value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={locked}><option value="">请选择</option><option value="TRUE">正确</option><option value="FALSE">错误</option></select></label> : <label>标准答案（选择题填 key，主观题填参考答案 Markdown）<textarea rows={4} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={locked} /></label>}<label>答案解析（Markdown）<textarea rows={4} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label>{locked && <small className="field-hint">已有作答记录，题型、题干、标准答案和选项已锁定；可以调整解析和难度。</small>}<div className="transfer-actions"><button className="primary-button" type="button" onClick={submit} disabled={pending}>{pending ? "保存中…" : selected ? "保存练习题" : "新增练习题"}</button>{selected && <button className="danger-button" type="button" onClick={remove} disabled={pending || locked}>删除练习题</button>}</div>{error && <p className="action-error" role="alert">{error}</p>}</div></section>;
}
