import { Children, isValidElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { isExternalContentLink, isSafeContentLink } from "@/lib/content/url-safety";
import { KnowledgeImage } from "./KnowledgeImage";

const components: Components = {
  a: ({ href, children }) => {
    if (!href || !isSafeContentLink(href)) return <span>{children}</span>;
    const external = isExternalContentLink(href);
    return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{children}</a>;
  },
  img: ({ src, alt, title }) => <KnowledgeImage src={typeof src === "string" ? src : ""} alt={alt || "知识图片"} caption={title || undefined} />,
  p: ({ children }) => {
    const items = Children.toArray(children);
    const containsImage = items.some((item) => isValidElement(item) && (item.type === KnowledgeImage || item.type === "img"));
    return <div className={containsImage ? "markdown-image-block" : "markdown-paragraph"}>{children}</div>;
  },
  pre: ({ children }) => <pre className="markdown-code-block">{children}</pre>,
};

export function MarkdownRenderer({ content, throwOnMathError = false }: { content: string; throwOnMathError?: boolean }) {
  return <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: throwOnMathError }]]} components={components}>{content}</ReactMarkdown></div>;
}
