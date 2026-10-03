import type { InterviewAnswerType } from "@prisma/client";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

const answerLabels: Record<InterviewAnswerType, string> = { SHORT_30S: "简短回答", MEDIUM_1MIN: "标准回答", DEEP: "深入理解" };

export function KnowledgeQuestionSection({ questions }: { questions: Array<{ id: string; question: string; level: number; frequency: number; source: string | null; answers: Array<{ answerType: InterviewAnswerType; content: string }> }> }) {
  if (questions.length === 0) return null;
  return <section className="knowledge-questions"><h2>常见问法</h2>{questions.map((question) => { const answers = new Map(question.answers.map((answer) => [answer.answerType, answer.content])); return <details className="knowledge-question" key={question.id}><summary><span>{question.question}</span><small>常见程度 {"★".repeat(question.frequency)}{"☆".repeat(5 - question.frequency)} · 难度 {question.level}/5</small></summary><div className="question-answers">{(Object.keys(answerLabels) as InterviewAnswerType[]).map((type) => answers.get(type) ? <div className="question-answer" key={type}><h3>{answerLabels[type]}</h3><MarkdownRenderer content={answers.get(type)!} /></div> : null)}{question.answers.length === 0 && <p className="sidebar-empty">暂未整理参考回答。</p>}{question.source && <small className="field-hint">来源：{question.source}</small>}</div></details>; })}</section>;
}
