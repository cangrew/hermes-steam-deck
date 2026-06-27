import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Renders assistant markdown with GFM tables/lists and syntax-highlighted code
 * blocks. Memoized because it re-renders on every streamed token.
 */
export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const content = String(children).replace(/\n$/, "");
            const isBlock = className?.includes("language-") || content.includes("\n");
            if (!isBlock) {
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <SyntaxHighlighter
                language={match?.[1] ?? "text"}
                style={oneDark}
                customStyle={{
                  borderRadius: 10,
                  fontSize: "0.95rem",
                  margin: "0.5rem 0",
                }}
                PreTag="div"
              >
                {content}
              </SyntaxHighlighter>
            );
          },
          a({ children, ...props }) {
            return (
              <a {...props} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
