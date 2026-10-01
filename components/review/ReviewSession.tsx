"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { recordReviewResult } from "@/features/review/actions";
import { reviewResultDescriptions, reviewResultLabels, type ReviewResult } from "@/features/review/constants";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

type ReviewPoint = {
  id: string;
  title: string;
  summary: string | null;
  definition: string | null;
  plainExplanation: string | null;
  principle: string | null;
  physicalMeaning: string | null;
  engineeringMeaning: string | null;
  formulas: Array<{ id: string; name: string | null; latex: string; description: string | null; conditions: string | null }>;
};

const resultOrder: ReviewResult[] = [0, 1, 2, 3];

export function ReviewSession({ point }: { point: ReviewPoint }) {
  const [answerVisible, setAnswerVisible] = useState(false);
  const [submitted, setSubmitted] = useState<ReviewResult | null>(null);
  const [nextReviewAt, setNextReviewAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const sections = [
    ["标准定义", point.definition],
    ["通俗理解", point.plainExplanation],
    ["核心原理", point.principle],
    ["物理意义", point.physicalMeaning],
    ["工程意义", point.engineeringMeaning],
  ] as const;
  function submit(result: ReviewResult) {
    setError("");
    startTransition(async () => {
      const response = await recordReviewResult({ knowledgePointId: point.id, result });
      if (!response.ok) { setError(response.error); return; }
      setSubmitted(result);
      setNextReviewAt(response.nextReviewAt);
    });
  }
  return <div className="review-session">
    <section className="review-prompt card"><div className="eyebrow">主动回忆</div><h2>你能回忆起「{point.title}」吗？</h2>{point.summary && <p>{point.summary}</p>}<button className="primary-button" type="button" onClick={() => setAnswerVisible(true)} disabled={answerVisible}>显示答案</button></section>
    {answerVisible && <section className="review-answer card"><h2>知识点内容</h2>{sections.map(([title, content]) => content ? <section key={title}><h3>{title}</h3><MarkdownRenderer content={content} /></section> : null)}{point.formulas.length > 0 && <section><h3>核心公式</h3>{point.formulas.map((formula) => <div className="review-formula" key={formula.id}><strong>{formula.name}</strong><MarkdownRenderer content={`$$\n${formula.latex}\n$$`} />{formula.description && <p>{formula.description}</p>}</div>)}</section>}<div className="review-result-block"><h3>这次记忆情况</h3><div className="review-result-grid">{resultOrder.map((result) => <button className={`review-result-button result-${result}`} type="button" key={result} disabled={pending || submitted !== null} onClick={() => submit(result)}><strong>{reviewResultLabels[result]}</strong><span>{reviewResultDescriptions[result]}</span></button>)}</div>{pending && <p className="review-pending" aria-live="polite">正在保存复习记录……</p>}{error && <p className="action-error" role="alert">{error}</p>}{submitted !== null && nextReviewAt && <div className="review-success" role="status"><strong>已记录：{reviewResultLabels[submitted]}</strong><span>下次复习：{new Date(nextReviewAt).toLocaleString("zh-CN")}</span><Link className="secondary-button" href="/review">返回复习中心</Link></div>}</div></section>}
  </div>;
}
