const sections = [["definition", "标准定义"], ["plainExplanation", "通俗理解"], ["principle", "核心原理"], ["physicalMeaning", "物理意义"], ["engineeringMeaning", "工程意义"]] as const;

export function KnowledgePointContent({ point }: { point: Record<string, unknown> }) {
  return <div className="knowledge-content">{sections.map(([field, title]) => typeof point[field] === "string" && point[field] ? <section key={field}><h2>{title}</h2><p>{point[field] as string}</p></section> : null)}</div>;
}
