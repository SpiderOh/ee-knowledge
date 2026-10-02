import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { practiceQuestionTypeLabels } from "@/features/practice/constants";
import { getWrongAnswerQuestions } from "@/features/practice/queries";

export const dynamic = "force-dynamic";

export default async function WrongAnswersPage() {
  const questions = await getWrongAnswerQuestions();
  return <AppShell active="错题本"><div className="page-header"><div><div className="eyebrow">WRONG ANSWERS</div><h1>错题本</h1><p className="subtitle">只显示最近一次仍答错的题目。</p></div><Link className="secondary-button" href="/practice">练习中心</Link></div>{questions.length === 0 ? <div className="empty card practice-empty">当前没有错题。完成练习后，最近一次答错的题目会出现在这里。</div> : <div className="practice-list wrong-list">{questions.map((question) => <article className="card wrong-item" key={question.id}><div><div className="practice-item-heading"><h2>{question.question.split("\n")[0].slice(0, 100)}</h2><span>{practiceQuestionTypeLabels[question.type]}</span></div><p>{question.knowledgePoint.course.name} · {question.knowledgePoint.title} · 难度 {question.difficulty}/5</p><small>错误 {question.wrongCount} 次 · 最近错误：{question.latestAttempt?.attemptedAt.toLocaleString("zh-CN")} · 最近提交：{question.latestAttempt?.submittedAnswer}</small></div><div className="wrong-item-actions"><Link className="secondary-button" href={`/practice/${question.id}`}>重新练习</Link><Link className="secondary-button" href={`/review/${question.knowledgePoint.slug}`}>复习知识点</Link></div></article>)}</div>}</AppShell>;
}
