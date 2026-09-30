import { Children, isValidElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { KnowledgeImage } from "./KnowledgeImage";

function isSafeLink(url: string) {
  const value = url.trim();
  if (value.startsWith("/")) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isExternalLink(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

const components: Components = {
  a: ({ href, children }) => {
    if (!href || !isSafeLink(href)) return <span>{children}</span>;
    return <a href={href} target={isExternalLink(href) ? "_blank" : undefined} rel={isExternalLink(href) ? "noopener noreferrer" : undefined}>{children}</a>;
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
