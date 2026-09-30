import type { Formula } from "@prisma/client";
import { renderToString } from "katex";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

type FormulaView = Pick<Formula, "id" | "name" | "latex" | "description" | "conditions" | "sortOrder">;

export function FormulaSection({ formulas }: { formulas: FormulaView[] }) {
  if (formulas.length === 0) return null;
  return <section className="formula-section"><h2>核心公式</h2><div className="formula-list">{formulas.map((formula) => <article className="formula-card" key={formula.id}>
    <h3>{formula.name || "公式"}</h3>
    <div className="formula-body">{renderFormula(formula.latex)}</div>
    {formula.description && <p><strong>说明：</strong>{formula.description}</p>}
    {formula.conditions && <p><strong>适用条件：</strong>{formula.conditions}</p>}
  </article>)}</div></section>;
}

function renderFormula(latex: string) {
  try {
    renderToString(latex, { displayMode: true, throwOnError: true });
    return <MarkdownRenderer content={`$$\n${latex}\n$$`} throwOnMathError />;
  } catch {
    return <div className="formula-fallback"><code>{latex}</code><span>公式渲染失败</span></div>;
  }
}
