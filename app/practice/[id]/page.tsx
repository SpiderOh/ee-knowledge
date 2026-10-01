import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PracticeSession } from "@/components/practice/PracticeSession";
import { practiceQuestionTypeLabels } from "@/features/practice/constants";
import { getPracticeQuestion } from "@/features/practice/queries";

export const dynamic = "force-dynamic";

export default async function PracticeQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = await getPracticeQuestion(id);
  if (!question) notFound();
  return <AppShell active="练习中心"><div className="practice-breadcrumb"><Link href="/practice">练习中心</Link><span>›</span><span>{practiceQuestionTypeLabels[question.type]}</span></div><div className="page-header"><div><div className="eyebrow">{question.knowledgePoint.course.name} · {question.knowledgePoint.title}</div><h1>练习题</h1><p className="subtitle">难度 {question.difficulty}/5</p></div></div><PracticeSession question={question} /><section className="card practice-history"><h2 className="section-title">最近作答</h2>{question.attempts.length === 0 ? <p className="empty">还没有作答记录。</p> : question.attempts.map((attempt) => <div className="practice-history-row" key={attempt.id}><span>{attempt.attemptedAt.toLocaleString("zh-CN")}</span><strong className={attempt.isCorrect ? "practice-correct" : "practice-incorrect"}>{attempt.isCorrect ? "正确" : "错误"}</strong><span>{attempt.submittedAnswer}</span></div>)}</section></AppShell>;
}
