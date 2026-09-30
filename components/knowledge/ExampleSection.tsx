import type { Example } from "@prisma/client";
import { MarkdownRenderer } from "@/components/content/MarkdownRenderer";

type ExampleView = Pick<Example, "id" | "title" | "content" | "solution" | "type" | "sortOrder">;

export function ExampleSection({ examples }: { examples: ExampleView[] }) {
  if (examples.length === 0) return null;
  return <section className="example-section"><h2>典型案例</h2><div className="example-list">{examples.map((example) => <article className="example-card" key={example.id}>
    <div className="example-heading"><h3>{example.title || "示例"}</h3>{example.type && <span>{example.type}</span>}</div>
    <MarkdownRenderer content={example.content} />
    {example.solution && <div className="example-solution"><h4>解答</h4><MarkdownRenderer content={example.solution} /></div>}
  </article>)}</div></section>;
}
