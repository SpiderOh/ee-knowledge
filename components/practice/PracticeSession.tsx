"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { PracticeQuestionType } from "@prisma/client";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";
import { recordPracticeAttempt } from "@/features/practice/actions";
import { isObjectiveQuestionType, practiceQuestionTypeLabels } from "@/features/practice/constants";

type PracticeQuestion = {
  id: string;
  type: PracticeQuestionType;
  question: string;
  answer: string;
  explanation: string | null;
  difficulty: number;
  knowledgePoint: { slug: string };
  options: Array<{ id: string; key: string; content: string; sortOrder: number }>;
};

export function PracticeSession({ question }: { question: PracticeQuestion }) {
  const [answer, setAnswer] = useState("");
  const [showReference, setShowReference] = useState(false);
  const [submitted, setSubmitted] = useState<{ isCorrect: boolean; answer: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const subjective = !isObjectiveQuestionType(question.type);
  const submit = (subjectiveAssessment?: boolean) => {
    setError("");
    startTransition(async () => {
      const result = await recordPracticeAttempt({ practiceQuestionId: question.id, submittedAnswer: answer, subjectiveAssessment });
      if (!result.ok) { setError(result.error); return; }
      setSubmitted({ isCorrect: result.isCorrect, answer });
    });
  };
  const choose = (key: string, checked: boolean) => {
    if (question.type === "MULTIPLE_CHOICE") {
      const keys = answer ? answer.split(",") : [];
      const next = checked ? [...new Set([...keys, key])] : keys.filter((item) => item !== key);
      setAnswer(next.join(","));
    } else setAnswer(key);
  };
  return <div className="practice-session"><section className="card practice-question-card"><div className="practice-question-meta"><span>{practiceQuestionTypeLabels[question.type]}</span><span>难度 {question.difficulty}/5</span></div><div className="practice-question-content"><MarkdownRenderer content={question.question} /></div>{question.type === "SINGLE_CHOICE" && <div className="practice-options">{question.options.map((option) => <label className="practice-option" key={option.id}><input type="radio" name={`question-${question.id}`} value={option.key} checked={answer === option.key} onChange={() => choose(option.key, true)} disabled={pending || submitted !== null} /><span><strong>{option.key}</strong><MarkdownRenderer content={option.content} /></span></label>)}</div>}{question.type === "MULTIPLE_CHOICE" && <div className="practice-options">{question.options.map((option) => <label className="practice-option" key={option.id}><input type="checkbox" value={option.key} checked={answer.split(",").includes(option.key)} onChange={(event) => choose(option.key, event.target.checked)} disabled={pending || submitted !== null} /><span><strong>{option.key}</strong><MarkdownRenderer content={option.content} /></span></label>)}</div>}{question.type === "TRUE_FALSE" && <div className="practice-choice-buttons"><button type="button" className={answer === "TRUE" ? "selected" : ""} onClick={() => choose("TRUE", true)} disabled={pending || submitted !== null}>正确</button><button type="button" className={answer === "FALSE" ? "selected" : ""} onClick={() => choose("FALSE", true)} disabled={pending || submitted !== null}>错误</button></div>}{subjective && <textarea className="practice-answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={pending || submitted !== null} placeholder="先写下你的答案，再查看参考答案。" rows={7} />}{!subjective && <button className="primary-button" type="button" onClick={() => submit()} disabled={pending || submitted !== null || !answer}>{pending ? "提交中…" : "提交答案"}</button>}{subjective && !showReference && <button className="primary-button" type="button" onClick={() => setShowReference(true)} disabled={pending || submitted !== null || !answer.trim()}>查看参考答案</button>}{subjective && showReference && <div className="practice-reference"><h3>参考答案</h3><MarkdownRenderer content={question.answer} />{question.explanation && <><h3>答案解析</h3><MarkdownRenderer content={question.explanation} /></>}<div className="practice-assessment"><button type="button" onClick={() => submit(true)} disabled={pending || submitted !== null}>我答对了</button><button type="button" onClick={() => submit(false)} disabled={pending || submitted !== null}>我答错了</button></div></div>}{error && <p className="action-error" role="alert">{error}</p>}{submitted && <div className={`practice-result ${submitted.isCorrect ? "correct" : "incorrect"}`} role="status" aria-live="polite"><strong>{submitted.isCorrect ? "回答正确" : "回答错误"}</strong><span>你的答案：{submitted.answer}</span>{!subjective && <><span>正确答案：{question.answer}</span>{question.explanation && <MarkdownRenderer content={question.explanation} />}</>}<div className="practice-result-actions"><Link className="secondary-button" href="/practice">返回练习中心</Link>{!submitted.isCorrect && <Link className="secondary-button" href={`/review/${question.knowledgePoint.slug}`}>复习对应知识点</Link>}<Link className="secondary-button" href="/wrong-answers">查看错题本</Link><button className="secondary-button" type="button" onClick={() => { setAnswer(""); setShowReference(false); setSubmitted(null); }}>重新练习</button></div></div>}</section></div>;
}
