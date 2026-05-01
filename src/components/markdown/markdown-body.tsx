import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBodyProps {
  children: string;
  className?: string;
}

/**
 * Renders a markdown string with the Golden Study Nook prose styling.
 *
 * Uses Tailwind class composition (rather than the typography plugin) so the
 * styles stay aligned with the project's custom design tokens. Safe by
 * default — `react-markdown` escapes HTML, no `dangerouslySetInnerHTML`.
 */
export function MarkdownBody({
  children,
  className,
}: MarkdownBodyProps): React.JSX.Element {
  const wrapperClass = [
    "text-text-primary font-body leading-relaxed",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: nodes }) => (
            <h1 className="font-heading text-3xl text-text-primary mt-8 mb-4 first:mt-0">
              {nodes}
            </h1>
          ),
          h2: ({ children: nodes }) => (
            <h2 className="font-heading text-2xl text-text-primary mt-8 mb-3 first:mt-0">
              {nodes}
            </h2>
          ),
          h3: ({ children: nodes }) => (
            <h3 className="font-heading text-xl text-text-primary mt-6 mb-2 first:mt-0">
              {nodes}
            </h3>
          ),
          p: ({ children: nodes }) => (
            <p className="text-text-primary mb-4 leading-relaxed">{nodes}</p>
          ),
          ul: ({ children: nodes }) => (
            <ul className="list-disc pl-6 mb-4 space-y-1.5 text-text-primary marker:text-accent">
              {nodes}
            </ul>
          ),
          ol: ({ children: nodes }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-1.5 text-text-primary marker:text-accent">
              {nodes}
            </ol>
          ),
          li: ({ children: nodes }) => (
            <li className="text-text-primary leading-relaxed">{nodes}</li>
          ),
          a: ({ children: nodes, href }) => (
            <a
              href={href}
              className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent transition-colors"
            >
              {nodes}
            </a>
          ),
          strong: ({ children: nodes }) => (
            <strong className="font-semibold text-text-primary">{nodes}</strong>
          ),
          em: ({ children: nodes }) => (
            <em className="italic text-text-secondary">{nodes}</em>
          ),
          code: ({ children: nodes }) => (
            <code className="rounded-md bg-[rgba(199,123,26,0.1)] border border-glass px-1.5 py-0.5 font-mono text-sm text-text-primary">
              {nodes}
            </code>
          ),
          pre: ({ children: nodes }) => (
            <pre
              tabIndex={0}
              className="glass rounded-2xl p-4 my-5 overflow-x-auto font-mono text-sm text-text-primary shadow-warm"
            >
              {nodes}
            </pre>
          ),
          blockquote: ({ children: nodes }) => (
            <blockquote className="border-l-4 border-accent/40 bg-[rgba(199,123,26,0.06)] rounded-r-lg pl-4 pr-4 py-2 my-5 italic text-text-secondary">
              {nodes}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-0 border-t border-glass" />,
          table: ({ children: nodes }) => (
            <div
              tabIndex={0}
              className="my-5 overflow-x-auto rounded-2xl border border-glass"
            >
              <table className="w-full border-collapse text-sm text-text-primary">
                {nodes}
              </table>
            </div>
          ),
          th: ({ children: nodes }) => (
            <th className="border-b border-glass bg-[rgba(199,123,26,0.08)] px-4 py-2.5 text-left font-heading text-text-primary">
              {nodes}
            </th>
          ),
          td: ({ children: nodes }) => (
            <td className="border-b border-glass px-4 py-2.5 text-text-primary last:border-b-0">
              {nodes}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
