// Minimal, safe renderer for the news article body format.
// Supports: `## heading`, `### heading`, blank-line paragraphs, `> quote`,
// unordered lists (`- item`), `**bold**`, `*italic*`, inline `[label](url)` links,
// and standalone image lines `![alt](url)`. No raw HTML — everything is rendered
// through React elements, so untrusted body content cannot inject markup.
import { Fragment, type ReactNode } from "react";

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "image"; alt: string; url: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let listBuf: string[] | null = null;

  const flushParagraph = () => {
    if (buf.length) {
      blocks.push({ kind: "paragraph", text: buf.join(" ") });
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf) {
      blocks.push({ kind: "list", items: listBuf });
      listBuf = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "image", alt: image[1], url: image[2] });
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: 3, text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: 2, text: line.slice(3) });
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "quote", text: line.slice(2) });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      listBuf ??= [];
      listBuf.push(line.slice(2));
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

// Inline formatting: bold, italic, link. No raw HTML.
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const regex =
    /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const href = linkMatch[2];
        const isExternal = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={key++}
            href={href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            className="text-[#6d412a] underline underline-offset-4 decoration-2 hover:text-black transition"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

export function ArticleBody({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-6 text-lg leading-relaxed text-[#3a2617]">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "heading":
            return block.level === 2 ? (
              <h2
                key={i}
                className="text-3xl font-bold text-black mt-12 mb-2 tracking-tight"
              >
                {renderInline(block.text)}
              </h2>
            ) : (
              <h3
                key={i}
                className="text-2xl font-bold text-black mt-8 mb-1 tracking-tight"
              >
                {renderInline(block.text)}
              </h3>
            );
          case "paragraph":
            return (
              <p key={i} className="text-[#3a2617]/85">
                {renderInline(block.text)}
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-[#6d412a] pl-6 py-2 my-8 text-xl italic text-[#3a2617]"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i} className="list-disc pl-6 space-y-2 text-[#3a2617]/85">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={i} className="my-8">
                <img
                  src={block.url}
                  alt={block.alt}
                  loading="lazy"
                  className="w-full rounded-2xl border border-[#ede5dc]"
                />
                {block.alt && (
                  <figcaption className="mt-3 text-sm text-[#6d412a]/70 text-center">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
